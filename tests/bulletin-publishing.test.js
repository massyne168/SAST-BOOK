import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createBulletinHandler,validateBulletin} from '../bulletin-service.js';
import {createLocalBulletinStore,createRedisBulletinStore} from '../bulletin-storage.js';
import {buildBulletinPages} from '../bulletin-pages.js';
import {validateBulletinDraft} from '../bulletin-editor.js';

const draft=()=>({
  title:'High Command Briefing',type:'Announcement',issuedBy:'Leon Ramirez',
  priority:'Important',message:'Department meeting tomorrow.\nAll active officers must attend.',
  expiryDate:'',pinned:true,confirmation:true
});
const createMemoryStore=()=>{
  const rows=[];
  return {rows,async list(){return rows.slice()},async add(row){rows.unshift(row)}};
};

test('valid High Command data is required, with matching client/server limits',()=>{
  assert.equal(validateBulletin(draft()).valid,true);
  assert.deepEqual(validateBulletinDraft({...draft(),secret:'example'}),{});
  const invalid={...draft(),title:'',type:'Fake',priority:'Extreme',message:'',expiryDate:'2026-02-30',confirmation:false};
  const errors=validateBulletin(invalid).errors;
  for (const field of ['title','type','priority','message','expiryDate','confirmation']) assert.ok(errors[field]);
  assert.ok(validateBulletinDraft({...invalid,secret:''}).secret);
  assert.ok(validateBulletin({...draft(),message:'x'.repeat(4001)}).errors.message);
  assert.ok(validateBulletin({...draft(),issuedBy:'x'.repeat(101)}).errors.issuedBy);
});

test('the public can read published notices, but only server-authenticated High Command can publish',async()=>{
  const store=createMemoryStore();
  const handler=createBulletinHandler({store,token:'strong-private-key',id:()=> 'fe343281b5ab4d4bac01',now:()=>new Date('2026-10-15T19:00:00Z')});
  assert.equal((await handler({method:'GET'})).status,200);
  assert.equal((await handler({method:'POST',body:draft()})).status,401);
  assert.equal((await handler({method:'POST',authorization:'Bearer invalid',body:draft()})).status,401);
  const result=await handler({method:'POST',authorization:'Bearer strong-private-key',body:draft()});
  assert.equal(result.status,201);
  assert.match(result.body.bulletin.reference,/^AO-2026-/);
  assert.equal(result.body.bulletin.publishedDate,'2026-10-15');
  assert.equal(result.body.bulletin.pinned,true);
  assert.equal(result.body.bulletin.confirmation,undefined);
  assert.equal(result.body.bulletin.secret,undefined);
  assert.equal(store.rows.length,1);
  const visible=await handler({method:'GET'});
  assert.equal(visible.body.bulletins[0].title,draft().title);
  assert.equal(visible.body.bulletins[0].message,draft().message);
  assert.equal(visible.body.publishingConfigured,true);
});

test('failed or unconfigured saves never report a published notice',async()=>{
  const noToken=createBulletinHandler({store:createMemoryStore(),token:''});
  assert.equal((await noToken({method:'POST',body:draft()})).status,503);
  const noStorage=createBulletinHandler({token:'right'});
  assert.equal((await noStorage({method:'POST',authorization:'Bearer right',body:draft()})).status,503);
  const failing=createBulletinHandler({store:{list:async()=>[],add:async()=>{throw Error('broken')}},token:'right'});
  assert.equal((await failing({method:'POST',authorization:'Bearer right',body:draft()})).status,503);
  assert.equal((await failing({method:'PUT',authorization:'Bearer right',body:draft()})).status,405);
  const unauthorized=createBulletinHandler({store:createMemoryStore(),token:'right'});
  assert.equal((await unauthorized({method:'POST',authorization:'Bearer right',body:{...draft(),message:'',confirmation:false}})).status,400);
});

test('each publication gets its own safely escaped book page; the book expands automatically',()=>{
  const empty=buildBulletinPages([]);
  assert.equal(empty.length,10);
  assert.match(empty[8],/data-bulletin-editor-slot/);
  assert.match(empty[9],/data-bulletin-preview/);
  const seven=Array.from({length:7},(_,i)=>({
    ...draft(),title:'Order '+i,reference:'AO-2026-'+i,publishedDate:'2026-10-15',publishedAt:'2026-10-15T19:00:00Z'
  }));
  const pages=buildBulletinPages(seven);
  assert.equal(pages.length,12);
  assert.equal(pages.filter(markup=>markup.includes('bulletin-official-sheet__stamp')).length,7);
  assert.match(pages[10],/data-bulletin-editor-slot/);
  assert.match(pages[11],/data-bulletin-preview/);
  const injection=buildBulletinPages([{...seven[0],title:'<script>alert(1)</script>',message:'<img src=x onerror=alert(1)>'}]);
  assert.doesNotMatch(injection[2],/<script>|<img src=x/);
  assert.match(injection[2],/&lt;script&gt;/);
  assert.match(injection[2],/&lt;img/);
});

test('local records persist after the store is reconstructed; old notices are preserved',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sast-bulletins-'));
  try {
    const file=path.join(dir,'bulletins.json');
    const first=createLocalBulletinStore({filename:file});
    await first.add({reference:'AO-1',title:'First'});
    const reopened=createLocalBulletinStore({filename:file});
    await reopened.add({reference:'AO-2',title:'Second'});
    assert.deepEqual((await reopened.list()).map(x=>x.reference),['AO-2','AO-1']);
    assert.equal(JSON.parse(await readFile(file,'utf8')).length,2);
  } finally {await rm(dir,{recursive:true,force:true})}
});

test('Vercel storage uses atomic Redis append with a server-only secret, never wiping past records',async()=>{
  const calls=[];
  const store=createRedisBulletinStore({url:'https://kv.example',token:'private',fetchImpl:async(_,options)=>{
    calls.push(options);
    const cmd=JSON.parse(options.body);
    return {ok:true,json:async()=>({result:cmd[0]==='LRANGE'?['{"reference":"AO-OLD"}']:1})};
  }});
  assert.deepEqual(await store.list(),[{reference:'AO-OLD'}]);
  await store.add({reference:'AO-NEW'});
  assert.deepEqual(calls.map(x=>JSON.parse(x.body)[0]),['LRANGE','LPUSH']);
  assert.ok(calls.every(x=>x.headers.Authorization==='Bearer private'));
  assert.equal(createRedisBulletinStore({url:'',token:''}),null);
});
