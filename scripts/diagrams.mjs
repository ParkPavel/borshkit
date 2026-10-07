// Animated block diagrams for the README in every language Borshkit ships.
// Each picture is drawn from the code it explains: names of files, commands
// and fields are the real ones (scripts/diagram-texts.mjs holds the words).
// GitHub shows SVG through <img>: SMIL moves a token along the real path, CSS
// lights the step it is on, the page's colour scheme applies, and with
// "reduce motion" the token is hidden and every block stays still.
// Run: node scripts/diagrams.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../core/io.mjs';
import { T } from './diagram-texts.mjs';

export const LANGS = ['ru', 'en', 'de', 'ko', 'zh-TW', 'fr'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Apple SD Gothic Neo","Malgun Gothic","PingFang TC","Microsoft JhengHei","Noto Sans CJK TC",sans-serif';
const BASE_CSS = `
:root{--bg:#fbf7f2;--ink:#2b1d1d;--muted:#6b5757;--red:#b3261e;--deep:#8c1c13;--line:#cdb9b5;--card:#fffdfa;--group:#f5ede7;--ok:#2e7d32;--okbg:#e6f2e6;--wait:#9a5b00;--waitbg:#fbefdc;--off:#7d6f6f;--offbg:#efe8e6;--steam:#c9a9a6;--hl:#fde8e5;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#171213;--ink:#f4ecea;--muted:#bfaeac;--red:#ef6b5f;--deep:#a8261b;--line:#5a4846;--card:#221a1a;--group:#1d1617;--ok:#7bc47f;--okbg:#1f2e20;--wait:#f0a64a;--waitbg:#33261a;--off:#9d8f8e;--offbg:#2a2222;--steam:#6e5856;--hl:#3a1f1d}}
text{font-family:${FONT};fill:var(--ink)}
.bg{fill:var(--bg)}.ttl{font-size:20px;font-weight:700}.sub{font-size:12px;fill:var(--muted)}.cap{font-size:13px;fill:var(--muted)}
.b{font-size:13.5px;font-weight:650}.l{font-size:11.5px;fill:var(--muted)}.m{font-family:var(--mono);font-size:11px}.c{font-family:var(--mono);font-size:11.5px;fill:var(--red);font-weight:600}
.gl{font-size:11px;font-weight:700;letter-spacing:.06em;fill:var(--muted);text-transform:uppercase}
.al{font-size:10.5px;fill:var(--muted);paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round}
.box{fill:var(--card);stroke:var(--line);stroke-width:1.4}.grp{fill:var(--group);stroke:var(--line);stroke-width:1.2;stroke-dasharray:5 4}
.ok .box,.box.ok{fill:var(--okbg);stroke:var(--ok)}.wait .box,.box.wait{fill:var(--waitbg);stroke:var(--wait)}.off .box,.box.off{fill:var(--offbg);stroke:var(--off)}.bad .box,.box.bad{fill:var(--hl);stroke:var(--red)}
.ln{fill:none;stroke:var(--line);stroke-width:1.6}.ln.red{stroke:var(--red)}.ln.okl{stroke:var(--ok)}.ln.waitl{stroke:var(--wait)}.ln.offl{stroke:var(--off)}.ln.dash{stroke-dasharray:5 4}
.mk{fill:var(--line)}.mk.red{fill:var(--red)}.mk.okl{fill:var(--ok)}.mk.waitl{fill:var(--wait)}.mk.offl{fill:var(--off)}
.tok{fill:var(--red);stroke:var(--bg);stroke-width:2}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.tok{display:none}}`;

function svg(lang, { w, h, title, desc, css = '', body }) {
  const markers = ['', 'red', 'okl', 'waitl', 'offl'].map(c => `<marker id="a${c}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="mk ${c}" d="M0 0L10 5L0 10z"/></marker>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d" lang="${lang}">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>${markers}</defs>
<style>${BASE_CSS}${css}</style>
<rect class="bg" width="${w}" height="${h}" rx="14"/>
${body}
</svg>
`;
}

// ── Primitives ──────────────────────────────────────────────────────────────
const LINE = { t: 18, c: 15.5, l: 15, m: 14.5 };
/** A block: rows are [kind, text]; kind t = title, c = command, l = note, m = mono. */
function block({ x, y, w, h, rows, cls = '', id = '', pad = 11 }) {
  let cy = y + 20;
  const text = rows.filter(([, s]) => s !== undefined && s !== '').map(([k, s]) => {
    const out = `<text class="${k === 't' ? 'b' : k}" x="${x + pad}" y="${cy}">${esc(s)}</text>`;
    cy += LINE[k];
    return out;
  }).join('');
  return `<g class="${cls}"${id ? ` id="${id}"` : ''}><rect class="box${id ? ` hl-${id}` : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="9"/>${text}</g>`;
}
const group = ({ x, y, w, h, label }) => `<rect class="grp" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text class="gl" x="${x + 12}" y="${y + 17}">${esc(label)}</text>`;
/** An arrow along points; `color` is one of '', red, okl, waitl, offl. */
function arrow(points, { color = '', dash = false, label = null, at = 0.5, dx = 0, dy = -6, anchor = 'middle', head = true } = {}) {
  const d = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ');
  let lab = '';
  if (label) {
    const [lx, ly] = pointAt(points, at);
    lab = `<text class="al" x="${lx + dx}" y="${ly + dy}" text-anchor="${anchor}">${esc(label)}</text>`;
  }
  return `<path class="ln ${color}${dash ? ' dash' : ''}" d="${d}"${head ? ` marker-end="url(#a${color})"` : ''}/>${lab}`;
}
function lengths(points) {
  const seg = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  return { seg, total: seg.reduce((a, b) => a + b, 0) };
}
function pointAt(points, t) {
  const { seg, total } = lengths(points);
  let left = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) { const f = seg[i] ? left / seg[i] : 0; return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f]; }
    left -= seg[i];
  }
  return points.at(-1);
}
/**
 * A token moving along `points` at constant speed, resting `pauses[i]`
 * seconds at vertex i. Returns the SMIL element and, per vertex, the share of
 * the cycle during which the token rests there (for CSS highlights).
 */
function token(points, pauses, { speed = 160, fadeAt = null } = {}) {
  const { seg } = lengths(points);
  const times = [], keyPoints = [];
  let t = 0, dist = 0;
  const total = seg.reduce((a, b) => a + b, 0);
  const windows = [];
  for (let i = 0; i < points.length; i++) {
    const rest = pauses[i] ?? 0;
    windows.push([t, t + rest]);
    times.push(t); keyPoints.push(dist / total);
    if (rest) { t += rest; times.push(t); keyPoints.push(dist / total); }
    if (i < seg.length) { t += seg[i] / speed; dist += seg[i]; }
  }
  const dur = t;
  const kt = times.map(x => (x / dur).toFixed(4)).join(';'), kp = keyPoints.map(x => Math.min(1, x).toFixed(4)).join(';');
  const d = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ');
  return {
    dur, windows: windows.map(([a, b]) => [a / dur * 100, b / dur * 100]),
    svg: `<circle class="tok" r="7" cx="0" cy="0"><animateMotion dur="${dur.toFixed(2)}s" repeatCount="indefinite" path="${d}" keyPoints="${kp}" keyTimes="${kt}" calcMode="linear"/></circle>`,
  };
}
/** CSS that lights block `id` while the token rests in window [a, b] (percent of the cycle). */
function light(id, [a, b], dur) {
  if (b - a < 0.01) return '';
  const p = v => Math.max(0, Math.min(100, v)).toFixed(2);
  return `.hl-${id}{animation:hl-${id} ${dur.toFixed(2)}s linear infinite}@keyframes hl-${id}{0%,${p(a - 0.6)}%{stroke:var(--line);stroke-width:1.4}${p(a)}%,${p(b)}%{stroke:var(--red);stroke-width:2.6}${p(b + 0.6)}%,100%{stroke:var(--line);stroke-width:1.4}}`;
}

// ── Banner ─────────────────────────────────────────────────────────────────
function banner(lang) {
  const t = T[lang];
  const css = `.bowl{fill:var(--deep)}.rim{fill:var(--red)}.st{fill:none;stroke:var(--steam);stroke-width:7;stroke-linecap:round}
.cube{fill:var(--red)}.cube2{fill:var(--ink);opacity:.85}.cube3{fill:var(--red);opacity:.7}
.big{font-size:92px;font-weight:700}.bsub{font-size:40px;fill:var(--muted)}.tag{font-size:28px;fill:var(--muted)}
.st{animation:rise 4s ease-in-out infinite}.st:nth-child(2){animation-delay:-1.3s}.st:nth-child(3){animation-delay:-2.6s}
@keyframes rise{0%,100%{transform:translateY(0);opacity:.95}50%{transform:translateY(-8px);opacity:.55}}
.q{animation:bob 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.q2{animation-delay:-1.6s}.q3{animation-delay:-3.2s}
@keyframes bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-10px) rotate(6deg)}}`;
  const body = `<g transform="translate(170 205)">
  <path class="bowl" d="M-95 0 H95 A95 95 0 0 1 -95 0 Z"/>
  <rect class="rim" x="-110" y="-8" width="220" height="16" rx="8"/>
  <g><path class="st" d="M-45 -30 C-60 -55 -30 -70 -45 -95"/><path class="st" d="M0 -30 C-15 -55 15 -70 0 -95"/><path class="st" d="M45 -30 C30 -55 60 -70 45 -95"/></g>
  <rect class="cube q" x="-70" y="-142" width="26" height="26" rx="5"/>
  <rect class="cube2 q q2" x="-13" y="-154" width="26" height="26" rx="5"/>
  <rect class="cube3 q q3" x="44" y="-140" width="26" height="26" rx="5"/>
</g>
<text class="big" x="340" y="150">Borshkit</text>
<text class="bsub" x="344" y="205">Modular AI Workspace</text>
<text class="tag" x="344" y="252">${esc(t.tagline)}</text>`;
  return svg(lang, { w: 1280, h: 320, title: 'Borshkit — Modular AI Workspace', desc: t.bannerDesc, css, body });
}

// ── 1. Architecture: who calls what, where every file lives ─────────────────
function architecture(lang) {
  const t = T[lang].arch, W = 980, H = 660;
  const A = { x: 20, w: 182 }, B = { x: 226, w: 396 }, C = { x: 646, w: 314 };
  const parts = [`<text class="ttl" x="20" y="36">${esc(t.title)}</text><text class="sub" x="20" y="56">${esc(t.sub)}</text>`];
  // Who calls it
  parts.push(group({ x: A.x, y: 74, w: A.w, h: 380, label: t.inputs }));
  parts.push(block({ x: A.x + 10, y: 100, w: A.w - 20, h: 66, id: 'you', rows: [['t', t.you], ['m', 'borshkit …'], ['l', t.youL]] }));
  parts.push(block({ x: A.x + 10, y: 178, w: A.w - 20, h: 98, rows: [['t', 'Claude Code'], ['l', t.ccL], ['m', 'SessionStart'], ['m', 'PreToolUse']] }));
  parts.push(block({ x: A.x + 10, y: 288, w: A.w - 20, h: 66, rows: [['t', t.agents], ['m', 'AGENTS.md'], ['l', t.agentsL]] }));
  parts.push(block({ x: A.x + 10, y: 360, w: A.w - 20, h: 86, cls: 'wait', rows: [['t', t.person], ['l', t.personL1], ['l', t.personL2], ['l', t.personL3]] }));
  // Core: jobs sit at the bottom, next to the executors they call
  parts.push(group({ x: B.x, y: 74, w: B.w, h: 380, label: t.core }));
  const g = [
    ['g1', 100, t.g1, 'space · config · privacy · experiment · hooks', t.g1d],
    ['g2', 186, t.g2, 'contract · snapshot · accept · builtins', t.g2d],
    ['g4', 272, t.g4, 'kb · materials · gitshell · eval', t.g4d],
    ['g3', 358, t.g3, 'jobs · roles · adapters · executors · questions', t.g3d],
  ];
  for (const [id, y, title, mods, d] of g) parts.push(block({ x: B.x + 12, y, w: B.w - 24, h: 76, rows: [['t', title], ['m', mods], ['l', d]], id }));
  // Files
  parts.push(group({ x: C.x, y: 74, w: C.w, h: 380, label: t.files }));
  parts.push(block({ x: C.x + 10, y: 100, w: C.w - 20, h: 156, id: 'space', rows: [['t', 'borshkit/'], ['l', t.spaceL],
    ['m', 'settings/workspace.json'], ['m', 'tasks/<id>/ contract · evidence'], ['m', '  logs · acceptance.md'], ['m', 'jobs/ · questions/ · STATUS.md'], ['m', 'knowledge/ · materials/'], ['m', '.state/ kb.sqlite · locks/']] }));
  parts.push(block({ x: C.x + 10, y: 268, w: C.w - 20, h: 74, id: 'project', rows: [['t', t.project], ['m', '.gitignore: /borshkit/'], ['l', t.projectL]] }));
  parts.push(block({ x: C.x + 10, y: 364, w: C.w - 20, h: 80, id: 'copy', rows: [['t', t.copy], ['m', '../<project>.borshkit-worktrees/<id>'], ['l', t.copyL]] }));
  // Executors
  parts.push(group({ x: B.x, y: 486, w: W - B.x - 20, h: 122, label: t.exec }));
  const ex = [['Claude Code', 'claude-cli', t.sub2], ['Codex · GPT Image', 'codex-cli', t.sub2], [t.api, 'openai-compat', t.sub3], [t.own, 'command', t.sub4]];
  const ew = (W - B.x - 20 - 24 - 3 * 12) / 4;
  ex.forEach(([n, k, l], i) => parts.push(block({ x: B.x + 12 + i * (ew + 12), y: 512, w: ew, h: 80, rows: [['t', n], ['c', k], ['l', l]], id: i === 0 ? 'ex' : '' })));
  // Arrows: every caller goes through the same CLI into the core
  const bus = A.x + A.w + 10;
  parts.push(`<path class="ln" d="M${A.x + A.w - 10} 133 H${bus} M${A.x + A.w - 10} 227 H${bus} M${A.x + A.w - 10} 321 H${bus} M${bus} 133 V403"/>`);
  parts.push(`<path class="ln waitl dash" d="M${A.x + A.w - 10} 403 H${bus}"/>`);
  parts.push(arrow([[bus, 267], [B.x + 12, 267]], { color: 'red' }));
  // core ↔ files
  parts.push(arrow([[B.x + B.w - 12, 224], [C.x + 10, 224]], { color: 'red' }));
  parts.push(arrow([[B.x + B.w - 12, 138], [C.x + 10, 138]]));
  // jobs ↔ executors
  parts.push(arrow([[B.x + 110, 434], [B.x + 110, 512]], { color: 'red', label: t.aPacket, at: 0.45, dx: 6, anchor: 'start' }));
  parts.push(arrow([[B.x + 290, 512], [B.x + 290, 434]], { label: t.aJson, at: 0.55, dx: 6, anchor: 'start' }));
  // writers → task copy; gitshell: copy → project → remote
  parts.push(arrow([[C.x + 150, 512], [C.x + 150, 444]], { color: 'red', label: t.aWrite, at: 0.5, dx: 6, anchor: 'start' }));
  parts.push(arrow([[C.x + 60, 364], [C.x + 60, 342]], { color: 'okl' }));
  parts.push(`<text class="al" x="${C.x + 70}" y="358">${esc(t.aMerge)}</text>`);
  parts.push(arrow([[C.x + C.w - 10, 330], [W - 4, 330], [W - 4, 300]], { color: 'okl' }));
  parts.push(`<text class="al" x="${W - 8}" y="292" text-anchor="end">${esc(t.aPush)}</text>`);
  // Token: you → jobs → executor → task copy → acceptance → project
  const path = [[A.x + A.w - 20, 133], [A.x + A.w + 10, 133], [A.x + A.w + 10, 267], [B.x + 200, 267], [B.x + 200, 396], [B.x + 110, 396], [B.x + 110, 552], [C.x + 150, 552], [C.x + 150, 404], [C.x + 150, 404], [B.x + 300, 224], [C.x + 60, 224], [C.x + 60, 305]];
  const tk = token(path, [0.6, 0, 0, 0, 1.2, 0, 1.2, 0, 1.2, 0, 1.4, 0, 1.6]);
  const css = [['you', 0], ['g3', 4], ['ex', 6], ['copy', 8], ['g2', 10], ['project', 12]].map(([id, i]) => light(id, tk.windows[i], tk.dur)).join('');
  parts.push(tk.svg);
  parts.push(`<text class="cap" x="20" y="${H - 22}">${esc(t.caption)}</text>`);
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.sub}. ${t.caption}`, css, body: parts.join('\n') });
}

// ── 2. The path of a task, with every outcome of convergence ───────────────
function flow(lang) {
  const t = T[lang].flow, W = 980, H = 590;
  const parts = [`<text class="ttl" x="20" y="36">${esc(t.title)}</text><text class="sub" x="20" y="56">${esc(t.sub)}</text>`];
  const r1 = 78, bh = 84, bw = 180, X = [20, 214, 408];
  parts.push(block({ x: X[0], y: r1, w: bw, h: bh, id: 'n1', rows: [['t', t.n1], ['c', t.n1c], ['l', t.n1l]] }));
  parts.push(block({ x: X[1], y: r1, w: bw, h: bh, id: 'n2', rows: [['t', t.n2], ['c', t.n2c], ['l', t.n2l]] }));
  parts.push(block({ x: X[2], y: r1, w: bw, h: bh, id: 'n3', rows: [['t', t.n3], ['c', t.n3c], ['l', t.n3l]] }));
  parts.push(block({ x: 616, y: 70, w: 192, h: 84, id: 'n4a', rows: [['t', t.n4a], ['c', t.n4ac], ['l', t.n4al]] }));
  parts.push(block({ x: 616, y: 166, w: 192, h: 84, id: 'n4b', rows: [['t', t.n4b], ['c', t.n4bc], ['l', t.n4bl]] }));
  parts.push(block({ x: 830, y: 104, w: 130, h: 112, id: 'n5', rows: [['t', t.n5], ['c', t.n5c], ['l', t.n5l1], ['l', t.n5l2], ['m', 'acceptance.md']] }));
  parts.push(arrow([[X[0] + bw, r1 + 42], [X[1], r1 + 42]], { color: 'red' }));
  parts.push(arrow([[X[1] + bw, r1 + 42], [X[2], r1 + 42]], { color: 'red' }));
  // Work → both kinds of evidence through one junction
  parts.push(`<path class="ln red" d="M${X[2] + bw} ${r1 + 42} H600 M600 112 V208"/>`);
  parts.push(arrow([[600, 112], [616, 112]], { color: 'red' }));
  parts.push(arrow([[600, 208], [616, 208]], { color: 'red' }));
  parts.push(arrow([[808, 112], [830, 140]], { color: 'red' }));
  parts.push(arrow([[808, 208], [830, 180]], { color: 'red' }));
  // Outcomes
  const oy = 300, oh = 84, O = [[20, 220], [252, 220], [484, 220], [716, 244]];
  const out = [['bad', `🔴 ${t.o1}`, t.o1l1, t.o1l2, 'o1'], ['off', `⚪ ${t.o2}`, t.o2l1, t.o2l2, 'o2'], ['wait', `🟡 ${t.o3}`, t.o3l1, t.o3l2, 'o3'], ['ok', `🟢 ${t.o4}`, t.o4l1, t.o4l2, 'o4']];
  out.forEach(([cls, a, b, c, id], i) => parts.push(block({ x: O[i][0], y: oy, w: O[i][1], h: oh, cls, id, rows: [['t', a], ['l', b], ['l', c]] })));
  // Convergence → outcome bus
  parts.push(`<path class="ln" d="M895 216 V284 H130 M362 284 V${oy} M594 284 V${oy} M130 284 V${oy}"/>`);
  parts.push(arrow([[895, 284], [895, oy]], { color: 'okl' }));
  parts.push(`<text class="al" x="888" y="272" text-anchor="end">${esc(t.lConverge)}</text>`);
  // Feedback loops
  parts.push(arrow([[60, oy], [60, 186], [498, 186], [498, r1 + bh]], { color: 'red', dash: true, label: t.lFix, at: 0.3, dy: -5 }));
  parts.push(arrow([[300, oy], [300, 232], [584, 232], [584, 208], [600, 208]], { color: 'offl', dash: true, label: t.lRecheck, at: 0.45, dy: -5, head: false }));
  parts.push(block({ x: 484, y: 420, w: 220, h: 84, cls: 'wait', id: 'you', rows: [['t', t.you], ['c', t.youc], ['l', t.youl]] }));
  parts.push(arrow([[594, oy + oh], [594, 420]], { color: 'waitl' }));
  parts.push(arrow([[704, 462], [714, 462], [714, 262], [870, 262], [870, 216]], { color: 'waitl', dash: true, label: t.lAnswer, at: 0.62, dy: -5 }));
  // Landing: update when main moved, merge, push
  parts.push(block({ x: 252, y: 420, w: 220, h: 84, cls: 'off', id: 'up', rows: [['t', t.up], ['c', t.upc], ['l', t.upl]] }));
  parts.push(block({ x: 726, y: 420, w: 112, h: 112, id: 'm', rows: [['t', t.m], ['c', t.mc], ['l', t.ml1], ['l', t.ml2], ['l', t.ml3]] }));
  parts.push(block({ x: 848, y: 420, w: 112, h: 112, id: 'p', rows: [['t', t.p], ['c', t.pc], ['l', t.pl1], ['l', t.pl2], ['l', t.pl3]] }));
  parts.push(arrow([[782, oy + oh], [782, 420]], { color: 'okl' }));
  parts.push(arrow([[838, 476], [848, 476]], { color: 'okl' }));
  parts.push(arrow([[726, 520], [362, 520], [362, 504]], { color: 'offl', dash: true, label: t.lMoved, at: 0.35, dy: 14 }));
  parts.push(arrow([[362, 420], [362, oy + oh]], { color: 'offl', dash: true }));
  // Token: the accepted path
  const path = [[110, 120], [304, 120], [498, 120], [600, 120], [712, 112], [895, 160], [895, 284], [895, 342], [782, 342], [782, 476], [904, 476]];
  const tk = token(path, [0.9, 0.9, 1.4, 0, 1.2, 1.2, 0, 1.0, 0, 1.0, 1.4]);
  const css = [['n1', 0], ['n2', 1], ['n3', 2], ['n4a', 4], ['n5', 5], ['o4', 7], ['m', 9], ['p', 10]].map(([id, i]) => light(id, tk.windows[i], tk.dur)).join('') + light('n4b', tk.windows[4], tk.dur);
  parts.push(tk.svg);
  parts.push(`<text class="cap" x="20" y="${H - 18}">${esc(t.caption)}</text>`);
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.sub}. ${t.caption}`, css, body: parts.join('\n') });
}

// ── 3. Evidence is bound to the exact state ────────────────────────────────
function evidence(lang) {
  const t = T[lang].ev, W = 980, H = 580;
  const parts = [`<text class="ttl" x="20" y="36">${esc(t.title)}</text><text class="sub" x="20" y="56">${esc(t.sub)}</text>`];
  parts.push(group({ x: 20, y: 74, w: 340, h: 286, label: t.state }));
  const rows = [[t.r1, 'source.digest', t.r1l], [t.r2, 'contractDigest', t.r2l], [t.r3, 'settingsDigest', t.r3l], [t.r4, 'materialsDigest', t.r4l], [t.r5, 'runtimeDigest', t.r5l]];
  rows.forEach(([name, field, note], i) => {
    const y = 98 + i * 52;
    parts.push(`<g><rect class="box${i === 0 ? ' hl-files' : ''}" x="32" y="${y}" width="316" height="46" rx="7"/><text class="b" x="44" y="${y + 19}" style="font-size:12.5px">${esc(name)}</text><text class="m" x="336" y="${y + 19}" text-anchor="end">${esc(field)}</text><text class="l" x="44" y="${y + 36}">${esc(note)}</text></g>`);
  });
  parts.push(group({ x: 384, y: 74, w: 266, h: 286, label: t.src }));
  parts.push(block({ x: 396, y: 98, w: 242, h: 78, rows: [['t', t.k1], ['c', t.k1c], ['l', t.k1l]] }));
  parts.push(block({ x: 396, y: 186, w: 242, h: 78, id: 'rev', rows: [['t', t.k2], ['c', t.k2c], ['l', t.k2l]] }));
  parts.push(block({ x: 396, y: 274, w: 242, h: 78, rows: [['t', t.k3], ['c', t.k3c], ['l', t.k3l]] }));
  parts.push(block({ x: 674, y: 98, w: 286, h: 140, id: 'rec', rows: [['t', t.rec], ['m', 'tasks/<id>/evidence/<uuid>.json'], ['m', '{ kind, status, criteria,'], ['m', '  state, freshness, origin,'], ['m', '  artifactSha256, sequence }'], ['l', t.recl]] }));
  parts.push(block({ x: 674, y: 252, w: 286, h: 108, rows: [['t', t.cmp], ['c', t.cmpc], ['l', t.cmpq], ['l', t.cmpl1], ['l', t.cmpl2]] }));
  parts.push(arrow([[348, 216], [384, 216]], { color: 'red', label: 'state', dy: -6 }));
  parts.push(arrow([[638, 168], [674, 168]], { color: 'red' }));
  parts.push(arrow([[817, 238], [817, 252]]));
  parts.push(group({ x: 20, y: 384, w: 940, h: 150, label: t.time }));
  const lane = (y, items) => items.map(([x, w, cls, title, sub, id]) => block({ x, y, w, h: 50, cls, id, rows: [['t', title], ['m', sub]] })).join('');
  parts.push(`<text class="l" x="34" y="429">${esc(t.lane1)}</text><text class="l" x="34" y="491">${esc(t.lane2)}</text>`);
  parts.push(lane(408, [[166, 160, '', t.e1, 'state = A · CURRENT', 'e1'], [344, 150, 'bad', t.e2, 'A → B', 'e2'], [512, 178, 'off', t.e3, 'A ≠ B → STALE', 'e3'], [708, 240, 'ok', t.e4, 'state = B · CURRENT', 'e4']]));
  parts.push(lane(470, [[166, 160, '', t.f1, 'seenState = B', 'f1'], [344, 150, 'bad', t.f2, 'B → C', 'f2'], [512, 436, 'off', t.f3, 'freshness: STALE', 'f3']]));
  for (const [x1, x2, y] of [[326, 344, 433], [494, 512, 433], [690, 708, 433], [326, 344, 495], [494, 512, 495]]) parts.push(arrow([[x1, y], [x2, y]]));
  const tk = token([[246, 433], [419, 433], [601, 433], [828, 433]], [1.2, 1.2, 1.6, 1.6], { speed: 120 });
  const css = [['e1', 0], ['e2', 1], ['e3', 2], ['e4', 3]].map(([id, i]) => light(id, tk.windows[i], tk.dur)).join('') + light('files', tk.windows[1], tk.dur) + light('rec', tk.windows[0], tk.dur);
  parts.push(tk.svg);
  parts.push(`<text class="cap" x="20" y="${H - 20}">${esc(t.caption)}</text>`);
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.sub}. ${t.caption}`, css, body: parts.join('\n') });
}

// ── 4. How a job finds an executor ─────────────────────────────────────────
function pool(lang) {
  const t = T[lang].pool, W = 980, H = 620;
  const parts = [`<text class="ttl" x="20" y="36">${esc(t.title)}</text><text class="sub" x="20" y="56">${esc(t.sub)}</text>`];
  parts.push(block({ x: 20, y: 78, w: 196, h: 84, id: 'job', rows: [['t', t.job], ['c', t.jobc], ['m', 'reviewer · pool=review'], ['l', t.jobl]] }));
  parts.push(group({ x: 20, y: 184, w: 196, h: 214, label: t.cand }));
  [['1 · claude', 'provider: anthropic', 'c1'], ['2 · codex', 'provider: openai', 'c2'], ['3 · groq', 'openai-compat', 'c3']]
    .forEach(([n, m, id], i) => parts.push(block({ x: 32, y: 208 + i * 62, w: 172, h: 52, id, rows: [['t', n], ['m', m]] })));
  parts.push(group({ x: 240, y: 78, w: 300, h: 320, label: t.gates }));
  [[t.g1, t.g1l], [t.g2, t.g2l], [t.g3, t.g3l], [t.g4, t.g4l]].forEach(([n, l], i) => parts.push(block({ x: 252, y: 102 + i * 72, w: 276, h: 62, id: `g${i}`, rows: [['t', `${i + 1}. ${n}`], ['l', l]] })));
  for (let i = 0; i < 3; i++) parts.push(arrow([[470, 164 + i * 72], [470, 174 + i * 72]], { color: 'red' }));
  parts.push(block({ x: 564, y: 78, w: 396, h: 122, id: 'run', rows: [['t', t.run], ['m', 'spawn(command) · stdin ← prompt'], ['l', t.runl1], ['l', t.runl2], ['l', t.runl3]] }));
  parts.push(block({ x: 564, y: 222, w: 188, h: 84, cls: 'ok', id: 'ok', rows: [['t', `✓ ${t.ok}`], ['l', t.okl1], ['l', t.okl2]] }));
  parts.push(block({ x: 772, y: 222, w: 160, h: 84, cls: 'wait', id: 'next', rows: [['t', `↻ ${t.next}`], ['l', t.nextl1], ['l', t.nextl2]] }));
  parts.push(block({ x: 564, y: 322, w: 188, h: 76, cls: 'bad', rows: [['t', `✗ ${t.fail}`], ['l', t.faill1], ['l', t.faill2]] }));
  parts.push(block({ x: 772, y: 322, w: 188, h: 76, cls: 'wait', id: 'ask', rows: [['t', `⏸ ${t.ask}`], ['l', t.askl1], ['l', t.askl2]] }));
  parts.push(group({ x: 20, y: 432, w: 940, h: 104, label: t.stopT }));
  parts.push(block({ x: 32, y: 456, w: 296, h: 68, cls: 'bad', rows: [['t', t.stop], ['l', t.stopl]] }));
  parts.push(block({ x: 346, y: 456, w: 296, h: 68, rows: [['t', 'stop-report.md · handoff.md'], ['m', 'status: WAITING_HUMAN'], ['l', t.stopf]] }));
  parts.push(block({ x: 660, y: 456, w: 288, h: 68, cls: 'wait', rows: [['t', t.you], ['c', t.youc1], ['c', t.youc2]] }));
  parts.push(arrow([[328, 490], [346, 490]], { color: 'red' }));
  parts.push(arrow([[642, 490], [660, 490]], { color: 'waitl' }));
  parts.push(arrow([[118, 162], [118, 184]], { color: 'red' }));
  parts.push(arrow([[204, 234], [252, 133]], { color: 'red' }));
  parts.push(arrow([[528, 349], [546, 349], [546, 139], [564, 139]], { color: 'red' }));
  parts.push(arrow([[658, 200], [658, 222]], { color: 'okl' }));
  parts.push(arrow([[852, 200], [852, 222]], { color: 'waitl' }));
  parts.push(arrow([[948, 200], [948, 322]], { color: 'waitl' }));
  parts.push(arrow([[852, 322], [852, 306]], { color: 'waitl' }));
  parts.push(arrow([[658, 306], [658, 322]], { color: 'red', dash: true }));
  parts.push(arrow([[772, 264], [762, 264], [762, 412], [228, 412], [228, 296], [204, 296]], { color: 'waitl', dash: true, label: t.toNext, at: 0.45, dy: -5 }));
  parts.push(arrow([[118, 398], [118, 456]], { color: 'red', dash: true, label: t.exhausted, at: 0.62, dx: 6, anchor: 'start' }));
  parts.push(`<rect class="box" x="20" y="552" width="940" height="30" rx="8"/><text class="l" x="34" y="572">${esc(t.board)}</text>`);
  const lineX = 34 + 14 + measure(t.board, 11.5);
  parts.push(t.s.map((s, i) => `<text class="m st${i}" x="${lineX}" y="572">${esc(s)}</text>`).join(''));
  const loop = [[118, 120], [118, 234], [390, 133], [390, 349], [546, 349], [546, 139], [658, 139], [852, 264], [762, 264], [762, 412], [228, 412], [228, 296], [118, 296], [390, 133], [390, 349], [546, 349], [546, 139], [658, 139], [658, 264]];
  const tk = token(loop, [0.6, 0.6, 0.5, 0.5, 0, 0, 1.2, 1.2, 0, 0, 0, 0, 0.6, 0.5, 0.5, 0, 0, 1.2, 1.8], { speed: 260 });
  const w = tk.windows, p = v => v.toFixed(2), D = tk.dur.toFixed(2);
  const css = [['job', 0], ['c1', 1], ['run', 6], ['next', 7], ['c2', 12], ['ok', 18]].map(([id, i]) => light(id, w[i], tk.dur)).join('')
    + [0, 1, 2, 3].map(i => light(`g${i}`, [w[2][0], w[3][1]], tk.dur)).join('')
    + `.st0{opacity:0;animation:s0 ${D}s linear infinite}@keyframes s0{0%,${p(w[7][0])}%{opacity:0}${p(w[7][0] + 0.4)}%,${p(w[17][0])}%{opacity:1}${p(w[17][0] + 0.4)}%,100%{opacity:0}}`
    + `.st1{opacity:0;animation:s1 ${D}s linear infinite}@keyframes s1{0%,${p(w[17][0])}%{opacity:0}${p(w[17][0] + 0.4)}%,${p(w[18][0])}%{opacity:1}${p(w[18][0] + 0.4)}%,100%{opacity:0}}`
    + `.st2{opacity:1;animation:s2 ${D}s linear infinite}@keyframes s2{0%,${p(w[18][0])}%{opacity:0}${p(w[18][0] + 0.4)}%,100%{opacity:1}}`;
  parts.push(tk.svg);
  parts.push(`<text class="cap" x="20" y="${H - 14}">${esc(t.caption)}</text>`);
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.sub}. ${t.s.join(' · ')}. ${t.caption}`, css, body: parts.join('\n') });
}
const measure = (s, px) => [...s].reduce((w, ch) => w + (ch.codePointAt(0) > 0x2e80 ? px : px * 0.58), 0);

// ── 5. Knowledge: sources → notes and SQL → who uses them ─────────────────
function kb(lang) {
  const t = T[lang].kb, W = 980, H = 640;
  const parts = [`<text class="ttl" x="20" y="36">${esc(t.title)}</text><text class="sub" x="20" y="56">${esc(t.sub)}</text>`];
  parts.push(group({ x: 20, y: 74, w: 290, h: 410, label: t.srcT }));
  [[t.s1, 'import / export', t.s1l], [t.s2, '[text](path) · `path`', t.s2l], [t.s3, 'bk-type · related · documents', t.s3l], [t.s4, '[[wikilinks]]', t.s4l], [t.s5, 'decision.json · lessons/', t.s5l]]
    .forEach(([n, m, l], i) => parts.push(block({ x: 32, y: 98 + i * 76, w: 266, h: 68, id: `s${i}`, rows: [['t', n], ['m', m], ['l', l]] })));
  parts.push(block({ x: 334, y: 98, w: 262, h: 84, id: 'build', rows: [['t', t.build], ['c', t.buildc], ['m', 'core/kb.mjs'], ['l', t.buildl]] }));
  parts.push(block({ x: 334, y: 204, w: 262, h: 104, id: 'gen', rows: [['t', 'knowledge/_generated/'], ['l', t.genl1], ['l', t.genl2], ['m', 'bk-provenance: EXTRACTED'], ['m', 'index.md']] }));
  parts.push(block({ x: 334, y: 326, w: 262, h: 158, id: 'sql', rows: [['t', '.state/kb.sqlite'], ['l', t.sqll], ['m', 'notes(id, type, kind, path…)'], ['m', 'links(src, dst, rel, provenance)'], ['m', 'fts'], ['m', 'orphans · stale · broken_links'], ['m', 'undocumented_modules'], ['m', '']] }));
  parts.push(arrow([[465, 182], [465, 204]], { color: 'red' }));
  parts.push(arrow([[465, 308], [465, 326]], { color: 'red' }));
  parts.push(`<path class="ln" d="M298 132 H316 M298 208 H316 M298 284 H316 M298 360 H316 M298 436 H316 M316 132 V436"/>`);
  parts.push(arrow([[316, 140], [334, 140]], { color: 'red' }));
  parts.push(group({ x: 620, y: 74, w: 340, h: 410, label: t.useT }));
  [[t.u1, t.u1c, t.u1l, 'u1'], [t.u2, t.u2c, t.u2l, 'u2'], [t.u3, t.u3c, t.u3l, 'u3'], [t.u4, t.u4c, t.u4l, 'u4']]
    .forEach(([n, c, l, id], i) => parts.push(block({ x: 632, y: 98 + i * 96, w: 316, h: 86, id, rows: [['t', n], ['c', c], ['l', l]] })));
  parts.push(arrow([[596, 256], [608, 256], [608, 141], [632, 141]]));
  parts.push(`<path class="ln red" d="M596 405 H614 M614 237 V429"/>`);
  for (const y of [237, 333, 429]) parts.push(arrow([[614, y], [632, y]], { color: 'red' }));
  // A small, correct example: an arrow goes from the note that holds the link
  parts.push(group({ x: 20, y: 506, w: 940, h: 92, label: t.example }));
  const nodeAt = { test: [110, 548], accept: [330, 548], snap: [550, 548], doc: [800, 548], lesson: [330, 584] };
  const label = { test: 'test/accept.test.mjs', accept: 'core/accept.mjs', snap: 'core/snapshot.mjs', doc: 'docs/concepts/evidence.md', lesson: 'knowledge/lessons/<task>.md' };
  parts.push(Object.entries(nodeAt).map(([k, [x, y]]) => `<text class="m" x="${x}" y="${y + 4}" text-anchor="middle">${esc(label[k])}</text>`).join(''));
  parts.push(arrow([[180, 544], [270, 544]], { color: 'red', label: 'tests', dy: -5 }));
  parts.push(arrow([[392, 544], [482, 544]], { label: 'imports', dy: -5 }));
  parts.push(arrow([[712, 544], [622, 544]], { label: 'documents', dy: -5 }));
  parts.push(arrow([[420, 584], [480, 584], [520, 556]], { label: 'about', at: 0.3, dy: -5 }));
  const path = [[165, 132], [316, 132], [316, 140], [334, 140], [465, 140], [465, 405], [614, 405], [614, 333], [790, 333]];
  const tk = token(path, [0.8, 0, 0, 0, 1.3, 1.3, 0, 0, 1.6], { speed: 170 });
  const css = [['s0', 0], ['build', 4], ['sql', 5], ['u3', 8]].map(([id, i]) => light(id, tk.windows[i], tk.dur)).join('') + light('gen', [tk.windows[4][1] - 3, tk.windows[4][1] + 2], tk.dur);
  parts.push(tk.svg);
  parts.push(`<text class="cap" x="20" y="${H - 16}">${esc(t.caption)}</text>`);
  return svg(lang, { w: W, h: H, title: t.title, desc: `${t.sub}. ${t.caption}`, css, body: parts.join('\n') });
}

export const DIAGRAMS = { banner, architecture, flow, evidence, pool, kb };
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
