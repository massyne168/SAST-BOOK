// Pure integration helpers only. No public write endpoint or client-side persistence.
// A future server must authorize, lock the serialized weapon, re-read, validate,
// and commit BOTH the returned record and audit entry in one database transaction.
const transitions = {
  AVAILABLE: ['ISSUED','DAMAGED','MAINTENANCE','LOST'],
  ISSUED: ['RETURNED','LOST','DAMAGED','MAINTENANCE'],
  RETURNED: ['AVAILABLE','DAMAGED','MAINTENANCE'],
  LOST: ['MAINTENANCE'], DAMAGED: ['MAINTENANCE'], MAINTENANCE: ['AVAILABLE','DAMAGED','LOST']
};
export function validateAssignment(record, nextStatus, officerId, inventory, officers) {
  if (!transitions[record.status]?.includes(nextStatus)) throw new Error('Invalid equipment status transition.');
  if (nextStatus === 'ISSUED') {
    if (!record.serialNumber) throw new Error('A recorded serial number is required.');
    if (!officers.some(officer => officer.id === officerId)) throw new Error('A valid officer identifier is required.');
    if (inventory.some(other => other.id !== record.id && other.serialNumber?.trim().toUpperCase() === record.serialNumber.trim().toUpperCase() && other.status === 'ISSUED')) {
      throw new Error('This serialized weapon already has an active assignment.');
    }
  }
}
export const activityTypes = Object.freeze([
  'trooper.added','trooper.rankUpdated','trooper.badgeUpdated','trooper.modified',
  'weapon.registered','weapon.issued','weapon.returned','weapon.lost','weapon.damaged','weapon.maintenance','weapon.statusUpdated'
]);
export function createActivity({id, eventType, entityType, entityId, relatedLabel, oldValue = null, newValue, actorId = null, timestamp}) {
  if (!id || !entityId || !activityTypes.includes(eventType) || !['trooper','weapon'].includes(entityType)
    || !eventType.startsWith(entityType + '.') || newValue === undefined
    || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp ?? '') || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error('A genuine event, record identifier and timestamp with timezone are required.');
  }
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) throw new Error('No change to record.');
  return Object.freeze({id, eventType, entityType, entityId, relatedLabel, oldValue, newValue, actorId, timestamp});
}
