import {createResignationRecordsHandler} from '../resignation-records-service.js';
import {createRedisResignationStore} from '../resignation-storage.js';

const handler=createResignationRecordsHandler({store:createRedisResignationStore()});
export default async function resignationRecords(request,response) {
  response.setHeader('Cache-Control','no-store');
  const result=await handler({method:request.method});
  return response.status(result.status).json(result.body);
}
