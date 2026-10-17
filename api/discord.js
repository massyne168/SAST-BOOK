import {createDiscordBookAccess} from '../discord-book-access.js';
const access=createDiscordBookAccess();
export default async function discord(request,response) {
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Vary','Cookie');
  const url=new URL(request.url,'https://localhost');
  const code=url.searchParams.get('code')||'';
  const error=url.searchParams.get('error')||'';
  const action=url.searchParams.get('action')||(code||error?'callback':'session');
  const result=await access.handle({
    action,cookie:request.headers.cookie,code,state:url.searchParams.get('state')||'',error,
    book:url.searchParams.get('book')||'',secure:true
  });
  if(result.cookies?.length)response.setHeader('Set-Cookie',result.cookies);
  if(result.location){response.setHeader('Location',result.location);return response.status(result.status).end()}
  return response.status(result.status).json(result.body);
}
