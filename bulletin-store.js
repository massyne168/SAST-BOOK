import {bulletins as bundledBulletins} from './bulletins-data.js';

let records=[...bundledBulletins],config={publishingConfigured:false};
const changed=()=>document.dispatchEvent(new CustomEvent('bulletins-updated',{detail:{bulletins:records,config}}));
export const currentBulletins=()=>records.slice();
export const bulletinConfig=()=>({...config});
export function updateBulletins(recordsFromServer,options={}){
  if(!Array.isArray(recordsFromServer))return;
  records=recordsFromServer.slice();
  config={...config,...options};
  changed();
}
export async function fetchBulletins(){
  const response=await fetch('/api/bulletins',{headers:{Accept:'application/json'},cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'Could not load published bulletins.');
  updateBulletins(result.bulletins,result);
  return currentBulletins();
}
