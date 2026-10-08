// EDITABLE RANK DIRECTORY DATA
// Add or remove personnel objects in each rank's personnel array. Portraits may be relative asset paths or URLs.
const placeholder = (rank, categoryNumber) => ({
  fullName: 'PLACEHOLDER PERSONNEL', rank, badgeNumber: `TBD-${String(categoryNumber).padStart(2, '0')}`,
  departmentUnit: 'San Andreas State Troopers / Unassigned', callSign: 'TBD', status: 'UNASSIGNED',
  joinDate: 'YYYY-MM-DD', profile: 'Replace this placeholder with an approved personnel profile or notes.',
  portrait: '', signature: 'Pending authorization'
});

export const rankDirectoryData = [
  'Officer 1', 'Officer 2', 'Officer 3', 'Senior Lead Officer', 'Sergeant 1', 'Sergeant 2',
  'Master Sergeant', 'Lieutenant', 'Captain', 'Major / Commander', 'Chief of Police',
  'Assistant Commissioner', 'Commissioner'
].map((title, index) => ({
  title,
  categoryNumber: index + 1,
  personnel: [placeholder(title, index + 1)]
}));
