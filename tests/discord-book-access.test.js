import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscordBookAccess,DISCORD_BOOK_IDS} from '../discord-book-access.js';

const GUILD='234567890123456789',CLIENT='123456789012345678';
const role={
  trooper:'111111111111111111',hc:'222222222222222222',
  armory:'333333333333333333',personnel:'444444444444444444',intelligence:'555555555555555555'
};
const env={
  DISCORD_CLIENT_ID:CLIENT,
  DISCORD_CLIENT_SECRET:'example-client-secret-not-public',
  DISCORD_GUILD_ID:GUILD,
  DISCORD_REDIRECT_URI:'https://sast.example/api/discord',
  DISCORD_SESSION_SECRET:'a-very-long-random-server-side-secret-which-is-at-least-32-chars',
  DISCORD_BOOK_ROLES_JSON:JSON.stringify({
    archive:[role.armory,role.hc],directory:[role.trooper,role.hc],
    classified:[role.intelligence,role.hc],resignation:[role.personnel,role.hc],
    bulletins:[role.hc]
  })
};
const findCookie=(cookies,name)=>cookies.find(item=>item.startsWith(name+'='))?.split(';')[0]||'';
function harness(initial=[role.trooper],opts={}) {
  let currentRoles=initial;
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    calls.push({url,options});
    if(url==='https://discord.com/api/oauth2/token')return {ok:true,json:async()=>({access_token:'private-oauth-token',expires_in:7200})};
    if(url.endsWith('/users/@me'))return {ok:true,json:async()=>({id:'345678901234567890',username:'Test Trooper'})};
    if(url.endsWith('/member'))return {ok:true,json:async()=>({roles:currentRoles,pending:false})};
    throw new Error('Unexpected external request: '+url);
  };
  let ms=Date.parse('2026-10-16T12:45:00Z');
  const client=createDiscordBookAccess({env:{...env,...opts},fetchImpl,now:()=>ms,random:()=> 'csrf-random-strong-token'});
  const setRoles=roles=>{currentRoles=roles};
  const advance=seconds=>{ms+=seconds*1000};
  return {client,calls,setRoles,advance};
}
async function login(suite) {
  const started=await suite.client.handle({action:'start'});
  assert.equal(started.status,302);
  const authorize=new URL(started.location);
  const state=authorize.searchParams.get('state');
  const callback=await suite.client.handle({
    action:'callback',cookie:findCookie(started.cookies,'sast_discord_oauth_state'),
    state,code:'discord-returned-code'
  });
  assert.equal(callback.status,303);
  assert.equal(callback.location,'/?discord=connected');
  return {start:started,callback,
    cookie:findCookie(callback.cookies,'sast_discord_session')};
}
test('default configuration requires real Discord IDs and all five per-book role lists',()=>{
  const bad=createDiscordBookAccess({env:{},fetchImpl:async()=>{throw Error('Unexpected fetch')}});
  assert.equal(bad.configured,false);
  const result=bad.handle({action:'session'});
  assert.ok(result);
  assert.deepEqual(DISCORD_BOOK_IDS,['archive','directory','classified','resignation','bulletins']);
});
test('OAuth authorize URL requests only identify and guilds.members.read with an opaque state cookie',async()=>{
  const h=harness();
  const start=await h.client.handle({action:'start',secure:true});
  const url=new URL(start.location);
  assert.equal(url.hostname,'discord.com');
  assert.equal(url.searchParams.get('scope'),'identify guilds.members.read');
  assert.equal(url.searchParams.get('redirect_uri'),env.DISCORD_REDIRECT_URI);
  assert.equal(url.searchParams.get('state'),'csrf-random-strong-token');
  assert.match(start.cookies[0],/HttpOnly; SameSite=Lax; Secure/);
  assert.doesNotMatch(start.cookies[0],/example-client-secret/);
});
test('OAuth callback rejects wrong state without exchanging credentials',async()=>{
  const h=harness();
  const start=await h.client.handle({action:'start'});
  const callback=await h.client.handle({action:'callback',cookie:findCookie(start.cookies,'sast_discord_oauth_state'),state:'tampered',code:'code'});
  assert.equal(callback.location,'/?discord=authorization-failed');
  assert.equal(h.calls.length,0);
});
test('authenticated Trooper can open Rank Directory but not Armory, Classified, Resignations or Bulletins',async()=>{
  const h=harness([role.trooper]);
  const {cookie,callback}=await login(h);
  assert.match(cookie,/^sast_discord_session=/);
  assert.doesNotMatch(cookie,/private-oauth-token|Test Trooper|345678901234567890/);
  assert.ok(callback.cookies.some(item=>item.includes('HttpOnly')));
  const session=await h.client.handle({action:'session',cookie});
  assert.equal(session.status,200);
  assert.equal(session.body.user.username,'Test Trooper');
  assert.deepEqual(session.body.books,{
    archive:false,directory:true,classified:false,resignation:false,bulletins:false
  });
  assert.equal((await h.client.handle({action:'access',cookie,book:'directory'})).status,200);
  assert.equal((await h.client.handle({action:'access',cookie,book:'archive'})).status,403);
});
test('High Command role can access all books if explicitly listed in every book configuration',async()=>{
  const h=harness([role.hc]);
  const {cookie}=await login(h);
  const session=await h.client.handle({action:'session',cookie});
  assert.ok(Object.values(session.body.books).every(Boolean));
  for(const book of DISCORD_BOOK_IDS)
    assert.equal((await h.client.handle({action:'access',book,cookie})).status,200);
});
test('changes to Discord roles are reflected without logging in again',async()=>{
  const h=harness([role.hc]),{cookie}=await login(h);
  assert.equal((await h.client.handle({action:'access',book:'classified',cookie})).status,200);
  h.setRoles([role.trooper]);
  assert.equal((await h.client.handle({action:'access',book:'classified',cookie})).status,403);
  assert.equal((await h.client.handle({action:'access',book:'directory',cookie})).status,200);
});
test('expired Discord login session fails closed',async()=>{
  const h=harness([role.hc]),{cookie}=await login(h);
  h.advance(2*60*60+1);
  const after=await h.client.handle({action:'access',book:'bulletins',cookie});
  assert.equal(after.status,401);
  assert.equal(after.body.authenticated,false);
});
test('role list missing or invalid denies that book, never opens it by default',async()=>{
  const h=harness([role.hc],{DISCORD_BOOK_ROLES_JSON:JSON.stringify({archive:[role.hc],directory:['NotAnID']})});
  const {cookie}=await login(h);
  assert.equal((await h.client.handle({action:'access',cookie,book:'archive'})).status,200);
  assert.equal((await h.client.handle({action:'access',cookie,book:'directory'})).status,403);
  assert.equal((await h.client.handle({action:'access',cookie,book:'bulletins'})).status,403);
});
test('revoked guild membership is denied at every book open',async()=>{
  const h=harness([role.hc]),{cookie}=await login(h);
  h.setRoles([]);
  const response=await h.client.handle({action:'access',cookie,book:'bulletins'});
  assert.equal(response.status,403);
});
test('all downstream membership verification uses bearer token solely on the server',async()=>{
  const h=harness([role.armory]),{cookie}=await login(h);
  assert.equal((await h.client.handle({action:'access',cookie,book:'archive'})).status,200);
  const calls=h.calls.filter(call=>call.url.endsWith('/member'));
  assert.ok(calls.length>=2);
  assert.ok(calls.every(call=>call.options.headers.Authorization==='Bearer private-oauth-token'));
});
