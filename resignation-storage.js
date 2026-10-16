import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLocalBulletinStore,createRedisBulletinStore} from './bulletin-storage.js';

// Dedicated notice archive. No bulletin records or original personnel files are touched.
const localFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'data','resignations.json');
export const createLocalResignationStore=(options={})=>
  createLocalBulletinStore({filename:localFile,...options});
export const createRedisResignationStore=(options={})=>
  createRedisBulletinStore({key:'sast:resignations:v1',...options});
