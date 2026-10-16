import {rankDirectoryData} from './rank-directory-data.js';
import {navigateBook} from './app.js';
import {commandSession,commandCan,refreshCommandSession,loginCommand,logoutCommand} from './command-session-client.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const entry=document.createElement('button');
entry.type='button';entry.className='command-center-entry';entry.textContent='COMMAND CENTER';
entry.setAttribute('aria-label','Open Command Center');entry.title='High Command / Secure Command Center';
document.querySelector('.masthead .header-utilities').prepend(entry);
const dialog=document.createElement('dialog');
dialog.className='command-center command-center--secured';
dialog.setAttribute('aria-labelledby','command-center-title');
dialog.innerHTML=[
  '<header><div><span>SAST / SECURE COMMAND SYSTEM</span><h2 id="command-center-title">COMMAND CENTER</h2></div><button type="button" data-close>CLOSE ×</button></header>',
  '<section class="command-access" data-command-access>',
    '<div class="command-access-identity"><span class="command-access-kicker">RESTRICTED / AUTHORIZATION REQUIRED</span><h3>COMMAND AUTHENTICATION</h3><p>Sign in using your department access level. Publishing and administrative actions are checked on the server.</p></div>',
    '<form id="command-login-form" autocomplete="off">',
      '<label>ACCESS LEVEL<select name="role" required><option value="high_command">HIGH COMMAND</option><option value="administrator">ADMINISTRATOR</option><option value="armory_officer">ARMORY OFFICER</option><option value="trooper">TROOPER</option></select></label>',
      '<label>PRIVATE ACCESS KEY<input name="accessKey" type="password" minlength="12" required autocomplete="off" spellcheck="false" placeholder="Department access key"></label>',
      '<button type="submit" data-command-login>AUTHORIZE ACCESS →</button>',
    '</form><p role="status" aria-live="polite" data-command-login-status>Checking command server...</p>',
  '</section>',
  '<section class="command-workspace" data-command-workspace hidden>',
    '<div class="command-workspace-bar"><span class="command-identity" data-command-identity></span><button type="button" data-command-refresh>REFRESH DATA</button><button type="button" data-command-logout>SIGN OUT</button></div>',
    '<p data-command-overview-status role="status" aria-live="polite"></p>',
    '<div class="command-kpi-grid" data-command-kpis></div>',
    '<div class="command-dash-columns"><section class="command-dash-module"><h3>RANK STRUCTURE</h3><div data-command-ranks></div></section><section class="command-dash-module"><h3>ARMORY STATUS</h3><div data-command-gear></div></section></div>',
    '<section class="command-dash-module"><div class="command-dash-module-head"><h3>ANNOUNCEMENTS & ORDERS</h3><span data-command-storage></span></div><div data-command-bulletins></div></section>',
    '<div class="command-shortcuts"><button type="button" data-open-directory>RANK DIRECTORY</button><button type="button" data-open-archive>ARMORY</button><button type="button" data-open-bulletins>ANNOUNCEMENTS</button><button type="button" data-open-resignation>RESIGNATION NOTICE</button></div>',
    '<label class="command-search-label">PERSONNEL SEARCH<input id="command-personnel-query" type="search" autocomplete="off" placeholder="Name or badge number"></label>',
    '<p id="command-search-status" role="status">Enter a name or badge number to search personnel.</p>',
    '<ul id="command-personnel-results"></ul>',
  '</section>'
].join('');
document.body.append(dialog);
const loginForm=dialog.querySelector('#command-login-form');
const loginStatus=dialog.querySelector('[data-command-login-status]');
const access=dialog.querySelector('[data-command-access]');
const workspace=dialog.querySelector('[data-command-workspace]');
const dashboardStatus=dialog.querySelector('[data-command-overview-status]');
const input=dialog.querySelector('#command-personnel-query');
const list=dialog.querySelector('#command-personnel-results');
const searchStatus=dialog.querySelector('#command-search-status');

function search(){
  const query=input.value.trim().toLowerCase();
  if(!query){list.replaceChildren();searchStatus.textContent='Enter a name or badge number to search personnel.';return}
  const matches=rankDirectoryData.filter(person=>person.name.toLowerCase().includes(query)||String(person.badge).toLowerCase().includes(query));
  searchStatus.textContent=matches.length?matches.length+' personnel record(s) found.':'No personnel records match that search.';
  list.innerHTML=matches.map(person=>'<li><button type="button" data-officer="'+escape(person.id)+'"><strong>'+escape(person.name)+'</strong><span>BADGE '+escape(person.badge)+' · '+escape(person.rankId)+'</span></button></li>').join('');
}
function metric(label,value){
  return '<section class="command-kpi"><span>'+escape(label)+'</span><strong>'+escape(value==null?'—':value)+'</strong></section>';
}
function rows(items,key,value) {
  if(!items?.length)return '<p>No verified records to display.</p>';
  return items.map(item=>'<div class="command-data-row"><span>'+escape(item[key])+'</span><strong>'+escape(item[value])+'</strong></div>').join('');
}
function renderOverview(data){
  const o=data.overview,b=o.bulletins;
  dialog.querySelector('[data-command-kpis]').innerHTML=
    metric('PERSONNEL',o.totalPersonnel)+metric('REGISTERED WEAPONS',o.totalWeapons)+
    metric('PUBLISHED NOTICES',b.total)+metric('URGENT ORDERS',b.urgent);
  dialog.querySelector('[data-command-ranks]').innerHTML=rows(o.ranks,'rank','count');
  dialog.querySelector('[data-command-gear]').innerHTML=rows(o.equipment,'status','count');
  dialog.querySelector('[data-command-storage]').textContent=b.storageConnected?'ARCHIVE CONNECTED':'STORAGE NOT CONNECTED';
  dialog.querySelector('[data-command-bulletins]').innerHTML=b.recent?.length
    ?b.recent.map(item=>'<div class="command-data-row"><span>'+escape(item.title)+'<small>'+escape(item.reference)+' · '+escape(item.publishedDate)+'</small></span><strong>'+escape(item.priority)+'</strong></div>').join('')
    :'<p>'+(b.error?escape(b.error):b.storageConnected?'No official bulletins published yet.':'Persistent bulletin storage must be configured in Vercel.')+'</p>';
  dashboardStatus.textContent='SERVER VERIFIED · UPDATED '+new Date(o.asOf).toLocaleString();
}
async function loadOverview(){
  if(!commandCan('dashboard:read'))return;
  dashboardStatus.textContent='Loading verified Command data...';
  try{
    const response=await fetch('/api/command-overview',{credentials:'same-origin',cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Unable to retrieve Command data.');
    renderOverview(result);
  }catch(error){dashboardStatus.textContent=error.message;}
}
function renderSession(){
  const current=commandSession();
  access.hidden=current.authenticated;
  workspace.hidden=!current.authenticated;
  if(!current.authenticated) {
    loginStatus.textContent=current.configured?'Enter the department access key to unlock the Command Center.':
      'Command authentication is not configured. An administrator must set COMMAND_SESSION_SECRET and the department access keys on the server.';
    return;
  }
  const role=current.session.role.replaceAll('_',' ').toUpperCase();
  dialog.querySelector('[data-command-identity]').textContent='AUTHORIZED / '+role;
  dialog.querySelector('[data-open-bulletins]').title=commandCan('bulletins:publish')?'Authorized to publish announcements':'Read-only: bulletin publication restricted to High Command';
  void loadOverview();
}
loginForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=loginForm.querySelector('button[type=submit]'),key=loginForm.elements.accessKey.value;
  button.disabled=true;loginStatus.textContent='Verifying Command authorization...';
  try{await loginCommand(loginForm.elements.role.value,key);loginStatus.textContent='Access granted.';}
  catch(error){loginStatus.textContent=error.message;}
  finally{loginForm.elements.accessKey.value='';button.disabled=false;}
});
dialog.addEventListener('click',event=>{
  if(event.target===dialog||event.target.closest('[data-close]')){dialog.close();return}
  if(event.target.closest('[data-command-logout]')){
    void logoutCommand().then(()=>{dialog.querySelector('[data-command-kpis]').replaceChildren();}).catch(e=>dashboardStatus.textContent=e.message);
    return;
  }
  if(event.target.closest('[data-command-refresh]')){void loadOverview();return}
  const officer=event.target.closest('[data-officer]');
  if(officer){dialog.close();void navigateBook('directory',officer.dataset.officer);return}
  const destinations={'[data-open-directory]':'directory','[data-open-archive]':'archive',
    '[data-open-bulletins]':'bulletins','[data-open-resignation]':'resignation'};
  for(const [selector,kind] of Object.entries(destinations))
    if(event.target.closest(selector)){dialog.close();void navigateBook(kind);return}
});
input.addEventListener('input',search);
document.addEventListener('sast-command-session',()=>{if(dialog.open)renderSession()});
entry.addEventListener('click',async()=>{
  dialog.showModal();
  input.value='';search();
  await refreshCommandSession();
  renderSession();
  if(!commandSession().authenticated)loginForm.elements.accessKey.focus({preventScroll:true});
});
