// Browser-side view of the server session. Authentication is held only in
// an HttpOnly cookie, never localStorage, URL parameters or exported passwords.
let state={configured:false,authenticated:false,session:null};
let loading=null;
const changed=()=>document.dispatchEvent(new CustomEvent('sast-command-session',{detail:state}));
export const commandSession=()=>({...state,session:state.session?{...state.session}:null});
export const commandCan=permission=>Boolean(state.authenticated&&state.session?.permissions?.includes(permission));
const decode=async response=>{
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'Command service unavailable.');
  return body;
};
export async function refreshCommandSession(){
  if(loading)return loading;
  loading=(async()=>{
    try{
      const result=await decode(await fetch('/api/command-session',{cache:'no-store',credentials:'same-origin'}));
      state={configured:Boolean(result.configured),authenticated:Boolean(result.authenticated),session:result.session||null};
    }catch{
      state={configured:false,authenticated:false,session:null};
    }finally {loading=null;changed()}
    return commandSession();
  })();
  return loading;
}
export async function loginCommand(role,accessKey){
  const result=await decode(await fetch('/api/command-session',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-SAST-Request':'command-ui'},
    credentials:'same-origin',cache:'no-store',
    body:JSON.stringify({role,accessKey})
  }));
  state={configured:true,authenticated:result.authenticated,session:result.session};
  changed();return commandSession();
}
export async function logoutCommand(){
  await decode(await fetch('/api/command-session',{
    method:'DELETE',headers:{'X-SAST-Request':'command-ui'},
    credentials:'same-origin',cache:'no-store'
  }));
  state={configured:true,authenticated:false,session:null};
  changed();return commandSession();
}
void refreshCommandSession();
