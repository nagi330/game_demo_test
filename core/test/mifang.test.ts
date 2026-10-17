/**
 * 糜芳（ADR-174）：3 费 1/3 谋臣
 *  · 「赖此复振」战吼：使**己方血量最低的人物**永久 +2/+3（零空放）
 *  · 「叛迎」亡语：以**无技能的糜芳**进入**对手牌库随机位置**（新动作 `defect_to_deck`）
 *
 * ⭐ 两个抓点都是 A 级（卷三十八）：糜家「于時困匱，**賴此複振**」（雪中送炭）＋
 * 糜芳「**私好攜貳，叛迎孫權**，羽因覆敗」（主动叛变）。
 *
 * ⚠️ 叛变后的糜芳是 `type: token`（`NON_DECK_TYPES` ⇒ 不进卡池/构筑）、**无任何技能**、费用仍 3
 * ⇒ 对对手是一张抽到基本不会打的白板，等同于污染其抽牌与手牌。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const MATE: CardDef = {
  id: 'test_mf_mate', name: '友军', faction: 'shu', type: 'general', cost: 2,
  attack: 2, health: 6, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(MATE);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

function board() {
  const { state, ctx } = scenario({ ownHand: ['shu_mifang'] });
  ctx.cards.set(MATE.id, MATE);
  return { state, ctx, rng: createRng(9) } as B;
}

const playMifang = (b: B, col = 2) => applyAction(b.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col });
const killMifang = (b: B, col = 2) => {
  const evs: import('../src/types.ts').GameEvent[] = [];
  dealDamage(b.state, b.ctx.cards, unitRef('own', 'front', col), 99, evs, '测试', 0);
  return evs;
};

/* ============================================================ */

test('形态：3 费 1/3 谋臣；战吼 +2/+3 打「血量最低」；亡语进对手牌库并换成 token', () => {
  const c = ALL.find((x) => x.id === 'shu_mifang')!;
  assert.equal(c.type, 'strategist');
  assert.equal(c.cost, 3); assert.equal(c.attack, 1); assert.equal(c.health, 3);

  const [buff, death] = c.skills!;
  assert.equal(buff!.name, '赖此复振');
  assert.equal(buff!.trigger, 'on_play');
  const ef = buff!.effects![0]!;
  assert.equal(ef.action, 'modify');
  assert.equal(ef.attack, 2); assert.equal(ef.health, 3);
  assert.equal(ef.target?.mode, 'lowest_health', '⭐ 自动指向血量最低的友军（永不空放）');
  assert.equal(ef.duration, undefined, '不带 duration ＝ 永久');

  assert.equal(death!.name, '叛迎');
  assert.equal(death!.trigger, 'on_death');
  assert.equal(death!.effects![0]!.action, 'defect_to_deck');
  assert.equal(death!.effects![0]!.unit, 'token_mifang_panbian');

  const withNote = c as CardDef & { note?: string };
  assert.ok((withNote.note ?? '').length > 500, 'note 要写清两个抓点的来源与等级');
  assert.ok(c.flavor);
});

test('叛变版：type=token（不进构筑）、**无任何技能**、同费 1/3', () => {
  const t = ALL.find((x) => x.id === 'token_mifang_panbian')!;
  assert.equal(t.type, 'token', 'NON_DECK_TYPES ⇒ 不进卡池/构筑');
  assert.equal(t.name, '糜芳', '还是同一个人');
  assert.equal(t.cost, 3); assert.equal(t.attack, 1); assert.equal(t.health, 3);
  assert.deepEqual(t.skills ?? [], [], '⚠️ 叛变后他不再有手段');
});

test('⭐ 战吼：只强化**血量最低**的那一个（另一个不动）', () => {
  const b = board();
  const low = makeUnit(MATE, 0, 11); low.hp = 2;      // 血量最低
  const high = makeUnit(MATE, 0, 12); high.hp = 5;
  setUnit(b.state, 'own', 'front', 0, low);
  setUnit(b.state, 'own', 'front', 1, high);

  const r = playMifang(b);
  assert.ok(r.ok, `糜芳应能打出：${r.error}`);
  const a = getUnit(r.state, 'own', 'front', 0)!;
  const c2 = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(a.atk, 4, '血最低的那个 2 攻 → 4');
  assert.equal(a.maxHp, 9, '上限 6 → 9');
  assert.equal(c2.atk, 2, '另一个不动');
  assert.equal(c2.maxHp, 6);
});

test('⭐ 永不空放：场上没有别的单位时，战吼指向**自己**', () => {
  const b = board();
  const r = playMifang(b);
  assert.ok(r.ok);
  const self = getUnit(r.state, 'own', 'front', 2)!;
  assert.equal(self.atk, 3, '糜芳自己 1 → 3');
  assert.equal(self.maxHp, 6, '3 → 6');
});

test('⭐ 亡语：阵亡后，一张**无技能的糜芳**进入对手牌库（随机位置）', () => {
  const b = board();
  b.state.sides.enemy.deck = ['neutral_infantry', 'neutral_archer'];
  const before = b.state.sides.enemy.deck.length;

  const r = playMifang(b);
  assert.ok(r.ok);
  const evs = killMifang({ ...b, state: r.state });

  assert.equal(getUnit(r.state, 'own', 'front', 2), null, '糜芳已阵亡');
  const enemyDeck = r.state.sides.enemy.deck;
  assert.equal(enemyDeck.length, before + 1, '对手牌库多了一张');
  assert.equal(enemyDeck.filter((id) => id === 'token_mifang_panbian').length, 1, '就是叛变版糜芳');
  assert.ok(evs.some((e) => e.type === 'CARD_DEFECTED'), '应派发 CARD_DEFECTED 事件');
});

test('对手牌库为空时也能塞进去（不会崩）', () => {
  const b = board();
  b.state.sides.enemy.deck = [];
  const r = playMifang(b);
  assert.ok(r.ok);
  killMifang({ ...b, state: r.state });
  assert.deepEqual(r.state.sides.enemy.deck, ['token_mifang_panbian']);
});
