const clean=value=>String(value??'').trim();
const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T00:00:00Z');
  return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;
};
export function validateBulletinDraft(data) {
  const errors={};
  if(!data.title||data.title.length>120)errors.title='Enter a title of up to 120 characters.';
  if(!['Announcement','Order'].includes(data.type))errors.type='Select Announcement or Order.';
  if(!data.issuedBy||data.issuedBy.length>100)errors.issuedBy='Enter the High Command officer issuing this notice.';
  if(!['Normal','Important','Urgent'].includes(data.priority))errors.priority='Select a priority.';
  if(!data.message||data.message.length>4000)errors.message='Enter the full announcement or order.';
  if(data.expiryDate&&!validDate(data.expiryDate))errors.expiryDate='Choose a valid expiry date.';
  if(!data.confirmation)errors.confirmation='Confirm High Command approval before publication.';
  if(!data.secret)errors.secret='Enter the High Command publishing access key.';
  return errors;
}
export function createBulletinEditor({onPublished,onDraft}={}) {
  const element=document.createElement('section');
  element.className='high-command-bulletin-editor';
  element.innerHTML=[
    '<p class="bulletin-editor-kicker">HIGH COMMAND / AUTHORIZED PUBLISHING</p>',
    '<h3>PUBLISH AN ANNOUNCEMENT</h3>',
    '<p>Fill out this notice. Review it on the facing page, then publish it to the shared book.</p>',
    '<form data-bulletin-form novalidate>',
    '<label>NOTICE TYPE<select name="type"><option>Announcement</option><option>Order</option></select></label>',
    '<label>NOTICE TITLE<input name="title" type="text" maxlength="120" required autocomplete="off" placeholder="Official subject"></label>',
    '<label>ISSUED BY<input name="issuedBy" maxlength="100" required autocomplete="off" placeholder="High Command officer / rank"></label>',
    '<label>PRIORITY<select name="priority"><option>Normal</option><option>Important</option><option>Urgent</option></select></label>',
    '<label>FULL ANNOUNCEMENT / ORDER<textarea name="message" maxlength="4000" rows="5" required placeholder="Write the authorized announcement..."></textarea></label>',
    '<label>EXPIRY DATE (OPTIONAL)<input name="expiryDate" type="date"></label>',
    '<label class="bulletin-checkbox"><input name="pinned" type="checkbox"><span>PIN NOTICE AT THE TOP</span></label>',
    '<label>HIGH COMMAND ACCESS KEY<input name="secret" type="password" autocomplete="off" spellcheck="false" required placeholder="Publishing permission"></label>',
    '<label class="bulletin-checkbox"><input name="confirmation" type="checkbox" required><span>I confirm High Command has approved publication.</span></label>',
    '<div class="bulletin-editor-actions"><button type="button" data-bulletin-review>REVIEW DRAFT</button><button type="submit" data-bulletin-publish disabled>PUBLISH TO BOOK</button></div>',
    '<p class="bulletin-editor-status" role="status" aria-live="polite" data-bulletin-status>Only approved notices are published.</p>',
    '</form>'
  ].join('');
  const form=element.querySelector('form');
  const review=element.querySelector('[data-bulletin-review]');
  const publish=element.querySelector('[data-bulletin-publish]');
  const status=element.querySelector('[data-bulletin-status]');
  let reviewed=false,publishing=false,phase='draft';
  const values=()=>({
    title:clean(form.elements.title.value),type:clean(form.elements.type.value),
    issuedBy:clean(form.elements.issuedBy.value),priority:clean(form.elements.priority.value),
    message:clean(form.elements.message.value),expiryDate:clean(form.elements.expiryDate.value),
    pinned:form.elements.pinned.checked,confirmation:form.elements.confirmation.checked,
    secret:form.elements.secret.value
  });
  const snapshot=()=>{
    const {secret,...data}=values();
    return {...data,phase};
  };
  const notify=()=>onDraft?.(snapshot());
  function showErrors(errors) {
    form.querySelectorAll('[aria-invalid]').forEach(field=>field.removeAttribute('aria-invalid'));
    for(const field of Object.keys(errors))form.elements[field]?.setAttribute('aria-invalid','true');
    status.textContent=Object.values(errors)[0]||'Draft reviewed. Ready for authorized publication.';
    return Object.keys(errors).length===0;
  }
  function markDraft(){
    if(publishing)return;
    reviewed=false;phase='draft';publish.disabled=true;
    status.textContent='DRAFT — nothing has been published.';
    notify();
  }
  form.addEventListener('input',markDraft);
  form.addEventListener('change',markDraft);
  review.addEventListener('click',()=>{
    const data=values();
    if(showErrors(validateBulletinDraft(data))){
      reviewed=true;phase='reviewed';publish.disabled=false;
      status.textContent='REVIEWED — click PUBLISH TO BOOK to make it official.';
      notify();
    } else {reviewed=false;phase='draft';publish.disabled=true;notify();}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(publishing)return;
    const data=values();
    if(!showErrors(validateBulletinDraft(data))||!reviewed){publish.disabled=true;status.textContent='Review the completed form first.';return}
    publishing=true;phase='publishing';review.disabled=true;publish.disabled=true;notify();
    status.textContent='SAVING OFFICIAL NOTICE...';
    try {
      const {secret,...payload}=data;
      const response=await fetch('/api/bulletins',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},
        body:JSON.stringify(payload),cache:'no-store'
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||'Publication could not be confirmed.');
      if(!result.bulletin?.reference)throw Error('Server did not confirm a bulletin reference.');
      phase='published';
      status.textContent='PUBLISHED — '+result.bulletin.reference+'. The notice is now a page in the book.';
      onPublished?.(result.bulletin);
      form.reset();
      reviewed=false;publish.disabled=true;notify();
    } catch(error) {
      phase='error';status.textContent=error.message;
      reviewed=false;publish.disabled=true;notify();
    } finally {publishing=false;review.disabled=false;}
  });
  notify();
  return {element,snapshot,form};
}
