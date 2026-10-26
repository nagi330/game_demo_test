/**
 * 文丑〈延津铁骑〉—— 6 费 3/5 群雄武将（`yuan_shi` / elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   战吼：召唤一个 3/2「延津铁骑」（先攻）。
 *   之后文丑每次普通攻击后，再召唤一个 3/2「延津铁骑」（先攻）。
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

function playWenchou(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 6;
  s.state.sides.own.hand = [{ card: real('qun_wenchou'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
  });
}

function attack(s: ReturnType<typeof setup>) {
  return applyAction(s.state, s.ctx, {
    type: 'ATTACK',
    from: { row: 'front', col: 0 },
    to: { kind: 'unit', row: 'front', col: 0 },
  });
}

/* =====================================================================
 * 1. 数据形态
 * ===================================================================== */
test('文丑 数据形态：6 费 3/5、延津铁骑、token 3/2 先攻', () => {
  const c = real('qun_wenchou');
  assert.equal(c.cost, 6);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 5);
  const onPlay = (c.skills ?? []).find((k) => k.id === 'yan_jin_tie_qi');
  assert.ok(onPlay);
  assert.equal(onPlay.effects?.[0]?.action, 'summon');
  assert.equal(onPlay.effects?.[0]?.unit, 'qun_yanjin_tieqi');
  const after = (c.skills ?? []).find((k) => k.id === 'yan_jin_tie_qi_xu');
  assert.ok(after);
  assert.equal(after.trigger, 'after_attack');
  assert.equal(after.effects?.[0]?.action, 'summon');
  const token = real('qun_yanjin_tieqi');
  assert.equal(token.attack, 3);
  assert.equal(token.health, 2);
  assert.ok((token.keywords ?? []).includes('xian_gong'));
});

/* =====================================================================
 * 2. 战吼召唤一个 3/2 先攻
 * ===================================================================== */
test('文丑〈延津铁骑〉：战吼召唤 3/2 先攻', () => {
  const s = setup();
  const r = playWenchou(s);
  assert.equal(r.ok, true);
  const token = getUnit(r.state, 'own', 'front', 1);
  assert.ok(token);
  assert.equal(token.atk, 3);
  assert.equal(token.hp, 2);
  assert.ok(token.kw.includes('xian_gong'));
});

/* =====================================================================
 * 3. 普攻后再召唤一个
 * ===================================================================== */
test('文丑〈延津铁骑·续〉：普通攻击后再召唤一个 3/2 先攻', () => {
  const s = setup();
  placeEnemy(s, mk('test_target', 1, 1));
  const r1 = playWenchou(s);
  const st = r1.state;
  // 文丑刚上场，没有先攻；给「先攻」状态让它当回合能攻击（= 测试“普攻后”的 after_attack）。
  st.sides.own.rows.front[0]!.kw.push('xian_gong');
  const r2 = attack({ ...s, state: st } as ReturnType<typeof setup>);
  assert.equal(r2.ok, true);
  const token = getUnit(r2.state, 'own', 'front', 2);
  assert.ok(token);
  assert.equal(token.atk, 3);
  assert.equal(token.hp, 2);
  assert.ok(token.kw.includes('xian_gong'));
});

/* =====================================================================
 * 4. token 3/2 先攻
 * ===================================================================== */
test('延津铁骑 token：3/2 先攻', () => {
  const token = real('qun_yanjin_tieqi');
  assert.equal(token.type, 'token');
  assert.equal(token.attack, 3);
  assert.equal(token.health, 2);
  assert.ok((token.keywords ?? []).includes('xian_gong'));
});

/* =====================================================================
 * 5. 6 费 3/5
 * ===================================================================== */
test('文丑 6 费 3/5（身板 8，基准 13，−5）', () => {
  const c = real('qun_wenchou');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 5);
});
