import {createCommandAuth} from '../command-auth.js';
import {createCommandOverviewHandler} from '../command-overview-service.js';
import {createRedisBulletinStore} from '../bulletin-storage.js';

const handler=createCommandOverviewHandler({auth:createCommandAuth(),store:createRedisBulletinStore()});
export default async function commandOverview(request,response){
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Vary','Cookie');
  const result=await handler({method:request.method,cookie:request.headers.cookie});
  return response.status(result.status).json(result.body);
}
