import {randomUUID,timingSafeEqual} from 'node:crypto';
import {roleCan} from './command-auth.js';

const clean = value => typeof value === 'string' ? value.trim() : '';
export const BULLETIN_LIMITS=Object.freeze({title:120,issuedBy:100,message:4000});
const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
};
export function validateBulletin(value) {
  const item={
    title:clean(value?.title),type:clean(value?.type),issuedBy:clean(value?.issuedBy),
    priority:clean(value?.priority),message:clean(value?.message),expiryDate:clean(value?.expiryDate),
    pinned:value?.pinned===true,confirmation:value?.confirmation===true
  };
  const errors={};
  if(!item.title||item.title.length>BULLETIN_LIMITS.title)errors.title='Enter a title of up to 120 characters.';
  if(!['Announcement','Order'].includes(item.type))errors.type='Choose Announcement or Order.';
  if(!item.issuedBy||item.issuedBy.length>BULLETIN_LIMITS.issuedBy)errors.issuedBy='Enter the issuing High Command officer (up to 100 characters).';
  if(!['Normal','Important','Urgent'].includes(item.priority))errors.priority='Select a valid priority.';
  if(!item.message||item.message.length>BULLETIN_LIMITS.message)errors.message='Enter the full notice (up to 4,000 characters).';
  if(item.expiryDate&&!validDate(item.expiryDate))errors.expiryDate='Enter a valid expiry date or leave it empty.';
  if(!item.confirmation)errors.confirmation='Confirm that High Command approved publication.';
  return {valid:Object.keys(errors).length===0,errors,item};
}
export const sortedBulletins=records=>records.slice().sort((a,b)=>
  Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) ||
  String(b.publishedAt||b.publishedDate).localeCompare(String(a.publishedAt||a.publishedDate)) ||
  String(b.reference).localeCompare(String(a.reference))
);
const authorized=(incoming,secret)=>{
  if(!secret||typeof incoming!=='string'||!incoming.startsWith('Bearer '))return false;
  const supplied=Buffer.from(incoming.slice(7),'utf8'),expected=Buffer.from(secret,'utf8');
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
};
// Storage is injected, so access, validation and persistence can be tested independently.
export function createBulletinHandler({
  store,
  token=process.env.HIGH_COMMAND_TOKEN||process.env.ADMIN_TOKEN,
  now=()=>new Date(),
  id=()=>randomUUID()
}={}) {
  return async({method,authorization='',role=null,body={}})=>{
    if(method==='GET') {
      if(!store)return {status:200,body:{bulletins:[],publishingConfigured:false}};
      try {
        const bulletins=sortedBulletins(await store.list());
        return {status:200,body:{bulletins,publishingConfigured:Boolean(token)}};
      }catch{return {status:503,body:{error:'Bulletin records are temporarily unavailable.'}}}
    }
    if(method!=='POST')return {status:405,body:{error:'Method not allowed.'}};
    if(!token&&!roleCan(role,'bulletins:publish'))return {status:503,body:{error:'High Command authorization is not configured on the server.'}};
    if(!roleCan(role,'bulletins:publish')&&!authorized(authorization,token))return {status:401,body:{error:'High Command authorization required.'}};
    if(!store)return {status:503,body:{error:'Persistent bulletin storage is not configured. An administrator must connect the server-side Upstash Redis integration.'}};
    const validated=validateBulletin(body);
    if(!validated.valid)return {status:400,body:{error:'Please correct the required fields.',fields:validated.errors}};
    const publishedAt=now().toISOString();
    const entry={
      ...validated.item,confirmation:undefined,
      reference:'AO-'+publishedAt.slice(0,4)+'-'+id().replace(/-/g,'').slice(0,12).toUpperCase(),
      publishedDate:publishedAt.slice(0,10),
      publishedAt
    };
    delete entry.confirmation;
    try {
      await store.add(entry);
      return {status:201,body:{bulletin:entry}};
    }catch{
      return {status:503,body:{error:'Could not save the bulletin. Nothing was published; please try again.'}};
    }
  };
}
