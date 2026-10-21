import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
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
