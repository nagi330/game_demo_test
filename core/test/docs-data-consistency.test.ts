/**
 * 文档 ↔ 数据 对账：`docs/gdd/07-troops.md` 的四张特种兵表 vs `core/data/cards.json`
 *
 * ## 为什么需要它（2026-10-05 抓到的真 bug）
 *
 * 先登死士的定稿是「**3 费 3/2**」—— ADR-119、`07-troops.md` 的表、考证档 `qun-xiandengsishi.md`、
 * **连测试标题**都写着 3/2，**只有 `data/cards.yaml` 里写成了 `attack: 2`（＝2/2）**；
 * 而测试的断言数组也跟着写成了 `[3, 2, 2]`（断言消息却写着"属性 5 点"）——
 * 于是**数据与测试一起错，437 条全绿**，从设计者定稿到审计之间谁都没发现。
 *
 * 文档与数据之间此前**没有任何自动防线**：`npm run validate` 只校验数据自身（字段白名单/注册表/定型），
 * 不比对文档；`verify:dsl` 只跑效果。这条测试补上这一段。
 *
 * ## 口径
 *
 * · 只比对**可机械解析**的字段：**费用 / 攻血 / 关键词 / 覆盖度**，不比对文案措辞。
 * · 读的是导出后的 `core/data/cards.json`（与其余测试一致）—— 它由 `tools/build-cards.sh`
 *   从 `data/cards.yaml` 生成；「产物与源码一致」另有 pre-commit / pre-push 钩子兜底。
 * · 四张表格式并不统一（蜀国表没有「费用」列、还混着一张战法卡的行），故按**分节 + 卡名 + 兵种**
 *   定位，能解析多少就核多少：费用列不存在时跳过费用，行对不上任何特种兵时整行跳过。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const keywords: Array<{ id: string; name: string }> =
  JSON.parse(readFileSync(new URL('../data/keywords.json', import.meta.url), 'utf8')).keywords;
const doc = readFileSync(new URL('../../docs/gdd/07-troops.md', import.meta.url), 'utf8');

const KEYWORD_NAME = new Map(keywords.map((k) => [k.id, k.name]));

/** 章节标题 → 阵营（只有这四节的表按本文件口径核对） */
const SECTION_FACTION: Record<string, string> = {
  魏国特殊兵: 'wei', 蜀国特殊兵: 'shu', 吴国特殊兵: 'wu', 群雄特殊兵: 'qun',
};
/** 表里的兵种中文名 → troopKind（用于消解「西凉铁骑」「白马义从」这类跨阵营同名） */
const KIND: Record<string, string> = {
  步兵: 'infantry', 盾兵: 'shield', 弓兵: 'archer', 骑兵: 'cavalry',
};

interface Row {
  section: string;
  name: string;
  card: CardDef;
  /** 文档里写的费用（独立列或写在攻血列里的「**4 费** 4/3」），解析不出时为 null */
  costDoc: number | null;
  /** 文档里写的 [攻, 血] */
  stats: [number, number] | null;
  statCell: string;
  keywordCell: string;
}

/** 解析四张表里能对应到特种兵的行 */
function parseRows(): Row[] {
  const rows: Row[] = [];
  let section = '';
  for (const line of doc.split('\n')) {
    const head = /^#{2,4}\s*3\.\d\s+(.*?)\r?$/.exec(line);
    if (head) { section = head[1]!.trim(); continue; }
    const faction = SECTION_FACTION[section];
    if (!faction || !line.startsWith('|') || /^\|[\s|:-]*\|?$/.test(line)) continue;
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 4 || cells[0] === '卡牌') continue;

    const name = cells[0]!.replace(/\*\*/g, '').replace(/（[^）]*）/g, '').trim();
    let hit = cards.filter((c) => c.name === name && c.faction === faction && c.upgradeFrom);
    const kind = KIND[cells[1] ?? ''];
    if (kind) hit = hit.filter((c) => c.troopKind === kind).length
      ? hit.filter((c) => c.troopKind === kind) : hit;
    if (!hit.length) continue;                       // 战法卡等非特种兵的行，跳过

    // 六列＝有独立「费用」列（魏/吴/群雄）；五列＝没有（蜀国，费用写在攻血列里，如「**4 费** 4/3」）
    const hasCost = cells.length >= 6 && /^\**\d+\**$/.test(cells[2] ?? '');
    const statCell = (hasCost ? cells[3] : cells[2]) ?? '';
    const m = /^(?:\**\s*(\d+)\s*费\s*\**\s*)?\**(\d+)\s*\/\s*(\d+)\**$/.exec(statCell);
    rows.push({
      section, name, card: hit[0]!,
      costDoc: hasCost ? Number(cells[2]!.replace(/\*/g, '')) : (m?.[1] ? Number(m[1]) : null),
      stats: m ? [Number(m[2]), Number(m[3])] : null,
      statCell,
      keywordCell: (hasCost ? cells[4] : cells[3]) ?? '',
    });
  }
  return rows;
}

const ROWS = parseRows();

test('文档里的每一行都能对应到真实卡（改卡名 / 删卡的防线）', () => {
  // ⚠️ 2026-10-05 事故：用脚本按「下一张卡的 id」切片重写 cards.yaml 时，
  //    夹在两张卡之间的「西凉铁骑」被一并删掉（卡数 182→181）。
  //    上面那条覆盖度测试**抓不到删卡**（卡不存在于数据里，就不在 specials 里）。
  //    这里反向查：文档表里**看起来是特种兵**的行，必须能落到一张真实卡上。
  const problems: string[] = [];
  let section = '';
  for (const line of doc.split('\n')) {
    const head = /^#{2,4}\s*3\.\d\s+(.*?)\r?$/.exec(line);
    if (head) { section = head[1]!.trim(); continue; }
    const faction = SECTION_FACTION[section];
    if (!faction || !line.startsWith('|') || /^\|[\s|:-]*\|?$/.test(line)) continue;
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 4 || cells[0] === '卡牌') continue;
    // 战法卡行（「（战法）元戎弩射」）与英雄技能行不算
    if (cells[0].includes('战法') || cells[0].includes('主公技')) continue;
    const name = cells[0]!.replace(/\*\*/g, '').replace(/（[^）]*）/g, '').trim();
    const kind = KIND[cells[1] ?? ''];
    if (!kind) continue;                              // 兵种列不是四类基础兵 → 不是特种兵行
    const hit = cards.filter((c) => c.name === name && c.faction === faction);
    if (!hit.length) {
      problems.push(`[${section}] 表里有「${name}」，但 ${faction} 阵营没有这张卡（改名？误删？）`);
    }
  }
  assert.deepEqual(problems, [], `文档表里的卡在数据里找不到：\n${problems.join('\n')}`);
});

test('文档覆盖度：四阵营每张特种兵都出现在 07-troops.md 的表里', () => {
  const specials = cards.filter((c) => c.upgradeFrom && ['wei', 'shu', 'wu', 'qun'].includes(c.faction));
  assert.ok(specials.length >= 30, `四阵营特种兵应有 30+ 张，实际 ${specials.length}`);
  const documented = new Set(ROWS.map((r) => r.card.id));
  const missing = specials.filter((c) => !documented.has(c.id)).map((c) => `${c.name}(${c.id})`);
  assert.deepEqual(missing, [], `这些特种兵没写进 07-troops.md 的表：${missing.join('、')}`);
});

test('文档表里的费用与卡数据一致（先登死士 2/2 那个 bug 的防线）', () => {
  const problems: string[] = [];
  let checked = 0;
  for (const r of ROWS) {
    if (r.costDoc === null) continue;                // 该行没写费用（如蜀国的战法卡行）
    checked++;
    if (r.costDoc !== r.card.cost) {
      problems.push(`[${r.section}] ${r.name}：文档写 ${r.costDoc} 费，数据是 ${r.card.cost} 费`);
    }
  }
  assert.ok(checked >= 28, `应至少核到 28 行费用，实际 ${checked}`);
  assert.deepEqual(problems, [], `文档与数据的费用对不上：\n${problems.join('\n')}`);
});

test('文档表里的攻/血与卡数据一致（先登死士 2/2 那个 bug 的防线）', () => {
  const problems: string[] = [];
  for (const r of ROWS) {
    if (!r.stats) { problems.push(`[${r.section}] ${r.name}：攻血列「${r.statCell}」解析不出「攻/血」`); continue; }
    if (r.stats[0] !== r.card.attack || r.stats[1] !== r.card.health) {
      problems.push(`[${r.section}] ${r.name}：文档写 ${r.stats[0]}/${r.stats[1]}，数据是 ${r.card.attack}/${r.card.health}`);
    }
  }
  assert.deepEqual(problems, [], `文档与数据的攻血对不上：\n${problems.join('\n')}`);
});

test('文档表里列出的关键词都真的挂在卡上（先攻/架盾这类漏写防线）', () => {
  const problems: string[] = [];
  for (const r of ROWS) {
    for (const kw of r.card.keywords ?? []) {
      const cn = KEYWORD_NAME.get(kw) ?? kw;
      if (!r.keywordCell.includes(cn)) {
        problems.push(`[${r.section}] ${r.name}：卡上有「${cn}」，但文档的关键词/技能列没写它（「${r.keywordCell}」）`);
      }
    }
  }
  assert.deepEqual(problems, [], `文档漏写关键词：\n${problems.join('\n')}`);
});
