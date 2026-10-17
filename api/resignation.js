import {createDiscordBookAccess} from '../discord-book-access.js';
import {createResignationHandler} from '../resignation-service.js';
import {createRedisResignationStore} from '../resignation-storage.js';

const handler = createResignationHandler({store:createRedisResignationStore(),requireStorage:true});
export default async function resignation(request, response) {
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed.'});
  const access=await createDiscordBookAccess().check(request.headers.cookie,'resignation');
  if(access.status!==200)return response.status(access.status).json({error:access.body.message||'Forbidden'});
  const result = await handler({body: request.body, ip: request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket?.remoteAddress});
  return response.status(result.status).json(result.body);
}
