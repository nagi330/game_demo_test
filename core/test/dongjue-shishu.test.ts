/**
 * 董厥「使蜀慰劳」：2 费 1/3 **谋臣**；战吼 → 己方主公回复 2 点、己方其他人物各回复 1 点（ADR-167）
 *
 * ## 设计口径（设计者 2026-10-15 定稿，见 `docs/gdd/18-character-skill-design.md` §2.5）
 *
 * **功能卡（辅助位）**：史料只给"特点与贴合度" —— 抓点是「**使蜀慰劳**」（A 级：蜀亡后入晋、
 * 被派回蜀地**慰劳**）＋「**良士**／思慎宜适」（A 级：诸葛亮亲口评语）。机制按游戏性做成
 * **战吼回血**，**不绑死任何另一张卡**。
 *
 * ## 本文件钉死的四条边界（都是实测出来的行为，不是推测）
 *
 * ① **永不落空**：场上只有主公时也照常生效（主公恒在，不需要选目标、不需要凑第二张卡）。
 * ② **主公不被重复治**：`filter: { type: character }` 不含主公（ADR-087 的"范围默认含主公"
 *    **只对 `damage` 生效**）→ 主公恰好 +2，不是 +3。
 * ③ **不过量治疗**：满血单位不会被治到超过上限。
 * ④ **只治己方**：敌方主公与敌方单位都不吃。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));

for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) {
    TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
  }
}
function real(id: string): CardDef {
  const raw = ALL.find((c) => c.id === id);
  assert.ok(raw, `cards.json 里找不到 ${id}`);
  const flat: CardDef = { ...raw, keywords: raw.keywords ?? [], skills: raw.skills ?? [] };
  const i = TEST_CARDS.findIndex((x) => x.id === id);
  if (i >= 0) TEST_CARDS[i] = flat; else TEST_CARDS.push(flat);
  return flat;
}

const FRIEND = {
  id: 'test_dj_friend', name: '友军', faction: 'shu', type: 'general', cost: 2, attack: 2, health: 6,
  keywords: [], memo: '',
} as unknown as CardDef;

/** 主公先扣到 20 血便于观察；`friends` 是各友军的当前血量（放在 front 0..n-1） */
function board(friends: number[] = []) {
  const { state, ctx } = scenario({ ownHand: ['shu_dongjue'] });
  state.sides.own.lord.hp = 20;
  friends.forEach((hp, i) => {
    const u = makeUnit(FRIEND, 0, 100 + i);
    u.hp = hp;
    setUnit(state, 'own', 'front', i, u);
  });
  return { state, ctx };
}

/** 打出董厥到 `col`（默认放在友军之后） */
function play(state: ReturnType<typeof board>['state'], ctx: ReturnType<typeof board>['ctx'], col: number) {
  return applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col });
}

/* ============================================================
   ① 数据形态
   ============================================================ */

test('董厥 数据形态：谋臣 2 费 1/3、无关键词、战吼两段治疗（主公 2 ＋ 其他人物各 1）', () => {
  const c = real('shu_dongjue');
  assert.equal(c.type, 'strategist', '谋臣（文吏履历；ADR-018：攻击 ≤1 默认谋臣）');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  assert.deepEqual(c.keywords ?? [], [], '旧版的「架盾」在 A 级史料里没有锚点，已移除');

  const sk = (c.skills ?? []).find((s) => s.id === 'shi_shu_wei_lao');
  assert.ok(sk, '董厥应有「使蜀慰劳」');
  assert.equal(sk!.trigger, 'on_play');
  assert.equal(sk!.effects?.length, 2);

  const [lordHeal, allHeal] = sk!.effects!;
  assert.equal(lordHeal!.action, 'heal');
  assert.equal(lordHeal!.value, 2);
  assert.equal(lordHeal!.target?.lord, true, '第一段治主公');
  assert.equal(allHeal!.action, 'heal');
  assert.equal(allHeal!.value, 1);
  assert.equal(allHeal!.target?.count, 'all');
  assert.equal(allHeal!.target?.filter?.type, 'character', '第二段治"其他人物"（不含主公 —— 由引擎语义保证）');
  assert.equal(allHeal!.target?.lord, undefined, '第二段不显式含主公');
});

/* ============================================================
   ② 行为
   ============================================================ */

test('行为：主公 +2、其他人物各 +1', () => {
  const { state, ctx } = board([3, 5]);
  const r = play(state, ctx, 2);
  assert.ok(r.ok, `董厥应能打出：${r.error}`);
  assert.equal(r.state.sides.own.lord.hp, 22, '主公 20 → 22');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 4, '友军 3 → 4');
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.hp, 6, '友军 5 → 6');
});

/* ============================================================
   ③ 四条边界（实测行为）
   ============================================================ */

test('边界① 永不落空：场上**只有主公**时也照常生效', () => {
  const { state, ctx } = board([]);
  const r = play(state, ctx, 0);
  assert.ok(r.ok, `只有主公时也应能打出：${r.error}`);
  assert.equal(r.state.sides.own.lord.hp, 22, '主公照样 +2');
});

test('边界② 主公不被重复治：恰好 +2，不是 +3', () => {
  const { state, ctx } = board([2, 2]);
  const r = play(state, ctx, 2);
  assert.equal(r.state.sides.own.lord.hp, 22,
    '⚠️「全体人物」那半不得把主公也算进去（ADR-087 的"范围默认含主公"只对 damage 生效）');
});

test('边界③ 不过量治疗：满血单位不会被治到超过上限', () => {
  const { state, ctx } = board([6]);   // FRIEND 满血 6/6
  const r = play(state, ctx, 1);
  const f = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(f.hp, f.maxHp, '满血单位保持满血，不溢出');
  assert.equal(f.hp, 6);
});

test('边界④ 只治己方：敌方主公与敌方单位都不吃', () => {
  const { state, ctx } = board([3]);
  state.sides.enemy.lord.hp = 20;
  const foe = makeUnit(FRIEND, 0, 999);
  foe.hp = 3;
  setUnit(state, 'enemy', 'front', 0, foe);

  const r = play(state, ctx, 1);
  assert.equal(r.state.sides.enemy.lord.hp, 20, '敌方主公不掉也不回');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 3, '敌方单位不被治');
  assert.equal(r.state.sides.own.lord.hp, 22, '己方主公照常 +2');
});
