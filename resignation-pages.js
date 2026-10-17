const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stamp=index=>String(index+1).padStart(2,'0');
const info=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value||'—')+'</dd></div>';

// One physical paper page per successfully archived resignation; NEVER alters rank/roster.
export function renderArchivedResignation(entry,index,total) {
  const fields=[
    info('RECORD REFERENCE',entry.reference),info('SUBMITTED ON',entry.submittedAt?.slice(0,10)),
    info('OFFICER NAME',entry.fullName),info('BADGE NUMBER',entry.badgeNumber),
    info('CURRENT RANK',entry.currentRank),info('EFFECTIVE DATE',entry.effectiveDate)
  ].join('');
  return '<article class="supplemental-page resignation-archive-page" data-supplemental-page-index="'+index+'">'+
    '<header><span>SAST / PERSONNEL NOTICE</span><b>'+stamp(index)+' / '+stamp(total)+'</b></header>'+
    '<div class="supplemental-page-body"><p class="supplemental-label">ARCHIVED RESIGNATION NOTICE</p>'+
    '<h2>TROOPER RESIGNATION</h2><div class="supplemental-rule"></div>'+
    '<section class="resignation-archived-document">'+
    '<div class="resignation-archived-document__banner"><span>ELYSIUM / SAST</span><strong>NOTICE RECEIVED</strong></div>'+
    '<dl>'+fields+'</dl><h3>STATEMENT OF RESIGNATION</h3><p class="resignation-archived-statement">'+esc(entry.reason)+'</p>'+
    (entry.notes?'<h3>ADDITIONAL NOTES</h3><p class="resignation-archived-statement">'+esc(entry.notes)+'</p>':'')+
    '<div class="resignation-archived-document__foot">SUBMITTED NOTICE · PERSONNEL STATUS NOT AUTOMATICALLY CHANGED</div>'+
    '</section></div><footer>OFFICIAL SUBMISSION RECORD <span>RESIGNATION NOTICES</span></footer></article>';
}
export function buildResignationPages(records=[],templates,buildPage) {
  const sorted=records.slice().sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||''))||String(b.reference||'').localeCompare(String(a.reference||'')));
  const paperSlots=Math.ceil(sorted.length/2)*2;
  const total=10+paperSlots;
  const formIndex=total-2;
  const out=templates.slice(0,8).map((template,index)=>{
    if(index===6)template=['07 / RECORDS','SUBMITTED NOTICES','PERMANENT ARCHIVE',
      'Confirmed resignation notices are archived on the following physical pages. This register records submissions only; it does not automatically change any officer’s rank or status.'];
    return buildPage(template,index,'resignation',formIndex,total);
  });
  for(let i=0;i<paperSlots;i++) {
    const index=i+8;
    out.push(sorted[i]?renderArchivedResignation(sorted[i],index,total):
      '<article class="supplemental-page resignation-archive-page" data-supplemental-page-index="'+index+'">'+
      '<header><span>SAST / PERSONNEL RECORDS</span><b>'+stamp(index)+' / '+stamp(total)+'</b></header>'+
      '<div class="supplemental-page-body"><p class="supplemental-label">RESERVED RECORD</p><h2>AVAILABLE PAPER</h2>'+
      '<div class="supplemental-rule"></div><p>This page is reserved for the next confirmed resignation notice.</p></div>'+
      '<footer>RESIGNATION ARCHIVE <span>CONTROLLED COPY</span></footer></article>');
  }
  out.push(buildPage(templates[8],formIndex,'resignation',formIndex,total));
  out.push(buildPage(templates[9],formIndex+1,'resignation',formIndex,total));
  return out;
}
