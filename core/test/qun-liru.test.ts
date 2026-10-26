/**
 * 李儒〈鸩酒〉—— 4 费 1/4 群雄谋臣（`dong_zhuo` / elite / `ju_du`）。
 *
 * 设计者定稿（2026-10-21，第二版）：
 *   战吼：若一名敌方人物攻击力 < 4，对其造成 1 点毒攻；若伤害生效，剧毒直接消灭。
 *   **不削攻**；`chosen_attack_max: 3` 读目标当前攻击力（0/1/2/3 可毒杀；4 攻及以上不碰）。
 *   披坚/免疫/减伤到 0 → 1 点毒攻不生效 → `ju_du` 不触发（披坚人物不会被毒杀）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
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

function mk(id: string, attack: number, health: number): CardDef {
  return {
    id, name: id, faction: 'qun', type: 'general', cost: 3,
    attack, health, rarity: 'common', keywords: [],
  } as CardDef;
}

function placeEnemy(s: ReturnType<typeof setup>, card: CardDef) {
  const u = makeUnit(card, 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, u);
  return u;
}

function playLiru(
  s: ReturnType<typeof setup>,
  target: { kind: 'unit'; side: 'enemy'; row: 'front'; col: number },
) {
  s.state.sides.own.command.cur = 4;
  s.state.sides.own.hand = [{ card: real('qun_liru'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1, target,
  });
}

/* =====================================================================
 * 1. 数据形态：不削攻，只有 1 点毒攻 + chosen_attack_max: 3
 * ===================================================================== */
test('李儒 数据形态：4 费 1/4 谋臣、ju_du、鸩酒（不削攻）', () => {
  const c = real('qun_liru');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 4);
  assert.equal(c.type, 'strategist');
  assert.ok((c.keywords ?? []).includes('ju_du'));
  const sk = (c.skills ?? []).find((k) => k.id === 'zhen_jiu');
  assert.ok(sk);
  assert.equal(sk.name, '鸩酒');
  assert.equal(sk.trigger, 'on_play');
  assert.equal(sk.target?.filter?.type, 'character');
  assert.equal(sk.target?.filter?.include_lord, false);
  assert.equal(sk.effects?.length, 1, '第二版不再削攻：只有 1 个 damage');
  assert.equal(sk.effects?.[0]?.action, 'damage');
  assert.equal(sk.effects?.[0]?.value, 1);
  assert.equal(sk.effects?.[0]?.damage_type, 'poison');
  assert.equal(sk.effects?.[0]?.condition?.chosen_attack_max, 3);
});

/* =====================================================================
 * 2. 3 攻可毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：3 攻目标 <4，剧毒斩杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy3', 3, 3));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
});

/* =====================================================================
 * 3. 2 攻可毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：2 攻目标 <4，剧毒斩杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy2', 2, 2));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
});

/* =====================================================================
 * 4. 1 攻可毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：1 攻目标 <4，剧毒斩杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy1', 1, 1));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
});

/* =====================================================================
 * 5. 0 攻可毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：0 攻目标 <4，剧毒斩杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy0', 0, 4));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
});

/* =====================================================================
 * 6. 4 攻是边界：不小于 4，不毒杀、也不掉血
 * ===================================================================== */
test('李儒〈鸩酒〉：4 攻目标 = 边界，不毒杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy4', 4, 4));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'enemy', 'front', 0);
  assert.ok(u);
  assert.equal(u.atk, 4);
  assert.equal(u.hp, 4);
  assert.equal(u.statuses.zhong_du?.stacks ?? 0, 0);
});

/* =====================================================================
 * 7. 5 攻不毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：5 攻目标 >4，不毒杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy5', 5, 8));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'enemy', 'front', 0);
  assert.ok(u);
  assert.equal(u.atk, 5);
  assert.equal(u.hp, 8);
  assert.equal(u.statuses.zhong_du?.stacks ?? 0, 0);
});

/* =====================================================================
 * 8. 7 攻不毒杀
 * ===================================================================== */
test('李儒〈鸩酒〉：7 攻目标 >4，不毒杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_enemy7', 7, 7));
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'enemy', 'front', 0);
  assert.ok(u);
  assert.equal(u.atk, 7);
  assert.equal(u.hp, 7);
});

/* =====================================================================
 * 9. 披坚（免疫一次伤害）吸收 1 点毒攻 → 剧毒不触发
 * ===================================================================== */
test('李儒〈鸩酒〉：披坚吸收 1 点毒攻 → 不毒杀', () => {
  const s = setup();
  const enemy = placeEnemy(s, mk('test_enemy_jian', 2, 2));
  enemy.statuses.sheng_dun_status = { stacks: 1 };
  const r = playLiru(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'enemy', 'front', 0);
  assert.ok(u);
  assert.equal(u.atk, 2);
  assert.equal(u.hp, 2);
});

/* =====================================================================
 * 10. 主公不能选（数据形态）
 * ===================================================================== */
test('李儒〈鸩酒〉：主公不能选（target.include_lord = false）', () => {
  const c = real('qun_liru');
  const sk = (c.skills ?? [])[0];
  assert.equal(sk.target?.filter?.include_lord, false);
});
