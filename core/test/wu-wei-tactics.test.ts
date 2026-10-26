import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction, playTargetPlan } from '../src/engine.ts';
import { canAttack } from '../src/rules.ts';
import { dealDamage, summonUnit, unitRef } from '../src/mutate.ts';
import { recomputeAuras } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { allUnits, getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { chooseAction } from '../src/ai/index.ts';
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

test('火烧连营战法：起火点与同军连续相邻单位各受一次2点火攻', () => {
  const s = setup();
  for (const col of [0, 1, 2]) place(s, 'wei_caoren', 'enemy', col);
  const result = playTactic(s, 'wu_huoshao_lianying', { side: 'enemy', row: 'front', col: 1 });
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, 6, '相邻目标应受到2点伤害');
  assert.equal(getUnit(result.state, 'enemy', 'front', 1)?.hp, 6, '起火点也应受到2点伤害');
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

test('水军调遣：只从牌库随机取得带水攻效果的牌，最多两张', () => {
  const s = setup();
  s.state.sides.own.deck = [
    'wu_chengliu_zhuiji', 'neutral_infantry', 'wu_huoshao_lianying',
  ];
  const result = playTactic(s, 'wu_shuijun_diaoqian');
  const drawn = result.state.sides.own.hand.map((x) => x.card.id);
  assert.ok(drawn.includes('wu_chengliu_zhuiji'), '应取得带水攻效果的战法');
  assert.equal(drawn.includes('neutral_infantry'), false, '不应取得无水攻描述的牌');
  assert.equal(result.state.sides.own.deck.includes('wu_chengliu_zhuiji'), false);
});

test('火船破阵：成功牺牲军械后对敌方单位和主公各造成3点无属性伤害', () => {
  const s = setup();
  const machine = place(s, 'wu_mengchongdoujian', 'own', 0);
  const enemy = place(s, 'wei_caoren', 'enemy', 0);
  const lordHp = s.state.sides.enemy.lord.hp;
  const result = playTactic(s, 'wu_huochuan_pozhen', { side: 'own', row: 'front', col: 0 });
  assert.equal(getUnit(result.state, 'own', 'front', 0), null, '军械应被牺牲');
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, enemy.hp - 3);
  assert.equal(result.state.sides.enemy.lord.hp, lordHp - 3);
  assert.equal(machine.hp > 0, true, '测试前军械应存活');
});

test('暗度陈仓：目标池只包含拥有主动战技的人物', () => {
  const s = setup();
  place(s, 'neutral_infantry', 'own', 0);
  place(s, 'wu_luxun', 'own', 1);
  const plan = playTargetPlan(s.state, 'own', real('qun_andu_chencang_v2'));
  assert.equal(plan.choices.length, 1);
  assert.deepEqual(plan.choices[0]!.targets.map((t) => t.kind === 'unit' ? t.col : -1), [1]);
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

test('围师必阙：敌方可以选择回手或承受伤害', () => {
  const bounce = setup();
  place(bounce, 'wei_caoren', 'enemy', 0);
  const cast = playTactic(bounce, 'qun_weishi_bique', { side: 'enemy', row: 'front', col: 0 });
  assert.ok(cast.state.pendingOpponentChoice, '应暂停等待敌方抉择');
  const chosen = applyAction(cast.state, bounce.ctx, { type: 'CHOOSE_OPPONENT', option: 0 });
  assert.equal(chosen.ok, true, chosen.error ?? '敌方应能选择回手');
  assert.equal(getUnit(chosen.state, 'enemy', 'front', 0), null);
  assert.equal(chosen.state.sides.enemy.hand.at(-1)?.card.id, 'wei_caoren');

  const damage = setup();
  const target = place(damage, 'wei_caoren', 'enemy', 0);
  const castDamage = playTactic(damage, 'qun_weishi_bique', { side: 'enemy', row: 'front', col: 0 });
  const damaged = applyAction(castDamage.state, damage.ctx, { type: 'CHOOSE_OPPONENT', option: 1 });
  assert.equal(damaged.ok, true, damaged.error ?? '敌方应能选择承伤');
  assert.equal(getUnit(damaged.state, 'enemy', 'front', 0)?.hp, target.hp - 4);
});

test('AI 在敌方抉择挂起时提交 CHOOSE_OPPONENT，避免战法结算卡死', () => {
  const s = setup();
  place(s, 'wei_caoren', 'enemy', 0);
  const cast = playTactic(s, 'qun_weishi_bique', { side: 'enemy', row: 'front', col: 0 });
  assert.ok(cast.state.pendingOpponentChoice);
  const action = chooseAction(cast.state, s.ctx);
  assert.ok(action, 'AI 应提交敌方抉择');
  assert.equal(action?.type, 'CHOOSE_OPPONENT');
  const resolved = applyAction(cast.state, s.ctx, action!);
  assert.equal(resolved.ok, true, resolved.error ?? 'AI 的敌方抉择应可结算');
  assert.equal(resolved.state.pendingOpponentChoice, undefined);
});

test('以战养战：本回合每击杀一个敌方人物就回血并抽牌', () => {
  const s = setup();
  place(s, 'wei_caoren', 'own', 0);
  place(s, 'neutral_archer', 'enemy', 0);
  s.state.sides.own.deck = ['neutral_archer'];
  s.state.sides.own.lord.hp = s.state.sides.own.lord.maxHp - 1;
  const cast = playTactic(s, 'qun_yizhan_yangzhan');
  const attack = applyAction(cast.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(attack.ok, true, attack.error ?? '应能完成击杀');
  assert.equal(attack.state.sides.own.lord.hp, attack.state.sides.own.lord.maxHp);
  assert.equal(attack.state.sides.own.hand.at(-1)?.card.id, 'neutral_archer');
});

test('先发制人：强化武将并在普攻击杀后抽牌', () => {
  const s = setup();
  const attacker = place(s, 'neutral_infantry', 'own', 0);
  place(s, 'neutral_shieldman', 'enemy', 0);
  s.state.sides.own.deck = ['neutral_archer'];
  const cast = playTactic(s, 'qun_xianfazhiren', { side: 'own', row: 'front', col: 0 });
  assert.equal(getUnit(cast.state, 'own', 'front', 0)?.atk, attacker.atk + 2);
  assert.ok(getUnit(cast.state, 'own', 'front', 0)?.statuses.xian_gong_status);
  const attack = applyAction(cast.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(attack.ok, true, attack.error ?? '先攻单位应能攻击');
  assert.equal(attack.state.sides.own.hand.at(-1)?.card.id, 'neutral_archer');
});

test('金蝉脱壳：原位回手并留下架盾替身，再抽牌', () => {
  const s = setup();
  place(s, 'neutral_infantry', 'own', 2);
  s.state.sides.own.deck = ['neutral_archer'];
  const result = playTactic(s, 'qun_jinchantuoqiao', { side: 'own', row: 'front', col: 2 });
  const replacement = getUnit(result.state, 'own', 'front', 2);
  assert.equal(replacement?.cardId, 'token_tishen');
  assert.ok(replacement?.statuses.jia_dun || replacement?.kw.includes('jia_dun'));
  assert.equal(result.state.sides.own.hand.at(-2)?.card.id, 'neutral_infantry');
  assert.equal(result.state.sides.own.hand.at(-1)?.card.id, 'neutral_archer');
});

test('知己知彼：展示敌方手牌并只提高所选手牌费用', () => {
  const s = setup();
  s.state.sides.enemy.hand = [
    { card: real('neutral_infantry'), mods: [] },
    { card: real('neutral_archer'), mods: [] },
  ];
  s.state.sides.own.deck = ['neutral_shieldman'];
  const cast = playTactic(s, 'qun_zhijizhibi');
  assert.ok(cast.state.pendingHandChoice, '应暂停选择敌方手牌');
  const chosen = applyAction(cast.state, s.ctx, { type: 'CHOOSE_HAND', handIndex: 0 });
  assert.equal(chosen.ok, true, chosen.error ?? '应能选择敌方手牌');
  assert.equal(chosen.state.sides.enemy.hand[0]?.mods.some((m) => m.kind === 'cost' && m.value === 2), true);
  assert.equal(chosen.state.sides.enemy.hand[1]?.mods.length, 0);
  assert.equal(chosen.state.sides.own.hand.at(-1)?.card.id, 'neutral_shieldman');
});

test('擒贼擒王：锁定打出时最高攻击单位，击杀后触发抽牌和全军加攻', () => {
  const s = setup();
  const ally = place(s, 'neutral_infantry', 'own', 0);
  place(s, 'wei_caoren', 'enemy', 0);
  place(s, 'neutral_shieldman', 'enemy', 1);
  s.state.sides.own.deck = ['neutral_archer', 'neutral_shieldman'];
  const cast = playTactic(s, 'qun_qinzeiqinwang');
  assert.ok(getUnit(cast.state, 'enemy', 'front', 0)?.statuses.qin_zei_qin_wang);
  dealDamage(cast.state, s.ctx.cards, unitRef('enemy', 'front', 0), 99, [], '测试');
  assert.equal(getUnit(cast.state, 'enemy', 'front', 0), null);
  assert.equal(cast.state.sides.own.hand.length, 2);
  assert.equal(getUnit(cast.state, 'own', 'front', 0)?.atk, ally.atk + 1);
});

test('无中生有：从本阵营可构筑战法池随机获得两张战法', () => {
  const s = setup();
  const result = playTactic(s, 'qun_wuzhongshengyou');
  assert.equal(result.state.sides.own.hand.length, 2);
  assert.ok(result.state.sides.own.hand.every((hc) => hc.card.type === 'tactic'));
  assert.ok(result.state.sides.own.hand.every((hc) => hc.card.faction === 'shu' || hc.card.faction === 'qun' || hc.card.faction === 'neutral'));
});
