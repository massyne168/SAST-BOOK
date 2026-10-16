import http from 'node:http';
import {readFile, mkdir, rename, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {rankDirectoryData, directoryRanks} from './rank-directory-data.js';
import {createResignationHandler} from './resignation-service.js';
import {createLocalResignationStore} from './resignation-storage.js';
import {createResignationRecordsHandler} from './resignation-records-service.js';
import {createBulletinHandler} from './bulletin-service.js';
import {createLocalBulletinStore} from './bulletin-storage.js';
import {createCommandAuth} from './command-auth.js';
import {createCommandOverviewHandler} from './command-overview-service.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const personnelFile = path.join(root, 'data', 'personnel.json');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const sendJson = (response, status, body) => response.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));
const resignationStore=createLocalResignationStore();
const resignationHandler = createResignationHandler({store:resignationStore,requireStorage:true});
const resignationRecordsHandler=createResignationRecordsHandler({store:resignationStore});
const bulletinStore=createLocalBulletinStore();
const bulletinHandler = createBulletinHandler({store:bulletinStore});
const commandAuth=createCommandAuth();
const commandOverview=createCommandOverviewHandler({auth:commandAuth,store:bulletinStore});
const readJson = request => new Promise((resolve, reject) => {
  let data = '';
  request.on('data', chunk => { data += chunk; if (data.length > 1024 * 1024) request.destroy(); });
  request.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (cause) { reject(cause); } });
  request.on('error', reject);
});
const readPersonnel = async () => {
  try { return JSON.parse(await readFile(personnelFile, 'utf8')); }
  catch (cause) { if (cause.code === 'ENOENT') return rankDirectoryData; throw cause; }
};
const savePersonnel = async people => {
  await mkdir(path.dirname(personnelFile), {recursive:true});
  const pending = personnelFile + '.tmp';
  await writeFile(pending, JSON.stringify(people, null, 2) + '\n', 'utf8');
  await rename(pending, personnelFile);
};
export const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if (pathname === '/api/personnel' && request.method === 'GET') {
      return sendJson(response, 200, {people: await readPersonnel(), adminEnabled: Boolean(process.env.ADMIN_TOKEN)});
    }
    if (pathname === '/api/personnel/admin-session' && request.method === 'GET') {
      const expectedToken = process.env.ADMIN_TOKEN;
      if (!expectedToken || request.headers.authorization !== `Bearer ${expectedToken}`) return sendJson(response, 401, {error:'Administrator authorization required.'});
      return sendJson(response, 200, {authorized:true});
    }
    if (pathname === '/api/personnel/rank' && request.method === 'PATCH') {
      const expectedToken = process.env.ADMIN_TOKEN;
      if (!expectedToken) return sendJson(response, 503, {error:'Administrator editing is not configured.'});
      if (request.headers.authorization !== `Bearer ${expectedToken}`) return sendJson(response, 401, {error:'Administrator authorization required.'});
      const {id, rankId} = await readJson(request);
      if (typeof id !== 'string' || !directoryRanks.includes(rankId)) return sendJson(response, 400, {error:'A valid personnel ID and rank ID are required.'});
      const people = await readPersonnel();
      const position = people.findIndex(person => person.id === id);
      if (position < 0) return sendJson(response, 404, {error:'Personnel record not found.'});
      people[position] = {...people[position], rankId};
      await savePersonnel(people);
      return sendJson(response, 200, {person: people[position], people});
    }
    if (pathname === '/api/command-session') {
      if(['POST','DELETE'].includes(request.method)&&request.headers['x-sast-request']!=='command-ui')
        return sendJson(response,403,{error:'Invalid command request.'});
      const result=commandAuth.handle({
        method:request.method,body:request.method==='POST'?await readJson(request):{},
        cookie:request.headers.cookie,secure:false
      });
      if(result.setCookie)response.setHeader('Set-Cookie',result.setCookie);
      response.setHeader('Vary','Cookie');
      return sendJson(response,result.status,result.body);
    }
    if (pathname === '/api/command-overview') {
      const result=await commandOverview({method:request.method,cookie:request.headers.cookie});
      response.setHeader('Vary','Cookie');
      return sendJson(response,result.status,result.body);
    }
    if (pathname === '/api/bulletins') {
      const result=await bulletinHandler({
        method:request.method,authorization:request.headers.authorization,
        role:request.headers['x-sast-request']==='command-ui'?commandAuth.verify(request.headers.cookie)?.role:null,
        body:request.method==='POST'?await readJson(request):{}
      });
      return sendJson(response,result.status,result.body);
    }
    if (pathname === '/api/resignation-records') {
      const result=await resignationRecordsHandler({method:request.method});
      return sendJson(response,result.status,result.body);
    }
    if (pathname === '/api/resignation') {
      if (request.method !== 'POST') return sendJson(response, 405, {error: 'Method not allowed.'});
      const result = await resignationHandler({body: await readJson(request), ip: request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress});
      return sendJson(response, result.status, result.body);
    }
    if (pathname.startsWith('/data/')||pathname.startsWith('/api/')||
        pathname.split('/').some(segment=>segment.startsWith('.')&&segment!=='.well-known')||
        pathname.endsWith('.tmp'))return sendJson(response,404,{error:'Not found.'});
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(filename);
    response.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream'}).end(data);
  } catch (cause) {
    if (cause?.code === 'ENOENT') { response.writeHead(404).end('Not found'); return; }
    response.writeHead(500, {'Content-Type':'application/json'}).end(JSON.stringify({error: cause instanceof SyntaxError ? 'Invalid request body.' : 'Server error.'}));
  }
});
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(8080,'127.0.0.1',() => console.log('Armory Book: http://127.0.0.1:8080'));
}
