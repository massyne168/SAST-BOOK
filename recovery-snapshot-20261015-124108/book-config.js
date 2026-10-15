// The overview carousel and active-reader palette both derive from this one registry.
export const bookConfig = Object.freeze([
  {id: 'archive', title: 'ARMORY', theme: 'armory', stage: '.primary-book', cover: '#archive-cover', opener: '#open-archive', action: 'openArchive'},
  {id: 'directory', title: 'RANK DIRECTORY', theme: 'directory', stage: '.rank-cover-stage-teaser', cover: '#rank-cover', opener: '#open-rank-directory', action: 'openDirectory'},
  {id: 'classified', title: 'CLASSIFIED ARCHIVE', theme: 'classified', stage: '.classified-cover-stage-teaser', cover: '#classified-cover', opener: '#open-classified-archive', action: 'openClassified'},
  {id: 'resignation', title: 'RESIGNATION NOTICES', theme: 'resignation', stage: '.resignation-cover-stage-teaser', cover: '#resignation-cover', opener: '#open-resignation-notices', action: 'openResignationNotices'},
  {id: 'bulletins', title: 'ANNOUNCEMENTS & ORDERS', theme: 'bulletins', stage: '.bulletins-cover-stage-teaser', cover: '#bulletins-cover', opener: '#open-command-bulletin', action: 'openBulletinArchive'}
]);

export const getBook = id => bookConfig.find(book => book.id === id);
