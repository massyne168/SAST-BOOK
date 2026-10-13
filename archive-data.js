import {rankDirectoryData, directoryRanks, directoryPages} from './rank-directory-data.js';
import {weapons, activities} from './armory-data.js';
export {weapons, activities};
export const officers = rankDirectoryData;
export const statuses = Object.freeze(['AVAILABLE','ISSUED','RETURNED','LOST','DAMAGED','MAINTENANCE']);
const normalize = value => String(value ?? '').trim().toLocaleLowerCase('en');
const matches = (values, query) => normalize(query).split(/\s+/).every(term => values.some(value => normalize(value).includes(term)));
export function searchOfficers(query, records = officers) {
  return records.filter(person => matches([person.name, person.rankId, person.badge], query));
}
export function officerPage(id) {
  return directoryPages.findIndex(page => page.people.some(person => person.id === id));
}
export const isOfficialRank = rankId => directoryRanks.includes(rankId);
export function filterWeapons(records, {query = '', status = '', assignedName = '', category = ''} = {}) {
  return records.filter(record => matches([record.name, record.serialNumber, record.assignedName, record.assignedBadgeNumber, record.id], query)
    && (!status || record.status === status) && (!assignedName || record.assignedName === assignedName)
    && (!category || (record.category ?? 'Not recorded') === category));
}
// Explicit reporting definition, not a change to the department's rank hierarchy.
export const leadershipRanks = Object.freeze(['COMMISSIONER','CHIEF OF POLICE','ASSISTANT CHIEF OF POLICE','CAPTAIN','LIEUTENANT']);
export function calculateStatistics(people = officers, inventory = weapons, ranks = directoryRanks) {
  const officialPeople = people.filter(person => ranks.includes(person.rankId));
  return {
    totalTroopers: officialPeople.length, totalRanks: ranks.length,
    leadership: officialPeople.filter(person => leadershipRanks.includes(person.rankId)).length,
    byRank: ranks.map(rank => ({label: rank, count: officialPeople.filter(person => person.rankId === rank).length})),
    totalWeapons: inventory.length,
    byStatus: statuses.map(status => ({label: status, count: inventory.filter(weapon => weapon.status === status).length})),
    unknownStatus: inventory.filter(weapon => !statuses.includes(weapon.status)).length
  };
}
export function filterActivities(records, {group = '', query = '', from = '', to = '', order = 'newest'} = {}) {
  return records.filter(record => (!group || (group === 'assignments' ? ['weapon.issued','weapon.returned'].includes(record.eventType) : record.entityType === group))
    && matches([record.entityId, record.relatedLabel, record.eventType], query)
    && (!from || record.timestamp.slice(0,10) >= from) && (!to || record.timestamp.slice(0,10) <= to))
    .sort((a,b) => (Date.parse(a.timestamp) - Date.parse(b.timestamp)) * (order === 'oldest' ? 1 : -1));
}
