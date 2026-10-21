import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction, playTargetPlan } from '../src/engine.ts';
import { canAttack } from '../src/rules.ts';
import { dealDamage, summonUnit, unitRef } from '../src/mutate.ts';
import { recomputeAuras } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { allUnits, getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((x) => x.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({ ownHand: [] });
  for (const card of cards) s.ctx.cards.set(card.id, card);
  return s;
}

function place(s: ReturnType<typeof setup>, id: string, side: 'own' | 'enemy', col: number) {
  const unit = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, side, 'front', col, unit);
  return unit;
}

function playTactic(s: ReturnType<typeof setup>, id: string, target?: { side: 'own' | 'enemy'; row: 'front'; col: number }) {
  s.state.sides.own.hand = [{ card: real(id), mods: [] }];
  const result = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, ...(target ? { target } : {}),
  });
  assert.equal(result.ok, true, result.error ?? `${id} 应能打出`);
  return result;
}

test('蒙冲斗舰：可攻击军械允许普通攻击，其他军械仍被类型规则拦截', () => {
  const s = setup();
  const ship = place(s, 'wu_mengchongdoujian', 'own', 0);
  const enemy = place(s, 'neutral_infantry', 'enemy', 0);
  assert.equal(canAttack(s.state, 'own', 'front', 0).ok, true);
  const attack = applyAction(s.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(attack.ok, true, attack.error ?? '蒙冲斗舰应能普攻');
  assert.equal(getUnit(attack.state, 'enemy', 'front', 0)?.hp, enemy.hp - ship.atk);

  const other = setup();
  place(other, 'wu_louchuanjun', 'own', 0);
  assert.equal(canAttack(other.state, 'own', 'front', 0).ok, false);
});

test('丁奉：后续召唤单位获得先攻且攻血各降低1', () => {
  const s = setup();
  place(s, 'wu_dingfeng', 'own', 0);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const before = real('neutral_infantry');
  const events: GameEvent[] = [];
  const unit = summonUnit(s.state, s.ctx.cards, 'own', 'front', 1, before.id, events);
  assert.ok(unit);
  assert.equal(unit!.atk, Math.max(0, before.attack! - 1));
  assert.equal(unit!.maxHp, Math.max(1, before.health! - 1));
  assert.ok(unit!.kw.includes('xian_gong'));
});

test('铁锁横江：铁锁免疫普通伤害，遇火失效并解除敌方攻击封锁', () => {
  const s = setup();
  place(s, 'neutral_infantry', 'enemy', 0);
  const played = playTactic(s, 'wu_tiesuo_hengjiang');
  const lockRef = allUnits(played.state, 'own').find((x) => x.unit.cardId === 'token_tiesuo');
  assert.ok(lockRef, '应召唤铁锁');
  assert.ok(getUnit(played.state, 'enemy', 'front', 0)?.statuses.jin_gong, '敌方单位应被禁止攻击');
  const physical = dealDamage(played.state, s.ctx.cards, unitRef('own', lockRef!.row, lockRef!.col), 99, [], '物理');
  assert.equal(physical, 0);
  assert.ok(getUnit(played.state, 'own', lockRef!.row, lockRef!.col), '普通伤害不能移除铁锁');
  dealDamage(played.state, s.ctx.cards, unitRef('own', lockRef!.row, lockRef!.col), 1, [], '火攻', 0, null, undefined, 'fire');
  assert.equal(getUnit(played.state, 'own', lockRef!.row, lockRef!.col), null, '火攻应使铁锁失效');
});

test('火烧连营战法：起火点本身不受伤害，只向连续相邻单位传播', () => {
  const s = setup();
  for (const col of [0, 1, 2]) place(s, 'wei_caoren', 'enemy', col);
  const result = playTactic(s, 'wu_huoshao_lianying', { side: 'enemy', row: 'front', col: 1 });
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, 6, '相邻目标应受到2点伤害');
  assert.equal(getUnit(result.state, 'enemy', 'front', 1)?.hp, 8, '起火点不应受伤害');
  assert.equal(getUnit(result.state, 'enemy', 'front', 2)?.hp, 6, '另一侧相邻目标应受到2点伤害');
});

test('吴舰齐射：4费对任意场上单位造成6点水攻，旧卡已删除', () => {
  const s = setup();
  const target = place(s, 'wei_caoren', 'enemy', 0);
  const hpBefore = target.hp;
  assert.equal(real('wu_shuijun_tuxi').name, '吴舰齐射');
  assert.equal(real('wu_shuijun_tuxi').cost, 4);
  assert.equal(real('qun_qizubaoshuai').name, '齐卒保帅');
  assert.equal(real('qun_qizubaoshuai').faction, 'qun');
  assert.equal(cards.some((card) => card.id === 'wu_jiedongfeng'
    || card.id === 'wu_huoshaochibi' || card.id === 'wei_gefa_daishou'), false);
  const result = playTactic(s, 'wu_shuijun_tuxi', { side: 'enemy', row: 'front', col: 0 });
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, hpBefore - 6);
});

test('扎草为兵：5费召唤三个草兵，并封锁敌方下回合普攻', () => {
  const s = setup();
  place(s, 'wei_caoren', 'enemy', 0);
  place(s, 'neutral_infantry', 'enemy', 1);
  const result = playTactic(s, 'wu_zhacao_weibing');
  assert.equal(real('wu_zhacao_weibing').cost, 5);
  assert.equal(allUnits(result.state, 'own').filter((x) => x.unit.cardId === 'token_caobing').length, 3);
  for (const col of [0, 1]) {
    assert.equal(getUnit(result.state, 'enemy', 'front', col)?.statuses.jin_gong?.turns, 1,
      `敌方单位 ${col} 应在下个回合无法攻击`);
  }

  const enemyTurn = applyAction(result.state, s.ctx, { type: 'END_TURN' });
  assert.equal(enemyTurn.ok, true, enemyTurn.error ?? '应能进入敌方回合');
  assert.ok(getUnit(enemyTurn.state, 'enemy', 'front', 0)?.statuses.jin_gong,
    '敌方回合内无法攻击状态应保持');
  assert.equal(canAttack(enemyTurn.state, 'enemy', 'front', 0).ok, false,
    '敌方单位在下个回合确实不能发动普通攻击');
  const ownTurn = applyAction(enemyTurn.state, s.ctx, { type: 'END_TURN' });
  assert.equal(ownTurn.ok, true, ownTurn.error ?? '应能结束敌方回合');
  assert.equal(getUnit(ownTurn.state, 'enemy', 'front', 0)?.statuses.jin_gong, undefined,
    '敌方回合结束后无法攻击状态应失效');
});

test('虎豹突袭：7费同时召唤虎骑营和豹骑营', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('wei_hubao_tuxi'), mods: [] }];
  const result = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.equal(result.ok, true, result.error ?? '虎豹突袭应能打出');
  const own = allUnits(result.state, 'own');
  assert.equal(own.filter((x) => x.unit.cardId === 'wei_hubaoki_hu').length, 1);
  assert.equal(own.filter((x) => x.unit.cardId === 'wei_hubaoki_bao').length, 1);
  assert.equal(result.state.sides.own.command.cur, result.state.sides.own.command.max - 7);
});

test('乌巢焚粮：4费移除敌方牌库顶并随机弃置敌方一张手牌', () => {
  const s = setup();
  s.state.sides.enemy.deck = [real('neutral_archer').id, real('neutral_infantry').id];
  s.state.sides.enemy.hand = [
    { card: real('neutral_shieldman'), mods: [] },
    { card: real('neutral_archer'), mods: [] },
  ];
  const result = playTactic(s, 'wei_wuchaofenliang');
  assert.equal(real('wei_wuchaofenliang').cost, 4);
  assert.deepEqual(result.state.sides.enemy.deck, [real('neutral_archer').id], '应移除敌方牌库顶牌');
  assert.equal(result.state.sides.enemy.hand.length, 1, '应随机弃置敌方一张手牌');
  assert.equal(result.state.sides.enemy.discard.length, 2, '牌库顶牌和弃置的手牌都应进入弃牌堆');
});

test('八门金锁阵：震慑选中及左右紧邻单位，正对的己方单位永久+2攻击和先攻', () => {
  const s = setup();
  const baseAttack = real('neutral_infantry').attack!;
  for (const col of [0, 1, 2, 3, 4]) {
    const ally = place(s, 'neutral_infantry', 'own', col);
    ally.enteredTurn = s.state.turn;
    place(s, 'wei_caoren', 'enemy', col);
  }
  const plan = playTargetPlan(s.state, 'own', real('wei_bamenjinsuo'));
  assert.equal(plan.choices.length, 1, '页面只需选择一个敌方单位');
  assert.equal(plan.choices[0]!.targets.length, 5);
  assert.ok(plan.choices[0]!.targets.every((t) => t.kind === 'unit' && t.side === 'enemy'));
  const result = playTactic(s, 'wei_bamenjinsuo', { side: 'enemy', row: 'front', col: 2 });
  assert.equal(result.state.sides.own.command.cur, s.state.sides.own.command.cur - 4);
  for (const col of [0, 1, 2, 3, 4]) {
    const affected = col >= 1 && col <= 3;
    const ally = getUnit(result.state, 'own', 'front', col)!;
    assert.equal(!!getUnit(result.state, 'enemy', 'front', col)?.statuses.zhen_she, affected);
    assert.equal(ally.atk, baseAttack + (affected ? 2 : 0));
    assert.equal(!!ally.statuses.xian_gong_status, affected);
    assert.equal(canAttack(result.state, 'own', 'front', col).ok, affected,
      '获得先攻的当回合入场兵种应立即可以攻击');
  }
  assert.equal(result.state.sides.enemy.lord.statuses?.zhen_she, undefined);
  const enemyTurn = applyAction(result.state, s.ctx, { type: 'END_TURN' });
  assert.equal(enemyTurn.ok, true);
  assert.ok(getUnit(enemyTurn.state, 'enemy', 'front', 2)?.statuses.zhen_she);
  assert.equal(canAttack(enemyTurn.state, 'enemy', 'front', 2).ok, false);
  const ownTurn = applyAction(enemyTurn.state, s.ctx, { type: 'END_TURN' });
  assert.equal(ownTurn.ok, true);
  for (const col of [1, 2, 3]) {
    assert.equal(getUnit(ownTurn.state, 'enemy', 'front', col)?.statuses.zhen_she, undefined);
    assert.equal(getUnit(ownTurn.state, 'own', 'front', col)?.atk, baseAttack + 2);
    assert.ok(getUnit(ownTurn.state, 'own', 'front', col)?.statuses.xian_gong_status);
  }
});

test('八门金锁阵：边缘和空位不延伸，也不强化其他已被震慑单位的正对位置', () => {
  const s = setup();
  for (const col of [0, 1, 2, 7]) place(s, 'neutral_infantry', 'own', col);
  place(s, 'wei_caoren', 'enemy', 0);
  place(s, 'wei_caoren', 'enemy', 2).statuses.zhen_she = { stacks: 1, turns: 1 };
  place(s, 'wei_caoren', 'enemy', 7);
  const result = playTactic(s, 'wei_bamenjinsuo', { side: 'enemy', row: 'front', col: 0 });
  assert.equal(getUnit(result.state, 'own', 'front', 0)?.atk, real('neutral_infantry').attack! + 2);
  for (const col of [1, 2, 7]) {
    assert.equal(getUnit(result.state, 'own', 'front', col)?.atk, real('neutral_infantry').attack);
    assert.equal(getUnit(result.state, 'own', 'front', col)?.statuses.xian_gong_status, undefined);
  }
  assert.equal(getUnit(result.state, 'enemy', 'front', 7)?.statuses.zhen_she, undefined);
});

test('八门金锁阵：免疫震慑的目标不产生正对强化，空的己方位置不把强化转给其他单位', () => {
  const s = setup();
  for (const col of [1, 2, 3]) place(s, 'wei_caoren', 'enemy', col);
  getUnit(s.state, 'enemy', 'front', 2)!.statuses.si_zhan = { stacks: 1 };
  for (const col of [0, 1, 2]) place(s, 'neutral_infantry', 'own', col);
  const result = playTactic(s, 'wei_bamenjinsuo', { side: 'enemy', row: 'front', col: 2 });
  assert.equal(getUnit(result.state, 'enemy', 'front', 2)?.statuses.zhen_she, undefined);
  assert.equal(getUnit(result.state, 'own', 'front', 2)?.atk, real('neutral_infantry').attack);
  assert.equal(getUnit(result.state, 'own', 'front', 0)?.atk, real('neutral_infantry').attack);
  assert.equal(getUnit(result.state, 'own', 'front', 1)?.atk, real('neutral_infantry').attack! + 2);
  assert.ok(getUnit(result.state, 'enemy', 'front', 3)?.statuses.zhen_she);
  const summoned = summonUnit(result.state, s.ctx.cards, 'own', 'front', 3, 'neutral_infantry', []);
  assert.equal(summoned?.atk, real('neutral_infantry').attack, '后续入场单位不继承强化');
  assert.equal(summoned?.statuses.xian_gong_status, undefined);
});

test('八门金锁阵：敌方施放时，震慑及正对强化仍按施法方正确结算', () => {
  const s = setup();
  for (const col of [5, 6, 7]) {
    place(s, 'wei_caoren', 'own', col);
    place(s, 'neutral_infantry', 'enemy', col);
  }
  s.state.active = 'enemy';
  s.state.sides.enemy.hand = [{ card: real('wei_bamenjinsuo'), mods: [] }];
  const result = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, target: { side: 'own', row: 'front', col: 6 },
  });
  assert.equal(result.ok, true, result.error ?? '敌方应能施放八门金锁阵');
  for (const col of [5, 6, 7]) {
    assert.ok(getUnit(result.state, 'own', 'front', col)?.statuses.zhen_she);
    assert.equal(getUnit(result.state, 'enemy', 'front', col)?.atk, real('neutral_infantry').attack! + 2);
    assert.ok(getUnit(result.state, 'enemy', 'front', col)?.statuses.xian_gong_status);
  }
  const ownTurn = applyAction(result.state, s.ctx, { type: 'END_TURN' });
  assert.equal(ownTurn.ok, true);
  assert.ok(getUnit(ownTurn.state, 'own', 'front', 6)?.statuses.zhen_she);
  const nextEnemyTurn = applyAction(ownTurn.state, s.ctx, { type: 'END_TURN' });
  assert.equal(nextEnemyTurn.ok, true);
  assert.equal(getUnit(nextEnemyTurn.state, 'own', 'front', 6)?.statuses.zhen_she, undefined);
});
