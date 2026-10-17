import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const reader=read('supplemental-readers.js');
const editor=read('bulletin-editor.js');
const server=read('server.js');
const api=read('api/bulletins.js');
const css=read('bulletin-publishing.css');
const index=read('index.html');
const standard=read('resignation-form.js');

test('publishing is part of the existing physical book, not a separate page or dialog',()=>{
  assert.match(reader,/import \{FlipEngine\} from '\.\/flip-engine\.js'/);
  assert.match(reader,/buildBulletinPages\(currentBulletins\(\)\)/);
  assert.match(reader,/createBulletinEditor\(/);
  assert.match(reader,/data-bulletin-open-form/);
  assert.match(reader,/kind === 'bulletins'\?state\.documentPages\.length\/2:5/);
});

test('live draft preview updates safely; the High Command password is excluded',()=>{
  assert.match(reader,/data-preview-field/);
  assert.match(reader,/target\.textContent=String\(draft\[key\]\|\|'—'\)/);
  assert.match(editor,/const \{secret,\.\.\.data\}=values\(\)/);
  assert.match(editor,/onDraft\?\.\(snapshot\(\)\)/);
  assert.match(editor,/phase='reviewed'/);
  assert.match(editor,/PUBLISH TO BOOK/);
  assert.match(editor,/Authorization:'Bearer '\+secret/);
});

test('saved notices become new book pages and the editing form is parked during a flip',()=>{
  assert.match(reader,/onPublished:bulletin=>/);
  assert.match(reader,/updateBulletins\(\[bulletin,\.\.\.currentBulletins\(\)\]/);
  assert.match(reader,/refreshBulletinBook\(state,1\)/);
  assert.match(reader,/if\(busy\).*parkBulletinEditor\(state\)/);
  assert.match(reader,/if\(!busy\).*mountBulletinEditor\(state\)/);
  assert.match(reader,/state\.engine\.count=state\.documentPages\.length\/2/);
});

test('Vercel and local Node share the same authenticated publication handler',()=>{
  assert.match(server,/pathname === '\/api\/bulletins'/);
  assert.match(server,/createBulletinHandler\(\{store:createLocalBulletinStore\(\)\}\)/);
  assert.match(api,/createBulletinHandler\(\{store:createRedisBulletinStore\(\)\}\)/);
  assert.match(api,/request\.headers\.authorization/);
  assert.match(api,/response\.setHeader\('Cache-Control','no-store'\)/);
});

test('published notices and in-book forms have responsive official document styling',()=>{
  assert.match(index,/href="bulletin-publishing\.css"/);
  assert.match(css,/\.bulletin-official-sheet/);
  assert.match(css,/\.high-command-bulletin-editor/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/overflow-y:auto/);
  assert.ok(standard.includes("initializeResignationForm")); // Original resignation untouched.
});
