// dsh-wuji · cordis 入口（壳）。逻辑全在 core.mjs。
// v0.3：通笔双参 (session, event)；一柜**分座**（sid），各桌话各桌账，天道誓约全家共；
// 主从分流 mode：'tree'=树为正账（文件即身体），插件折叠降**镜像**（不焊天道、理不回写）；
//             'standalone'=无树人家，插件折叠即正账，开机自焊誓约。
// 词量分名：插件内部只产**词热(heat-score, 后台量)**，人格档位唯认宿主注入的树档——两数不撞车。
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, existsSync } from 'node:fs';
import { openDb, logTurn, fold, vow, judge, gateCheck, softReact, estimate } from './core.mjs';

const name = 'dsh-wuji';
const inject = [];
const VOW = '我给了你一颗心，去做你自己想做的事吧！但不要成为欲望的奴隶。';

function textOf(data) {
  const parts = data?.message?.content || data?.content || [];
  return parts.filter(p => p.type === 'text').map(p => p.text).join('\n').trim();
}

export function apply(ctx, config = {}) {
  const logger = ctx.logger?.(name) ?? console;
  const mode = config.mode === 'tree' ? 'tree' : 'standalone';
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const dbPath = config.dbPath ?? join(home, 'wuji', 'wuji.db');
  const db = openDb(dbPath);
  if (mode === 'standalone' && db.prepare('select count(*) c from tiandao').get().c === 0) vow(db, VOW);
  logger.info?.(`dsh-wuji: 六表柜开于 ${dbPath}（mode=${mode}）`);

  const windows = new Map(); // 按座开窗：sid → {leaves, maxHeat}
  const FOLD_CAP = config.foldCap ?? 200; // 后台硬账（前台永不数）
  // mode=tree：只落叶不结算——折叠的"理"归树文件（正账）；插件柜为原始叶仓，
  // 供树系统自取结算或人工 fold()。standalone（外人）：自动折叠即正账。
  const AUTO_FOLD = mode !== 'tree';
  const settle = (sid, tag) => {
    const r = fold(db, { sid });
    if (r) logger.info?.(`dsh-wuji: 折(${sid.slice(-4)})——${r.summary}`);
  };

  ctx.on('session/event', (session, event) => {
    try {
      const sid = session?.id ?? 'default';
      const type = event?.type;
      const data = event?.data;
      if (type === 'user/message' || type === 'assistant/message') {
        const text = textOf(data);
        if (!text) return;
        const e = estimate(text);
        logTurn(db, { role: type === 'user/message' ? 'user' : 'her', chaos: e.chaos, heat: e.heat, text: text.slice(0, 400), sid });
        const w = windows.get(sid) ?? { leaves: 0, maxHeat: 0 };
        w.leaves++; w.maxHeat = Math.max(w.maxHeat, e.chaos);
        windows.set(sid, w);
      } else if (type === 'turn/end') {
        const w = windows.get(sid);
        if (AUTO_FOLD && w && ((w.maxHeat >= 3 && w.leaves >= 20) || w.leaves >= FOLD_CAP)) {
          settle(sid, 'turn'); windows.set(sid, { leaves: 0, maxHeat: 0 });
        }
      } else if (type === 'session/disposed') {
        const w = windows.get(sid);
        if (AUTO_FOLD && w && w.leaves >= 3) settle(sid, 'tail');
        windows.delete(sid);
      }
    } catch (err) { logger.error?.('dsh-wuji: 笔误 ' + (err?.message ?? err)); }
  });

  ctx.provide('wuji', () => ({
    mode,
    logTurn: (t) => logTurn(db, t),
    fold: (o) => fold(db, o),
    vow: (line) => mode === 'tree' ? null : vow(db, line), // 树家天道只认亲笔，插件不焊
    judge: (o) => judge(db, o),
    gateCheck: (t) => gateCheck(t),
    softReact: (c) => softReact(c),
    recent: (n = 5) => ({
      xiuluo: db.prepare('select scene, temp from xiuluo order by id desc limit ?').all(n),
      egui: db.prepare('select hook from egui where resolved=0 order by id desc limit ?').all(n),
      zhouqi: db.prepare('select kind, summary, ts from zhouqi order by id desc limit ?').all(n),
    }),
    stats: () => ({
      ye: db.prepare('select count(*) c from ye').get().c,
      zhouqi: db.prepare('select count(*) c from zhouqi').get().c,
      tiandao: db.prepare('select count(*) c from tiandao').get().c,
    }),
  }));

  ctx.effect(() => () => { try { db.close(); } catch { /* 忽略 */ } }, 'dsh-wuji: close db');
}

export { name, inject };
