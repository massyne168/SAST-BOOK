import {directoryRanks} from './rank-directory-data.js';

const MAX = {fullName: 100, badgeNumber: 32, reason: 1000, notes: 2000};
const clean = value => String(value || '').trim();
const validDate = value => { const date = new Date(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value; };
export function validateNotice(values) {
  const errors = {};
  if (!clean(values.fullName) || clean(values.fullName).length > MAX.fullName) errors.fullName = 'Enter a full name of up to 100 characters.';
  if (!clean(values.badgeNumber) || clean(values.badgeNumber).length > MAX.badgeNumber) errors.badgeNumber = 'Enter a badge number of up to 32 characters.';
  if (!directoryRanks.includes(values.currentRank)) errors.currentRank = 'Select a current rank.';
  if (!validDate(values.effectiveDate)) errors.effectiveDate = 'Enter a valid effective date.';
  if (!clean(values.reason) || clean(values.reason).length > MAX.reason) errors.reason = 'Enter a reason of up to 1,000 characters.';
  if (clean(values.notes).length > MAX.notes) errors.notes = 'Additional notes must be 2,000 characters or fewer.';
  if (!values.confirmation) errors.confirmation = 'Confirmation is required.';
  return errors;
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function initializeResignationForm() {
  const form = document.querySelector('#resignation-form'); if (!form) return;
  if (form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';
  const rank = form.elements.currentRank;
  rank.innerHTML = '<option value="">SELECT RANK</option>' + directoryRanks.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  const review = document.querySelector('#review-resignation'), submit = document.querySelector('#submit-resignation'), summary = document.querySelector('#resignation-summary'), status = document.querySelector('#resignation-status');
  const values = () => Object.fromEntries(new FormData(form).entries());
  const notify = (phase, data, reference) => document.dispatchEvent(new CustomEvent('resignation-notice-updated', {detail:{phase, data, reference}}));
  const snapshot = () => ({...values(), confirmation:form.elements.confirmation.checked});
  const showErrors = errors => {
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    Object.keys(errors).forEach(name => form.elements[name]?.setAttribute('aria-invalid', 'true'));
    status.textContent = Object.values(errors)[0] || ''; return !Object.keys(errors).length;
  };
  const makeSummary = data => {
    const labels = {fullName:'Full Name',badgeNumber:'Badge Number',currentRank:'Current Rank',effectiveDate:'Effective Resignation Date',reason:'Reason for Resignation',notes:'Additional Notes',confirmation:'Confirmation'};
    summary.innerHTML = '<h3>REVIEW NOTICE</h3>' + Object.entries(labels).map(([key, label]) => `<div><strong>${label}</strong><span>${escapeHtml(key === 'confirmation' ? 'Confirmed' : (data[key] || (key === 'notes' ? 'None provided' : '')))}</span></div>`).join('');
    summary.hidden = false; submit.hidden = false; submit.focus({preventScroll:true});
  };
  review.addEventListener('click', () => { const data = snapshot(); if (showErrors(validateNotice(data))) { makeSummary(data); notify('reviewed', data); } else notify('draft', data); });
  form.addEventListener('input', () => { summary.hidden = true; submit.hidden = true; notify('draft', snapshot()); });
  form.addEventListener('change', () => { summary.hidden = true; submit.hidden = true; notify('draft', snapshot()); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); const data = snapshot();
    if (!showErrors(validateNotice(data))) return;
    submit.disabled = true; review.disabled = true; status.textContent = 'SENDING NOTICE…'; notify('sending', data);
    try {
      const response = await fetch('/api/resignation', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Delivery could not be confirmed.');
      status.textContent = `NOTICE DELIVERED — REFERENCE ${payload.reference}`;
      notify('delivered', data, payload.reference);
      form.reset(); summary.hidden = true; submit.hidden = true;
    } catch (cause) { status.textContent = cause.message; notify('error', data); }
    finally { submit.disabled = false; review.disabled = false; }
  });
}
