import {createBulletinHandler} from '../bulletin-service.js';
import {createRedisBulletinStore} from '../bulletin-storage.js';

const handler=createBulletinHandler({store:createRedisBulletinStore()});
export default async function bulletins(request,response) {
  response.setHeader('Cache-Control','no-store');
  const result=await handler({
    method:request.method,
    authorization:request.headers.authorization,
    body:request.body
  });
  return response.status(result.status).json(result.body);
}
