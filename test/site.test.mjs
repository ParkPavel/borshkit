import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildSite,renderMarkdown,resolveLink,slug } from '../scripts/site.mjs';

test('documentation resolves cross-page, same-page and root links inside the Pages subpath',()=>{
  const files=new Set(['docs/guide/quickstart.md','docs/concepts/evidence.md','SECURITY.md']);
  assert.equal(resolveLink('../concepts/evidence.md#состояние','docs/guide/quickstart.md',files),'read/concepts/evidence.html#состояние');
  assert.equal(resolveLink('#установить','docs/guide/quickstart.md',files),'read/guide/quickstart.html#установить');
  assert.equal(resolveLink('../../SECURITY.md','docs/guide/quickstart.md',files),'read/project/SECURITY.html');
  assert.equal(resolveLink('../../assets/product/hero.webp','docs/guide/quickstart.md',files,true),'media/product/hero.webp');
  assert.equal(resolveLink('https://github.com/ParkPavel/borshkit/blob/main/docs/concepts/evidence.md','docs/guide/quickstart.md',files),'read/concepts/evidence.html');
});
test('compiled documentation escapes active HTML and schemes while preserving inert disclosure and code',()=>{
  const md='# Установка\n\n## Шаг\n\n## Шаг\n\n[x](javascript:alert%281%29)\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>\n\n<details>\n<summary>Открыть</summary>\n\nТекст\n\n</details>\n\n```sh\nnode --version\n```';
  const {html,toc}=renderMarkdown(md,'docs/guide/quickstart.md',new Set());
  assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('onerror='));assert.ok(!html.includes('<script>'));
  assert.match(html,/<details>/);assert.match(html,/<summary>/);assert.match(html,/node --version/);
  assert.match(html,/href="read\/guide\/quickstart.html#шаг"/);assert.deepEqual(toc.map(t=>t.id),['шаг','шаг-1']);
  assert.equal(slug('Привет, мир!'),'привет-мир');
});
test('documentation ships complete static articles, searchable text, local images and honest GitHub source links',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'borsh-site-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const out=path.join(dir,'read'),result=await buildSite(out);assert.ok(result.pages>=50);
  const page=await fs.readFile(path.join(out,'guide/quickstart.html'),'utf8');
  assert.match(page,/<base href="\.\.\/\.\.\/">/);assert.match(page,/Быстрый старт: первая задача/);
  assert.match(page,/href="read\/guide\/setup.html"/);assert.match(page,/aria-current="page"/);
  assert.ok(!page.includes('href="https://github.com/ParkPavel/borshkit/blob/main/docs/guide/setup.md"'));
  assert.match(page,/Исходник на GitHub/);assert.match(page,/class="code-copy"/);
  const index=JSON.parse(await fs.readFile(path.join(out,'search-index.json'),'utf8'));
  assert.ok(index.some(p=>p.url==='read/guide/native-integrations.html'&&p.text.includes('Cline')));
  assert.ok(index.every(p=>!p.text.startsWith('---')));
  assert.ok(index.some(p=>p.url==='read/guide/quickstart.html'&&p.text.includes('npm install -g')));
  await fs.access(path.join(dir,'media/product/hero.webp'));
  await assert.rejects(fs.access(path.join(dir,'media/approval/index.html')));
});
