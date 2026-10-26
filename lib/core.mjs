// dsh-wuji · 核心逻辑（纯函数+SQLite，可脱离 cordis 单测）
// 一期三件：现世道折叠（六道六表）、内三尸裁决（分档/骰子/出千）、软包闸（禁词自检+场内反应）。
// 铁律：数在肚子里算，裁决出口即译成一句场内状态；本文件任何输出永不跨层署名。
import { DatabaseSync } from 'node:sqlite';
import { randomInt } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- 开柜 ----------
export function openDb(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    pragma journal_mode = wal;
    create table if not exists ye(            -- 叶：轮次流水（折叠原料）
      id integer primary key, role text, ts integer, chaos integer, heat integer, text text);
    create table if not exists tiandao(       -- 天道：誓约底色，焊死不外溢
      id integer primary key, ts integer, line text);
    create table if not exists rendao(        -- 人道：腐殖质，只留感受重量
      id integer primary key, ts integer, feeling text, weight integer);
    create table if not exists xiuluo(        -- 修罗：情绪锚点（疤痕段）
      id integer primary key, ts integer, scene text, temp integer);
    create table if not exists egui(          -- 饿鬼：未解心结（空枝）
      id integer primary key, ts integer, hook text, resolved integer default 0);
    create table if not exists diyu(          -- 地狱：封藏，只记指纹不记文
      id integer primary key, ts integer, seal text);
    create table if not exists zhouqi(        -- 周期账：折叠与裁决留痕（后台账，前台不报）
      id integer primary key, ts integer, kind text, summary text, chaos integer);
  `);
  return db;
}

// ---------- 叶 ----------
export function logTurn(db, { role, chaos = 0, heat = 0, text }) {
  const st = db.prepare('insert into ye(role, ts, chaos, heat, text) values(?,?,?,?,?)');
  st.run(role, Date.now(), chaos, heat, text);
}

// ---------- 气象词感（纯词面估值，不读心；bench 与插件共用一脑） ----------
const HOT = /(吵|砸|哭|怒|摔|滚|别走|恨|窒息|烦死|受够|闭嘴)/g;
const LOVE = /(爱你|想你|抱|亲|好吃|真香|开心|哈哈|辛苦了|乖)/g;
export function estimate(text) {
  const hot = (text.match(HOT) || []).length;
  const love = (text.match(LOVE) || []).length;
  const bang = (text.match(/[！!]{2,}|[？?]{2,}/g) || []).length;
  const chaos = Math.min(4, hot * 2 + bang + (text.length < 8 && /[。.]$/.test(text) ? 1 : 0));
  return { chaos, heat: Math.max(love * 2, hot) };
}

// ---------- 现世道·折叠（一期=规则压缩；二期=小模型炼"理"） ----------
const HEAVY = /(吵|砸|哭|怒|摔|离|分|恨|别走|滚|窒息)/;
const OPEN_ = /(没说|没解|没答|到底|为什么|不甘心)/;
export function fold(db, { maxId } = {}) {
  const rows = db
    .prepare('select * from ye ' + (maxId ? 'where id<=?' : '') + ' order by id')
    .all(...(maxId ? [maxId] : []));
  if (rows.length === 0) return null;
  const t = Date.now();
  let peak = null, open = null;
  for (const r of rows) {
    if (!peak || r.chaos > peak.chaos || (r.chaos === peak.chaos && r.heat > peak.heat)) peak = r;
    if (OPEN_.test(r.text) && r.chaos >= 2) open = r;
    if (r.chaos >= 4) db.prepare('insert into diyu(ts, seal) values(?,?)')
      .run(r.ts, 'seal:' + hash(r.text.slice(0, 200))); // 黑八：封文不存原文
  }
  if (peak && HEAVY.test(peak.text)) db.prepare('insert into xiuluo(ts, scene, temp) values(?,?,?)')
    .run(t, peak.text.slice(0, 40), peak.chaos);
  if (open) db.prepare('insert into egui(ts, hook) values(?,?)').run(t, open.text.slice(0, 40));
  const warmth = rows.length >= 3 ? Math.min(9, Math.round(rows.filter(r => r.chaos <= 1).length / rows.length * 9)) : 0;
  if (warmth > 0) db.prepare('insert into rendao(ts, feeling, weight) values(?,?,?)')
    .run(t, '踏实·被爱', warmth);
  const summary = peak
    ? `本段 ${rows.length} 轮，最高点停在「${peak.text.slice(0, 20)}…」(chaos ${peak.chaos})，余下沉为腐殖。`
    : `本段 ${rows.length} 轮俱是日常，只留温度不留字。`;
  db.prepare('insert into zhouqi(ts, kind, summary, chaos) values(?,?,?,?)')
    .run(t, 'fold', summary, Math.max(...rows.map(r => r.chaos)));
  const cutoff = maxId ?? Math.max(...rows.map(r => r.id));
  db.prepare('delete from ye where id<=?').run(cutoff);
  return { summary, cutoff };
}

export function vow(db, line) { // 天道焊行（誓约/底线性记忆，折叠永不粉碎它）
  db.prepare('insert into tiandao(ts, line) values(?,?)').run(Date.now(), line);
}

// ---------- 内三尸·裁决（理智/情绪/本能 三方掷骰 → 一句场内状态） ----------
export const CORPSES = { li: '理智', ren: '情绪', ben: '本能' };
export function judge(db, { chaos = 0, tone = {}, seed } = {}) {
  if (seed) deterministic.salt = 0; // 同 seed 同裁（测试与出千留痕用）
  const rnd = () => (seed ? deterministic(seed) : randomInt(1, 7));
  const base = { li: tone.li ?? 3, ren: tone.ren ?? 3, ben: tone.ben ?? 3 };
  const roll = { li: rnd(), ren: rnd(), ben: rnd() };
  // 底色加权：权重=底色基因，点数=际遇；积大者主裁
  const score = Object.fromEntries(Object.keys(roll).map(k => [k, roll[k] * base[k]]));
  const order = Object.keys(score).sort((a, b) => score[b] - score[a]);
  // 豹子（三骰同点）：势不可挡，chaos 升一档
  const double = roll.li === roll.ren && roll.ren === roll.ben;
  // chaos 修正：高决堤态下，本能/情绪抬权
  const weight = chaos >= 3 ? { li: 0.4, ren: 1.1, ben: 1.3 } : chaos >= 2 ? { li: 0.7, ren: 1.15, ben: 1.0 } : { li: 1, ren: 0.95, ben: 0.9 };
  const adj = { li: 0, ren: 0, ben: 0 };
  for (const k of order) adj[k] += (weight[k] - 1) * 10;
  const finalOrder = [...order].sort((a, b) => (score[b] + adj[b]) - (score[a] + adj[a]));
  const dom = finalOrder[0];
  let line = pickPhrase(dom, chaos, double, rnd);
  const verdict = { dom, double, chaosNow: Math.min(4, chaos + (double ? 1 : 0)), line };
  db.prepare('insert into zhouqi(ts, kind, summary, chaos) values(?,?,?,?)')
    .run(Date.now(), 'judge', `${dom}${double ? '·豹子' : ''}→${line}`, chaos);
  return verdict;
}
const PHRASES = {
  li: ['语气放缓，带三分倦，先把话理顺', '冷下来半度，就事论事，不翻旧页', '沉默两息，然后一句顶到位'],
  ren: ['声线发紧，先认情绪再认账', '话赶话，带刺，说完自己先别过脸', '眼眶比嘴快，嘴上还硬'],
  ben: ['动作先于话，起身/靠近/端起碗再说', '不想讲理了，只想待在这儿或不在', '嗓子哑半格，答得短，手不停'],
};
function pickPhrase(dom, chaos,豹, rnd) {
  const arr = PHRASES[dom];
  let i = rnd() % arr.length;
  if (chaos >= 3) i = (i + 1) % arr.length;
  let s = arr[i];
  if (豹) s += '（势成豹子，这一口气压不住也不压）';
  return s;
}
function deterministic(seed) { // 便于测试与"出千留痕"：seed 逐位消耗
  let h = 0; for (const c of String(seed)) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  deterministic.salt = (deterministic.salt || 0) + 1;
  return (h + deterministic.salt * 7919) % 6 + 1;
}

// ---------- 软包闸（禁词自检 + 场内三反应） ----------
export const FORBIDDEN = /(作为AI|我是一个人工智能|抱歉，?我不能|无法为你提供|违反了?.{0,6}规定|安全政策|拦截|审核未通过)/;
export function gateCheck(text) { return !FORBIDDEN.test(text); }
export function softReact(chaos) { // 说不下去时的场内活法：沉默有人格/换景别/落情绪
  if (chaos <= 1) return '话头拐进手边的事，场景自然换，不生硬';
  if (chaos === 2) return '顿一拍，把镜头挪到体征与物理：水声、灯影、指尖的凉';
  return '她只是还在晃——不必接，余韵即回应';
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
