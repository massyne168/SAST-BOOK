// Readable official notices are shared from the server; no fake local-only success.
let records=[];
let failure=null;
export const currentResignationRecords=()=>records.slice();
export const resignationRecordsError=()=>failure;
const changed=()=>document.dispatchEvent(new CustomEvent('resignation-records-updated',{detail:{records:currentResignationRecords(),error:failure}}));
export function setResignationRecords(items) {
  if(!Array.isArray(items))return;
  records=items.slice();
  failure=null;
  changed();
}
export function insertResignationRecord(item) {
  if(!item?.reference)return;
  records=[item,...records.filter(entry=>entry.reference!==item.reference)];
  failure=null;
  changed();
}
export async function fetchResignationRecords() {
  try{
    const response=await fetch('/api/resignation-records',{cache:'no-store',headers:{Accept:'application/json'}});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!Array.isArray(result.notices))throw Error(result.error||'Resignation archive unavailable.');
    setResignationRecords(result.notices);
    return currentResignationRecords();
  }catch(error){
    failure=error.message;
    changed();
    throw error;
  }
}
