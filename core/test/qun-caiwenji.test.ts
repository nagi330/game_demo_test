/** 蔡文姬〈悲愤成诗〉（ADR-193）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu'];       // 抽牌不触发疲劳
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

function hit(s: ReturnType<typeof setup>, side: 'own' | 'enemy', row: 'front' | 'back', col: number, amount: number) {
  const evs: GameEvent[] = [];
  dealDamage(s.state, s.ctx.cards, unitRef(side, row, col) as never, amount, evs, 'test');
}

test('蔡文姬 数据形态：6 费 0/6 谋臣、悲愤成诗（光环）+ 残章（战吼）', () => {
  const c = real('qun_caiwenji');
  assert.equal(c.cost, 6);
  assert.equal(c.attack, 0);
  assert.equal(c.health, 6);
  assert.equal(c.type, 'strategist');
  const aura = (c.skills ?? []).find((k) => k.id === 'bei_fen_cheng_shi');
  assert.ok(aura);
  assert.equal(aura.kind, 'trigger');
  assert.equal(aura.trigger, 'on_ally_damaged');
  const eff = aura.effects?.[0];
  assert.equal(eff?.action, 'modify');
  assert.equal(eff?.attack, 1);
  assert.equal(eff?.health, 1);
  assert.equal(eff?.target?.filter?.hp_min, 1);
  const battlecry = (c.skills ?? []).find((k) => k.id === 'can_zhang');
  assert.ok(battlecry);
  assert.equal(battlecry.trigger, 'on_play');
});

test('〈残章〉战吼：抽 1 张牌', () => {
  const s = setup();
  s.state.sides.own.command.cur = 6;
  s.state.sides.own.hand = [{ card: real('qun_caiwenji'), mods: [] }];
  const before = s.state.sides.own.deck.length;
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.hand.length, 1, '打出后 0 张 → 抽 1');
  assert.equal(r.state.sides.own.deck.length, before - 1);
});

test('〈悲愤成诗〉：队友受伤 → 随机另一名友军 +1/+1', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('ally', 2, 4), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('foe', 3, 3), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;

  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 1 },
  });
  assert.equal(r2.ok, true);
  const ally = getUnit(r2.state, 'own', 'front', 1)!;
  assert.equal(ally.hp, 2, '4 − 3 + 1（上限也 +1）');
  assert.equal(ally.maxHp, 5);
  assert.equal(ally.atk, 3);
  assert.ok(r2.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.skillId === 'bei_fen_cheng_shi'));
});

test('〈悲愤成诗〉：蔡文姬自己受伤也触发', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('ally2', 2, 2), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('foe2', 3, 3), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;

  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'own', 'front', 0)!.hp, 3, '0/6 吃了 3');
  const ally = getUnit(r2.state, 'own', 'front', 1)!;
  assert.equal(ally.atk, 3, '队友 +1 攻');
  assert.equal(ally.maxHp, 3, '队友 +1 生命上限');
});

test('〈悲愤成诗〉：只有敌方受伤不触发', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('ally3', 2, 2), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('foe3', 3, 3), 0, nextUidSeq(s.state)));

  hit(s, 'enemy', 'front', 0, 3);
  const ally = getUnit(s.state, 'own', 'front', 1)!;
  assert.equal(ally.atk, 2, '敌方受伤不该给友军加攻');
  assert.equal(ally.maxHp, 2);
});

test('〈悲愤成诗〉：蔡文姬阵亡后不再触发', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('ally4', 2, 2), 0, nextUidSeq(s.state)));

  hit(s, 'own', 'front', 0, 6);                                 // 打死蔡文姬
  assert.equal(getUnit(s.state, 'own', 'front', 0), null);
  const ally = getUnit(s.state, 'own', 'front', 1)!;
  assert.equal(ally.atk, 2, '她死了，诗就停了');
});

test('〈悲愤成诗〉：将死的单位不会被选为目标', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('dying', 2, 2), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 2, makeUnit(mk('alive', 2, 2), 0, nextUidSeq(s.state)));

  hit(s, 'own', 'front', 1, 3);                                 // dying 被打死
  assert.equal(getUnit(s.state, 'own', 'front', 1), null);
  const alive = getUnit(s.state, 'own', 'front', 2)!;
  assert.equal(alive.atk, 3, '+1 攻只落在活着的单位上');
  assert.equal(alive.maxHp, 3);
});

test('〈悲愤成诗〉：多次受伤可叠加', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_caiwenji'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('tank', 2, 8), 0, nextUidSeq(s.state)));

  hit(s, 'own', 'front', 1, 1);
  hit(s, 'own', 'front', 1, 1);
  const tank = getUnit(s.state, 'own', 'front', 1)!;
  assert.equal(tank.atk, 4, '两次受伤 → +2 攻');
  assert.equal(tank.maxHp, 10, '两次受伤 → +2 生命上限');
  assert.equal(tank.hp, 8, '掉 2 点、上限 +2，当前血不变');
});
