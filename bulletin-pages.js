const escape = value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const number = index=>String(index+1).padStart(2,'0');
function page(index,heading,eyebrow,label,inner){
  return '<article class="supplemental-page bulletin-book-page" data-supplemental-page-index="'+index+'">'+
    '<header><span>'+escape(eyebrow)+'</span><b>'+number(index)+' / OFFICIAL RECORD</b></header>'+
    '<div class="supplemental-page-body"><p class="supplemental-label">'+escape(label)+'</p>'+
    '<h2>'+escape(heading)+'</h2><div class="supplemental-rule"></div>'+inner+'</div>'+
    '<footer>SAST / HIGH COMMAND <span>ANNOUNCEMENTS &amp; ORDERS</span></footer></article>';
}
const field=(label,value)=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value||'—')+'</dd></div>';
export function bulletinDocument(item,index){
  const info=[
    field('REFERENCE',item.reference),field('PUBLISHED',item.publishedDate),
    field('ISSUED BY',item.issuedBy),field('PRIORITY',item.priority),
    field('EXPIRY',item.expiryDate||'No expiry'),field('STATUS',item.pinned?'PINNED / OFFICIAL':'OFFICIAL')
  ].join('');
  const content='<section class="bulletin-official-sheet" aria-label="Official published '+escape(item.type)+'">'+
    '<div class="bulletin-official-sheet__top"><span>ELYSIUM / SAST</span><strong>PUBLISHED · '+escape(item.type).toUpperCase()+'</strong></div>'+
    '<dl>'+info+'</dl><div class="bulletin-official-sheet__message"><h3>OFFICIAL COMMUNICATION</h3>'+
    '<p>'+escape(item.message)+'</p></div>'+
    '<div class="bulletin-official-sheet__stamp">HIGH COMMAND / CONTROLLED CIRCULATION</div></section>';
  return page(index,item.title,'HC / '+item.type.toUpperCase(),'OFFICIAL NOTICE • '+item.reference,content);
}
export function buildBulletinPages(records=[]){
  const sorted=records.slice().sort((a,b)=>
    Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) ||
    String(b.publishedAt||b.publishedDate).localeCompare(String(a.publishedAt||a.publishedDate))
  );
  const articleSlots=Math.max(6,Math.ceil(sorted.length/2)*2);
  const count=articleSlots+4;
  const pages=[];
  pages.push(page(0,'ANNOUNCEMENTS & ORDERS','HIGH COMMAND / ISSUED RECORDS','OFFICIAL DEPARTMENT BULLETINS',
    '<p>Read verified announcements and orders issued by High Command. Each confirmed publication occupies its own page and receives a permanent reference number.</p>'+
    '<p class="bulletin-instruction">Turn the page to see the register and published records. High Command can publish from the final spread.</p>'));
  const summaries=sorted.slice(0,9).map((item,i)=>
    '<div class="bulletin-index-row"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+escape(item.title)+'</strong><small>'+escape(item.type)+' / '+escape(item.reference)+'</small></div>'
  ).join('');
  pages.push(page(1,'PUBLICATION REGISTER','HIGH COMMAND / INDEX','LATEST OFFICIAL PUBLICATIONS',
    sorted.length?'<div class="bulletin-index">'+summaries+'</div><p>'+sorted.length+' published document(s). Continue turning for full texts.</p>':
      '<div class="bulletin-empty-state">NO OFFICIAL ANNOUNCEMENTS PUBLISHED YET.</div><p>Approved High Command publications will appear automatically in this volume.</p>'));
  for(let i=0;i<articleSlots;i++){
    pages.push(sorted[i]?bulletinDocument(sorted[i],i+2):
      page(i+2,'AVAILABLE RECORD','HC / UNASSIGNED','RESERVED PAPER','<div class="bulletin-empty-state">RESERVED FOR A FUTURE VERIFIED COMMAND NOTICE.</div>'));
  }
  pages.push(page(count-2,'PUBLISH A NOTICE','HIGH COMMAND / AUTHORIZED EDITOR','FORM · HIGH COMMAND ONLY',
    '<div class="bulletin-form-slot" data-bulletin-editor-slot></div>'));
  pages.push(page(count-1,'PUBLICATION PREVIEW','HIGH COMMAND / LIVE DOCUMENT','PREVIEW · NOT YET PUBLISHED',
    '<section class="bulletin-official-sheet bulletin-preview-sheet" data-bulletin-preview>'+
    '<div class="bulletin-official-sheet__top"><span>ELYSIUM / SAST</span><strong data-preview-phase>DRAFT • NOT PUBLISHED</strong></div>'+
    '<dl>'+['type','title','issuedBy','priority','expiryDate'].map(key=>'<div><dt>'+escape(({type:'TYPE',title:'TITLE',issuedBy:'ISSUED BY',priority:'PRIORITY',expiryDate:'EXPIRY'})[key])+'</dt><dd data-preview-field="'+key+'">—</dd></div>').join('')+'</dl>'+
    '<div class="bulletin-official-sheet__message"><h3>FULL NOTICE</h3><p data-preview-field="message">—</p></div>'+
    '<div class="bulletin-official-sheet__stamp">PREVIEW ONLY / AWAITING APPROVAL AND PUBLICATION</div></section>'));
  return pages;
}
