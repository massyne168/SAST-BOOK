// Optional development-only browser runner; the website has no dependencies.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {server} from '../server.js';
const {chromium} = await import(process.env.PLAYWRIGHT_PATH ? pathToFileURL(process.env.PLAYWRIGHT_PATH).href : 'playwright');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
const errors=[];
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
const report=label=>console.log(`PASS ${label}`);
async function spread(value) { await page.waitForFunction(value=>document.querySelector('#progress-text').textContent===`SPREAD ${String(value+1).padStart(2,'0')} / 15`,value); }
async function idle() { await page.waitForFunction(()=>document.querySelector('#book').getAttribute('aria-busy')==='false'); }
async function open() { await page.locator('#open-archive').click(); await page.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed')); await idle(); }
async function drag(from,to) {
  const box=await page.locator('#book').boundingBox();
  await page.mouse.move(box.x+box.width*from,box.y+box.height*.5);
  await page.mouse.down(); await page.mouse.move(box.x+box.width*to,box.y+box.height*.5,{steps:12}); await page.mouse.up(); await idle();
}
try {
  await page.goto(origin); await open(); await spread(0);
  assert.equal(await page.locator('#access-stamp').isVisible(),true);
  await page.waitForFunction(()=>document.querySelector('#access-stamp').hidden); report('cover opening and automatic stamp removal');
  assert.equal(await page.locator('.section-tabs').count(),0); report('section shortcuts removed');
  const bounds=await page.locator('#book').boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.9,bounds.y+bounds.height*.5); await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.5,{steps:5});
  assert.equal(await page.locator('#next').isDisabled(),true);
  assert.equal(await page.locator('#download-page').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('armory-book.spread')),'0'); await spread(0);
  await page.mouse.up(); await idle(); await spread(0); report('busy controls and no progress/storage changes during cancelled turn');
  await drag(.9,.65); await spread(0);
  await drag(.9,.2); await spread(1);
  await drag(.1,.35); await spread(1);
  await drag(.1,.8); await spread(0); report('forward/backward drags and midpoint cancellation');
  await page.locator('#book').focus(); await page.keyboard.press('ArrowLeft'); await spread(0);
  await page.keyboard.press('ArrowRight'); await spread(1); await idle(); report('keyboard navigation and first boundary');
  const downloadEvent=page.waitForEvent('download'); await page.locator('#download-page').click(); const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),'page-04.webp');
  await page.locator('#left').click();
  const selectedDownload=page.waitForEvent('download'); await page.locator('#download-page').click(); assert.equal((await selectedDownload).suggestedFilename(),'page-03.webp'); report('original single-page filenames and selection');
  await page.locator('#left').dblclick(); await page.locator('#zoom-dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#zoom-image').getAttribute('src'),/page-03.webp$/);
  await page.locator('#zoom-in').click(); assert.equal(await page.locator('#zoom-level').textContent(),'125%');
  await page.locator('#zoom-viewport').hover(); await page.mouse.wheel(0,-300);
  await page.waitForFunction(()=>Number(document.querySelector('#zoom-level').value.replace('%',''))>125);
  await page.locator('#zoom-reset').click(); assert.equal(await page.locator('#zoom-level').textContent(),'100%');
  await page.locator('#zoom-close').focus(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.id),'zoom-in');
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(()=>document.activeElement.id),'zoom-close');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#zoom-dialog').isVisible(),false); report('double-click zoom, buttons, wheel, focus trap and Escape');
  await page.locator('#read-spread').click(); assert.equal(await page.locator('#read-content img').count(),2); await page.keyboard.press('Escape'); report('existing read-spread dialog');
  await page.locator('#fullscreen').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!!document.fullscreenElement); assert.equal(await page.locator('#fullscreen').textContent(),'EXIT FULLSCREEN');
  await page.locator('#fullscreen').click(); await page.waitForFunction(()=>!document.fullscreenElement); report('keyboard fullscreen entry and exit label');
  await page.reload(); await open(); await spread(1); report('restored position after reload');
  await page.evaluate(()=>localStorage.setItem('armory-book.spread','999')); await page.reload(); await open(); await spread(14);
  assert.equal(await page.locator('#next').isDisabled(),true); await page.locator('#book').focus(); await page.keyboard.press('ArrowRight'); await spread(14); report('clamped saved position and final boundary');
  await page.waitForFunction(()=>document.querySelector('#access-stamp').hidden);
  await mkdir('test-results',{recursive:true}); await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  const fallback=await context.newPage();
  await fallback.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{value:false}));
  await fallback.goto(origin); assert.equal(await fallback.locator('#fullscreen').evaluate(el=>el.hidden),true); await fallback.close(); report('unsupported fullscreen fallback');
  const failure=await context.newPage();
  await failure.route('**/page-11.webp',route=>route.abort());
  await failure.goto(origin); await failure.locator('#open-archive').click(); await failure.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed'));
  await failure.close(); report('failed initial image loading preserves archive behavior');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await mobile.newPage(); phone.on('pageerror',error=>errors.push(error.message)); await phone.goto(origin);
  await phone.waitForFunction(()=>document.querySelector('#loader-percent').textContent==='100%');
  await phone.locator('#open-archive').tap(); await phone.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed'));
  assert.equal(await phone.locator('.section-tabs').count(),0);
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await phone.locator('#right').tap(); await phone.locator('#right').tap(); await phone.locator('#zoom-dialog').waitFor({state:'visible'});
  const cdp=await mobile.newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:400,id:1},{x:230,y:400,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:400,id:1},{x:290,y:400,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>Number(document.querySelector('#zoom-level').value.replace('%',''))>100);
  await phone.locator('#zoom-close').tap();
  await phone.waitForFunction(()=>document.querySelector('#access-stamp').hidden);
  await phone.screenshot({path:'test-results/mobile.png',fullPage:true}); report('mobile layout, double-tap, touch pinch, reduced motion');
  for(const width of [320,430,768]) { await phone.setViewportSize({width,height:844}); assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true); }
  report('responsive widths 320, 390, 430 and 768');
  const dimensions=await phone.evaluate(async()=>Promise.all(Array.from({length:30},async(_,i)=>{const image=new Image();image.src=`page-designs/page-${String(i+1).padStart(2,'0')}.webp`;await image.decode();return [image.naturalWidth,image.naturalHeight];})));
  for(const size of dimensions) assert.deepEqual(size,[1191,1685]); report('all 30 original image dimensions');
  assert.deepEqual(errors,[]); report('no browser JavaScript errors');
  await mobile.close();
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
