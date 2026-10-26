import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAction, playTargetPlan, unitSkillTargetPlan } from '../src/engine.ts';
import { recomputeAuras } from '../src/effects.ts';
import { isPlayableBy } from '../src/deck.ts';
import { effectiveCost, killUnit } from '../src/mutate.ts';
import { createMatch, getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { createRng } from '../src/rng.ts';
import { loadData } from '../src/loader.ts';
import type { CardDef, GameEvent, LordDef, MatchState, Side } from '../src/types.ts';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')) as CardDef[];
const heroes = JSON.parse(readFileSync(new URL('../data/heroes.json', import.meta.url), 'utf8')) as LordDef[];
const data = loadData({ cards, heroes }, { own: 'wei_caocao', enemy: 'wu_sunquan' });
const ctx = { cards: data.cards, lords: data.lords };

function stateWith(hand: string[] = [], deck: string[] = []) {
  const state = createMatch({ seed: 17, cards: data.cards, lords: data.lords,
    decks: { own: [], enemy: [] }, firstSide: 'own', secondCompensation: 'none' });
  state.sides.own.command = { cur: 10, max: 10 };
  state.sides.own.hand = hand.map((id) => ({ card: data.cards.get(id)!, mods: [] }));
  state.sides.own.deck = [...deck];
  return state;
}

function place(state: MatchState, id: string, col = 0, side: Side = 'own') {
  const unit = makeUnit(data.cards.get(id)!, 0, nextUidSeq(state));
  setUnit(state, side, 'front', col, unit);
  return unit;
}

test('司马师：6/3/6，每回合召唤一次1/1先攻死士', () => {
  const state = stateWith();
  place(state, 'wei_simashi');
  const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  const sishi = getUnit(result.state, 'own', 'front', 1)!;
  assert.equal(sishi.cardId, 'token_sima_sishi');
  assert.deepEqual([sishi.atk, sishi.hp], [1, 1]);
  assert.ok(sishi.kw.includes('xian_gong'));
  assert.equal(applyAction(result.state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 }).ok, false);
  assert.equal(result.state.sides.own.command.cur, 10);
});

test('死士亡语：手牌司马懿永久减1费，重复死亡可以继续减费', () => {
  const state = stateWith(['wei_simayi']);
  const events: GameEvent[] = [];
  for (let i = 0; i < 2; i++) {
    const unit = place(state, 'token_sima_sishi');
    killUnit(state, data.cards, { side: 'own', row: 'front', col: 0, unit }, events);
  }
  assert.equal(effectiveCost(state.sides.own.hand[0]!), 7);
  assert.equal(state.sides.own.hand[0]!.card.cost, 9);
});

test('死士亡语：在场司马懿优先增加蓄谋，最多3层，不修改同名手牌', () => {
  const state = stateWith(['wei_simayi']);
  place(state, 'wei_simayi', 1);
  for (let i = 0; i < 4; i++) {
    const unit = place(state, 'token_sima_sishi');
    killUnit(state, data.cards, { side: 'own', row: 'front', col: 0, unit }, []);
  }
  assert.equal(getUnit(state, 'own', 'front', 1)!.statuses.xu_mou?.stacks, 3);
  assert.equal(effectiveCost(state.sides.own.hand[0]!), 9);
});

test('司马昭：牺牲曹氏宗亲后成长，牌库无宗亲时额外成长，两项永久叠加', () => {
  const state = stateWith([], ['wei_xiahouen']);
  place(state, 'wei_simazhao');
  place(state, 'wei_caozhang', 1);
  const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  assert.equal(getUnit(result.state, 'own', 'front', 1), null);
  assert.deepEqual([getUnit(result.state, 'own', 'front', 0)!.atk,
    getUnit(result.state, 'own', 'front', 0)!.maxHp], [8, 10]);
  recomputeAuras(result.state, data.cards, createRng(17), []);
  assert.equal(getUnit(result.state, 'own', 'front', 0)!.atk, 8);
  assert.equal(applyAction(result.state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 }).ok, false);
});

test('司马昭：没有场上宗亲仍可发动，牌库有宗亲时无收益，无宗亲时+2/+2', () => {
  for (const [deck, expected] of [[['wei_caorui'], [4, 6]], [[], [6, 8]]] as const) {
    const state = stateWith([], [...deck]);
    place(state, 'wei_simazhao');
    const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
    assert.equal(result.ok, true, result.error ?? '动作应成功');
    const unit = getUnit(result.state, 'own', 'front', 0)!;
    assert.deepEqual([unit.atk, unit.maxHp], expected);
  }
});

test('司马昭：场上宗亲包括敌方单位，牺牲会正常触发亡语', () => {
  const state = stateWith([], ['wei_caorui']);
  place(state, 'wei_simazhao');
  place(state, 'wei_caozhi', 1, 'enemy');
  state.sides.enemy.deck = ['neutral_infantry', 'neutral_shieldman'];
  const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  assert.equal(getUnit(result.state, 'enemy', 'front', 1), null);
  assert.equal(result.state.sides.enemy.hand.length, 2);
  assert.equal(getUnit(result.state, 'own', 'front', 0)!.atk, 6);
});

test('曹冲：真实卡池能生成两张魏国可用战法，优先费用总和完全相等', () => {
  const state = stateWith(['wei_caochong', 'tactic_huogong', 'wei_xiahouen']);
  const plan = playTargetPlan(state, 'own', data.cards.get('wei_caochong')!);
  assert.deepEqual(plan.choices[0]!.handIndices, [1]);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0,
    row: 'front', col: 0, handIndex: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  const generated = result.state.sides.own.hand.filter((hc) => hc.card.type === 'tactic');
  assert.equal(generated.length, 2);
  // 设计意图是「优先等费、找不到时退化为相差 1」——不要写死总费用，
  // 否则卡池一改（例如万箭齐发从 0 费改为 2 费）这条用例就会假失败。
  const total = generated.reduce((sum, hc) => sum + hc.card.cost, 0);
  assert.ok(Math.abs(total - 3) <= 1, `两张战法总费用应与被弃火攻（3）相差不超过 1，实际 ${total}`);
  assert.ok(generated.every((hc) => isPlayableBy(hc.card, 'wei')));
  assert.equal(result.state.sides.own.discard[0]!.id, 'tactic_huogong');
});

test('曹冲：未指定手牌时挂起选择，拒绝人物牌，选择后产生两张战法', () => {
  const state = stateWith(['wei_caochong', 'wei_xiahouen', 'tactic_huogong']);
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '动作应成功');
  assert.deepEqual(played.state.pendingHandChoice?.indices, [1]);
  assert.equal(applyAction(played.state, ctx, { type: 'CHOOSE_HAND', handIndex: 0 }).ok, false);
  assert.equal(applyAction(played.state, ctx, { type: 'END_TURN' }).ok, false);
  const result = applyAction(played.state, ctx, { type: 'CHOOSE_HAND', handIndex: 1 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  assert.equal(result.state.pendingHandChoice, undefined);
  assert.equal(result.state.sides.own.hand.filter((hc) => hc.card.type === 'tactic').length, 2);
});

test('曹冲：无精确组合时选相差1的组合，按被弃牌的当前费用计算', () => {
  const state = stateWith(['wei_caochong', 'tactic_huogong']);
  state.sides.own.hand[1]!.mods.push({ id: 'test-cost', kind: 'cost', value: 2 });
  const pool = new Map(data.cards);
  for (const [id, card] of pool) if (card.type === 'tactic') pool.delete(id);
  const tactic: CardDef = { id: 'test_wei_tactic', name: '测试战法', faction: 'wei', type: 'tactic', cost: 2, memo: '测试' };
  pool.set(tactic.id, tactic);
  const result = applyAction(state, { ...ctx, cards: pool }, { type: 'PLAY_CARD', cardIndex: 0,
    row: 'front', col: 0, handIndex: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  assert.equal(result.state.sides.own.hand.length, 2);
  assert.deepEqual(result.state.sides.own.hand.map((hc) => hc.card.id), [tactic.id, tactic.id]);
  assert.equal(result.state.sides.own.hand.reduce((sum, hc) => sum + hc.card.cost, 0), 4);
});

test('曹冲：不存在相等或差1组合时仍弃牌，无可选战法时战吼不挂起', () => {
  const state = stateWith(['wei_caochong', 'tactic_huogong']);
  const pool = new Map(data.cards);
  for (const [id, card] of pool) if (card.type === 'tactic') pool.delete(id);
  const result = applyAction(state, { ...ctx, cards: pool }, { type: 'PLAY_CARD', cardIndex: 0,
    row: 'front', col: 0, handIndex: 0 });
  assert.equal(result.ok, true, result.error ?? '动作应成功');
  assert.equal(result.state.sides.own.hand.length, 0);
  assert.equal(result.state.sides.own.discard.length, 1);
  const noTactic = applyAction(stateWith(['wei_caochong']), ctx,
    { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(noTactic.ok, true, noTactic.error ?? '动作应成功');
  assert.equal(noTactic.state.pendingHandChoice, undefined);
});

test('曹叡：先将人物放回牌底，再发现；仅武将和谋臣进入候选', () => {
  const state = stateWith(['wei_caozhang', 'tactic_huogong'],
    ['wei_xunyu', 'wei_xiahouen', 'neutral_infantry', 'wei_piliche']);
  place(state, 'wei_caorui');
  const plan = unitSkillTargetPlan(state, 'own', 'front', 0);
  assert.deepEqual(plan.choices[0]!.handIndices, [0]);
  const used = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(used.ok, true, used.error ?? '动作应成功');
  assert.ok(used.state.pendingHandChoice);
  assert.equal(used.state.pendingDiscover, undefined);
  assert.equal(applyAction(used.state, ctx, { type: 'CHOOSE_HAND', handIndex: 1 }).ok, false);
  const selected = applyAction(used.state, ctx, { type: 'CHOOSE_HAND', handIndex: 0 });
  assert.equal(selected.ok, true, selected.error ?? '动作应成功');
  assert.equal(selected.state.pendingHandChoice, undefined);
  assert.equal(selected.state.sides.own.deck[0], 'wei_caozhang');
  assert.equal(selected.state.pendingDiscover?.candidates.length, 3);
  assert.deepEqual(new Set(selected.state.pendingDiscover!.candidates),
    new Set(['wei_caozhang', 'wei_xunyu', 'wei_xiahouen']));
});

test('曹叡：发现谋臣减1费，发现武将+1/+1，出牌时修正实际生效', () => {
  for (const choice of ['wei_xunyu', 'wei_xiahouen']) {
    const state = stateWith(['wei_caozhang'], ['wei_xunyu', 'wei_xiahouen']);
    place(state, 'wei_caorui');
    const used = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, handIndex: 0 });
    assert.equal(used.ok, true, used.error ?? '动作应成功');
    const result = applyAction(used.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: choice });
    assert.equal(result.ok, true, result.error ?? '动作应成功');
    const hc = result.state.sides.own.hand[0]!;
    assert.equal(hc.card.id, choice);
    assert.equal(effectiveCost(hc), choice === 'wei_xunyu' ? 4 : 2);
    result.state.sides.own.deck = [];
    const played = applyAction(result.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
    assert.equal(played.ok, true, played.error ?? '动作应成功');
    assert.equal(played.state.sides.own.command.cur, choice === 'wei_xunyu' ? 6 : 8);
    const u = getUnit(played.state, 'own', 'front', 1)!;
    assert.deepEqual([u.atk, u.maxHp], choice === 'wei_xunyu' ? [1, 5] : [4, 3]);
  }
});

test('曹叡：没有人物手牌时不能免费发现，指定战法被拒且不消耗次数', () => {
  const state = stateWith(['tactic_huogong'], ['wei_xunyu']);
  place(state, 'wei_caorui');
  const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, handIndex: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.state.pendingDiscover, undefined);
  assert.deepEqual(getUnit(result.state, 'own', 'front', 0)!.skillUsesThisTurn, {});
});

test('曹叡：发现曹休自动上场时仍获得+1/+1', () => {
  const state = stateWith(['wei_xiahouen'], ['wei_caoxiu']);
  place(state, 'wei_caorui');
  const used = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, handIndex: 0 });
  const chosen = applyAction(used.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: 'wei_caoxiu' });
  assert.equal(chosen.ok, true, chosen.error ?? '动作应成功');
  const caoxiu = ['front', 'back'].flatMap((row) =>
    Array.from({ length: 7 }, (_, col) => getUnit(chosen.state, 'own', row as 'front' | 'back', col)),
  ).find((unit) => unit?.cardId === 'wei_caoxiu');
  assert.ok(caoxiu, '曹休应因抽到时技能自动上场');
  assert.equal(caoxiu.cardId, 'wei_caoxiu');
  assert.deepEqual([caoxiu.atk, caoxiu.maxHp], [3, 4]);
});

test('曹爽：仅发现的曹氏宗亲减1费，非宗亲保持原费用', () => {
  for (const id of ['wei_caozhang', 'wei_xiahouen']) {
    const state = stateWith(['wei_caoshuang'], [id, 'neutral_infantry']);
    const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
    assert.equal(played.ok, true, played.error ?? '动作应成功');
    assert.deepEqual(played.state.pendingDiscover?.candidates, [id]);
    const selected = applyAction(played.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: id });
    assert.equal(selected.ok, true, selected.error ?? '动作应成功');
    assert.equal(effectiveCost(selected.state.sides.own.hand[0]!), id === 'wei_caozhang' ? 5 : 2);
  }
});

test('曹爽：其他宗亲入场与阵亡时光环切换，重复重算不累计攻血', () => {
  const state = stateWith();
  place(state, 'wei_caoshuang');
  recomputeAuras(state, data.cards, createRng(17), []);
  assert.deepEqual([getUnit(state, 'own', 'front', 0)!.atk, getUnit(state, 'own', 'front', 0)!.maxHp], [0, 5]);
  const ally = place(state, 'wei_caorui', 1);
  for (let i = 0; i < 3; i++) recomputeAuras(state, data.cards, createRng(17), []);
  assert.deepEqual([getUnit(state, 'own', 'front', 0)!.atk, getUnit(state, 'own', 'front', 0)!.maxHp], [5, 7]);
  killUnit(state, data.cards, { side: 'own', row: 'front', col: 1, unit: ally }, []);
  assert.deepEqual([getUnit(state, 'own', 'front', 0)!.atk, getUnit(state, 'own', 'front', 0)!.maxHp], [0, 5]);
});

test('曹冲随机战法组合：同种子相同选择可确定性回放', () => {
  const state = stateWith(['wei_caochong', 'tactic_huogong']);
  const action = { type: 'PLAY_CARD' as const, cardIndex: 0, row: 'front' as const, col: 0, handIndex: 0 };
  assert.deepEqual(applyAction(state, ctx, action), applyAction(state, ctx, action));
});
