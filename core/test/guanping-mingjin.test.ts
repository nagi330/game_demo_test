/**
 * 关平（ADR-175）：4 费 3/3 武将 ·「鸣金救主」
 *  战吼：把一名**己方人物**收回手牌（重下即满血、无状态），其费用**下回合 −2**；
 *        若该人物**已受伤**，关平改为 4/4 并获得「架盾」。
 *
 * ⭐ 设计者原话即此结构：「鸣金收兵把人撤回来；如果撤回来的那个人已经挂彩，关平自己顶上去」。
 * ⚠️ 两个"白给"的点（无需额外代码，本文件逐一钉住）：
 *   ① 「回满血清 debuff」＝ 回手后重下是**全新单位**；
 *   ② 「若其已受伤」＝ `chosen_damaged` 读的是**技能开始时快照**，目标先回手也判得准。
 * ⚠️ 「费用 −2 下回合」靠 `return_to_hand` 的新参数 `value`/`duration`（ADR-175）。
 * ⚠️ `exclude_source`：**不能把关平自己收回手牌**。救回范围**含衍生物**（设计者定）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { allUnits, getUnit, makeUnit, setUnit } from '../src/state.ts';
import { applyStatus } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const MATE: CardDef = {
  id: 'test_gp_mate', name: '友军', faction: 'shu', type: 'general', cost: 3,
  attack: 2, health: 5, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(MATE);
const TOKEN = ALL.find((x) => x.id === 'token_huangjin_bing')!;

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

function board(): B {
  const { state, ctx } = scenario({ ownHand: ['shu_guanping'] });
  ctx.cards.set(MATE.id, MATE);
  return { state, ctx, rng: createRng(4) } as B;
}

/** 打出关平（col 2），并选择场上 col 0 的友军为"救回"目标 */
const playGuanping = (b: B, target = true) => applyAction(b.state, b.ctx, {
  type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2,
  ...(target ? { target: { side: 'own' as const, row: 'front' as const, col: 0 } } : {}),
});

const gp = (state: S) => getUnit(state, 'own', 'front', 2);

test('形态：4 费 3/3；三段效果（救回 −2 费 / 已受伤则 4/4 / 已受伤则架盾），且**不能救自己**', () => {
  const c = ALL.find((x) => x.id === 'shu_guanping')!;
  assert.equal(c.type, 'general');
  assert.equal(c.cost, 4); assert.equal(c.attack, 3); assert.equal(c.health, 3);

  const sk = c.skills![0]!;
  assert.equal(sk.name, '鸣金救主');
  assert.equal(sk.trigger, 'on_play');
  const [ret, buff, shield] = sk.effects!;
  assert.equal(ret!.action, 'return_to_hand');
  assert.equal(ret!.value, -2, '⭐ 费用 −2');
  assert.equal(ret!.duration, 1, '⭐ 下回合（1 回合）');
  assert.equal(ret!.target?.side, 'ally');
  assert.equal(ret!.target?.filter?.exclude_source, true, '⚠️ 不能把关平自己收回手牌');

  assert.equal(buff!.action, 'modify');
  assert.deepEqual(buff!.condition, { chosen_damaged: true });
  assert.equal(shield!.action, 'apply_status');
  assert.equal((shield as { status?: string }).status, 'jia_dun_status');
  assert.deepEqual(shield!.condition, { chosen_damaged: true });
});

test('⭐ 救回满血友军：友军回手，关平**不变身**（3/3）', () => {
  const b = board();
  setUnit(b.state, 'own', 'front', 0, makeUnit(MATE, 0, 11));
  const r = playGuanping(b);
  assert.ok(r.ok, `关平应能打出：${r.error}`);

  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '友军已离开场上');
  assert.ok(r.state.sides.own.hand.some((h) => h.card.id === MATE.id), '友军回到手牌');
  const self = gp(r.state)!;
  assert.equal(self.atk, 3, '未受伤 → 不变身');
  assert.equal(self.maxHp, 3);
  assert.equal(self.statuses.jia_dun_status, undefined);
});

test('⭐ 救回**受伤**友军：关平变 4/4 并获得「架盾」', () => {
  const b = board();
  const hurt = makeUnit(MATE, 0, 12); hurt.hp = 2;      // 受伤
  setUnit(b.state, 'own', 'front', 0, hurt);

  const r = playGuanping(b);
  assert.ok(r.ok, `关平应能打出：${r.error}`);
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '受伤友军也被收回');
  const self = gp(r.state)!;
  assert.equal(self.atk, 4, '3 → 4');
  assert.equal(self.maxHp, 4, '3 → 4');
  assert.ok(self.statuses.jia_dun_status, '获得架盾');
});

test('⭐ 回手的那张牌带「费用 −2（1 回合）」修正', () => {
  const b = board();
  setUnit(b.state, 'own', 'front', 0, makeUnit(MATE, 0, 13));
  const r = playGuanping(b);
  assert.ok(r.ok);
  const hc = r.state.sides.own.hand.find((h) => h.card.id === MATE.id)!;
  const mod = hc.mods.find((m) => m.kind === 'cost')!;
  assert.ok(mod, '应有费用修正');
  assert.equal(mod.value, -2);
  assert.equal(mod.turns, 1);
  assert.ok(r.events.some((e) => e.type === 'HAND_MODIFIED'), '应派发 HAND_MODIFIED');
});

test('⭐ 重下即满血、无状态（"回满血清 debuff"是回手自带的）', () => {
  const b = board();
  const hurt = makeUnit(MATE, 0, 14); hurt.hp = 1;
  applyStatus(b.state, { kind: 'unit', side: 'own', row: 'front', col: 0 }, 'zhen_she', 1, []); // 挂个 debuff
  setUnit(b.state, 'own', 'front', 0, hurt);

  const r1 = playGuanping(b);
  assert.ok(r1.ok);

  // 重下：费用 3 − 2 = 1，统率足够
  const r2 = applyAction(r1.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r2.ok, `重下应成功：${r2.error}`);
  const again = getUnit(r2.state, 'own', 'front', 0)!;
  assert.equal(again.hp, 5, '满血（"回满血"是回手自带）');
  assert.equal(again.maxHp, 5);
  assert.equal(again.statuses.zhen_she, undefined, '旧 debuff 不会跟着回来');
});

test('场上没有别的己方人物时：战吼空转，关平不会把自己收回手牌', () => {
  const b = board();
  const r = playGuanping(b, false);
  assert.ok(r.ok, `没有合法目标时也应能打出：${r.error}`);
  const self = gp(r.state)!;
  assert.ok(self, '关平仍在场上（没有被自己收回）');
  assert.equal(self.atk, 3);
});

test('救回范围**含衍生物**（设计者定）：token 会变成手牌里一张可重下的卡', () => {
  const b = board();
  const tok = makeUnit(TOKEN, 0, 15);
  setUnit(b.state, 'own', 'front', 0, tok);
  assert.ok(allUnits(b.state, 'own').some((x) => x.unit.cardId === TOKEN.id));

  const r = playGuanping(b);
  assert.ok(r.ok, `关平应能打出：${r.error}`);
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, 'token 已被救回');
  assert.ok(r.state.sides.own.hand.some((h) => h.card.id === TOKEN.id), 'token 卡进了手牌');
});
