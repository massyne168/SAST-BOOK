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
async function verifyOpeningTabs(layout) {
  const overview=await page.evaluate(()=>({
    active:document.querySelector('.book-pair').dataset.activeBook,
    books:Object.fromEntries([
      ['archive',['#archive-cover','#open-archive']],
      ['directory',['#rank-cover','#open-rank-directory']]
    ].map(([name,[coverSelector,buttonSelector]])=>{
      const cover=document.querySelector(coverSelector),button=document.querySelector(buttonSelector);
      const rect=element=>{const {left,right,top,bottom,width,height}=element.getBoundingClientRect();return {left,right,top,bottom,width,height}};
      return [name,{cover:rect(cover),button:rect(button),hidden:button.hidden,disabled:button.disabled,nested:cover.contains(button),layoutWidth:cover.offsetWidth,layoutHeight:cover.offsetHeight}];
    }))
  }));
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  for(const name of ['archive','directory']){
    const {cover,button,hidden,disabled,nested,layoutWidth,layoutHeight}=overview.books[name];
    const other=overview.books[name==='archive'?'directory':'archive'].cover;
    assert.equal(nested,false,`${name} button is outside its cover`);
    assert.ok(cover.left>=0&&cover.right<=innerWidth,`${name} cover stays inside the viewport`);
    assert.ok(Math.abs(layoutHeight/layoutWidth-1685/1191)<.01,`${name} cover retains its source aspect ratio`);
    assert.equal(hidden,name!==overview.active,`${name} opening button visibility follows carousel selection`);
    assert.equal(disabled,name!==overview.active,`${name} opening button is disabled when not selected`);
    if(name!==overview.active) continue;
    assert.ok(button.left>=0&&button.right<=innerWidth,`${name} button stays inside the viewport`);
    assert.equal(overlaps(button,other),false,`${name} button does not cover the rear book`);
    const control=await page.locator(name==='archive'?'#open-archive':'#open-rank-directory').evaluate(element=>({
      label:element.querySelector('.opening-tab-label').textContent.trim(),
      width:element.getBoundingClientRect().width,
      height:element.getBoundingClientRect().height
    }));
    assert.equal(control.label,name==='archive'?'OPEN ARCHIVE':'ENTER DIRECTORY');
    if(layout==='desktop'){
      assert.ok(button.left>=cover.right-2,`${name} button is beside the cover`);
      assert.ok(button.top>cover.top+cover.height*.45&&button.bottom<cover.bottom,`${name} button sits around the lower-middle`);
      assert.equal(layoutWidth,331,`${name} closed cover is enlarged by about 20%`);
      assert.ok(control.width>=180&&control.height>=44,`${name} opening button remains accessible`);
    }else{
      assert.ok(button.top>=cover.bottom-2&&button.top-cover.bottom<30,`${name} button sits directly below the cover`);
      assert.ok(Math.abs((button.left+button.right-cover.left-cover.right)/2)<3,`${name} button is centered below the cover`);
      assert.ok(control.height>=44,`${name} mobile opening button is a comfortable touch target`);
    }
  }
}
async function open() {
  await idle();
  await page.locator('#open-archive').click();
  await page.waitForFunction(()=>document.querySelector('#archive-cover').dataset.bookState==='book-focused');
  assert.equal(await page.locator('main').evaluate(el=>el.classList.contains('archive-closed')),true);
  await page.locator('#open-archive').click();
  await page.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed'));
  await idle();
}
async function drag(from,to) {
  const box=await page.locator('#book').boundingBox();
  await page.mouse.move(box.x+box.width*from,box.y+box.height*.5);
  await page.mouse.down(); await page.mouse.move(box.x+box.width*to,box.y+box.height*.5,{steps:12}); await page.mouse.up(); await idle();
}
try {
  await page.goto(origin);
  await page.waitForFunction(()=>document.querySelector('#loader-percent').textContent==='100%');
  assert.equal(await page.locator('#maintenance-screen').isVisible(),true);
  await page.locator('#maintenance-code').fill('2012');
  await page.locator('#maintenance-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await idle();
  assert.equal(await page.locator('main').evaluate(el=>el.classList.contains('archive-closed')),true);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('is-maintenance')),false);
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  const discord=await page.locator('.discord-link').evaluate(element=>({
    href:element.href,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,
    animation:getComputedStyle(element,'::after').animationName,
    pointerEvents:getComputedStyle(element,'::after').pointerEvents
  }));
  assert.equal(discord.href,'https://discord.gg/YaFDtFusrt');
  assert.equal(discord.width,discord.height);
  assert.equal(discord.animation,'archive-control-glow');
  assert.equal(discord.pointerEvents,'none');
  await page.locator('.brand').focus();
  await page.keyboard.press('Tab');
  const discordFocus=await page.locator('.discord-link').evaluate(element=>({
    focused:element.matches(':focus-visible'),animation:getComputedStyle(element,'::after').animationName,
    opacity:getComputedStyle(element,'::after').opacity
  }));
  assert.equal(discordFocus.focused,true);
  assert.equal(discordFocus.animation,'none');
  assert.equal(discordFocus.opacity,'1');
  report('fresh loader, maintenance password, and unlocked overview');
  await verifyOpeningTabs('desktop'); report('desktop opening tabs stay beside covers without overlap or clipping');
  await open(); await spread(0);
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
  await page.locator('#read-spread').click(); assert.equal(await page.locator('#read-content img').count(),2);
  assert.equal(await page.locator('#read-dialog').evaluate(el=>el.classList.contains('directory-reading')),false);
  const armoryReadingStyle=await page.locator('#read-dialog').evaluate(el=>getComputedStyle(el).backgroundImage);
  const armoryGlow=await page.locator('#read-spread').evaluate(element=>({
    buttonAnimation:getComputedStyle(element).animationName,
    animation:getComputedStyle(element,'::after').animationName,
    duration:getComputedStyle(element,'::after').animationDuration,
    pointerEvents:getComputedStyle(element,'::after').pointerEvents,
    playState:getComputedStyle(element,'::after').animationPlayState
  }));
  assert.deepEqual(armoryGlow,{buttonAnimation:'none',animation:'archive-control-glow',duration:'3s',pointerEvents:'none',playState:'paused'});
  await page.keyboard.press('Escape'); report('Armory reading view retains its blue theme');
  await page.locator('#fullscreen').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!!document.fullscreenElement); assert.equal(await page.locator('#fullscreen').textContent(),'EXIT FULLSCREEN');
  await page.locator('#fullscreen').click(); await page.waitForFunction(()=>!document.fullscreenElement); report('keyboard fullscreen entry and exit label');
  await page.locator('#close-archive').click();
  await page.waitForFunction(()=>document.querySelector('main').classList.contains('archive-closed'));
  const overviewSizes=await page.evaluate(()=>[document.querySelector('#archive-cover'),document.querySelector('#rank-cover')].map(cover=>getComputedStyle(cover).width));
  assert.equal(overviewSizes[0],overviewSizes[1]);
  assert.equal(await page.locator('#rank-cover').isVisible(),true);
  await page.getByRole('button',{name:'Show the next book'}).click();
  await page.waitForFunction(()=>document.querySelector('.book-pair').dataset.activeBook==='directory');
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('#rank-cover').dataset.bookState==='book-focused');
  assert.equal(await page.locator('#rank-directory').isVisible(),false);
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('main').classList.contains('directory-open'));
  const palette=await page.evaluate(()=>({
    background:getComputedStyle(document.querySelector('#rank-directory')).getPropertyValue('--rd-bg').trim(),
    panels:getComputedStyle(document.querySelector('#rank-directory')).getPropertyValue('--rd-panel').trim(),
    badge:getComputedStyle(document.querySelector('#rank-directory .rank-person-row:not(.rank-person-head) span:last-child')).color,
    archiveAccent:getComputedStyle(document.querySelector('#open-archive')).color,
    directoryAccent:getComputedStyle(document.querySelector('#open-rank-directory')).color
  }));
  assert.equal(palette.background,'#170a0e');
  assert.equal(palette.panels,'#281016');
  assert.equal(palette.badge,'rgb(237, 100, 117)');
  assert.equal(palette.archiveAccent,'rgb(111, 213, 245)');
  assert.equal(palette.directoryAccent,'rgb(237, 100, 117)');
  assert.match(await page.locator('#rank-cover').evaluate(el=>getComputedStyle(el).backgroundImage),/rank-directory-cover\.webp/);
  assert.equal(await page.locator('#rank-book .page-slot.left .rank-personnel-list-page').count(),1);
  const headers=await page.locator('#rank-book .rank-person-head [role="columnheader"]').allTextContents();
  assert.deepEqual(headers.map(text=>text.trim()),['FULL NAME','BADGE NO.']);
  for (const index of [8,12,0,6,2,10]) {
    await page.locator(`[data-category-index="${index}"]`).click();
    await page.waitForFunction(index=>document.querySelector('#rank-position').textContent===`${String(index+1).padStart(2,'0')} / 13`,index);
    await page.waitForFunction(()=>!document.querySelector('#rank-book').classList.contains('rank-fade-out')&&!document.querySelector('#rank-book').classList.contains('rank-fade-in'));
    assert.equal(await page.locator('#rank-book .page-slot.left .rank-personnel-list-page').count(),1);
    assert.deepEqual((await page.locator('#rank-book .rank-person-head [role="columnheader"]').allTextContents()).map(text=>text.trim()),['FULL NAME','BADGE NO.']);
  }
  const rankGlow=await page.locator('[data-category-index="10"]').evaluate(element=>({
    selected:element.getAttribute('aria-current')==='page',
    animation:getComputedStyle(element,'::before').animationName,
    duration:getComputedStyle(element,'::before').animationDuration,
    pointerEvents:getComputedStyle(element,'::before').pointerEvents
  }));
  assert.deepEqual(rankGlow,{selected:true,animation:'archive-control-glow',duration:'3s',pointerEvents:'none'});
  await page.locator('[data-category-index="10"]').evaluate(element=>element.focus({focusVisible:true}));
  await page.keyboard.press('Tab');
  await page.waitForTimeout(220);
  const rankFocus=await page.locator('[data-category-index="11"]').evaluate(element=>({
    focused:element.matches(':focus-visible'),
    animation:getComputedStyle(element,'::before').animationName,
    opacity:getComputedStyle(element,'::before').opacity,
    readable:getComputedStyle(element).color
  }));
  assert.equal(rankFocus.focused,true);
  assert.equal(rankFocus.animation,'none');
  assert.equal(rankFocus.opacity,'1');
  assert.notEqual(rankFocus.readable,'rgba(0, 0, 0, 0)');
  await page.locator('#rank-next').click();
  await page.waitForFunction(()=>document.querySelector('#rank-position').textContent==='12 / 13');
  await page.locator('#rank-previous').click();
  await page.waitForFunction(()=>document.querySelector('#rank-position').textContent==='11 / 13');
  await page.locator('#rank-directory [data-reader-action="read"]').click();
  await page.locator('#read-dialog').waitFor({state:'visible'});
  const directoryGlow=await page.locator('#rank-directory [data-reader-action="read"]').evaluate(element=>({
    buttonAnimation:getComputedStyle(element).animationName,
    animation:getComputedStyle(element,'::after').animationName,
    duration:getComputedStyle(element,'::after').animationDuration,
    pointerEvents:getComputedStyle(element,'::after').pointerEvents,
    playState:getComputedStyle(element,'::after').animationPlayState
  }));
  assert.deepEqual(directoryGlow,{buttonAnimation:'none',animation:'archive-control-glow',duration:'3s',pointerEvents:'none',playState:'paused'});
  const directoryReading=await page.evaluate(()=>({
    themed:document.querySelector('#read-dialog').classList.contains('directory-reading'),
    background:getComputedStyle(document.querySelector('#read-dialog')).backgroundColor,
    border:getComputedStyle(document.querySelector('#read-dialog')).borderTopColor,
    closeBorder:getComputedStyle(document.querySelector('#close-read')).borderTopColor,
    badge:getComputedStyle(document.querySelector('#read-content .rank-person-row:not(.rank-person-head) span:last-child')).color,
    scrollbar:getComputedStyle(document.querySelector('#read-content')).scrollbarColor,
    title:document.querySelector('#read-content .rank-list-heading h2')?.textContent,
    headers:[...document.querySelectorAll('#read-content .rank-person-head [role="columnheader"]')].map(header=>header.textContent.trim()),
    people:[...document.querySelectorAll('#read-content .rank-person-row:not(.rank-person-head)')].map(row=>row.textContent.trim())
  }));
  assert.equal(directoryReading.themed,true);
  assert.equal(directoryReading.background,'rgb(23, 10, 14)');
  assert.equal(directoryReading.border,'rgb(142, 42, 58)');
  assert.equal(directoryReading.closeBorder,'rgb(142, 42, 58)');
  assert.equal(directoryReading.badge,'rgb(237, 100, 117)');
  assert.match(directoryReading.scrollbar,/rgb\(185, 44, 67\)/);
  assert.match(directoryReading.title,/ASSISTANT COMMISSIONER/);
  assert.deepEqual(directoryReading.headers,['FULL NAME','BADGE NO.']);
  assert.ok(directoryReading.people.length>0,'Directory reading view contains personnel');
  assert.deepEqual(directoryReading.people,await page.locator('#rank-book .page-slot.left .rank-person-row:not(.rank-person-head)').allTextContents().then(rows=>rows.map(row=>row.trim())));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#read-dialog').isVisible(),false);
  assert.match(armoryReadingStyle,/rgb\(16, 35, 51\)/);
  await page.locator('#rank-directory [data-reader-action="read"]').click();
  await page.locator('#read-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#read-dialog').evaluate(el=>el.classList.contains('directory-reading')),true);
  await page.keyboard.press('Escape');
  await page.locator('#rank-close').click();
  await page.waitForFunction(()=>!document.querySelector('main').classList.contains('directory-open')&&document.querySelector('#rank-directory').hidden);
  const restoredSizes=await page.evaluate(()=>[document.querySelector('#archive-cover'),document.querySelector('#rank-cover')].map(cover=>getComputedStyle(cover).width));
  assert.equal(restoredSizes[0],restoredSizes[1]);
  assert.equal(await page.locator('#rank-cover').isVisible(),true);
  await page.setViewportSize({width:390,height:844});
  await verifyOpeningTabs('mobile'); report('mobile opening tabs sit below their covers without overlap or clipping');
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('#rank-cover').dataset.bookState==='book-focused');
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('main').classList.contains('directory-open'));
  await page.locator('#rank-close').click();
  await page.waitForFunction(()=>!document.querySelector('main').classList.contains('directory-open'));
  await page.getByRole('button',{name:'Show the previous book'}).click();
  await page.waitForFunction(()=>document.querySelector('.book-pair').dataset.activeBook==='archive');
  await page.locator('#open-archive').click();
  await page.waitForFunction(()=>document.querySelector('#archive-cover').dataset.bookState==='book-focused');
  await page.locator('#open-archive').click();
  await page.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed'));
  await page.locator('#read-spread').click();
  await page.locator('#read-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#read-dialog').evaluate(el=>el.classList.contains('directory-reading')),false);
  assert.match(await page.locator('#read-dialog').evaluate(el=>getComputedStyle(el).backgroundImage),/rgb\(16, 35, 51\)/);
  await page.keyboard.press('Escape');
  await page.locator('#close-archive').click();
  await page.waitForFunction(()=>document.querySelector('main.archive-closed'));
  await page.getByRole('button',{name:'Show the next book'}).click();
  await page.waitForFunction(()=>document.querySelector('.book-pair').dataset.activeBook==='directory');
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('#rank-cover').dataset.bookState==='book-focused');
  await page.locator('#open-rank-directory').click();
  await page.waitForFunction(()=>document.querySelector('main').classList.contains('directory-open'));
  await page.locator('#rank-directory [data-reader-action="read"]').click();
  await page.locator('#read-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#read-dialog').evaluate(el=>el.classList.contains('directory-reading')),true);
  await page.keyboard.press('Escape');
  await page.locator('#rank-close').click();
  await page.waitForFunction(()=>document.querySelector('main.archive-closed'));
  await page.getByRole('button',{name:'Show the previous book'}).click();
  await page.waitForFunction(()=>document.querySelector('.book-pair').dataset.activeBook==='archive');
  await page.locator('#close-archive').click();
  await page.waitForFunction(()=>document.querySelector('main').classList.contains('archive-closed'));
  await page.setViewportSize({width:1440,height:1000});
  report('mobile Armory and Rank Directory two-step opening controls');
  await open(); report('Rank Directory cover, category switching, fields, and return overview');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await open(); await spread(1); report('existing unlocked session initializes and restores position');
  await page.evaluate(()=>localStorage.setItem('armory-book.spread','999')); await page.reload();
  await page.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await open(); await spread(14);
  assert.equal(await page.locator('#next').isDisabled(),true); await page.locator('#book').focus(); await page.keyboard.press('ArrowRight'); await spread(14); report('clamped saved position and final boundary');
  await page.waitForFunction(()=>document.querySelector('#access-stamp').hidden);
  await mkdir('test-results',{recursive:true}); await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  const fallback=await context.newPage();
  await fallback.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{value:false}));
  await fallback.goto(origin);
  await fallback.waitForFunction(()=>document.querySelector('#loader-percent').textContent==='100%');
  await fallback.locator('#maintenance-code').fill('2012');
  await fallback.locator('#maintenance-form button[type="submit"]').click();
  await fallback.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await fallback.waitForFunction(()=>document.querySelector('#book').getAttribute('aria-busy')==='false');
  assert.equal(await fallback.locator('#fullscreen').evaluate(el=>el.hidden),true); await fallback.close(); report('unsupported fullscreen fallback');
  const failure=await context.newPage();
  let failInitialization=true;
  await failure.route('**/app.js',route=>failInitialization?(failInitialization=false,route.abort()):route.continue());
  await failure.goto(origin);
  await failure.waitForFunction(()=>document.querySelector('#loader-percent').textContent==='100%');
  await failure.addStyleTag({content:'#maintenance-screen{transition:none!important}'});
  await failure.locator('#maintenance-code').fill('2012');
  await failure.locator('#maintenance-form button[type="submit"]').click();
  await failure.locator('#maintenance-retry').waitFor({state:'visible'});
  assert.match(await failure.locator('#maintenance-error').textContent(),/INITIALIZATION FAILED/);
  await failure.locator('#maintenance-retry').click();
  await failure.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await failure.waitForFunction(()=>document.querySelector('#book').getAttribute('aria-busy')==='false');
  await failure.close(); report('zero-duration unlock fallback and visible initialization retry');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await mobile.newPage(); phone.on('pageerror',error=>errors.push(error.message)); await phone.goto(origin);
  await phone.waitForFunction(()=>document.querySelector('#loader-percent').textContent==='100%');
  await phone.locator('#maintenance-code').fill('2012');
  await phone.locator('#maintenance-form button[type="submit"]').tap();
  await phone.waitForFunction(()=>document.querySelector('#maintenance-screen').hidden);
  await phone.waitForFunction(()=>document.querySelector('#book').getAttribute('aria-busy')==='false');
  await phone.locator('#open-archive').tap();
  await phone.waitForFunction(()=>document.querySelector('#archive-cover').dataset.bookState==='book-focused');
  await phone.locator('#open-archive').tap();
  await phone.waitForFunction(()=>!document.querySelector('main').classList.contains('archive-closed'));
  assert.equal(await phone.locator('.section-tabs').count(),0);
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const reducedGlow=await phone.evaluate(()=>({
    discord:getComputedStyle(document.querySelector('.discord-link'),'::after').animationName,
    reading:getComputedStyle(document.querySelector('#read-spread'),'::after').animationName,
    selectedRank:getComputedStyle(document.querySelector('#rank-directory .rank-category-list button[aria-current="page"]'),'::before').animationName
  }));
  assert.deepEqual(reducedGlow,{discord:'none',reading:'none',selectedRank:'none'});
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
