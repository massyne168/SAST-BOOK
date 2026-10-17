import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {ELYSIUM_DISCORD_GUILD_ID,ELYSIUM_BOOK_ROLE_IDS} from './discord-elysium-roles.js';

export const DISCORD_BOOK_IDS=Object.freeze(['archive','directory','classified','resignation','bulletins']);
const COOKIE_SESSION='sast_discord_session',COOKIE_STATE='sast_discord_oauth_state';
const SESSION_AGE=2*60*60,STATE_AGE=10*60;
const idPattern=/^\d{16,22}$/;
const safe=(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length&&timingSafeEqual(x,y);
};
const cookieRead=(header,name)=>typeof header==='string'
  ?(header.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))||'').slice(name.length+1)
  : '';
function parseRoles(raw) {
  try {
    const input=JSON.parse(raw||'{}');
    if(!input||typeof input!=='object'||Array.isArray(input))return {};
    return Object.fromEntries(DISCORD_BOOK_IDS.map(id=>{
      const ids=input[id];
      return [id,Array.isArray(ids)&&ids.length>0&&ids.every(role=>typeof role==='string'&&idPattern.test(role))?ids:[]];
    }));
  }catch{return {}}
}
const json=(status,body,cookies=[])=>({status,body,cookies});
const redirect=(location,cookies=[])=>({status:303,location,cookies});
const noStore=()=>({error:'Discord authorization is unavailable. Check configuration.'});

export function createDiscordBookAccess({
  env=process.env,fetchImpl=fetch,now=()=>Date.now(),random=()=>randomBytes(24).toString('hex'),
  apiBase='https://discord.com/api/v10'
}={}) {
  const clientId=env.DISCORD_CLIENT_ID||'';
  const clientSecret=env.DISCORD_CLIENT_SECRET||'';
  const guildId=env.DISCORD_GUILD_ID||ELYSIUM_DISCORD_GUILD_ID;
  const redirectUri=env.DISCORD_REDIRECT_URI||'';
  const signing=env.DISCORD_SESSION_SECRET||'';
  // Explicit env overrides remain authoritative; absent env uses the exact IDs
  // configured for ELYSIUM. Malformed overrides fail closed, not silently open.
  const roles=parseRoles(env.DISCORD_BOOK_ROLES_JSON===undefined
    ?JSON.stringify(ELYSIUM_BOOK_ROLE_IDS)
    :env.DISCORD_BOOK_ROLES_JSON);
  const configured=idPattern.test(clientId)&&idPattern.test(guildId)&&clientSecret.length>=10&&
    signing.length>=32&&/^https:\/\/[^#?]+$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/[^#?]+$/.test(redirectUri);
  const key=createHash('sha256').update(signing||'disabled').digest();
  const seal=payload=>{
    const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);
    const data=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);
    return Buffer.concat([nonce,cipher.getAuthTag(),data]).toString('base64url');
  };
  const unseal=input=>{
    if(typeof input!=='string'||input.length>3600)return null;
    try{
      const bytes=Buffer.from(input,'base64url');
      if(bytes.length<30)return null;
      const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
      cipher.setAuthTag(bytes.subarray(12,28));
      return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
    }catch{return null}
  };
  const makeCookie=(name,value,{secure=true,age=SESSION_AGE,clear=false}={})=>
    name+'='+value+'; Path=/; HttpOnly; SameSite=Lax'+(secure?'; Secure':'')+
    '; Max-Age='+(clear?'0':String(age));
  const tokenHeaders=token=>({Authorization:'Bearer '+token,Accept:'application/json'});
  async function readMember(token) {
    const response=await fetchImpl(apiBase+'/users/@me/guilds/'+guildId+'/member',{
      headers:tokenHeaders(token),cache:'no-store'
    });
    if(response.status===401||response.status===403||response.status===404)return null;
    if(!response.ok)throw Error('Discord guild membership could not be verified.');
    const member=await response.json();
    if(member?.pending||!Array.isArray(member?.roles))return null;
    return member;
  }
  const active=cookieHeader=>{
    const data=unseal(cookieRead(cookieHeader,COOKIE_SESSION));
    if(!configured||!data||!safe(data.guildId,guildId)||typeof data.token!=='string'||
       !Number.isFinite(data.exp)||now()>=data.exp||!idPattern.test(data.userId||''))return null;
    return data;
  };
  const booksFor=member=>{
    const assigned=new Set(member?.roles||[]);
    return Object.fromEntries(DISCORD_BOOK_IDS.map(id=>[id,
      Boolean(roles[id]?.length&&roles[id].some(role=>assigned.has(role)))]));
  };
  async function check(cookieHeader,bookId) {
    if(!configured)return {status:503,body:{configured:false,authenticated:false,allowed:false,message:'Discord OAuth is not configured on the server.'}};
    const session=active(cookieHeader);
    if(!session)return {status:401,body:{configured:true,authenticated:false,allowed:false,message:'Log in with Discord to access the books.'}};
    try {
      const member=await readMember(session.token);
      if(!member)return {status:403,body:{configured:true,authenticated:false,allowed:false,message:'Your Discord account is not an active member of the required server.'}};
      const books=booksFor(member);
      if(bookId&&!DISCORD_BOOK_IDS.includes(bookId))return {status:400,body:{error:'Invalid book.'}};
      const allowed=bookId?books[bookId]:true;
      return {status:allowed?200:403,body:{
        configured:true,authenticated:true,allowed,
        user:{id:session.userId,username:session.username},
        books,
        message:allowed?null:'Your Discord account does not have an allowed role for this book.'
      }};
    }catch{return {status:503,body:{configured:true,authenticated:false,allowed:false,message:'Discord role verification is temporarily unavailable.'}}}
  }
  async function handle({action='session',cookie='',code='',state='',error='',book='',secure=true}={}) {
    if(action==='start'){
      if(!configured)return json(503,noStore());
      const nonce=random();
      const auth=new URL('https://discord.com/oauth2/authorize');
      auth.searchParams.set('client_id',clientId);
      auth.searchParams.set('redirect_uri',redirectUri);
      auth.searchParams.set('response_type','code');
      auth.searchParams.set('scope','identify guilds.members.read');
      auth.searchParams.set('state',nonce);
      auth.searchParams.set('prompt','consent');
      return {status:302,location:auth.toString(),cookies:[makeCookie(COOKIE_STATE,seal({nonce,exp:now()+STATE_AGE*1000}),{secure,age:STATE_AGE})]};
    }
    if(action==='callback'){
      const clear=makeCookie(COOKIE_STATE,'',{secure,clear:true});
      const pending=unseal(cookieRead(cookie,COOKIE_STATE));
      if(!configured||error||!pending||!safe(state,pending.nonce)||pending.exp<=now()||!code||typeof code!=='string'||code.length>2000)
        return redirect('/?discord=authorization-failed',[clear]);
      try{
        const payload=new URLSearchParams({
          client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',
          code,redirect_uri:redirectUri
        });
        const response=await fetchImpl('https://discord.com/api/oauth2/token',{
          method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:payload.toString(),cache:'no-store'
        });
        if(!response.ok)throw Error('Discord rejected authorization.');
        const token=await response.json();
        if(!token?.access_token||!Number.isFinite(token.expires_in)||token.expires_in<=0)throw Error('Invalid OAuth access token.');
        const userResponse=await fetchImpl(apiBase+'/users/@me',{headers:tokenHeaders(token.access_token),cache:'no-store'});
        if(!userResponse.ok)throw Error('Discord profile check failed.');
        const user=await userResponse.json();
        if(!idPattern.test(user?.id||''))throw Error('Invalid account');
        const member=await readMember(token.access_token);
        if(!member) return redirect('/?discord=not-in-server',[clear]);
        const until=now()+Math.min(SESSION_AGE,token.expires_in)*1000;
        const session=seal({token:token.access_token,userId:user.id,username:String(user.global_name||user.username||'Discord Member').slice(0,80),guildId,exp:until});
        return redirect('/?discord=connected',[clear,makeCookie(COOKIE_SESSION,session,{secure,age:Math.floor((until-now())/1000)})]);
      }catch{return redirect('/?discord=authorization-failed',[clear])}
    }
    if(action==='logout')return redirect('/',[makeCookie(COOKIE_SESSION,'',{secure,clear:true}),makeCookie(COOKIE_STATE,'',{secure,clear:true})]);
    if(action==='session'||action==='access')return check(cookie,action==='access'?book:null);
    return json(400,{error:'Unknown Discord operation.'});
  }
  return {configured,roles,check,handle};
}
