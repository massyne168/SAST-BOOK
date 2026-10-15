import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const defaultFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'data','bulletins.json');
const MAX_BULLETINS=300;

// Local Node server: atomic file replacement and serialized writes.
export function createLocalBulletinStore({filename=defaultFile}={}) {
  let serial=Promise.resolve();
  const list=async()=>{
    try {
      const entries=JSON.parse(await readFile(filename,'utf8'));
      if(!Array.isArray(entries))throw Error('Invalid bulletin data file');
      return entries;
    }catch(error){if(error?.code==='ENOENT')return [];throw error}
  };
  return {
    list,
    add(entry) {
      const task=serial.then(async()=>{
        const current=await list();
        if(current.some(record=>record.reference===entry.reference))throw Error('Duplicate bulletin reference');
        const next=[entry,...current].slice(0,MAX_BULLETINS);
        await mkdir(path.dirname(filename),{recursive:true});
        const temp=filename+'.'+process.pid+'.tmp';
        await writeFile(temp,JSON.stringify(next,null,2)+'\n','utf8');
        await rename(temp,filename);
      });
      serial=task.catch(()=>{});
      return task;
    }
  };
}

// Production Vercel: Upstash REST-backed Redis list, shared between users and deployments.
// Configure KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN)
// as private server-side environment variables, NEVER in public JavaScript.
export function createRedisBulletinStore({
  url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,
  token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN,
  fetchImpl=fetch,
  key='sast:bulletins:v1'
}={}) {
  if(!url||!token)return null;
  const base=url.replace(/\/+$/,'');
  async function command(...parts){
    const response=await fetchImpl(base,{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(parts),
      cache:'no-store'
    });
    if(!response.ok)throw Error('Bulletin storage unavailable');
    const result=await response.json();
    if(result?.error)throw Error('Bulletin storage rejected request');
    return result?.result;
  }
  return {
    async list(){
      const result=await command('LRANGE',key,'0',String(MAX_BULLETINS-1));
      return (result||[]).map(value=>JSON.parse(value));
    },
    async add(entry) {
      // An LPUSH is atomic and persists independently of serverless deploys.
      await command('LPUSH',key,JSON.stringify(entry));
      await command('LTRIM',key,'0',String(MAX_BULLETINS-1));
    }
  };
}
