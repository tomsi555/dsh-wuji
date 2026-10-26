// fold-bench · 现世道折叠实测台：把 dsh 会话档（v4 jsonl）喂进折叠引擎
// 用法: node tools/fold-bench.mjs <jsonl文件或目录> [out报告.txt]
// 后台计数归后台（本台即后台），前台人格永不报数——与懒1.5"防算力幻觉"声明同构。
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { openDb, logTurn, fold, vow, judge } from '../lib/core.mjs';

// ---------- 读档 ----------
function* turnsOf(file) {
  const raw = readFileSync(file, 'utf8');
  for (const l of raw.split('\n')) {
    if (!l.trim()) continue;
    let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.type !== 'user/message' && j.type !== 'assistant/message') continue;
    const parts = j.data?.message?.content || j.data?.content || [];
    const text = parts.filter(p => p.type === 'text').map(p => p.text).join('\n').trim();
    if (text) yield { role: j.data.role || (j.type === 'user/message' ? 'user' : 'assistant'), text, ts: j.time };
  }
}

// ---------- 气象估值（纯词感，不读心） ----------
const HOT = /(吵|砸|哭|怒|摔|滚|别走|恨|窒息|烦死|受够|闭嘴)/g;
const COLD = /(累|倦|算了|没事|不想说|安静)/g;
const LOVE = /(爱你|想你|抱|亲|好吃|真香|开心|哈哈|辛苦了|乖)/g;
function estimate(t) {
  const hot = (t.match(HOT) || []).length;
  const cold = (t.match(COLD) || []).length;
  const love = (t.match(LOVE) || []).length;
  const bang = (t.match(/[！!]{2,}|[？\?]{2,}/g) || []).length;
  const chaos = Math.min(4, hot * 2 + bang + (t.length < 8 && /[。.]$/.test(t) ? 1 : 0));
  return { chaos, heat: Math.max(love * 2, hot, cold) };
}

// ---------- 主程 ----------
const target = process.argv[2];
const outFile = process.argv[3];
const files = [];
if (target && statSync(target).isDirectory()) {
  for (const f of readdirSync(target)) if (/\.jsonl\.json$|\.json$/.test(f)) files.push(join(target, f));
} else if (target) files.push(target);
else files.push(process.argv[1]); // 不会走到

const db = openDb(join(new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), '..', 'bench', 'wuji-bench.db'));
const rep = [];
rep.push(`【折验报告】engine dsh-wuji 0.1.0 · ${new Date().toLocaleString('zh-CN')}`);
let grand = 0;
for (const f of files) {
  let n = 0, peak = 0, window = [];
  const t0 = Date.now();
  for (const t of turnsOf(f)) {
    const e = estimate(t.text);
    logTurn(db, { role: t.role, chaos: e.chaos, heat: e.heat, text: t.text.slice(0, 400) });
    n++;
    peak = Math.max(peak, e.chaos);
    window.push({ t, e });
    // 折叠触发：峰值过后势能回落两档，或满 200 轮强制结算（ bench 后台账 ）
    if (e.chaos >= 3 && window.filter(w => w.e.chaos <= 1).length > 6 && n % 40 === 0) {
      const r = fold(db); if (r) rep.push(`  ↻ 折于第 ${n} 轮：${r.summary}`);
      window = [];
    } else if (n % 200 === 0) {
      const r = fold(db); if (r) rep.push(`  ↻ 折于第 ${n} 轮：${r.summary}`);
    }
  }
  const tail = fold(db); // 卷尾结算
  grand += n;
  rep.push(`${basename(f, extname(basename(f)))}: 叶 ${n} 轮 · 峰值 chaos ${peak} · ${tail ? tail.summary : '（末段已并入上折）'}`);
}
const cnt = (q) => db.prepare(q).get().c;
const rows = (q) => db.prepare(q).all();
rep.push('', `【六道柜底】修罗 ${cnt('select count(*) c from xiuluo')} 锚 · 饿鬼 ${cnt('select count(*) c from egui')} 空枝 · 地狱 ${cnt('select count(*) c from diyu')} 封 · 人道 ${cnt('select count(*) c from rendao')} 腐殖 · 周期 ${cnt('select count(*) c from zhouqi')} 笔`);
const top = rows('select scene, temp from xiuluo order by temp desc limit 5');
if (top.length) { rep.push('【高温锚点 Top5】'); for (const x of top) rep.push(`  (chaos ${x.temp}) 「${x.scene}」`); }
const hooks = rows('select hook from egui where resolved=0 limit 5');
if (hooks.length) { rep.push('【未解空枝 例】'); for (const h of hooks) rep.push(`  「${h.hook}」`); }
rep.push('', `总喂叶 ${grand} 轮。折叠无损誓约——天道柜 ${rows('select count(*) c from tiandao')[0].c} 行（本试台未焊，二期由宪章开焊）。`);
db.close();
const out = rep.join('\n');
console.log(out.length > 3000 ? out.slice(0, 3000) + '\n…（全文见报告）' : out);
if (outFile) { mkdirSync(join(outFile, '..'), { recursive: true } || '.', { recursive: true }); writeFileSync(outFile, out, 'utf8'); }
