const order=(a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||''))||String(b.reference||'').localeCompare(String(a.reference||''));
export function createResignationRecordsHandler({store}={}) {
  return async({method='GET'}={})=>{
    if(method!=='GET')return {status:405,body:{error:'Method not allowed.'}};
    if(!store)return {status:503,body:{error:'Resignation archive storage has not been configured.'}};
    try{
      const notices=await store.list();
      if(!Array.isArray(notices))throw Error('Invalid resignation record storage');
      return {status:200,body:{notices:notices.slice().sort(order)}};
    }catch{
      return {status:503,body:{error:'Could not load saved resignation notices. Please retry.'}};
    }
  };
}
