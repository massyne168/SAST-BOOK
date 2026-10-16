import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');
const app=read('app.js'),api=read('api/discord.js'),local=read('server.js');
const auth=read('discord-book-access.js'),ui=read('discord-access-client.js'),css=read('discord-access.css');
const save=read('api/resignation.js'),saved=read('api/resignation-records.js'),bulletins=read('api/bulletins.js');
const html=read('index.html'),config=read('book-config.js');

test('all five book opening handlers and navigation require Discord roles',()=>{
  for(const [method,id] of [
    ['openArchive','archive'],['openDirectory','directory'],['openClassified','classified'],
    ['openResignationNotices','resignation'],['openBulletinArchive','bulletins']
  ])assert.ok(app.includes("async function "+method+"() {\\n  if (!await ensureBookAccess('"+id+"')) return;"));
  assert.match(app,/if \(!await ensureBookAccess\(kind\)\) return/);
  assert.match(app,/import \{ensureBookAccess\} from '\.\/discord-access-client\.js'/);
  assert.match(app,/bookConfig\.forEach/);
  for(const id of ['archive','directory','classified','resignation','bulletins'])
    assert.ok(config.includes("id: '"+id+"'"));
});

test('Discord guild role checks are server backed and fail closed when unset',()=>{
  assert.match(auth,/guilds\.members\.read/);
  assert.match(auth,/\/users\/@me\/guilds\//);
  assert.match(auth,/if\(!configured\)return \{status:503/);
  assert.match(auth,/Boolean\(roles\[id\]\?\.length&&roles\[id\]\.some/);
  assert.match(auth,/pending/);
  assert.match(auth,/createCipheriv\('aes-256-gcm'/);
  assert.match(auth,/createDecipheriv\('aes-256-gcm'/);
  assert.match(auth,/timingSafeEqual/);
});

test('all authenticated resignation and bulletin APIs enforce live Discord roles',()=>{
  assert.match(save,/\.check\(request\.headers\.cookie,'resignation'\)/);
  assert.match(saved,/\.check\(request\.headers\.cookie,'resignation'\)/);
  assert.match(bulletins,/\.check\(request\.headers\.cookie,'bulletins'\)/);
  assert.match(local,/discordAccess\.check\(request\.headers\.cookie,'resignation'\)/);
  assert.match(local,/discordAccess\.check\(request\.headers\.cookie,'bulletins'\)/);
  assert.match(api,/createDiscordBookAccess/);
  assert.match(local,/pathname === '\/api\/discord'/);
});

test('Login with Discord is a header control and never alters the book cover assets',()=>{
  assert.match(ui,/\.masthead \.header-utilities/);
  assert.match(ui,/LOGIN WITH DISCORD/);
  assert.match(ui,/dialog\.showModal/);
  assert.match(ui,/\/api\/discord/);
  assert.match(ui,/credentials:'same-origin'/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage/);
  assert.match(html,/href="discord-access\.css"/);
  assert.match(css,/\.discord-book-gate/);
  assert.doesNotMatch(css,/#archive-cover|#rank-cover|\.shared-cover-art/);
});

test('role gate never exposes token or client secret to JavaScript',()=>{
  assert.doesNotMatch(ui,/DISCORD_CLIENT_SECRET|DISCORD_SESSION_SECRET|access_token/);
  assert.doesNotMatch(ui,/Bearer\s+[A-Za-z0-9]/);
  assert.match(auth,/HttpOnly; SameSite=Lax/);
  assert.match(auth,/DISCORD_BOOK_ROLES_JSON/);
});

test('all new CSS braces are balanced',()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"]*"|'[^']*'/g,'""');
  let n=0;for(const ch of clean){if(ch==='{')n++;if(ch==='}')assert.ok(--n>=0)}
  assert.equal(n,0);
});
