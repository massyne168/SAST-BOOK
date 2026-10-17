import {createCommandAuth} from '../command-auth.js';

export default async function commandSession(request,response){
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Vary','Cookie');
  if(['POST','DELETE'].includes(request.method)&&request.headers['x-sast-request']!=='command-ui'){
    return response.status(403).json({error:'Invalid command request.'});
  }
  const secure=(request.headers['x-forwarded-proto']||'https').split(',')[0].trim()==='https';
  const result=createCommandAuth().handle({
    method:request.method,body:request.body,cookie:request.headers.cookie,secure
  });
  if(result.setCookie)response.setHeader('Set-Cookie',result.setCookie);
  return response.status(result.status).json(result.body);
}
