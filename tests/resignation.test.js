import test from 'node:test';
import assert from 'node:assert/strict';
import {createResignationHandler, validateResignation} from '../resignation-service.js';
import {directoryRanks} from '../rank-directory-data.js';
import {validateNotice} from '../resignation-form.js';

const valid = () => ({fullName:'Avery Stone', badgeNumber:'0420', currentRank:directoryRanks[0], effectiveDate:'2026-11-01', reason:'Personal reasons.', notes:'', confirmation:true});

test('resignation validation rejects missing confirmation and invalid values', () => {
  const invalid = {...valid(), fullName:'', confirmation:false, currentRank:'NOT A RANK'};
  const result = validateResignation(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.fullName); assert.ok(result.errors.confirmation); assert.ok(result.errors.currentRank);
});

test('client validation matches required constraints before review', () => {
  assert.deepEqual(validateNotice(valid()), {});
  assert.ok(validateNotice({...valid(), effectiveDate:'2026-02-30'}).effectiveDate);
  assert.ok(validateNotice({...valid(), reason:'x'.repeat(1001)}).reason);
});

test('resignation delivery uses a structured embed with mentions disabled', async () => {
  let request;
  const handler = createResignationHandler({webhookUrl:'https://discord.example/webhook', id:() => 'abc12345-0000-0000-0000-000000000000', now:() => new Date('2026-10-14T12:00:00.000Z'), fetchImpl:async (...args) => { request = args; return {ok:true, status:204}; }});
  const result = await handler({body:valid(), ip:'127.0.0.1'});
  assert.equal(result.status, 201); assert.match(result.body.reference, /^RN-2026-/);
  assert.equal(request[1].method, 'POST');
  const payload = JSON.parse(request[1].body);
  assert.deepEqual(payload.allowed_mentions, {parse:[]});
  assert.equal(payload.embeds[0].title, 'TROOPER RESIGNATION NOTICE');
  assert.ok(payload.embeds[0].fields.some(field => field.name === 'Badge Number' && field.value === '0420'));
});

test('resignation delivery failure preserves a retryable error and never reports success', async () => {
  const handler = createResignationHandler({webhookUrl:'https://discord.example/webhook', fetchImpl:async () => ({ok:false,status:500})});
  const result = await handler({body:valid(), ip:'127.0.0.2'});
  assert.equal(result.status, 502);
  assert.match(result.body.error, /could not be confirmed/i);
});

test('resignation handler blocks duplicate notices', async () => {
  let clock = new Date('2026-10-14T12:00:00.000Z');
  const handler = createResignationHandler({webhookUrl:'https://discord.example/webhook', now:() => clock, fetchImpl:async () => ({ok:true,status:204})});
  assert.equal((await handler({body:valid(), ip:'127.0.0.3'})).status, 201);
  assert.equal((await handler({body:valid(), ip:'127.0.0.3'})).status, 409);
});
