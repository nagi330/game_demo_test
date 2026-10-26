/**
 * 王允〈密谋诛恶〉—— 5 费 1/4 群雄谋臣。
 *
 * 设计者定稿（2026-10-20）：
 *   战吼：依次指定两名敌方人物，令第 1 个目标立即对第 2 个目标发起一次普通攻击；
 *        交锋后，若这两名人物中仍有存活者，王允阵亡，且己方主公受到其中攻击力最高者等量的伤害。
 *
 * ⚠️ 按原文 `survivor_condition: any` 实现：两名中**至少一名**存活即触发。
 *    普通攻击含反击，至少一方会活着，所以惩罚几乎必触发；唯一不触发是双方都被亡语/反伤带走。
 *    `both`（两名都存活才触发）是动作支持的另一种口径，本文件用一张测试卡单独覆盖。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { applyStatus, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  return s;
}

function place(s: ReturnType<typeof setup>, id: string, col: number) {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', col, u);
  return u;
}

/** 打出王允，指定第 1 个目标（攻击者）与第 2 个目标（被攻击者） */
function playWangyun(s: ReturnType<typeof setup>, t1: number, t2: number) {
  s.state.sides.own.command.cur = 4;
  s.state.sides.own.hand = [{ card: real('qun_wangyun'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: t1 },
    target2: { side: 'enemy', row: 'front', col: t2 },
  });
}

/* =====================================================================
   一、数据形态
   ===================================================================== */

test('王允：4 费 1/4 群雄谋臣，精英，密谋诛恶', () => {
  const c = real('qun_wangyun');
  assert.deepEqual([c.cost, c.attack, c.health], [4, 1, 4]);
  assert.equal(c.faction, 'qun');
  assert.equal(c.type, 'strategist');
  assert.equal(c.rarity, 'elite');
  assert.deepEqual(c.keywords ?? [], []);
  assert.ok(c.memo?.includes('王允阵亡'), 'memo 要写出核心代价');

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '密谋诛恶');
  assert.equal(sk.trigger, 'on_play');
  const eff = sk.effects![0]!;
  assert.equal(eff.action, 'scheme_duel');
  assert.equal(eff.survivor_condition, 'any', '按设计者原文：仍有一名存活就触发');
  assert.equal(eff.self_destruct, true);
  assert.equal(eff.lord_damage, 'max_attack');
  assert.deepEqual(eff.target, {
    side: 'enemy',
    filter: { type: 'character', include_lord: false },
    count: 2,
    mode: 'choose',
    pick: 2,
  });

  assert.match(sk.text ?? '', /第 1 个目标/);
  assert.match(sk.text ?? '', /第 2 个目标/);
  assert.match(sk.text ?? '', /仍有存活者/);
  assert.match(sk.text ?? '', /攻击力最高/);
  assert.ok(c.flavor?.includes('士孫瑞'), 'flavor 用 A-06 原文');
});

/* =====================================================================
   二、第 1 个目标打死第 2 个目标
   ===================================================================== */

test('密谋诛恶：第 1 个目标击杀第 2 个目标 → 王允阵亡，主公按第 1 个目标的攻击掉血', () => {
  const s = setup();
  place(s, 'wei_caoren', 3);     // 5/8 攻击者
  place(s, 'qun_caimao', 4);     // 2/2 被攻击者
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 4), null, '第 2 个目标被 5 点普攻击杀');
  assert.equal(getUnit(r.state, 'enemy', 'front', 3)!.hp, 6, '第 1 个目标吃到 2 点同时结算的反击');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '王允阵亡');
  assert.equal(r.state.sides.own.lord.hp, 25, '己方主公受到存活者最高攻击 5 点');
});

test('密谋诛恶：第 1 个目标被反击打死 → 王允阵亡，主公按第 2 个目标的攻击掉血', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);     // 2/2 攻击者
  place(s, 'wei_caoren', 4);     // 5/8，吃 2 点后反击 5
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '第 1 个目标被反击打死');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 6, '第 2 个目标 8 − 2 = 6');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '王允阵亡');
  assert.equal(r.state.sides.own.lord.hp, 25, '己方主公受到存活者最高攻击 5 点');
});

/* =====================================================================
   三、两名都存活 / 都阵亡
   ===================================================================== */

test('密谋诛恶：两名都存活 → 王允阵亡，主公按两人中最高攻击掉血', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);     // 2/6
  place(s, 'shu_yanyan', 4);     // 2/6：互打后都剩 4
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3)!.hp, 4);
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 4);
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '两名都存活 → 王允阵亡');
  assert.equal(r.state.sides.own.lord.hp, 28, '主公受到最高攻击 2 点');
});

test('密谋诛恶：双方同归于尽（同时结算的反击）→ 没有存活者，王允存活，主公不掉血', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);     // 2/2
  place(s, 'qun_caimao', 4);     // 2/2：互相打死
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '第 1 个目标被同时结算的 2 点反击带走');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4), null, '第 2 个目标被 2 点普攻击杀');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 4, '没有存活者 → 王允存活');
  assert.equal(r.state.sides.own.lord.hp, 30, '主公不掉血');
});

/* =====================================================================
   四、survivor_condition: both（测试卡）
   ===================================================================== */

const bothCard: CardDef = {
  id: 'test_wangyun_both',
  name: '王允（both 测试）',
  faction: 'qun',
  type: 'strategist',
  cost: 5,
  attack: 1,
  health: 4,
  rarity: 'common',
  memo: '测试 both 口径',
  gender: 'male',
  keywords: [],
  skills: [{
    id: 'test_both',
    name: '密谋诛恶（both）',
    kind: 'trigger',
    trigger: 'on_play',
    text: '测试：两名都存活才触发。',
    effects: [{
      action: 'scheme_duel',
      survivor_condition: 'both',
      self_destruct: true,
      lord_damage: 'max_attack',
      target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 2, mode: 'choose', pick: 2 },
    }],
  }],
};

function playBoth(s: ReturnType<typeof setup>, t1: number, t2: number) {
  s.ctx.cards.set(bothCard.id, bothCard);
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: bothCard, mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: t1 },
    target2: { side: 'enemy', row: 'front', col: t2 },
  });
}

test('survivor_condition: both —— 两名都存活才惩罚', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);
  place(s, 'shu_yanyan', 4);
  const r = playBoth(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '两名都存活 → 王允阵亡');
  assert.equal(r.state.sides.own.lord.hp, 28);
});

test('survivor_condition: both —— 死一个就不惩罚，王允存活', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);     // 2/2 攻击者，会被 4/4 反击打死
  place(s, 'shu_zhoucang', 4);   // 4/4
  const r = playBoth(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');
  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 4, '死一个 → 不触发，王允存活');
  assert.equal(r.state.sides.own.lord.hp, 30);
});

/* =====================================================================
   五、护盾/免伤交互
   ===================================================================== */

test('密谋诛恶：第 2 个目标的披坚吸收普攻 → 第 1 个目标被反击打死，主公按第 2 个目标的攻击掉血', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);     // 2/2 攻击者
  place(s, 'shu_yanyan', 4);     // 2/6，带披坚
  applyStatus(s.state, unitRef('enemy', 'front', 4), 'sheng_dun_status', 1, []);
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '第 1 个目标被反击打死');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 6, '披坚吃掉 2 点，第 2 个目标不掉血');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '王允阵亡');
  assert.equal(r.state.sides.own.lord.hp, 28, '主公按第 2 个目标攻击 2 点掉血');
});

test('密谋诛恶：主公伤害可以致命 —— 主公 3 血时被 5 点伤害打死', () => {
  const s = setup();
  place(s, 'wei_caoren', 3);
  place(s, 'qun_caimao', 4);
  s.state.sides.own.lord.hp = 3;
  const r = playWangyun(s, 3, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(r.state.sides.own.lord.hp, 0);
  assert.equal(r.state.winner, 'enemy', '主公被自己的密谋反噬致死');
});
