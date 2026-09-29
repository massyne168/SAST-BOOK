import {FlipEngine} from './flip-engine.js';
const ids=Array.from({length:30},(_,i)=>`page-${String(i+1).padStart(2,'0')}`);
const pages=ids.map((id,i)=>`<article class="page image-page" data-page-id="${id}"><img src="page-designs/${id}.webp" width="1191" height="1685" alt="ELYSIUM record — page ${i+1}" draggable="false"></article>`);
const previous=document.querySelector('#previous'),next=document.querySelector('#next');
const engine=new FlipEngine(document.querySelector('#book'),{spreadCount:15,render:i=>pages[i],onChange:s=>{document.querySelector('#position').textContent=`${String(s*2+1).padStart(2,'0')} — ${String(s*2+2).padStart(2,'0')}`;previous.disabled=s===0;next.disabled=s===14;document.querySelector('#book').setAttribute('aria-label',`Pages ${s*2+1} and ${s*2+2} of 30. Drag across the spine or use arrow keys.`);}});
previous.onclick=()=>engine.turn(-1);next.onclick=()=>engine.turn(1);
const readDialog=document.querySelector('#read-dialog');document.querySelector('#read-spread').onclick=()=>{document.querySelector('#read-content').innerHTML=pages[engine.spread*2]+pages[engine.spread*2+1];readDialog.showModal();};document.querySelector('#close-read').onclick=()=>readDialog.close();readDialog.addEventListener('click',e=>{if(e.target===readDialog)readDialog.close();});
const archiveMain=document.querySelector('main');
const cover=document.querySelector('#archive-cover');
let coverOpening=false;
document.querySelector('#open-archive').onclick=()=>{
 if(coverOpening)return;
 coverOpening=true;cover.classList.add('opening');
 const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
 setTimeout(()=>{archiveMain.classList.remove('archive-closed');cover.classList.remove('opening');coverOpening=false;document.querySelector('#book').focus({preventScroll:true});},delay);
};
document.querySelector('#close-archive').onclick=()=>{
 if(engine.drag||engine.animating)return;
 archiveMain.classList.add('archive-closed');
 document.querySelector('#open-archive').focus({preventScroll:true});
};
