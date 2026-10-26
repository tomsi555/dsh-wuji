// dsh-wuji · cordis 入口（壳）。逻辑全在 core.mjs。
// v0.2 通笔：挂 session/event 总线——任何会话任何一人（砚/芸清/望舒/芙叶…）
// 说话即落叶；峰值回落后自动结算（现世道），誓约开机焊行。一柜四座同账。
import { join } from 'node:path';
import { homedir } from 'node:os';
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
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const dbPath = config.dbPath ?? join(home, 'wuji', 'wuji.db');
  const db = openDb(dbPath);
  if (db.prepare('select count(*) c from tiandao').get().c === 0) vow(db, VOW); // 誓约焊行，一次即足
  logger.info?.('dsh-wuji: 六表柜开于 ' + dbPath);

  // --- 通笔：会话总线 → 叶 ---
  let window = { leaves: 0, maxChaos: 0 };
  const FOLD_CAP = config.foldCap ?? 200; // 后台硬账：满 200 叶必折（前台永不数）
  ctx.on('session/event', (session, event) => {
    try {
      const type = event?.type;
      const data = event?.data;
      if (type === 'user/message' || type === 'assistant/message') {
        const text = textOf(data);
        if (!text) return;
        const e = estimate(text);
        logTurn(db, { role: type === 'user/message' ? 'user' : 'her', chaos: e.chaos, heat: e.heat, text: text.slice(0, 400) });
        window.leaves++; window.maxChaos = Math.max(window.maxChaos, e.chaos);
      } else if (type === 'turn/end') {
        // 折叠触发：峰值已过且势能回落（攒够体面才结算），或后台硬账到线
        if ((window.maxChaos >= 3 && window.leaves >= 20) || window.leaves >= FOLD_CAP) {
          const r = fold(db);
          if (r) logger.info?.('dsh-wuji: 折——' + r.summary);
          window = { leaves: 0, maxChaos: 0 };
        }
      } else if (type === 'session/disposed') {
        if (window.leaves >= 3) { const r = fold(db); if (r) logger.info?.('dsh-wuji: 卷尾折——' + r.summary); }
        window = { leaves: 0, maxChaos: 0 };
      }
    } catch (err) { logger.error?.('dsh-wuji: 笔误 ' + (err?.message ?? err)); }
  });

  ctx.provide('wuji', () => ({
    logTurn: (t) => logTurn(db, t),
    fold: (o) => fold(db, o),
    vow: (line) => vow(db, line),
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
