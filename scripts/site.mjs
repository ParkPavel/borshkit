// Build a self-contained documentation site from the repository's Markdown.
// Markdown parsing: Marked 15.0.12 (MIT), vendored with its license.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from './vendor/marked/marked.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://parkpavel.github.io/borshkit/';
const REPO = 'https://github.com/ParkPavel/borshkit/blob/main/';
export const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const posix = p => p.split(path.sep).join('/');
export const slug = s => s.replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s/g,'-');
const stripFrontmatter = s => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
export const route = file => file==='docs/README.md' ? 'index.html' : file.startsWith('docs/') ? file.slice(5).replace(/\.md$/,'.html') : file==='library/README.md' ? 'library/index.html' : `project/${file.replace(/\.md$/,'.html')}`;
export function resolveLink(href, source, files, image=false) {
  // Encoded controls / active schemes are never allowed into generated attributes.
  if (/^[\s\x00-\x20]*(?:javascript|data|vbscript):/i.test(href.replace(/&#(?:x([\da-f]+)|(\d+));?/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))))) return '#';
  if (href.startsWith(SITE+'read/')) return href.slice(SITE.length).replace(/^read\/README\.html/, 'read/index.html');
  if (href.startsWith(REPO)) href='/'+href.slice(REPO.length);
  if(href.startsWith('#'))return 'read/'+route(source)+href;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  let [file, fragment] = href.split('#');
  try { file=decodeURIComponent(file); } catch { return '#'; }
  const target=posix(path.normalize(file.startsWith('/') ? file.slice(1) : path.join(path.dirname(source),file)));
  if (target.startsWith('../') || path.isAbsolute(target)) return '#';
  const anchor=fragment ? '#'+fragment : '';
  if (files.has(target)) return 'read/'+route(target)+anchor;
  if (target.startsWith('assets/')) return 'media/'+target.slice(7)+anchor;
  if (image) return /^https?:/i.test(href) ? href : '#';
  return REPO+target+anchor;
}
export function renderMarkdown(markdown,source,files) {
  const toc=[],ids=new Map();
  const parser=new Marked({gfm:true, renderer:{
    heading({tokens,depth}) { const text=this.parser.parseInline(tokens),base=slug(text)||'section',n=ids.get(base)||0;ids.set(base,n+1);const id=base+(n?'-'+n:'');if(depth===2||depth===3)toc.push({depth,id,text:text.replace(/<[^>]*>/g,'')});return `<h${depth} id="${escape(id)}">${text}<a class="heading-anchor" href="read/${route(source)}#${escape(id)}" aria-label="Ссылка на раздел">#</a></h${depth}>\n`; },
    link({href,tokens,title}) { return `<a href="${escape(resolveLink(href,source,files))}"${title?` title="${escape(title)}"`:''}>${this.parser.parseInline(tokens)}</a>`; },
    image({href,text}) { return `<img src="${escape(resolveLink(href,source,files,true))}" alt="${escape(text)}" loading="lazy">`; },
    html({text}) {
      return text.split(/(<[^>]*>)/g).map(part=>{
        if(!part.startsWith('<'))return escape(part);
        const m=/^<(\/?)([a-z]+)\b([^>]*)>$/i.exec(part);if(!m)return escape(part);
        const [,closing,rawTag,attrs]=m,tag=rawTag.toLowerCase();
        if(['p','details','summary','br','kbd','sup','sub','strong','em'].includes(tag))return `<${closing}${tag}>`;
        if(tag==='a'){if(closing)return '</a>';const href=/\bhref="([^"]*)"/i.exec(attrs)?.[1];return href?`<a href="${escape(resolveLink(href,source,files))}">`:'';}
        if(tag==='img'&&!closing){const href=/\bsrc="([^"]*)"/i.exec(attrs)?.[1],alt=/\balt="([^"]*)"/i.exec(attrs)?.[1]||'';return href?`<img src="${escape(resolveLink(href,source,files,true))}" alt="${escape(alt)}" loading="lazy">`:'';}
        return escape(part);
      }).join('');
    },
    table({header,rows}) {
      if(source!=='docs/README.md'||header[0]?.text!=='Тебе нужно')return false;
      return `<div class="doc-cards">${rows.map((row,i)=>`<section class="doc-card${i===0?' doc-card-first':''}"><span>0${i+1}</span><h2>${this.parser.parseInline(row[0].tokens)}</h2><p>${this.parser.parseInline(row[1].tokens)}</p></section>`).join('')}</div>`;
    },
    code({text,lang}) {if(lang==='mermaid')return `<details class="diagram-source"><summary>Схема процесса · открыть описание связей</summary><pre tabindex="0"><code>${escape(text)}</code></pre></details>`;return `<div class="code-block"><div class="code-toolbar"><span>${escape(lang||'команда')}</span><button type="button" class="code-copy" aria-label="Скопировать блок кода">Копировать</button></div><pre tabindex="0"><code>${escape(text)}</code></pre></div>`;}
  }});
  // Existing GitHub image wrappers become normal Markdown, without importing HTML.
  let body=stripFrontmatter(markdown).replace(/<p\b[^>]*>\s*<img\b([^>]+)>\s*<\/p>/gi,(_,attrs)=>{
    const src=/\bsrc="([^"]+)"/.exec(attrs)?.[1],alt=/\balt="([^"]*)"/.exec(attrs)?.[1]||'';
    return src?`\n![${alt}](${src})\n`:'';
  });
  if(source==='docs/README.md')body=body.replace(/```mermaid[\s\S]*?```/, '![Путь задачи: цель, работа, проверки и лист приёмки](../assets/diagrams/flow.ru.svg)');
  if(source==='docs/guide/team-operations.md'||source==='docs/concepts/team-workspace.md')body=body.replace(/```mermaid[\s\S]*?```/, '![Цикл команды: настройка, роли, проверки, приёмка](../../assets/diagrams/operations.ru.svg)');
  const html=parser.parse(body);return {html,toc};
}
const groups=[
 ['Начать здесь',['docs/README.md','docs/guide/quickstart.md','docs/guide/workflow.md','docs/guide/setup.md']],
 ['Работать с задачами',['docs/guide/handoff.md','docs/guide/native-integrations.md','docs/guide/team-operations.md','docs/concepts/acceptance.md','docs/concepts/evidence.md','docs/concepts/executors.md','docs/concepts/privacy.md','docs/concepts/knowledge.md','docs/concepts/glossary.md']],
 ['Справочник',['docs/reference/commands.md','docs/reference/contract.md','docs/reference/team-resources.md','docs/architecture.md','docs/roadmap.md','docs/release.md','docs/ingredients.md','library/README.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md']]
];
async function markdownFiles(dir) {const out=[];for(const e of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){const f=posix(path.join(dir,e.name));if(e.isDirectory())out.push(...await markdownFiles(f));else if(e.isFile()&&e.name.endsWith('.md'))out.push(f);}return out;}
export async function buildSite(output=path.join(ROOT,'docs','read')) {
  const sources=[...await markdownFiles('docs'),...(await fs.readdir(ROOT)).filter(f=>f.endsWith('.md')),'library/README.md'].filter(f=>!f.startsWith('docs/read/')&&!f.startsWith('docs/media/')).sort();
  const files=new Set(sources),pages=[];
  for(const source of sources){const markdown=await fs.readFile(path.join(ROOT,source),'utf8'),plain=stripFrontmatter(markdown),title=/^#\s+(.+)$/m.exec(plain)?.[1]||path.basename(source);pages.push({source,title,markdown,...renderMarkdown(markdown,source,files)});}
  const known=new Set(groups.flatMap(g=>g[1]));const allGroups=[...groups,['Ещё материалы',pages.filter(p=>!known.has(p.source)&&!p.source.startsWith('docs/discussions/')&&!p.source.startsWith('docs/graph/')).map(p=>p.source)],['История и отчёты',pages.filter(p=>p.source.startsWith('docs/discussions/')||p.source.startsWith('docs/graph/')).map(p=>p.source)]];
  const titles=new Map(pages.map(p=>[p.source,p.title]));
  if(path.basename(output)!=='read')throw Error('Выходной каталог документации должен называться read');
  await fs.rm(output,{recursive:true,force:true});
  await fs.mkdir(output,{recursive:true});
  for(const page of pages){
    const currentRoute='read/'+route(page.source),depth=route(page.source).split('/').length,base='../'.repeat(depth);
    const sidebar=allGroups.map(([name,list],i)=>{const links=list.filter(f=>files.has(f)).map(f=>`<a href="read/${route(f)}"${f===page.source?' aria-current="page"':''}>${escape(titles.get(f))}</a>`).join('');return i<3?`<section><h2>${name}</h2>${links}</section>`:`<details${list.includes(page.source)?' open':''}><summary>${name}</summary>${links}</details>`;}).join('');
    const toc=page.toc.map(h=>`<a href="${currentRoute}#${escape(h.id)}" class="toc-level-${h.depth}">${escape(h.text)}</a>`).join('');
    const order=groups.flatMap(g=>g[1]).filter(f=>files.has(f)),idx=order.indexOf(page.source);
    const adjacent=[[-1,'Назад'],[1,'Дальше']].map(([step,label])=>{const f=idx>=0?order[idx+step]:null;return f?`<a href="read/${route(f)}"><small>${label}</small>${escape(titles.get(f))}</a>`:'<span></span>';}).join('');
    const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${base}"><meta name="description" content="${escape(page.title)} — документация Borshkit"><meta name="theme-color" content="#141619"><title>${escape(page.title)} · Borshkit</title><link rel="canonical" href="${SITE+currentRoute}"><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="reader.css"><script src="reader.js" defer></script></head><body class="docs-page"><a class="skip" href="${currentRoute}#article">К статье</a><header class="docs-header"><a class="brand" href="index.html">borshkit<span class="brand-dot">.</span></a><a class="docs-label" href="read/index.html">Документация <span>0.13</span></a><nav aria-label="Навигация проекта"><a href="index.html">Обзор</a><a href="https://github.com/ParkPavel/borshkit/releases/tag/0.13.0">Скачать</a><a class="support-link" href="https://web.tribute.tg/d/Sh8">Поддержать</a><a href="https://github.com/ParkPavel/borshkit">GitHub</a></nav></header><div class="docs-tools"><button type="button" id="menu-toggle" aria-controls="docs-nav" aria-expanded="false">Разделы</button><label class="search-label" for="docs-search">Найти в документации</label><input id="docs-search" type="search" placeholder="Задача, проверка, Copilot…" autocomplete="off" aria-controls="search-results"><span class="search-shortcut" aria-hidden="true">/</span></div><div class="search-output" id="search-results" aria-live="polite" hidden></div><div class="docs-layout"><aside id="docs-nav" class="docs-sidebar"><nav aria-label="Разделы документации">${sidebar}</nav><a class="sidebar-support" href="https://web.tribute.tg/d/Sh8"><strong>Поддержать Borshkit</strong><span>Помоги развивать открытый инструмент.</span></a></aside><main id="article" tabindex="-1" class="docs-article"><div class="article-meta"><span>${page.source.startsWith('docs/discussions/')?'ИСТОРИЯ / ОТЧЁТ':'ДОКУМЕНТАЦИЯ'}</span><a href="${REPO+page.source}">Исходник на GitHub</a></div><article lang="${/(?:README|overview)\.(en|de|fr|ko|zh-TW)\.md$/.exec(page.source)?.[1]||'ru'}">${page.html}</article><nav class="page-neighbors" aria-label="Предыдущая и следующая статьи">${adjacent}</nav><footer class="article-footer"><p>Не хватает ответа? <a href="https://github.com/ParkPavel/borshkit/issues">Сообщи об этом</a>.</p><a href="index.html">К обзору продукта</a></footer></main><aside class="docs-toc" aria-label="В этой статье"><p>В этой статье</p><nav>${toc}</nav></aside></div><p class="reader-status sr-only" id="reader-status" role="status"></p></body></html>\n`;
    const target=path.join(output,route(page.source));await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html);
  }
  const index=pages.map(p=>({title:p.title,url:'read/'+route(p.source),text:stripFrontmatter(p.markdown).replace(/^```.*$/gm,' ').replace(/<[^>]+>|[\[\]#*_`|]/g,' ').replace(/\s+/g,' ').trim(),sections:p.toc.filter(h=>h.depth===2)}));
  await fs.writeFile(path.join(output,'search-index.json'),JSON.stringify(index)+'\n');
  // Only public, versioned artwork; never copy user workspaces or service data.
  await fs.rm(path.join(path.dirname(output),'media'),{recursive:true,force:true});
  await fs.cp(path.join(ROOT,'assets'),path.join(path.dirname(output),'media'),{recursive:true});
  return {pages:pages.length,output};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildSite()));
