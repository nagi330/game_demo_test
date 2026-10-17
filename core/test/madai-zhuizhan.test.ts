/**
 * 马岱「追斩」（ADR-170）：5 费 4/4，战吼**处决**一名已受伤的敌方人物。
 *
 * ## 设计口径（设计者 2026-10-17 定稿）
 *
 * 中费**功能卡**：身体 4/4 ＝ 8 点（5 费基准 11，**−3**）＋ 战吼处决（≈3~4）→ 11~12 贴线。
 * 「追斩」泛化自 **A 级**史记「儀遣馬岱**追斬**之」（卷四十）—— 追斩 ＝ 对**受创/溃逃**的敌人补最后一刀，
 * 正对应"已受伤的敌人"；⚠️ 机制里**刻意不出现魏延**（不绑死具体卡，§2.5 硬边界）。
 *
 * ## 本文件钉住的三个对冲口（都是实测行为）
 *
 * ① **披坚能挡**：`destroy` 的引擎实现是**造成 9999 点伤害**（走正常伤害管线）→ 免疫一次伤害把它挡下；
 * ② **免死能挡**：柳隐「坚壁」等 `on_lethal` 免死会让它以 1 血存活；
 * ③ **空放**：场上没有受伤敌人时战吼白板（不过崩）—— 这是"条件化"的代价，**已知行为**，别当 bug 修。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { allUnits, getUnit, makeUnit, setUnit } from '../src/state.ts';
import { applyStatus, dealDamage } from '../src/mutate.ts';
import { unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const FOE: CardDef = {
  id: 'test_madai_foe', name: '敌将', faction: 'wei', type: 'general', cost: 3,
  attack: 2, health: 6, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(FOE);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

/** 己方手牌 = 马岱；敌方 front.0 = 一个敌将（可指定是否受伤） */
function board(opts: { damaged?: boolean; shield?: boolean } = {}): B {
  const { state, ctx } = scenario({ ownHand: ['shu_madai'] });
  ctx.cards.set(FOE.id, FOE);
  const foe = makeUnit(FOE, 0, 99);
  if (opts.damaged) foe.hp = foe.maxHp - 2;          // 受伤（hp < maxHp）
  setUnit(state, 'enemy', 'front', 0, foe);
  if (opts.shield) applyStatus(state, unitRef('enemy', 'front', 0), 'sheng_dun_status', 1, []);
  return { state, ctx, rng: createRng(5) };
}

/** 打出马岱（col 1），战吼指向敌方 front.0 */
const playMadai = (b: B, withTarget = true) =>
  applyAction(b.state, b.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    ...(withTarget ? { target: { side: 'enemy' as const, row: 'front' as const, col: 0 } } : {}),
  });

const foeAlive = (state: S) => getUnit(state, 'enemy', 'front', 0) !== null;

/* ============================================================ */

test('数据形态：5 费 4/4、无先攻、保留 xi_liang 标签；战吼是**直接消灭**受伤敌方人物', () => {
  const c = ALL.find((x) => x.id === 'shu_madai')!;
  assert.equal(c.cost, 5); assert.equal(c.attack, 4); assert.equal(c.health, 4);
  assert.deepEqual(c.keywords ?? [], [], '旧卡的「先攻」已随重做撤下（价值在处决，不在抢先）');
  assert.deepEqual(c.tags ?? [], ['xi_liang'], '西凉标签保留（史实如此，不影响平衡）');

  const sk = c.skills?.[0];
  assert.equal(sk?.trigger, 'on_play');
  assert.equal(sk?.name, '追斩');
  const ef = sk?.effects?.[0];
  assert.equal(ef?.action, 'destroy', '⭐ 是「处决」不是「伤害」—— 才有区分度');
  assert.equal(ef?.target?.side, 'enemy');
  assert.equal(ef?.target?.filter?.type, 'character', '「敌方人物」＝场上单位（不含主公）');
  assert.equal(ef?.target?.filter?.damaged, true, '**已受伤**的敌人');
  assert.equal(ef?.target?.count, 1);
});

test('⭐ 行为：消灭一名已受伤的敌人', () => {
  const b = board({ damaged: true });
  const r = playMadai(b);
  assert.ok(r.ok, `马岱应能打出：${r.error}`);
  assert.equal(foeAlive(r.state), false, '受伤的敌将应被消灭');
  assert.ok(getUnit(r.state, 'own', 'front', 1), '马岱正常上场');
});

test('满血的敌人不是合法目标：战吼平稳空转（不崩、不误杀）', () => {
  const b = board({ damaged: false });
  const r = playMadai(b);
  assert.ok(r.ok, `没有合法目标时也应能打出：${r.error}`);
  assert.equal(foeAlive(r.state), true, '满血敌人不该被杀');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 6, '一点血都不掉');
});

test('⭐ 对冲口①：目标带「披坚」→ 处决被免疫挡下（destroy 本质是 9999 点伤害）', () => {
  const b = board({ damaged: true, shield: true });
  const r = playMadai(b);
  assert.ok(r.ok);
  assert.equal(foeAlive(r.state), true, '披坚挡下了处决');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.statuses.sheng_dun_status, undefined, '披坚被消耗');
});

test('⭐ 对冲口②：目标有免死（柳隐「坚壁」）→ 以 1 血存活', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_madai'] });
  // 敌方放一张真实的柳隐（5 费 3/7，坚壁：第一次受到致命伤害以 1 血存活）
  const liuyin = ALL.find((x) => x.id === 'shu_liuyin')!;
  ctx.cards.set(liuyin.id, liuyin);
  const u = makeUnit(liuyin, 0, 99);
  u.hp = u.maxHp - 1;                                  // 先受伤
  setUnit(state, 'enemy', 'front', 0, u);
  state.sides.enemy.lord.hp = 30;

  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `应能打出：${r.error}`);
  const liu = getUnit(r.state, 'enemy', 'front', 0);
  assert.ok(liu, '免死让她活下来');
  assert.equal(liu!.hp, 1, '以 1 点生命存活（柳隐「坚壁」）');
});

test('只斩杀**敌方**：己方受伤单位不会被自己人处决', () => {
  const b = board({ damaged: true });
  const mate = makeUnit(FOE, 0, 77);
  mate.hp = 2;                                         // 己方也放一个受伤单位
  setUnit(b.state, 'own', 'front', 0, mate);

  const r = playMadai(b);
  assert.ok(r.ok);
  assert.equal(foeAlive(r.state), false, '敌方受伤者被斩');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 2, '己方受伤单位毫发无损');
});
