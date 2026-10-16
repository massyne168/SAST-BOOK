import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

export const COMMAND_COOKIE='sast_command_session';
export const SESSION_TTL_SECONDS=8*60*60;
const ROLE_PERMISSIONS=Object.freeze({
  administrator:['dashboard:read','bulletins:publish','personnel:manage','armory:manage','approvals:review'],
  high_command:['dashboard:read','bulletins:publish','approvals:review'],
  armory_officer:['dashboard:read','armory:manage'],
  trooper:['dashboard:read']
});
export const rolePermissions=role=>ROLE_PERMISSIONS[role]?.slice()||[];
export const roleCan=(role,permission)=>rolePermissions(role).includes(permission);
const safeEqual=(left,right)=>{
  if(typeof left!=='string'||typeof right!=='string'||!left||!right)return false;
  const a=Buffer.from(left,'utf8'),b=Buffer.from(right,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
};
const tag=(credential)=>createHash('sha256').update(credential).digest('hex').slice(0,24);
const COOKIE_PATTERN=new RegExp('(?:^|;\\s*)'+COMMAND_COOKIE+'=([^;]+)');

export function createCommandAuth({
  signingSecret=process.env.COMMAND_SESSION_SECRET,
  credentials={
    administrator:process.env.ADMIN_TOKEN,
    high_command:process.env.HIGH_COMMAND_TOKEN,
    armory_officer:process.env.ARMORY_TOKEN,
    trooper:process.env.TROOPER_TOKEN
  },
  now=()=>Date.now()
}={}) {
  const configured=Boolean(typeof signingSecret==='string'&&signingSecret.length>=32&&
    Object.values(credentials).some(value=>typeof value==='string'&&value.length>=12));
  const sign=message=>createHmac('sha256',signingSecret).update(message).digest('base64url');
  const issue=(role,accessKey)=>{
    if(!configured||!Object.hasOwn(ROLE_PERMISSIONS,role)||!safeEqual(accessKey,credentials[role])||credentials[role].length<12)return null;
    const iat=Math.floor(now()/1000);
    const session={role,iat,exp:iat+SESSION_TTL_SECONDS,version:1,credentialTag:tag(credentials[role])};
    const data=Buffer.from(JSON.stringify(session)).toString('base64url');
    return data+'.'+sign(data);
  };
  const verify=(cookieHeader)=>{
    if(!configured||typeof cookieHeader!=='string')return null;
    const cookie=cookieHeader.match(COOKIE_PATTERN)?.[1];
    if(!cookie||cookie.length>1600||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(cookie))return null;
    const [data,signature]=cookie.split('.');
    if(!safeEqual(sign(data),signature))return null;
    try {
      const payload=JSON.parse(Buffer.from(data,'base64url').toString('utf8'));
      const current=Math.floor(now()/1000);
      if(payload?.version!==1||!Object.hasOwn(ROLE_PERMISSIONS,payload.role)||
         !Number.isInteger(payload.iat)||!Number.isInteger(payload.exp)||
         payload.iat>current+30||payload.exp<=current||
         payload.exp-payload.iat!==SESSION_TTL_SECONDS||
         !credentials[payload.role]||!safeEqual(payload.credentialTag,tag(credentials[payload.role])))return null;
      return {role:payload.role,permissions:rolePermissions(payload.role),expiresAt:new Date(payload.exp*1000).toISOString()};
    }catch{return null}
  };
  const cookieValue=(value,secure=false,clear=false)=>
    COMMAND_COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict'+(secure?'; Secure':'')+
    (clear?'; Max-Age=0':'; Max-Age='+SESSION_TTL_SECONDS);

  function handle({method='GET',body={},cookie='',secure=false}={}) {
    if(method==='GET') {
      const session=verify(cookie);
      return {status:200,body:{configured,authenticated:Boolean(session),session}};
    }
    if(method==='DELETE')return {status:200,body:{authenticated:false},setCookie:cookieValue('',secure,true)};
    if(method!=='POST')return {status:405,body:{error:'Method not allowed.'}};
    if(!configured)return {status:503,body:{error:'Command access is not configured by the server administrator.'}};
    const token=issue(body?.role,body?.accessKey);
    if(!token)return {status:401,body:{error:'Invalid Command role or access key.'}};
    return {
      status:200,
      body:{authenticated:true,session:verify(COMMAND_COOKIE+'='+token)},
      setCookie:cookieValue(token,secure)
    };
  }
  return {configured,issue,verify,handle};
}
