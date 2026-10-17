import {createDiscordBookAccess} from '../discord-book-access.js';
import {createResignationRecordsHandler} from '../resignation-records-service.js';
import {createRedisResignationStore} from '../resignation-storage.js';

const handler=createResignationRecordsHandler({store:createRedisResignationStore()});
export default async function resignationRecords(request,response) {
  response.setHeader('Cache-Control','no-store');
  const access=await createDiscordBookAccess().check(request.headers.cookie,'resignation');
  if(access.status!==200)return response.status(access.status).json({error:access.body.message||'Forbidden'});
  const result=await handler({method:request.method});
  return response.status(result.status).json(result.body);
}
