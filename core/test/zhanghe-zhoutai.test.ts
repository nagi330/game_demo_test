import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { getUnit, setUnit } from '../src/state.ts';
import { dealDamage, healTarget, unitRef } from '../src/mutate.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

function card(over: Partial<CardDef>): CardDef {
  const c: CardDef = {
    id: 'test_zhanghe', name: '张郃', faction: 'wei', type: 'general',
    cost: 5, attack: 4, health: 4, keywords: [], memo: '测试卡', ...over,
  };
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
  return c;
}

test('张郃「巧变」：移动后正对武将获得2生命，且每回合只能使用一次', () => {
  const zhanghe = card({
    id: 'test_zhanghe_move', skills: [{
      id: 'qiao_bian', name: '巧变', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
      target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      effects: [{
        action: 'move',
        move_bonus: 'facing_type',
        target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
        target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      }],
    }],
  });
  const { state, ctx } = scenario({
    own: { front: [null, null, null, 'neutral_infantry', 'test_zhanghe_move'] },
    enemy: { front: [null, null, 'test_champion', null, null] },
  });
  const result = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: 'qiao_bian',
    target: { side: 'own', row: 'front', col: 3 },
    target2: { side: 'own', row: 'front', col: 2 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  const moved = getUnit(result.state, 'own', 'front', 2);
  assert.equal(moved?.name, '步兵');
  assert.equal(moved?.maxHp, 3, '移动后正对武将应获得+2生命（步兵基础1血）');
  assert.equal(getUnit(result.state, 'own', 'front', 3), null);
});

test('张郃「巧变」：移动后正对谋臣获得2攻击，缺少空位目标时拒绝', () => {
  const zhanghe = card({
    id: 'test_zhanghe_move_right', name: '张郃', skills: [{
      id: 'qiao_bian_right', name: '巧变', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
      target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      effects: [{
        action: 'move',
        move_bonus: 'facing_type',
        target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
        target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      }],
    }],
  });
  const { state, ctx } = scenario({
    own: { front: ['test_zhanghe_move_right', 'neutral_infantry', null, null, null] },
    enemy: { front: [null, null, 'test_strategist', null, null] },
  });
  const missing = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'qiao_bian_right',
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(missing.ok, false, '没有选择空位时不能自动移动到第一个空格');
  const result = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'qiao_bian_right',
    target: { side: 'own', row: 'front', col: 1 },
    target2: { side: 'own', row: 'front', col: 2 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  const moved = getUnit(result.state, 'own', 'front', 2);
  assert.equal(moved?.name, '步兵');
  assert.equal(moved?.atk, 4, '移动后正对谋臣应获得+2攻击（步兵基础2攻）');
  assert.equal(getUnit(result.state, 'own', 'front', 1), null);
});

test('张郃「巧变」：正面没有武将或谋臣时获得+1/+1', () => {
  const zhanghe = card({
    id: 'test_zhanghe_move_default', name: '张郃', skills: [{
      id: 'qiao_bian_default', name: '巧变', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
      target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      effects: [{
        action: 'move', move_bonus: 'facing_type',
        target: { side: 'ally', filter: { type: 'troop' }, count: 1, mode: 'choose', pick: 1 },
        target2: { side: 'ally', require_empty: true, count: 1, mode: 'choose', pick: 2 },
      }],
    }],
  });
  const { state, ctx } = scenario({
    own: { front: ['test_zhanghe_move_default', 'neutral_infantry', null, null, null] },
    enemy: { front: [null, null, 'neutral_infantry', null, null] },
  });
  const result = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'qiao_bian_default',
    target: { side: 'own', row: 'front', col: 1 },
    target2: { side: 'own', row: 'front', col: 2 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  const moved = getUnit(result.state, 'own', 'front', 2);
  assert.equal(moved?.atk, 3, '正面为普通兵种时应获得+1攻击');
  assert.equal(moved?.maxHp, 2, '正面为普通兵种时应获得+1生命');
});

test('周泰「不屈」：入场1层，致命伤消耗，治疗满血后补回', () => {
  const zhoutai = card({
    id: 'test_zhoutai_resilience', name: '周泰', cost: 6, attack: 2, health: 5,
    keywords: ['jia_dun'],
    skills: [
      { id: 'charge', name: '不屈充能', kind: 'trigger', trigger: 'on_play', effects: [
        { action: 'apply_status', status: 'bu_qu', stacks: 1, target: { source: true } },
      ] },
      { id: 'save', name: '不屈', kind: 'trigger', trigger: 'on_lethal',
        requires: { status: { id: 'bu_qu', min: 1 } },
        effects: [{ action: 'survive', target: { source: true } }] },
    ],
  });
  const { state, ctx } = scenario({ ownHand: ['test_zhoutai_resilience'] });
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  const ref = unitRef('own', 'front', 0);
  const u0 = getUnit(played.state, 'own', 'front', 0)!;
  assert.equal(u0.statuses.bu_qu?.stacks, 1);
  dealDamage(played.state, ctx.cards, ref, 99, [], '测试伤害');
  const saved = getUnit(played.state, 'own', 'front', 0)!;
  assert.equal(saved.hp, 1);
  assert.equal(saved.statuses.bu_qu?.stacks, 0);
  healTarget(played.state, ref, 10, []);
  assert.equal(saved.hp, saved.maxHp);
  assert.equal(saved.statuses.bu_qu?.stacks, 1);
});
