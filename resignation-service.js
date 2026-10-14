import {createHash, randomUUID} from 'node:crypto';
import {directoryRanks} from './rank-directory-data.js';

export const RESIGNATION_LIMITS = Object.freeze({name: 100, badge: 32, reason: 1000, notes: 2000});
const clean = value => typeof value === 'string' ? value.trim() : '';
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function validateResignation(value) {
  const notice = {
    fullName: clean(value?.fullName), badgeNumber: clean(value?.badgeNumber), currentRank: clean(value?.currentRank),
    effectiveDate: clean(value?.effectiveDate), reason: clean(value?.reason), notes: clean(value?.notes), confirmation: value?.confirmation === true
  };
  const errors = {};
  if (!notice.fullName || notice.fullName.length > RESIGNATION_LIMITS.name) errors.fullName = 'Enter a full name of up to 100 characters.';
  if (!notice.badgeNumber || notice.badgeNumber.length > RESIGNATION_LIMITS.badge) errors.badgeNumber = 'Enter a badge number of up to 32 characters.';
  if (!directoryRanks.includes(notice.currentRank)) errors.currentRank = 'Select a current rank.';
  if (!validDate(notice.effectiveDate)) errors.effectiveDate = 'Enter a valid effective date.';
  if (!notice.reason || notice.reason.length > RESIGNATION_LIMITS.reason) errors.reason = 'Enter a reason of up to 1,000 characters.';
  if (notice.notes.length > RESIGNATION_LIMITS.notes) errors.notes = 'Additional notes must be 2,000 characters or fewer.';
  if (!notice.confirmation) errors.confirmation = 'Confirmation is required.';
  return {valid: Object.keys(errors).length === 0, errors, notice};
}

export const fingerprintNotice = notice => createHash('sha256').update(JSON.stringify([notice.fullName.toLowerCase(), notice.badgeNumber.toLowerCase(), notice.currentRank, notice.effectiveDate, notice.reason, notice.notes])).digest('hex');

export function createResignationHandler({fetchImpl = fetch, webhookUrl = process.env.DISCORD_RESIGNATION_WEBHOOK_URL, now = () => new Date(), id = () => randomUUID(), limit = 5, windowMs = 10 * 60 * 1000, duplicateMs = 24 * 60 * 60 * 1000} = {}) {
  const requests = new Map(), duplicates = new Map();
  return async ({body, ip = 'unknown'}) => {
    const checked = validateResignation(body);
    if (!checked.valid) return {status: 400, body: {error: 'Please correct the highlighted fields.', fields: checked.errors}};
    if (!webhookUrl) return {status: 503, body: {error: 'Resignation delivery is not configured. Ask an administrator to set DISCORD_RESIGNATION_WEBHOOK_URL on the server.'}};
    const timestamp = now(); const key = fingerprintNotice(checked.notice); const recent = requests.get(ip) || [];
    const active = recent.filter(time => timestamp - time < windowMs);
    if (active.length >= limit) return {status: 429, body: {error: 'Too many notices submitted. Please wait and try again.'}};
    if (duplicates.get(key) && timestamp - duplicates.get(key) < duplicateMs) return {status: 409, body: {error: 'An identical resignation notice was already submitted recently.'}};
    requests.set(ip, [...active, timestamp]);
    const reference = `RN-${timestamp.getUTCFullYear()}-${id().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const fields = [
      ['Full Name', checked.notice.fullName], ['Badge Number', checked.notice.badgeNumber], ['Current Rank', checked.notice.currentRank],
      ['Effective Resignation Date', checked.notice.effectiveDate], ['Reason for Resignation', checked.notice.reason], ['Additional Notes', checked.notice.notes || 'None provided'],
      ['Reference Number', reference], ['Submitted At', timestamp.toISOString()]
    ].map(([name, value]) => ({name, value: String(value).slice(0, 1024), inline: name !== 'Reason for Resignation' && name !== 'Additional Notes'}));
    try {
      const response = await fetchImpl(webhookUrl, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({allowed_mentions: {parse: []}, embeds: [{title: 'TROOPER RESIGNATION NOTICE', color: 0xb92c43, fields, timestamp: timestamp.toISOString()}]})});
      if (!response.ok) throw new Error(`Discord returned ${response.status}`);
      duplicates.set(key, timestamp);
      return {status: 201, body: {reference}};
    } catch {
      return {status: 502, body: {error: 'Delivery could not be confirmed. Your notice was not submitted; please try again.'}};
    }
  };
}
