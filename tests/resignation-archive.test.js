import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {directoryRanks} from '../rank-directory-data.js';
import {createResignationHandler} from '../resignation-service.js';
import {createResignationRecordsHandler} from '../resignation-records-service.js';
import {createLocalResignationStore,createRedisResignationStore} from '../resignation-storage.js';
import {buildResignationPages,renderArchivedResignation} from '../resignation-pages.js';

const valid=()=>({fullName:'Trooper Example',badgeNumber:'0601',currentRank:directoryRanks[0],
  effectiveDate:'2026-11-01',reason:'Voluntary separation.',notes:'Complete the handover.',confirmation:true});
const memory=()=>{const rows=[];return {rows,async list(){return rows.slice()},async add(x){rows.unshift(x)}}};
const createHandler=store=>createResignationHandler({
  store,requireStorage:true,webhookUrl:null,now:()=>new Date('2026-10-16T11:45:00Z'),
  id:()=> 'b1bb0a10-0000-0000-0000-000000000000'
});

test('confirmed resignation creates permanent server record with reference, date and original user details',async()=>{
  const store=memory(),handler=createHandler(store);
  const result=await handler({body:valid(),ip:'person-a'});
  assert.equal(result.status,201);
  assert.match(result.body.reference,/^RN-2026-/);
  assert.equal(result.body.delivery,'book-only');
  assert.equal(result.body.record.fullName,'Trooper Example');
  assert.equal(result.body.record.badgeNumber,'0601');
  assert.equal(result.body.record.reason,'Voluntary separation.');
  assert.equal(result.body.record.status,'Submitted');
  assert.equal(result.body.record.submittedAt,'2026-10-16T11:45:00.000Z');
  assert.equal(store.rows.length,1);
  const listing=await createResignationRecordsHandler({store})({method:'GET'});
  assert.equal(listing.status,200);
  assert.equal(listing.body.notices[0].reference,result.body.reference);
});

test('identical notice submitted from another invocation is not copied to another book page',async()=>{
  const store=memory();
  assert.equal((await createHandler(store)({body:valid(),ip:'one'})).status,201);
  assert.equal((await createHandler(store)({body:valid(),ip:'two'})).status,409);
  assert.equal(store.rows.length,1);
});

test('archival is required in production and failure never falsely claims the book saved it',async()=>{
  const noStore=createHandler(null);
  assert.equal((await noStore({body:valid(),ip:'one'})).status,503);
  const broken={list:async()=>[],add:async()=>{throw Error('unavailable')}};
  const error=await createHandler(broken)({body:valid(),ip:'one'});
  assert.equal(error.status,503);
  assert.match(error.body.error,/could not be archived/i);
});

test('Discord webhook behavior is retained and failed Discord sends do not create official book pages',async()=>{
  const store=memory();
  const handler=createResignationHandler({store,requireStorage:true,webhookUrl:'https://example.invalid/webhook',
    fetchImpl:async()=>({ok:false,status:500}),now:()=>new Date('2026-10-16T11:45:00Z')});
  const result=await handler({body:valid(),ip:'example'});
  assert.equal(result.status,502);
  assert.equal(store.rows.length,0);
});

test('GET-only records archive never permits unauthorised publication',async()=>{
  const handler=createResignationRecordsHandler({store:memory()});
  assert.equal((await handler({method:'POST'})).status,405);
  assert.equal((await createResignationRecordsHandler({store:null})({method:'GET'})).status,503);
});

test('each saved record becomes exactly one safe official paper page and form remains at end',()=>{
  const base=Array.from({length:10},(_,i)=>['GUIDE','PAGE '+i,'TEXT','Description']);
  const render=(_item,index,_kind,formIndex,total)=>'MOCK '+index+'/'+total+' '+(index===formIndex?'FORM':index===formIndex+1?'PREVIEW':'GUIDANCE');
  const record={reference:'RN-2026-1',fullName:'Officer',badgeNumber:'0061',
    currentRank:'OFFICER 1',effectiveDate:'2026-11-01',submittedAt:'2026-10-16T11:45:00Z',
    reason:'Leaving',notes:''};
  assert.equal(buildResignationPages([],base,render).length,10);
  const one=buildResignationPages([record],base,render);
  assert.equal(one.length,12);
  assert.match(one[8],/RN-2026-1/);
  assert.match(one[9],/RESERVED RECORD/);
  assert.match(one[10],/FORM/);
  assert.match(one[11],/PREVIEW/);
  const three=buildResignationPages([record,{...record,reference:'RN-2'},{...record,reference:'RN-3'}],base,render);
  assert.equal(three.length,14);
  assert.match(three.at(-2),/FORM/);
  assert.match(three.at(-1),/PREVIEW/);
});

test('malicious or untrusted names, reasons and notes are escaped in paper markup',()=>{
  const page=renderArchivedResignation({...valid(),reference:'RN-<>',submittedAt:'2026-10-16T11:45:00Z',
    fullName:'<img src=x onerror=alert(1)>',reason:'<script>alert(1)</script>',notes:'<b>secret</b>'},8,12);
  assert.doesNotMatch(page,/<script>|<img src=x|<b>secret/);
  assert.match(page,/&lt;img/);
  assert.match(page,/&lt;script&gt;/);
  assert.match(page,/&lt;b&gt;secret/);
});

test('local resignation archive survives store reload and never rewrites bulletin data',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sast-resignations-'));
  try {
    const filename=path.join(dir,'resignations.json');
    const a=createLocalResignationStore({filename});
    await a.add({reference:'RN-OLD'});
    await createLocalResignationStore({filename}).add({reference:'RN-NEW'});
    assert.deepEqual((await a.list()).map(x=>x.reference),['RN-NEW','RN-OLD']);
  }finally{await rm(dir,{recursive:true,force:true})}
});

test('Vercel archive uses a separate Redis list key from Announcements and Orders',async()=>{
  const calls=[];
  const store=createRedisResignationStore({
    url:'https://redis.example.invalid',token:'server-secret',
    fetchImpl:async(_,options)=>{const cmd=JSON.parse(options.body);calls.push(cmd);return {ok:true,json:async()=>({result:cmd[0]==='LRANGE'?[]:1})}}
  });
  await store.add({reference:'RN-X'});
  assert.deepEqual(await store.list(),[]);
  assert.equal(calls[0][0],'LPUSH');
  assert.equal(calls[0][1],'sast:resignations:v1');
  assert.equal(calls[1][0],'LRANGE');
});

test('physical book integration preserves the form, preview and drag engine',()=>{
  const reader=readFileSync(new URL('../supplemental-readers.js',import.meta.url),'utf8');
  const form=readFileSync(new URL('../resignation-form.js',import.meta.url),'utf8');
  assert.match(reader,/buildResignationPages\(currentResignationRecords\(\),drafts\.resignation,buildPage\)/);
  assert.match(reader,/state\.documentPages\.length\/2/);
  assert.match(reader,/new FlipEngine\(book/);
  assert.match(reader,/resignation-record-created/);
  assert.match(reader,/fetchResignationRecords\(\)/);
  assert.match(form,/resignation-record-created/);
  assert.match(form,/fetch\('\/api\/resignation'/);
});
