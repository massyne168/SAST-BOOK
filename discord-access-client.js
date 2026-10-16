import {bookConfig} from './book-config.js';

const books=Object.freeze(Object.fromEntries(bookConfig.map(book=>[book.id,book.title])));
const link='/api/discord?action=start';
const header=document.querySelector('.masthead .header-utilities');
const button=document.createElement('button');
button.type='button';button.className='discord-auth-button';button.textContent='LOGIN WITH DISCORD';
button.title='Sign in to access role-restricted SAST books';
header?.prepend(button);
const dialog=document.createElement('dialog');
dialog.className='discord-book-gate';
dialog.setAttribute('aria-label','Discord authorization');
dialog.innerHTML='<header><span>ELYSIUM / SAST ACCESS CONTROL</span><button type="button" data-gate-close aria-label="Close authorization">×</button></header>'+
  '<h2>DISCORD AUTHORIZATION</h2><p data-gate-message>Checking your Discord roles...</p>'+
  '<div class="discord-gate-actions"><a href="'+link+'" data-discord-connect>LOGIN WITH DISCORD →</a><button type="button" data-gate-close>BACK TO BOOKS</button></div>';
document.body.append(dialog);
const message=dialog.querySelector('[data-gate-message]');
const signin=dialog.querySelector('[data-discord-connect]');
const show=(msg,allowLogin)=>{
  message.textContent=msg;
  signin.hidden=!allowLogin;
  if(!dialog.open)dialog.showModal();
};
dialog.addEventListener('click',event=>{
  if(event.target===dialog||event.target.closest('[data-gate-close]'))dialog.close();
});
let account=null;
async function requestRole(book) {
  const query=book?'?action=access&book='+encodeURIComponent(book):'?action=session';
  let response,body;
  try {
    response=await fetch('/api/discord'+query,{credentials:'same-origin',cache:'no-store'});
    body=await response.json();
  }catch{
    return {status:503,body:{message:'Cannot reach the Discord authorization service.'}};
  }
  if(body?.authenticated)account=body.user;
  else account=null;
  button.textContent=account?'DISCORD / '+String(account.username||'CONNECTED').slice(0,18):'LOGIN WITH DISCORD';
  button.title=account?'Discord connected · open to manage session':'Connect Discord to enter restricted books';
  return {status:response.status,body};
}
export async function ensureBookAccess(book,{interactive=true}={}) {
  if(!Object.hasOwn(books,book))return false;
  const {status,body}=await requestRole(book);
  if(status===200&&body?.allowed)return true;
  if(interactive){
    const reason=body?.message||'The server denied access.';
    show(books[book]+' — '+reason,status===401);
  }
  return false;
}
button.addEventListener('click',async()=>{
  const {status,body}=await requestRole();
  if(status===200&&body?.authenticated) {
    show('Connected as '+String(body.user?.username||'Discord member')+
      '. Your guild roles determine which of the five books you can open.',false);
    const actions=dialog.querySelector('.discord-gate-actions');
    let logout=actions.querySelector('[data-discord-logout]');
    if(!logout){
      logout=document.createElement('a');
      logout.href='/api/discord?action=logout';
      logout.textContent='DISCONNECT';
      logout.setAttribute('data-discord-logout','');
      actions.prepend(logout);
    }
    logout.hidden=false;
  } else {
    dialog.querySelector('[data-discord-logout]')?.setAttribute('hidden','');
    show(body?.message||'Connect Discord to view authorized books.',status!==503);
  }
});
const query=new URLSearchParams(window.location.search);
if(query.has('discord')) {
  const status=query.get('discord');
  if(status==='connected')void requestRole().then(({body})=>{
    show(body?.authenticated?'DISCORD CONNECTED. Select a book to check your assigned roles.':'Discord login could not be verified.',false);
  });
  if(status==='not-in-server')show('You must be a member of the ELYSIUM Discord server before you can access these books.',true);
  if(status==='authorization-failed')show('Discord authorization was not completed. Try connecting again.',true);
  window.history.replaceState(null,'',window.location.pathname);
}
void requestRole();
