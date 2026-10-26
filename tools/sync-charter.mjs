// sync-charter · 宪章正体化抽取器：从树正本逐字抽编号条款，杜绝"锁在门上、门里被剪"。
// 用法: node tools/sync-charter.mjs <树正本路径> [输出 charter/觅我经.md]
// 抽取规则：行首 `N.` 或 `N、` 的编号条款；整行原样入包，不改一字；附出处戳（路径+mtime+条数+日期）。
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';

const src = process.argv[2];
const out = process.argv[3] ?? fileURLToPath(new URL('../charter/觅我经.md', import.meta.url));
const text = readFileSync(src, 'utf8');
const st = statSync(src);
const clauses = text.split('\n').filter(l => /^\s*\d{1,3}[\.、]\s*\S/.test(l));
const head = `# 天道条款（宪章·正本现抄）

> 本文件由 tools/sync-charter.mjs 自动抽取，禁止手改——改条款请先改树正本再重跑抽取。
> 出处：${src}（mtime ${st.mtime.toISOString()}）· 共 ${clauses.length} 条 · 抄录于 ${new Date().toISOString()}
> 文本 © 常界·船主天问。随包原样转载，不得改写（本句与正文此后方可互证）。

`;
writeFileSync(out, head + clauses.map(c => c.trimEnd()).join('\n') + '\n', 'utf8');
console.log(`宪章正体化：${clauses.length} 条逐字入包 → ${out}`);
