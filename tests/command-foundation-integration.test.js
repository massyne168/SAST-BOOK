import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const index=read('index.html'),css=read('command-foundation.css'),command=read('command-center.js');
const auth=read('command-auth.js'),client=read('command-session-client.js');
const api=read('api/command-session.js'),overview=read('api/command-overview.js');
const server=read('server.js'),book=read('app.js'),editor=read('bulletin-editor.js');
const publishing=read('api/bulletins.js');

test('original Command Center entry remains in masthead and opens a secure login',()=>{
  assert.match(command,/\.masthead \.header-utilities'\)\.prepend\(entry\)/);
  assert.match(command,/command-center-entry/);
  assert.match(command,/name="role"/);
  assert.match(command,/name="accessKey" type="password"/);
  assert.match(command,/data-command-workspace" hidden/);
  assert.match(command,/commandCan\('dashboard:read'\)/);
  assert.match(command,/data-command-bulletins/);
  assert.match(command,/data-command-ranks/);
  assert.match(command,/data-command-gear/);
});

test('all secured session operations are server-backed and do not persist credentials client-side',()=>{
  assert.match(client,/fetch\('\/api\/command-session'/);
  assert.match(client,/credentials:'same-origin'/);
  assert.match(client,/X-SAST-Request':'command-ui'/);
  assert.doesNotMatch(client,/localStorage|sessionStorage/);
  assert.match(auth,/HttpOnly; SameSite=Strict/);
  assert.match(auth,/timingSafeEqual/);
  assert.match(auth,/createHmac\('sha256'/);
  assert.match(api,/request\.headers\['x-sast-request'\]/);
  assert.match(api,/response\.setHeader\('Set-Cookie'/);
  assert.match(api,/Cache-Control','no-store'/);
});

test('both local Node and Vercel enforce a signed cookie before dashboard reads',()=>{
  assert.match(server,/pathname === '\/api\/command-session'/);
  assert.match(server,/pathname === '\/api\/command-overview'/);
  assert.match(server,/commandOverview\(\{method:request\.method,cookie:request\.headers\.cookie\}\)/);
  assert.match(overview,/createCommandOverviewHandler/);
  assert.match(overview,/cookie:request\.headers\.cookie/);
  assert.match(read('command-overview-service.js'),/roleCan\(session\.role,'dashboard:read'\)/);
});

test('only eligible Command roles can publish via a server-verified session',()=>{
  assert.match(publishing,/createCommandAuth\(\)\.verify\(request\.headers\.cookie\)\?\.role/);
  assert.match(server,/commandAuth\.verify\(request\.headers\.cookie\)\?\.role/);
  assert.match(read('bulletin-service.js'),/roleCan\(role,'bulletins:publish'\)/);
  assert.match(editor,/commandCan\('bulletins:publish'\)/);
  assert.match(editor,/Authorization:'Bearer '\+secret/);
  assert.match(editor,/credentials:'same-origin'/);
  assert.match(css,/\[data-high-command-key\]\[hidden\]/);
});

test('quick navigation supports all five real books without leaving the current one open',()=>{
  for(const id of ['archive','directory','classified','resignation','bulletins'])
    assert.ok(book.includes(id+':'));
  for(const action of ['closeArchive','closeClassified','closeResignationNotices','closeBulletinArchive','openBulletinArchive','openArchive'])
    assert.ok(book.includes('await '+action+'()'));
  assert.match(book,/setCarouselBook\(destinations\[kind\]\)/);
});

test('existing original artwork, data, and page turning are not overwritten by the new styling',()=>{
  assert.match(index,/href="command-foundation\.css"/);
  assert.match(css,/\.command-center--secured/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.doesNotMatch(css,/\.rank-cover|\.archive-cover\.webp-cover|\.shared-cover-art|\.supplemental-turn-layer/);
  assert.doesNotMatch(command,/innerHTML\s*=\s*.*page-designs|weapons\s*=\s*\[/);
});
