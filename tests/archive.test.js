import test from 'node:test';
import assert from 'node:assert/strict';
import {officers, weapons, activities, searchOfficers, officerPage, filterWeapons, calculateStatistics, filterActivities, statuses} from '../archive-data.js';
import {directoryPages, directoryRanks} from '../rank-directory-data.js';
import {validateAssignment, createActivity} from '../archive-management.js';

test('real roster search preserves leading zeros and duplicate badges', () => {
  assert.equal(searchOfficers('zakhar arsseni')[0].badge, '0601');
  assert.equal(searchOfficers('0601')[0].name, 'ZAKHAR ARSSENI');
  assert.ok(searchOfficers('0377').length > 1);
  assert.equal(new Set(searchOfficers('0377').map(p => p.id)).size, searchOfficers('0377').length);
  assert.ok(searchOfficers('chief').every(p => p.rank.includes('CHIEF')));
  assert.equal(searchOfficers('nonexistent person').length, 0);
  assert.equal(searchOfficers('  ').length, officers.length);
  assert.equal(new Set(officers.map(p => p.id)).size, officers.length);
  for (const person of officers) {
    assert.equal(typeof person.badge, 'string');
    assert.ok(directoryPages[officerPage(person.id)].people.some(p => p.id === person.id));
  }
  assert.equal(officerPage('missing'), -1);
});
test('statistics derive from input, including empty ranks and unknown statuses', () => {
  const stats = calculateStatistics();
  assert.equal(stats.totalTroopers, officers.length);
  assert.equal(stats.totalRanks, directoryRanks.length);
  assert.equal(stats.byRank.reduce((sum,r) => sum+r.count,0), officers.length);
  assert.equal(stats.totalWeapons, weapons.length);
  assert.equal(stats.byStatus.reduce((sum,r) => sum+r.count,0), weapons.length);
  const changed = calculateStatistics([{id:'test',rank:'CAPTAIN'}],[{status:'LOST'},{status:null}],['CAPTAIN','CADET']);
  assert.equal(changed.leadership,1); assert.equal(changed.byRank[1].count,0);
  assert.equal(changed.byStatus.find(s => s.label === 'LOST').count,1);
  assert.equal(changed.unknownStatus,1);
  assert.equal(calculateStatistics([],[],[]).totalWeapons,0);
});
test('inventory transcription preserves historical names and missing fields', () => {
  assert.equal(weapons.length,25);
  assert.equal(new Set(weapons.map(w => w.serialNumber)).size,25);
  assert.equal(weapons[0].assignedBadgeNumber,'300');
  assert.equal(weapons[13].assignedBadgeNumber,null);
  assert.equal(weapons[4].assignedName,'JUSEF KANE');
  assert.equal(weapons[4].assignedOfficerId,null);
  assert.equal(filterWeapons(weapons,{query:weapons[0].serialNumber.toLowerCase()})[0].id,weapons[0].id);
  assert.equal(filterWeapons(weapons,{assignedName:'MATEO VARGAS',category:'Not recorded',status:'ISSUED'}).length,1);
  assert.equal(filterWeapons(weapons,{status:'AVAILABLE'}).length,0);
  for(const status of statuses) assert.equal(filterWeapons([{status}],{status}).length,1);
});
test('assignment integration rejects invalid transitions and duplicate active serials', () => {
  const record = {id:'test-weapon',serialNumber:'TEST-001',status:'AVAILABLE'};
  const people = [{id:'test-person'}];
  assert.doesNotThrow(() => validateAssignment(record,'ISSUED','test-person',[],people));
  assert.throws(() => validateAssignment(record,'RETURNED',null,[],people),/transition/);
  assert.throws(() => validateAssignment(record,'ISSUED','missing',[],people),/officer/);
  assert.throws(() => validateAssignment({...record,serialNumber:null},'ISSUED','test-person',[],people),/serial/);
  assert.throws(() => validateAssignment(record,'ISSUED','test-person',[{id:'other',serialNumber:'test-001',status:'ISSUED'}],people),/active assignment/);
  assert.doesNotThrow(() => validateAssignment({...record,status:'ISSUED'},'RETURNED',null,[],people));
  assert.throws(() => validateAssignment({...record,status:'ISSUED'},'ISSUED','test-person',[],people),/transition/);
});
test('audit integration requires a real change and preserves supplied timestamps', () => {
  assert.deepEqual(activities,[]);
  const input = {id:'test-event',entityId:'test-weapon',entityType:'weapon',eventType:'weapon.issued',timestamp:'2026-10-11T10:20:00+01:00',oldValue:'AVAILABLE',newValue:'ISSUED'};
  const event = createActivity(input);
  assert.equal(event.timestamp,input.timestamp); assert.equal(event.actorId,null);
  assert.throws(() => createActivity({...input,newValue:'AVAILABLE'}),/No change/);
  assert.throws(() => createActivity({...input,timestamp:'yesterday'}),/timestamp/);
  assert.throws(() => createActivity({...input,eventType:'fake'}));
  assert.throws(() => createActivity({...input,entityType:'trooper'}));
  const later = {...event,id:'second',timestamp:'2026-10-12T00:00:00Z'};
  assert.equal(filterActivities([event,later],{group:'assignments',from:'2026-10-12'})[0].id,'second');
  assert.equal(filterActivities([later,event],{order:'oldest'})[0].id,'test-event');
  assert.deepEqual(filterActivities([event],{group:'trooper'}),[]);
  assert.deepEqual(filterActivities([event],{query:'absent'}),[]);
});
