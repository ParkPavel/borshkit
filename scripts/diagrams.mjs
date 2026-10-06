// Animated SVG explainers for the README in every language Borshkit ships.
// GitHub shows SVG through <img>, where CSS animations run and the page's
// colour scheme and reduced-motion preference apply. Without motion each
// picture shows its final, meaningful state. Run: node scripts/diagrams.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../core/io.mjs';

export const LANGS = ['ru', 'en', 'de', 'ko', 'zh-TW', 'fr'];
const T = {
  ru: {
    tagline: 'задачи · доказательства · приёмка · знания',
    bannerDesc: 'Миска борща, над которой поднимается пар и модули-кубики: задачи, проверки и знания собираются в одно пространство.',
    flow: { title: 'Путь одной задачи', steps: [['Цель', 'ты описываешь'], ['Работа', 'агент в копии'], ['Проверки', 'тесты, сборка'], ['Лист приёмки', 'что доказано'], ['Принято', 'собрать, отправить']], you: ['Ты', 'ручные пункты'],
      caption: '«Готово» от модели — ещё не приёмка. Всё, что не доказано, приходит к тебе списком.' },
    evidence: { title: 'Доказательство устаревает', state: 'состояние', check: 'проверка', edit: 'правка', passFor: 'для', stale: 'устарело', staleFrom: 'снято с',
      caption: 'Изменился хоть один байт — проверку надо повторить, даже если правка ещё не в коммите.' },
    pool: { title: 'Пул исполнителей', job: 'Работа', limit: 'лимит исчерпан', working: 'работает…', done: 'готово ✓', standby: 'ждёт', board: 'диспетчерская',
      s: ['→ claude: начал работу', 'claude: лимит исчерпан → codex', 'codex: готово ✓ · переключений: 1'],
      caption: 'Упёрся в лимит — работа сама переходит к следующему, кому это разрешено и кто это умеет.' },
    kb: { title: 'Знания: заметки + связи + SQL', project: 'проект', graph: 'граф (Obsidian)',
      caption: 'Одни и те же заметки — граф в Obsidian, ссылки на GitHub и таблицы для SQL.' },
  },
  en: {
    tagline: 'tasks · evidence · acceptance · knowledge',
    bannerDesc: 'A bowl of borscht with steam and module cubes rising above it: tasks, checks and knowledge come together in one workspace.',
    flow: { title: 'How a task travels', steps: [['Goal', 'you describe it'], ['Work', 'agent in a copy'], ['Checks', 'tests, build'], ['Acceptance sheet', 'what is proven'], ['Accepted', 'merge, push']], you: ['You', 'manual items'],
      caption: '“Done” from a model is not acceptance yet. Whatever isn’t proven comes to you as a list.' },
    evidence: { title: 'Evidence goes stale', state: 'state', check: 'check', edit: 'edit', passFor: 'for', stale: 'stale', staleFrom: 'taken on',
      caption: 'Change a single byte and the check must run again — even if the edit isn’t committed yet.' },
    pool: { title: 'Executor pool', job: 'Job', limit: 'limit reached', working: 'working…', done: 'done ✓', standby: 'standby', board: 'dispatcher',
      s: ['→ claude: started', 'claude: limit reached → codex', 'codex: done ✓ · switches: 1'],
      caption: 'Hit a limit, and the job moves on to the next executor that is allowed and able.' },
    kb: { title: 'Knowledge: notes + links + SQL', project: 'project', graph: 'graph (Obsidian)',
      caption: 'The same notes: a graph in Obsidian, links on GitHub, tables for SQL.' },
  },
  de: {
    tagline: 'Aufgaben · Nachweise · Abnahme · Wissen',
    bannerDesc: 'Eine Schüssel Borschtsch, über der Dampf und Modulwürfel aufsteigen: Aufgaben, Prüfungen und Wissen kommen in einem Arbeitsbereich zusammen.',
    flow: { title: 'Der Weg einer Aufgabe', steps: [['Ziel', 'du beschreibst es'], ['Arbeit', 'Agent in Kopie'], ['Prüfungen', 'Tests, Build'], ['Abnahmeblatt', 'was belegt ist'], ['Abgenommen', 'mergen, pushen']], you: ['Du', 'manuelle Punkte'],
      caption: '„Fertig“ vom Modell ist noch keine Abnahme. Was nicht belegt ist, kommt als Liste zu dir.' },
    evidence: { title: 'Nachweise veralten', state: 'Zustand', check: 'Prüfung', edit: 'Änderung', passFor: 'für', stale: 'veraltet', staleFrom: 'erhoben auf',
      caption: 'Ändert sich auch nur ein Byte, muss die Prüfung neu laufen – auch ohne Commit.' },
    pool: { title: 'Ausführer-Pool', job: 'Auftrag', limit: 'Limit erreicht', working: 'arbeitet…', done: 'fertig ✓', standby: 'wartet', board: 'Leitstand',
      s: ['→ claude: gestartet', 'claude: Limit erreicht → codex', 'codex: fertig ✓ · Wechsel: 1'],
      caption: 'Ist ein Limit erreicht, geht der Auftrag an den Nächsten, der darf und kann.' },
    kb: { title: 'Wissen: Notizen + Links + SQL', project: 'Projekt', graph: 'Graph (Obsidian)',
      caption: 'Dieselben Notizen: Graph in Obsidian, Links auf GitHub, Tabellen für SQL.' },
  },
  ko: {
    tagline: '작업 · 증거 · 인수 · 지식',
    bannerDesc: '김과 모듈 큐브가 피어오르는 보르시 한 그릇: 작업, 검사, 지식이 하나의 작업 공간에 모입니다.',
    flow: { title: '작업 하나의 여정', steps: [['목표', '직접 설명'], ['작업', '복사본의 에이전트'], ['검사', '테스트, 빌드'], ['인수 시트', '증명된 것'], ['승인됨', '병합, 푸시']], you: ['나', '수동 항목'],
      caption: '모델의 “완료”는 아직 인수가 아닙니다. 증명되지 않은 것은 목록으로 당신에게 옵니다.' },
    evidence: { title: '증거는 낡는다', state: '상태', check: '검사', edit: '수정', passFor: '기준', stale: '만료됨', staleFrom: '측정 시점',
      caption: '1바이트만 바뀌어도 검사를 다시 해야 합니다. 커밋 전 수정도 마찬가지입니다.' },
    pool: { title: '실행자 풀', job: '작업', limit: '한도 도달', working: '작업 중…', done: '완료 ✓', standby: '대기', board: '상황판',
      s: ['→ claude: 시작', 'claude: 한도 도달 → codex', 'codex: 완료 ✓ · 전환: 1회'],
      caption: '한도에 걸리면 작업은 허용되고 할 수 있는 다음 실행자에게 넘어갑니다.' },
    kb: { title: '지식: 노트 + 링크 + SQL', project: '프로젝트', graph: '그래프 (Obsidian)',
      caption: '같은 노트가 Obsidian에서는 그래프, GitHub에서는 링크, SQL에서는 테이블이 됩니다.' },
  },
  'zh-TW': {
    tagline: '任務 · 證據 · 驗收 · 知識',
    bannerDesc: '一碗冒著熱氣的羅宋湯，上方升起模組方塊：任務、檢查與知識匯聚於同一個工作區。',
    flow: { title: '一個任務的旅程', steps: [['目標', '由你描述'], ['工作', '代理在副本中'], ['檢查', '測試、建置'], ['驗收清單', '已證明的'], ['已驗收', '合併、推送']], you: ['你', '手動項目'],
      caption: '模型說「完成」還不算驗收。未被證明的部分會列成清單交給你。' },
    evidence: { title: '證據會過期', state: '狀態', check: '檢查', edit: '修改', passFor: '針對', stale: '已過期', staleFrom: '取自',
      caption: '只要改動一個位元組就得重新檢查——即使修改尚未提交。' },
    pool: { title: '執行者池', job: '工作', limit: '已達上限', working: '工作中…', done: '完成 ✓', standby: '待命', board: '調度台',
      s: ['→ claude：開始', 'claude：已達上限 → codex', 'codex：完成 ✓ · 切換：1 次'],
      caption: '遇到上限時，工作會自動交給下一個被允許且有能力的執行者。' },
    kb: { title: '知識：筆記 + 連結 + SQL', project: '專案', graph: '圖譜（Obsidian）',
      caption: '同一批筆記：在 Obsidian 是圖譜，在 GitHub 是連結，在 SQL 是資料表。' },
  },
  fr: {
    tagline: 'tâches · preuves · recette · connaissances',
    bannerDesc: 'Un bol de bortsch d’où montent de la vapeur et des cubes-modules : tâches, vérifications et connaissances réunies dans un même espace.',
    flow: { title: 'Le trajet d’une tâche', steps: [['Objectif', 'tu le décris'], ['Travail', 'agent dans une copie'], ['Vérifications', 'tests, build'], ['Feuille de recette', 'ce qui est prouvé'], ['Accepté', 'fusionner, pousser']], you: ['Toi', 'points manuels'],
      caption: '« Terminé » selon le modèle n’est pas une recette. Ce qui n’est pas prouvé te revient en liste.' },
    evidence: { title: 'Une preuve peut expirer', state: 'état', check: 'vérification', edit: 'modification', passFor: 'pour', stale: 'périmée', staleFrom: 'prise sur',
      caption: 'Un octet change, et la vérification doit être relancée — même sans commit.' },
    pool: { title: 'Pool d’exécutants', job: 'Travail', limit: 'limite atteinte', working: 'en cours…', done: 'terminé ✓', standby: 'en attente', board: 'tableau de bord',
      s: ['→ claude : démarré', 'claude : limite atteinte → codex', 'codex : terminé ✓ · bascules : 1'],
      caption: 'Limite atteinte : le travail passe au suivant qui est autorisé et capable.' },
    kb: { title: 'Connaissances : notes + liens + SQL', project: 'projet', graph: 'graphe (Obsidian)',
      caption: 'Les mêmes notes : un graphe dans Obsidian, des liens sur GitHub, des tables pour SQL.' },
  },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Apple SD Gothic Neo","Malgun Gothic","PingFang TC","Microsoft JhengHei","Noto Sans CJK TC",sans-serif';
const BASE_CSS = `
:root{--bg:#fbf7f2;--ink:#2b1d1d;--muted:#6b5757;--red:#b3261e;--deep:#8c1c13;--line:#dccbc8;--card:#fffdfa;--ok:#2e7d32;--okbg:#e6f2e6;--off:#8f8282;--offbg:#efe8e6;--steam:#c9a9a6;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#171213;--ink:#f4ecea;--muted:#bfaeac;--red:#e0574b;--deep:#a8261b;--line:#4a3a39;--card:#221a1a;--ok:#7bc47f;--okbg:#1f2e20;--off:#8d7f7e;--offbg:#2a2222;--steam:#6e5856}}
text{font-family:${FONT};fill:var(--ink)}
.bg{fill:var(--bg)}.t{font-size:19px;font-weight:700}.b{font-size:14px;font-weight:650}.s{font-size:11.5px;fill:var(--muted)}.c{font-size:13px;fill:var(--muted)}
.m{font-family:var(--mono);font-size:12px}.box{fill:var(--card);stroke:var(--line);stroke-width:1.5}.ln{stroke:var(--line);stroke-width:2;fill:none}
.red{fill:var(--red)}.ok{fill:var(--ok)}.off{fill:var(--off)}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
function svg(lang, { w, h, title, desc, css, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d" lang="${lang}">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${BASE_CSS}${css}</style>
<rect class="bg" width="${w}" height="${h}" rx="14"/>
${body}
</svg>
`;
}
const kf = (name, frames) => `@keyframes ${name}{${frames}}`;
// Rough text width for placing a label after another one: wide (CJK) characters take about twice the space.
const textWidth = (s, px) => [...s].reduce((w, ch) => w + (ch.codePointAt(0) > 0x2e80 ? px : px * 0.58), 0);

// ── Banner ─────────────────────────────────────────────────────────────────
function banner(lang) {
  const t = T[lang];
  const css = `
.bowl{fill:var(--deep)}.rim{fill:var(--red)}.st{fill:none;stroke:var(--steam);stroke-width:7;stroke-linecap:round}
.cube{fill:var(--red)}.cube2{fill:var(--ink);opacity:.85}.cube3{fill:var(--red);opacity:.7}
.big{font-size:92px;font-weight:700}.sub{font-size:40px;fill:var(--muted)}.tag{font-size:28px;fill:var(--muted)}
.st{animation:rise 4s ease-in-out infinite}.st:nth-child(2){animation-delay:-1.3s}.st:nth-child(3){animation-delay:-2.6s}
${kf('rise', '0%,100%{transform:translateY(0);opacity:.95}50%{transform:translateY(-8px);opacity:.55}')}
.q{animation:bob 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.q2{animation-delay:-1.6s}.q3{animation-delay:-3.2s}
${kf('bob', '0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-10px) rotate(6deg)}')}`;
  const body = `<g transform="translate(170 205)">
  <path class="bowl" d="M-95 0 H95 A95 95 0 0 1 -95 0 Z"/>
  <rect class="rim" x="-110" y="-8" width="220" height="16" rx="8"/>
  <g><path class="st" d="M-45 -30 C-60 -55 -30 -70 -45 -95"/><path class="st" d="M0 -30 C-15 -55 15 -70 0 -95"/><path class="st" d="M45 -30 C30 -55 60 -70 45 -95"/></g>
  <rect class="cube q" x="-70" y="-142" width="26" height="26" rx="5"/>
  <rect class="cube2 q q2" x="-13" y="-154" width="26" height="26" rx="5"/>
  <rect class="cube3 q q3" x="44" y="-140" width="26" height="26" rx="5"/>
</g>
<text class="big" x="340" y="150">Borshkit</text>
<text class="sub" x="344" y="205">Modular AI Workspace</text>
<text class="tag" x="344" y="252">${esc(t.tagline)}</text>`;
  return svg(lang, { w: 1280, h: 320, title: 'Borshkit — Modular AI Workspace', desc: t.bannerDesc, css, body });
}

// ── 1. How a task travels ──────────────────────────────────────────────────
function flow(lang) {
  const t = T[lang].flow, W = 884, H = 270, bw = 148, gap = 26, x0 = 22, y = 72, bh = 58;
  const cx = i => x0 + i * (bw + gap) + bw / 2;
  const lit = [[0, 8], [14, 28], [34, 48], [54, 76], [82, 97]];
  let css = `.tok{fill:var(--red);opacity:0;animation:tok 12s ease-in-out infinite}.tok2{fill:var(--red);opacity:0;animation:tok2 12s ease-in-out infinite}
.done{opacity:1;animation:done 12s linear infinite}.youbox{stroke-dasharray:5 4}`;
  const pos = [[0, 0], [8, 0], [14, 1], [28, 1], [34, 2], [48, 2], [54, 3], [76, 3], [82, 4], [97, 4]];
  css += kf('tok', `${pos.map(([p, i]) => `${p}%{transform:translate(${cx(i) - cx(0)}px,0);opacity:${p >= 97 ? 0 : 1}}`).join('')}100%{transform:translate(${cx(4) - cx(0)}px,0);opacity:0}`);
  css += kf('tok2', `0%,57%{transform:translate(0,0);opacity:0}58%{opacity:1;transform:translate(0,0)}64%,70%{transform:translate(0,${110}px);opacity:1}76%{transform:translate(0,0);opacity:1}77%,100%{opacity:0}`);
  css += kf('done', '0%,84%{opacity:0}86%,97%{opacity:1}100%{opacity:0}');
  lit.forEach(([a, b], i) => { css += `.hl${i}{animation:hl${i} 12s linear infinite}` + kf(`hl${i}`, `0%,${Math.max(a - 1, 0)}%{stroke:var(--line);stroke-width:1.5}${a}%,${b}%{stroke:var(--red);stroke-width:3}${Math.min(b + 1, 100)}%,100%{stroke:var(--line);stroke-width:1.5}`); });
  const boxes = t.steps.map(([a, b], i) => `<rect class="box hl${i}" x="${cx(i) - bw / 2}" y="${y}" width="${bw}" height="${bh}" rx="10"/>
<text class="b" x="${cx(i)}" y="${y + 25}" text-anchor="middle">${esc(a)}</text><text class="s" x="${cx(i)}" y="${y + 44}" text-anchor="middle">${esc(b)}</text>`).join('\n');
  const arrows = [0, 1, 2, 3].map(i => `<path class="ln" d="M${cx(i) + bw / 2 + 3} ${y + bh / 2} H${cx(i + 1) - bw / 2 - 5}"/><path class="red" d="M${cx(i + 1) - bw / 2 - 2} ${y + bh / 2} l-8 -5 v10 z"/>`).join('\n');
  const yb = y + 110;
  const you = `<path class="ln" d="M${cx(3)} ${y + bh} V${yb}" stroke-dasharray="4 4"/>
<rect class="box youbox" x="${cx(3) - bw / 2}" y="${yb}" width="${bw}" height="${bh - 6}" rx="10"/>
<text class="b" x="${cx(3)}" y="${yb + 22}" text-anchor="middle">${esc(t.you[0])}</text><text class="s" x="${cx(3)}" y="${yb + 40}" text-anchor="middle">${esc(t.you[1])}</text>`;
  const body = `<text class="t" x="${x0}" y="38">${esc(t.title)}</text>
${arrows}
${you}
${boxes}
<g class="done"><circle class="ok" cx="${cx(4) + bw / 2 - 14}" cy="${y + 14}" r="11"/><path d="M${cx(4) + bw / 2 - 19} ${y + 14} l4 4 l7 -8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
<circle class="tok" cx="${cx(0)}" cy="${y - 10}" r="7"/>
<circle class="tok2" cx="${cx(3)}" cy="${y + bh + 4}" r="6"/>
<text class="c" x="${x0}" y="${H - 18}">${esc(t.caption)}</text>`;
  return svg(lang, { w: W, h: H, title: t.title, desc: [t.steps.map(s => s.join(' — ')).join(' → '), t.caption].join('. '), css, body });
}

// ── 2. Evidence goes stale ─────────────────────────────────────────────────
function evidence(lang) {
  const t = T[lang].evidence, W = 860, H = 260;
  const show = (name, from, to, base) => `.${name}{opacity:${base};animation:${name} 10s linear infinite}` + kf(name, `0%,${from - 1}%{opacity:0}${from}%,${to}%{opacity:1}${to + 1}%,100%{opacity:0}`);
  let css = show('passA', 15, 35, 0) + show('stale', 43, 65, 0) + show('hashA', 0, 37, 0) + show('flash', 35, 42, 0)
    + `.hashB{opacity:1;animation:hashB 10s linear infinite}${kf('hashB', '0%,37%{opacity:0}38%,100%{opacity:1}')}`
    + `.passB{opacity:1;animation:passB 10s linear infinite}${kf('passB', '0%,71%{opacity:0}72%,100%{opacity:1}')}`
    + `.pulse{animation:pulse 10s linear infinite}${kf('pulse', '0%,5%{stroke:var(--line)}7%,14%{stroke:var(--red)}16%,64%{stroke:var(--line)}66%,72%{stroke:var(--red)}74%,100%{stroke:var(--line)}')}`
    + `.bar2{animation:bar 10s linear infinite}${kf('bar', '0%,35%{fill:var(--line)}36%,100%{fill:var(--red)}')}`
    + '.pass{fill:var(--okbg);stroke:var(--ok);stroke-width:1.5}.stl{fill:var(--offbg);stroke:var(--off);stroke-width:1.5;stroke-dasharray:5 4}';
  const pw = Math.max(62, textWidth(t.edit, 11) + 20);
  const card = `<rect class="box" x="40" y="62" width="230" height="130" rx="10"/>
<text class="b m" x="58" y="88">app.js</text>
<rect x="58" y="102" width="150" height="8" rx="4" fill="var(--line)"/><rect class="bar2" x="58" y="118" width="110" height="8" rx="4" fill="var(--red)"/><rect x="58" y="134" width="170" height="8" rx="4" fill="var(--line)"/>
<text class="s" x="58" y="172">${esc(t.state)}:</text>
<text class="m hashA" x="${66 + textWidth(t.state + ':', 11.5)}" y="172">a1b2c3</text><text class="m hashB" x="${66 + textWidth(t.state + ':', 11.5)}" y="172" fill="var(--red)">f9e8d7</text>
<g class="flash"><rect x="${262 - pw}" y="108" width="${pw}" height="22" rx="11" fill="var(--red)"/><text x="${262 - pw / 2}" y="123" text-anchor="middle" style="font-size:11px;fill:#fff;font-weight:650">${esc(t.edit)}</text></g>`;
  const arrow = `<text class="s" x="390" y="112" text-anchor="middle">${esc(t.check)}</text>
<path class="ln pulse" d="M290 127 H482"/><path class="red" d="M490 127 l-10 -6 v12 z"/>`;
  const badge = (cls, kind, big, small) => `<g class="${cls}"><rect class="${kind}" x="510" y="92" width="300" height="70" rx="12"/>
<text class="b" x="660" y="122" text-anchor="middle" style="font-size:20px;fill:var(${kind === 'pass' ? '--ok' : '--off'})">${esc(big)}</text>
<text class="s m" x="660" y="146" text-anchor="middle">${esc(small)}</text></g>`;
  const after = (word, hash) => lang === 'ko' ? `${hash} ${word}` : `${word} ${hash}`;
  const body = `<text class="t" x="40" y="38">${esc(t.title)}</text>
${card}
${arrow}
${badge('passA', 'pass', 'PASS ✓', after(t.passFor, 'a1b2c3'))}
${badge('stale', 'stl', t.stale, after(t.staleFrom, 'a1b2c3'))}
${badge('passB', 'pass', 'PASS ✓', after(t.passFor, 'f9e8d7'))}
<text class="c" x="40" y="${H - 22}">${esc(t.caption)}</text>`;
  return svg(lang, { w: W, h: H, title: t.title, desc: `PASS ${after(t.passFor, 'a1b2c3')} → ${t.edit} → ${t.stale} → PASS ${after(t.passFor, 'f9e8d7')}. ${t.caption}`, css, body });
}

// ── 3. Executor pool ───────────────────────────────────────────────────────
function pool(lang) {
  const t = T[lang].pool, W = 860, H = 300, rows = [['Claude Code', 64], ['Codex', 118], ['API · free', 172]];
  const win = (name, from, to, base) => `.${name}{opacity:${base};animation:${name} 10s linear infinite}` + kf(name, `0%,${from - 1}%{opacity:0}${from}%,${to}%{opacity:1}${to < 100 ? `${to + 1}%,100%{opacity:0}` : ''}`);
  const css = win('lim', 26, 100, 1) + win('work', 48, 74, 0) + win('done', 75, 100, 1) + win('s0', 4, 30, 0) + win('s1', 31, 74, 0) + win('s2', 75, 100, 1)
    + `.tok{fill:var(--red);opacity:0;animation:tok 10s ease-in-out infinite}`
    + kf('tok', `0%,4%{transform:translate(0,0);opacity:0}6%{opacity:1;transform:translate(0,0)}18%,24%{transform:translate(206px,${rows[0][1] + 20 - 130}px);opacity:1}26%{transform:translate(196px,${rows[0][1] + 20 - 130}px)}40%,72%{transform:translate(206px,${rows[1][1] + 20 - 130}px);opacity:1}76%,100%{transform:translate(206px,${rows[1][1] + 20 - 130}px);opacity:0}`)
    + '.r1{animation:r1 10s linear infinite}' + kf('r1', '0%,17%{stroke:var(--line)}18%,25%{stroke:var(--red);stroke-width:3}26%,100%{stroke:var(--line)}')
    + '.r2{animation:r2 10s linear infinite}' + kf('r2', '0%,39%{stroke:var(--line)}40%,74%{stroke:var(--red);stroke-width:3}75%,100%{stroke:var(--ok);stroke-width:2.5}')
    + '.pill{rx:11}.limbg{fill:var(--red)}.okbg{fill:var(--okbg);stroke:var(--ok)}.board{fill:var(--card);stroke:var(--line)}';
  const job = `<rect class="box" x="40" y="104" width="190" height="56" rx="10"/><text class="b" x="135" y="129" text-anchor="middle">${esc(t.job)}</text><text class="s m" x="135" y="147" text-anchor="middle">implementer</text>`;
  const lines = rows.map(([, y]) => `<path class="ln" d="M232 132 C330 132 330 ${y + 20} 430 ${y + 20}"/>`).join('\n');
  const execs = rows.map(([name, y], i) => `<rect class="box${i === 0 ? ' r1' : i === 1 ? ' r2' : ''}" x="440" y="${y}" width="380" height="40" rx="10"/><text class="b" x="458" y="${y + 25}">${esc(name)}</text>`).join('\n');
  const pill = (cls, y, text, kind) => `<g class="${cls}"><rect class="${kind}" x="${812 - 150}" y="${y + 8}" width="142" height="24" rx="12"/><text x="${812 - 79}" y="${y + 24}" text-anchor="middle" style="font-size:12px;font-weight:650;fill:${kind === 'limbg' ? '#fff' : 'var(--ok)'}">${esc(text)}</text></g>`;
  const statuses = pill('lim', rows[0][1], t.limit, 'limbg') + `<text class="s work" x="${812 - 79}" y="${rows[1][1] + 25}" text-anchor="middle">${esc(t.working)}</text>` + pill('done', rows[1][1], t.done, 'okbg')
    + `<text class="s" x="${812 - 79}" y="${rows[2][1] + 25}" text-anchor="middle">${esc(t.standby)}</text>`;
  const board = `<rect class="board" x="40" y="${H - 72}" width="780" height="34" rx="8"/><text class="s" x="56" y="${H - 50}">${esc(t.board)}</text>
${t.s.map((s, i) => `<text class="m s${i}" x="${70 + textWidth(t.board, 11.5)}" y="${H - 50}">${esc(s)}</text>`).join('')}`;
  const body = `<text class="t" x="40" y="38">${esc(t.title)}</text>
${lines}
${job}
${execs}
${statuses}
<circle class="tok" cx="226" cy="130" r="7"/>
${board}
<text class="c" x="40" y="${H - 14}">${esc(t.caption)}</text>`;
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.s.join(' · ')}. ${t.caption}`, css, body });
}

// ── 4. Knowledge: notes + links + SQL ──────────────────────────────────────
function kb(lang) {
  const t = T[lang].kb, W = 860, H = 280;
  const files = ['accept.mjs', 'snapshot.mjs', 'evidence.md'];
  const nodes = [[360, 92, 'accept'], [470, 70, 'snapshot'], [440, 168, 'evidence'], [330, 190, 'accept.test'], [520, 140, 'io']];
  const edges = [[0, 1, 'imports'], [2, 0, 'documents'], [3, 0, 'tested-by'], [1, 4, 'imports'], [0, 4, 'imports']];
  let css = '.nd{fill:var(--card);stroke:var(--red);stroke-width:2}.ed{stroke:var(--muted);stroke-width:1.6;fill:none}.el{font-size:10px;fill:var(--muted)}.panel{fill:var(--card);stroke:var(--line)}.kw{fill:var(--red);font-weight:700}';
  nodes.forEach((_, i) => { css += `.n${i}{animation:pop 10s ease-out infinite;animation-delay:${i * 0.25}s;transform-box:fill-box;transform-origin:center}`; });
  css += kf('pop', '0%{transform:scale(0);opacity:0}6%{transform:scale(1.15);opacity:1}9%,92%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}');
  edges.forEach((_, i) => { css += `.e${i}{stroke-dasharray:200;stroke-dashoffset:0;animation:draw${i} 10s linear infinite}` + kf(`draw${i}`, `0%,${12 + i * 4}%{stroke-dashoffset:200}${22 + i * 4}%,92%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}`); });
  css += '.q{animation:q 10s linear infinite}' + kf('q', '0%,42%{opacity:0}46%,94%{opacity:1}100%{opacity:0}');
  css += '.row{opacity:1;animation:row 10s linear infinite}.row2{animation-delay:.5s}' + kf('row', '0%,56%{opacity:0}60%,94%{opacity:1}100%{opacity:0}');
  const fileCol = files.map((f, i) => `<g><rect class="box" x="40" y="${70 + i * 46}" width="150" height="34" rx="8"/><text class="m" x="56" y="${92 + i * 46}">${esc(f)}</text></g>`).join('\n');
  const edgeEls = edges.map(([a, b, rel], i) => { const [x1, y1] = nodes[a], [x2, y2] = nodes[b]; return `<path class="ed e${i}" d="M${x1} ${y1} L${x2} ${y2}"/><text class="el" x="${(x1 + x2) / 2 + 4}" y="${(y1 + y2) / 2 - 4}">${rel}</text>`; }).join('\n');
  const nodeEls = nodes.map(([x, y, label], i) => `<g class="n${i}"><circle class="nd" cx="${x}" cy="${y}" r="13"/><text class="s" x="${x}" y="${y + 30}" text-anchor="middle">${esc(label)}</text></g>`).join('\n');
  const sql = `<rect class="panel" x="590" y="64" width="230" height="160" rx="10"/>
<text class="s" x="606" y="86">SQL</text>
<g class="q"><text class="m" x="606" y="112"><tspan class="kw">SELECT</tspan> path</text><text class="m" x="606" y="130"><tspan class="kw">FROM</tspan> undocumented_</text><text class="m" x="606" y="148">modules;</text></g>
<path d="M606 160 H804" stroke="var(--line)"/>
<text class="m row" x="606" y="182">core/io.mjs</text><text class="m row row2" x="606" y="202">core/process.mjs</text>`;
  const body = `<text class="t" x="40" y="38">${esc(t.title)}</text>
<text class="s" x="40" y="60">${esc(t.project)}</text><text class="s" x="300" y="60">${esc(t.graph)}</text>
${fileCol}
<path class="ln" d="M196 125 H${nodes[3][0] - 40}" stroke-dasharray="4 4"/>
${edgeEls}
${nodeEls}
${sql}
<text class="c" x="40" y="${H - 20}">${esc(t.caption)}</text>`;
  return svg(lang, { w: W, h: H, title: t.title, desc: t.caption, css, body });
}

export const DIAGRAMS = { banner, flow, evidence, pool, kb };
export async function writeDiagrams() {
  const dir = path.join(ROOT, 'assets', 'diagrams'), written = [];
  await fs.mkdir(dir, { recursive: true });
  for (const lang of LANGS) for (const [name, make] of Object.entries(DIAGRAMS)) {
    const file = path.join(dir, `${name}.${lang}.svg`);
    await fs.writeFile(file, make(lang));
    written.push(path.relative(ROOT, file));
  }
  return written;
}
if (process.argv[1]?.endsWith('diagrams.mjs')) console.log(`Нарисовано: ${(await writeDiagrams()).length} файлов в assets/diagrams/.`);
