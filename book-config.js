// The overview carousel and active-reader palette both derive from this one registry.
export const bookConfig = Object.freeze([
  {id: 'archive', title: 'ARMORY', theme: 'armory', cover: '#archive-cover', opener: '#open-archive', action: 'openArchive'},
  {id: 'directory', title: 'RANK DIRECTORY', theme: 'directory', cover: '#rank-cover', opener: '#open-rank-directory', action: 'openDirectory'},
  {id: 'classified', title: 'CLASSIFIED ARCHIVE', theme: 'classified', cover: '#classified-cover', opener: '#open-classified-archive', action: 'openClassified'},
  {id: 'resignation', title: 'RESIGNATION NOTICES', theme: 'resignation', cover: '#resignation-cover', opener: '#open-resignation-notices', action: 'openResignationNotices'},
  {id: 'bulletins', title: 'ANNOUNCEMENTS & ORDERS', theme: 'bulletins', cover: '#bulletins-cover', opener: '#open-command-bulletin', action: 'openBulletinArchive'}
]);

export const getBook = id => bookConfig.find(book => book.id === id);
