document.body.classList.add('reader-enhanced');
const search=document.querySelector('#docs-search');
const results=document.querySelector('#search-results');
const status=document.querySelector('#reader-status');
let indexPromise,queryVersion=0;
const closeSearch=()=>{results.hidden=true;};
function positionResults(){const rect=document.querySelector('.docs-tools').getBoundingClientRect();const width=Math.min(750,innerWidth-32);results.style.width=width+'px';results.style.left=Math.max(16,Math.min(search.getBoundingClientRect().left,innerWidth-width-16))+'px';results.style.top=(rect.bottom+8)+'px';results.style.maxHeight=Math.max(150,innerHeight-rect.bottom-28)+'px';}
window.addEventListener('resize',()=>{if(!results.hidden)positionResults();});
search.addEventListener('input',async()=>{
  const query=search.value.trim().toLocaleLowerCase(),version=++queryVersion;
  if(query.length<2){closeSearch();return;}
  try {
    indexPromise??=fetch('read/search-index.json').then(r=>{if(!r.ok)throw Error('index');return r.json();});
    const index=await indexPromise;if(version!==queryVersion)return;
    const terms=query.split(/\s+/),matches=index.filter(p=>terms.every(t=>(p.title+' '+p.text).toLocaleLowerCase().includes(t)))
      .sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(query))-Number(a.title.toLocaleLowerCase().includes(query))).slice(0,10);
    const heading=document.createElement('p');heading.className='search-summary';heading.textContent=matches.length?'Найдено статей: '+matches.length:'Ничего не найдено. Попробуй другое слово или выбери раздел.';
    results.replaceChildren(heading);
    for(const match of matches){const a=document.createElement('a'),title=document.createElement('strong'),snippet=document.createElement('span');a.href=match.url;title.textContent=match.title;const at=match.text.toLocaleLowerCase().indexOf(terms[0]);snippet.textContent=(at>60?'…':'')+match.text.slice(Math.max(0,at-60),Math.max(0,at-60)+180)+'…';a.append(title,snippet);results.append(a);}
    results.hidden=false;positionResults();
  }catch{indexPromise=null;results.textContent='Поиск сейчас недоступен. Статьи можно открыть через меню разделов.';results.hidden=false;positionResults();}
});
search.addEventListener('search',()=>{if(!search.value)closeSearch();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSearch();search.value='';if(document.activeElement.closest('#search-results'))search.focus();}
  if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.activeElement.isContentEditable){e.preventDefault();search.focus();}
});
document.addEventListener('click',e=>{if(!e.target.closest('.docs-tools,#search-results'))closeSearch();});
const menu=document.querySelector('#menu-toggle'),nav=document.querySelector('#docs-nav');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
for(const button of document.querySelectorAll('.code-copy'))button.addEventListener('click',async()=>{
  const code=button.closest('.code-block').querySelector('code');
  try{await navigator.clipboard.writeText(code.textContent);button.textContent='Скопировано';status.textContent='Код скопирован';}
  catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);button.textContent='Текст выделен';status.textContent='Копирование недоступно. Текст выделен: скопируй его вручную.';}
  setTimeout(()=>{button.textContent='Копировать';},2500);
});
for(const table of document.querySelectorAll('article table')){const wrapper=document.createElement('div');wrapper.className='table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Таблица, доступна горизонтальная прокрутка');table.before(wrapper);wrapper.append(table);}
const tocLinks=[...document.querySelectorAll('.docs-toc a')];
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)for(const a of tocLinks)a.classList.toggle('is-active',a.hash==='#'+encodeURIComponent(entry.target.id)||decodeURIComponent(a.hash.slice(1))===entry.target.id);},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('article h2,article h3').forEach(h=>observer.observe(h));}
