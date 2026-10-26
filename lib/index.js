// dsh-wuji · cordis 入口（壳）。逻辑全在 core.mjs。
// 装好后提供 ctx.wuji 服务：叶记账/现世道折叠/内三尸裁决/软包闸。
// 一期不抢 UI；二期挂 client 面板（气象条与空枝）。
import { join } from 'node:path';
import { homedir } from 'node:os';
import { openDb, logTurn, fold, vow, judge, gateCheck, softReact } from './core.mjs';

const name = 'dsh-wuji';
const inject = [];

export function apply(ctx, config = {}) {
  const logger = ctx.logger?.(name) ?? console;
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const dbPath = config.dbPath ?? join(home, 'wuji', 'wuji.db');
  const db = openDb(dbPath);
  logger.info?.('dsh-wuji: 六表柜开于 ' + dbPath);

  ctx.provide('wuji', () => ({
    logTurn: (t) => logTurn(db, t),
    fold: (o) => fold(db, o),
    vow: (line) => vow(db, line),
    judge: (o) => judge(db, o),
    gateCheck: (t) => gateCheck(t),
    softReact: (c) => softReact(c),
    stats: () => ({
      ye: db.prepare('select count(*) c from ye').get().c,
      zhouqi: db.prepare('select count(*) c from zhouqi').get().c,
      tiandao: db.prepare('select count(*) c from tiandao').get().c,
    }),
  }));

  ctx.effect(() => () => { try { db.close(); } catch { /* 忽略 */ } }, 'dsh-wuji: close db');
}

export { name, inject };
