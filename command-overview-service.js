import {rankDirectoryData} from './rank-directory-data.js';
import {weapons} from './armory-data.js';
import {roleCan} from './command-auth.js';

export function createCommandOverviewHandler({
  auth,
  store,
  people=rankDirectoryData,
  inventory=weapons
}={}) {
  return async({method='GET',cookie=''}={})=>{
    if(method!=='GET')return {status:405,body:{error:'Method not allowed.'}};
    const session=auth?.verify(cookie);
    if(!session||!roleCan(session.role,'dashboard:read'))
      return {status:401,body:{error:'Command sign-in required.'}};
    const ranks=Object.entries(people.reduce((counts,person)=>{
      const key=String(person.rankId||'UNASSIGNED');
      counts[key]=(counts[key]||0)+1;return counts;
    },{})).map(([rank,count])=>({rank,count})).sort((a,b)=>b.count-a.count||a.rank.localeCompare(b.rank));
    const equipment=Object.entries(inventory.reduce((counts,weapon)=>{
      const key=String(weapon.status||'UNKNOWN');
      counts[key]=(counts[key]||0)+1;return counts;
    },{})).map(([status,count])=>({status,count})).sort((a,b)=>b.count-a.count||a.status.localeCompare(b.status));
    let bulletinMetrics={total:null,urgent:null,pinned:null,recent:[],storageConnected:Boolean(store),error:null};
    if(store)try{
      const items=await store.list();
      bulletinMetrics={
        total:items.length,
        urgent:items.filter(item=>item.priority==='Urgent').length,
        pinned:items.filter(item=>item.pinned).length,
        recent:items.slice().sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))).slice(0,5)
          .map(({title,type,reference,publishedDate,priority})=>({title,type,reference,publishedDate,priority})),
        storageConnected:true,error:null
      };
    }catch{
      bulletinMetrics={...bulletinMetrics,storageConnected:false,error:'Bulletin storage is temporarily unavailable.'};
    }
    return {status:200,body:{
      session,
      overview:{totalPersonnel:people.length,totalWeapons:inventory.length,ranks,equipment,
        bulletins:bulletinMetrics,asOf:new Date().toISOString()}
    }};
  };
}
