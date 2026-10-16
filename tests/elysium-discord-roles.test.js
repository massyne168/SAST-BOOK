import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELYSIUM_DISCORD_GUILD_ID,ELYSIUM_ROLE_IDS,ELYSIUM_BOOK_ROLE_IDS
} from '../discord-elysium-roles.js';
import {createDiscordBookAccess} from '../discord-book-access.js';

const expected={
  HIGH_COMMAND:'1541899063736274960',
  CHIEF_OF_POLICE:'1541899063782543485',
  ASSISTANT_CHIEF_OF_POLICE:'1542362114436505640',
  CAPTAIN:'1541899063782543482',
  LIEUTENANT:'1541899063748726843',
  MASTER_SERGEANT:'1542638181063860224',
  STAFF_SERGEANT:'1541899063748726842',
  SERGEANT:'1541899063748726841',
  MASTER_TROOPER:'1542361904197009490',
  SENIOR_TROOPER:'1542362699030331402',
  TROOPER_FIRST_CLASS:'1541899063748726838',
  TROOPER:'1541899063748726837',
  LAW_ENFORCEMENT_TROOPER:'1541899063623163996'
};
const top=[expected.HIGH_COMMAND,expected.CHIEF_OF_POLICE,expected.ASSISTANT_CHIEF_OF_POLICE];
const all=Object.values(expected);
const baseEnv={
  DISCORD_CLIENT_ID:'123456789012345678',
  DISCORD_CLIENT_SECRET:'example-test-secret-never-production',
  DISCORD_REDIRECT_URI:'https://example.org/api/discord',
  DISCORD_SESSION_SECRET:'long-independent-test-secret-at-least-thirty-two-characters'
};
const make=env=>createDiscordBookAccess({env,fetchImpl:async()=>{throw Error('No live Discord call in configuration tests.')}});
test('the real owner-supplied Discord guild and all 13 role IDs are retained exactly',()=>{
  assert.equal(ELYSIUM_DISCORD_GUILD_ID,'1541899063501529178');
  assert.deepEqual(ELYSIUM_ROLE_IDS,expected);
  assert.equal(all.length,13);
  assert.equal(new Set(all).size,13);
  assert.ok(all.every(id=>typeof id==='string'&&/^\d{16,22}$/.test(id)));
});
test('every book has explicit access: all 13 for shared books, only top three for sensitive books',()=>{
  assert.deepEqual(ELYSIUM_BOOK_ROLE_IDS.archive,top);
  assert.deepEqual(ELYSIUM_BOOK_ROLE_IDS.classified,top);
  for(const name of ['directory','resignation','bulletins'])
    assert.deepEqual(ELYSIUM_BOOK_ROLE_IDS[name],all);
  assert.equal(Object.keys(ELYSIUM_BOOK_ROLE_IDS).length,5);
  assert.ok(Object.values(ELYSIUM_BOOK_ROLE_IDS).every(list=>list.length>0));
});
test('server defaults to ELYSIUM role IDs even without DISCORD_BOOK_ROLES_JSON',()=>{
  const auth=make(baseEnv);
  assert.equal(auth.configured,true);
  assert.deepEqual(auth.roles,Object.fromEntries(Object.entries(ELYSIUM_BOOK_ROLE_IDS)));
});
test('custom role configuration remains an explicit complete override and does not widen access',()=>{
  const onlyChief=make({...baseEnv,DISCORD_BOOK_ROLES_JSON:JSON.stringify({archive:[expected.CHIEF_OF_POLICE]})});
  assert.deepEqual(onlyChief.roles.archive,[expected.CHIEF_OF_POLICE]);
  for(const name of ['directory','classified','resignation','bulletins'])
    assert.deepEqual(onlyChief.roles[name],[]);
  const broken=make({...baseEnv,DISCORD_BOOK_ROLES_JSON:'invalid json'});
  assert.ok(Object.values(broken.roles).every(list=>list.length===0));
});
test('OAuth secrets are still required: public guild and role IDs alone cannot authorize login',()=>{
  const noCredentials=make({});
  assert.equal(noCredentials.configured,false);
  assert.equal(noCredentials.handle({action:'start'}).then instanceof Function,true);
});
