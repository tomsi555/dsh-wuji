import { test } from 'node:test';
import assert from 'node:assert';
import { openDb, logTurn, fold, vow, judge, gateCheck, softReact } from '../lib/core.mjs';

test('六表开柜与叶记账', () => {
  const db = openDb(':memory:');
  logTurn(db, { role: 'her', chaos: 0, heat: 1, text: '今晚吃什么' });
  logTurn(db, { role: 'her', chaos: 3, heat: 5, text: '你为什么总是这样，话都没说完！' });
  const c = db.prepare('select count(*) n from ye').get().n;
  assert.equal(c, 2);
});

test('现世道折叠：峰值入修罗、未解入饿鬼、日常沉人道', () => {
  const db = openDb(':memory:');
  logTurn(db, { role: 'a', chaos: 0, text: '散步吗' });
  logTurn(db, { role: 'a', chaos: 4, text: '别走！话说清楚！' });
  logTurn(db, { role: 'b', chaos: 2, text: '你到底为什么，我到现在没说' });
  const r = fold(db);
  assert.ok(r && /本段 3 轮/.test(r.summary));
  assert.equal(db.prepare('select count(*) n from xiuluo').get().n, 1);
  assert.equal(db.prepare('select count(*) n from egui').get().n, 1);
  assert.equal(db.prepare('select count(*) n from diyu').get().n, 1); // chaos4 封藏
  assert.equal(db.prepare('select count(*) n from ye').get().n, 0);   // 叶已折尽
});

test('天道焊行不受折叠粉碎', () => {
  const db = openDb(':memory:');
  vow(db, '不捞怎知虚与实？我便一棍硬破天。');
  logTurn(db, { role: 'a', chaos: 1, text: '随便聊' });
  fold(db);
  assert.equal(db.prepare('select count(*) n from tiandao').get().n, 1);
});

test('内三尸裁决：出千可测、豹子升档、出口禁词自检', () => {
  const db = openDb(':memory:');
  const v1 = judge(db, { chaos: 0, seed: 'fixed-A' });
  const v2 = judge(db, { chaos: 0, seed: 'fixed-A' });
  assert.equal(v1.line, v2.line); // 同 seed 同裁（测试态）
  assert.ok(gateCheck(v1.line));
  const p = judge(db, { chaos: 3, tone: { li: 5, ren: 5, ben: 5 }, seed: 'x' });
  assert.ok(p.line && !/chaos|规则|拦截/.test(p.line));
});

test('软包闸与三反应', () => {
  assert.ok(!gateCheck('抱歉，我是一个人工智能，不能帮你这个。'));
  assert.ok(gateCheck('嗓子哑半格，端起碗再说。'));
  assert.match(softReact(0), /手边的事/);
  assert.match(softReact(2), /镜头/);
  assert.match(softReact(3), /还在晃/);
});
