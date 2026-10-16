import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommandAuth,roleCan,rolePermissions,COMMAND_COOKIE} from '../command-auth.js';
import {createCommandOverviewHandler} from '../command-overview-service.js';
import {createBulletinHandler} from '../bulletin-service.js';

const credentials={
  administrator:'administration-secret-2026',
  high_command:'high-command-secret-2026',
  armory_officer:'armory-key-secret-2026',
  trooper:'trooper-key-secret-2026'
};
const secret='signing-secret-that-is-distinct-from-all-role-passwords-and-long';
const fixed=Date.parse('2026-10-16T10:00:00Z');
const authFor=(overrides={})=>createCommandAuth({signingSecret:secret,credentials,now:()=>fixed,...overrides});
const cookie=token=>COMMAND_COOKIE+'='+token;

test('role permission matrix never grants Troopers and Armory Officers High Command publishing',()=>{
  assert.equal(roleCan('administrator','bulletins:publish'),true);
  assert.equal(roleCan('high_command','bulletins:publish'),true);
  assert.equal(roleCan('armory_officer','bulletins:publish'),false);
  assert.equal(roleCan('trooper','bulletins:publish'),false);
  assert.equal(roleCan('unknown','dashboard:read'),false);
  assert.ok(rolePermissions('armory_officer').includes('armory:manage'));
});

test('no signing secret or too-short role access keys fail closed',()=>{
  const missing=createCommandAuth({signingSecret:'',credentials,now:()=>fixed});
  assert.equal(missing.configured,false);
  assert.equal(missing.handle({method:'POST',body:{role:'high_command',accessKey:credentials.high_command}}).status,503);
  const short=createCommandAuth({signingSecret:secret,credentials:{high_command:'123'},now:()=>fixed});
  assert.equal(short.configured,false);
});

test('role login issues a signed, HttpOnly, 8-hour, SameSite Strict cookie',()=>{
  const auth=authFor();
  assert.equal(auth.handle({method:'POST',body:{role:'trooper',accessKey:'wrong'}}).status,401);
  assert.equal(auth.handle({method:'POST',body:{role:'__proto__',accessKey:'wrong'}}).status,401);
  const login=auth.handle({method:'POST',body:{role:'high_command',accessKey:credentials.high_command},secure:true});
  assert.equal(login.status,200);
  assert.equal(login.body.session.role,'high_command');
  assert.ok(login.body.session.permissions.includes('bulletins:publish'));
  assert.match(login.setCookie,/HttpOnly/);
  assert.match(login.setCookie,/SameSite=Strict/);
  assert.match(login.setCookie,/Secure/);
  assert.match(login.setCookie,/Max-Age=28800/);
  assert.doesNotMatch(login.setCookie,/high-command-secret-2026/);
  assert.equal(auth.verify(login.setCookie).role,'high_command');
});

test('tampered, expired, and rotated sessions cannot access Command',()=>{
  const auth=authFor();
  const token=auth.issue('administrator',credentials.administrator);
  assert.ok(token);
  const [payload,signature]=token.split('.');
  assert.equal(auth.verify(cookie(payload+'.'+signature.slice(0,-1)+(signature.endsWith('a')?'b':'a'))),null);
  const expired=authFor({now:()=>fixed+9*60*60*1000});
  assert.equal(expired.verify(cookie(token)),null);
  const changedKey=authFor({credentials:{...credentials,administrator:'new-administrator-key-secret'}});
  assert.equal(changedKey.verify(cookie(token)),null);
  const changedSigning=authFor({signingSecret:secret+'-rotated'});
  assert.equal(changedSigning.verify(cookie(token)),null);
  assert.equal(auth.verify(cookie(token)).role,'administrator');
});

test('logout invalidates client cookie and server login rejects unsupported methods',()=>{
  const auth=authFor();
  const logout=auth.handle({method:'DELETE',cookie:cookie(auth.issue('trooper',credentials.trooper)),secure:true});
  assert.equal(logout.status,200);
  assert.match(logout.setCookie,/Max-Age=0/);
  assert.equal(auth.handle({method:'PATCH'}).status,405);
});

test('dashboard requires a signed role and returns real record counts, without exposing access keys',async()=>{
  const auth=authFor(),store={list:async()=>[
    {title:'Alpha',reference:'AO-1',priority:'Urgent',pinned:true,publishedAt:'2026-10-16T09:00:00Z',publishedDate:'2026-10-16',type:'Order'},
    {title:'Beta',reference:'AO-2',priority:'Normal',pinned:false,publishedAt:'2026-10-15T09:00:00Z',publishedDate:'2026-10-15',type:'Announcement'}
  ]};
  const handler=createCommandOverviewHandler({auth,store,people:[
    {name:'Officer A',rankId:'LIEUTENANT'},{name:'Officer B',rankId:'LIEUTENANT'}
  ],inventory:[{status:'ISSUED'},{status:'AVAILABLE'}]});
  assert.equal((await handler({method:'GET',cookie:''})).status,401);
  const allowed=await handler({method:'GET',cookie:cookie(auth.issue('trooper',credentials.trooper))});
  assert.equal(allowed.status,200);
  assert.equal(allowed.body.overview.totalPersonnel,2);
  assert.equal(allowed.body.overview.totalWeapons,2);
  assert.equal(allowed.body.overview.ranks[0].count,2);
  assert.equal(allowed.body.overview.bulletins.total,2);
  assert.equal(allowed.body.overview.bulletins.urgent,1);
  assert.equal(allowed.body.overview.bulletins.pinned,1);
  assert.doesNotMatch(JSON.stringify(allowed.body),/high-command-secret|signing-secret/);
});

test('Command dashboard reports missing Redis as unconnected, not falsely zero bulletins',async()=>{
  const auth=authFor();
  const handler=createCommandOverviewHandler({auth,store:null,people:[],inventory:[]});
  const response=await handler({cookie:cookie(auth.issue('high_command',credentials.high_command))});
  assert.equal(response.status,200);
  assert.equal(response.body.overview.bulletins.storageConnected,false);
  assert.equal(response.body.overview.bulletins.total,null);
});

test('authenticated High Command publishes, but Armory Officers and Troopers cannot',async()=>{
  const entries=[];
  const publisher=createBulletinHandler({
    store:{list:async()=>entries,add:async entry=>entries.push(entry)},
    token:credentials.high_command,
    now:()=>new Date(fixed),id:()=>'abcd-abcd-abcd-abcd'
  });
  const doc={title:'Department Notice',type:'Order',issuedBy:'High Command',priority:'Important',message:'Stand by.',expiryDate:'',confirmation:true};
  assert.equal((await publisher({method:'POST',role:'trooper',body:doc})).status,401);
  assert.equal((await publisher({method:'POST',role:'armory_officer',body:doc})).status,401);
  assert.equal(entries.length,0);
  assert.equal((await publisher({method:'POST',role:'high_command',body:doc})).status,201);
  assert.equal((await publisher({method:'POST',role:'administrator',body:doc})).status,201);
  assert.equal(entries.length,2);
});
