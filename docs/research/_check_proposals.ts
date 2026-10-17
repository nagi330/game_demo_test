/**
 * 提案可行性检查器（只读，不改任何东西）
 *
 *   cd core && node --experimental-strip-types ../docs/research/_check_proposals.ts
 *
 * 拿提案草案 `docs/research/shu_new_candidates_*.yaml` 逐条对照引擎的**真实注册表**：
 *   1. 卡级字段是否都在 data/cards.yaml 头部的白名单里
 *   2. action 是否在 effects.ts 的 IMPLEMENTED_ACTIONS 里
 *   3. status / trigger / kind / selector 字段 / filter.card_id / summon 单位是否已注册
 *   4. **静默空转黑名单** —— 字段合法但引擎根本不读的那些组合（见 SILENT_TRAPS）
 *
 * 这一条是 ADR-116 的教训：虎步军把 apply_status 的 duration 写成 turns，
 * 校验器全绿，水困实际成了永久；validate 只管卡级白名单，不管 effect 级字段。
 */
import { readFileSync } from 'node:fs';
import { IMPLEMENTED_ACTIONS } from '../../core/src/effects.ts';
import { STATUSES, KEYWORDS, TAGS, TIMING } from '../../core/src/constants.ts';
import { loadData } from '../../core/src/loader.ts';

const DATA = new URL('../../core/data/', import.meta.url).pathname;
const bundle = {
  cards: JSON.parse(readFileSync(DATA + 'cards.json', 'utf8')),
  heroes: JSON.parse(readFileSync(DATA + 'heroes.json', 'utf8')),
};
const loaded = loadData(bundle as never, { own: 'shu_liubei', enemy: 'wei_caocao' });

/** TIMING 是 `{ 键: '值' }`，判定要按**值**查而不是按键 */
const TIMING_VALUES = new Set(Object.values(TIMING) as string[]);
/**
 * ⚠️ 注册表缺口：`on_lord_skill_used` 被 engine.ts:35 真实派发、张昭/张纮/东吴精骑
 * 与本提案都在用，但它**不在 constants.ts 的 TIMING 表里** —— 校验器查不到就会误报。
 * 这里显式补上，同时作为一条待补的 ADR 线索。
 */
TIMING_VALUES.add('on_lord_skill_used');

/** YAML 里的列表：`keywords: []` 会被解析成空对象，这里统一取数组 */
const asList = (v: any): any[] => (Array.isArray(v) ? v : (v && Array.isArray(v.__list) ? v.__list : []));


// ── YAML 迷你解析：只支持本文件用到的子集（列表 / 映射 / 标量 / 嵌套缩进） ──
function parseYaml(text: string): any[] {
  const lines = text.split('\n')
    .map(l => l.replace(/\t/g, '  '))
    .filter(l => l.trim() && !l.trim().startsWith('#'));
  const root: any = { __items: [] };
  const isScalar = (n: any) => n && n.__value !== undefined;
  const mkScalar = (v: string): any => {
    if (v === '[]') return { __items: [] };
    if (/^-?\d+(\.\d+)?$/.test(v)) return { __value: Number(v) };
    if (v === 'true' || v === 'false') return { __value: v === 'true' };
    return { __value: v.replace(/^['"]|['"]$/g, '') };
  };
  const stack: Array<{ indent: number; node: any }> = [{ indent: -1, node: root }];
  for (const raw of lines) {
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    const isListItem = line.startsWith('- ');
    // 同级标量与更深层级一律弹出；**同级容器**在「接下来是列表项」时留下
    //（否则 `- xxx:` 会挂到上一个键；反之在 `count:` 这种同级键上必须弹掉，
    //  否则 `count`/`mode` 会被误当成 `filter:` 的子字段）。
    while (stack.length > 1
      && (stack[stack.length - 1].indent > indent
        || (stack[stack.length - 1].indent === indent
          && (!isListItem
            || isScalar(stack[stack.length - 1].node)
            || !Array.isArray(stack[stack.length - 1].node.__items))))) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    if (line.startsWith('- ')) {
      const item: any = {};
      if (Array.isArray(parent.__items)) parent.__items.push(item);
      const rest = line.slice(2);
      if (/^[A-Za-z_][\w]*:/.test(rest)) {
        const idx = rest.indexOf(':');
        item[rest.slice(0, idx)] = mkScalar(rest.slice(idx + 1).trim());
      } else item.__value = rest;
      stack.push({ indent, node: item });
      continue;
    }
    const idx = line.indexOf(':');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val === '') {
      const node: any = { __items: [] };
      parent[key] = node;
      stack.push({ indent, node });
    } else {
      parent[key] = mkScalar(val);
    }
  }
  const build = (n: any): any => {
    if (n === null || typeof n !== 'object') return n;
    if (n.__value !== undefined) return n.__value;
    const out: any = {};
    for (const [k, v] of Object.entries(n)) {
      if (k === '__items') continue;
      out[k] = build(v);
    }
    if (Array.isArray(n.__items) && n.__items.length) out.__list = n.__items.map(build);
    return out;
  };
  return root.__items.map(build);
}

/** effect 级字段白名单（types.ts: CardEffect） */
const EFFECT_FIELDS = new Set([
  'action', 'value', 'bonus_vs_keyword', 'bonus_vs_troop_kind', 'chance', 'condition',
  'clashMode', 'from', 'status_source', 'value_from_discarded', 'value_from_source',
  'damage_type', 'damage_origin', 'copy_source_stats', 'discover_to', 'value_from_flag',
  'attack_from', 'health_from', 'value_from', 'attack', 'health', 'status', 'stacks',
  'duration', 'unit', 'count', 'position', 'to', 'target', 'mode', 'remove_kind',
  'until_not_type', 'from_deck', 'force_attack', 'attack_side', 'victim_mode', 'on_death',
]);
const SELECTOR_FIELDS = new Set([
  'side', 'zone', 'source', 'attack_target', 'event', 'lord', 'pick', 'filter', 'troopKind',
  'has_status', 'adjacent_to', 'offset_from_chosen', 'exclude_source', 'include_lord',
  'count', 'mode', 'require_empty',
]);
const FILTER_FIELDS = new Set([
  'type', 'keyword', 'tag', 'faction', 'gender', 'lane', 'row', 'health_max', 'damaged',
  'cost_max', 'cost_min', 'cost_below_source', 'attack_below_source', 'attack_max', 'card_id', 'has_status',
]);
const CONDITION_FIELDS = new Set([
  'last_damage_target_not_type', 'exists', 'count', 'count_vs', 'event', 'chosen_side',
  'turn_max', 'victim_type', 'acted_this_turn', 'dealt_damage_this_turn', 'lord_hp',
  'lord_full_hp', 'lord_hp_vs_enemy', 'attack_target', 'all_of', 'any_of',
]);
const CARD_FIELDS = new Set([
  'id', 'name', 'faction', 'type', 'cost', 'attack', 'health', 'troopKind', 'keywords',
  'tags', 'skills', 'effects', 'cost_rule', 'memo', 'flavor', 'rarity', 'gender',
  'type_explicit', 'note', '__list', '__value',
]);
const SKILL_FIELDS = new Set([
  'id', 'name', 'kind', 'dsl', 'cost', 'frequency', 'trigger', 'duration', 'chance',
  'target', 'effects', 'modes', 'text', '__list', '__value',
]);

/**
 * 静默空转陷阱：字段都合法，但引擎的实现根本不读它。
 * 命中即报错 —— 这是 ADR-116「水困写成 turns → 永久」的同款坑。
 */
const SILENT_TRAPS: Array<{ when: string; msg: string }> = [
  {
    when: 'apply_status 用 turns',
    msg: 'apply_status 的时长字段是 `duration`；写成 `turns` 会被静默忽略 → 按状态定义的 duration 处理（水困/灼烧会变成永久）',
  },
  {
    when: 'modify 指向 lord 且没有 duration: this_turn',
    msg: 'effects.ts 的 modify 对 lord 只处理 duration===\'this_turn\'，其余情况命中 `t.kind !== \'unit\'` 直接跳过 → 永久给主公加攻无效',
  },
  {
    when: 'draw 指定单位目标',
    msg: 'draw 只看 target.side（是否给对手），无法「让某个被选中的单位抽牌」',
  },
  {
    when: 'summon 缺 unit',
    msg: 'summon 必须写 unit: <card_id>',
  },
];

/** 逐条检查一个 selector */
function checkSelector(sel: any, where: string, errs: string[]) {
  if (sel == null) return;
  for (const k of Object.keys(sel)) {
    if (k === '__value') continue;
    if (!SELECTOR_FIELDS.has(k)) errs.push(`${where}: selector 字段未注册 → "${k}"`);
  }
  const f = sel.filter;
  if (f) {
    for (const k of Object.keys(f)) {
      if (k === '__value') continue;
      if (!FILTER_FIELDS.has(k)) errs.push(`${where}: filter 字段未注册 → "${k}"`);
    }
    if (f.card_id && !loaded.cards.get(f.card_id)) {
      errs.push(`${where}: filter.card_id 指向不存在的卡 → "${f.card_id}"`);
    }
    if (f.tag && !(f.tag in TAGS)) errs.push(`${where}: 未注册的标签 → "${f.tag}"`);
    if (f.keyword && !(f.keyword in KEYWORDS)) errs.push(`${where}: 未注册的关键词 → "${f.keyword}"`);
  }
  if (sel.has_status && !(sel.has_status in STATUSES)) {
    errs.push(`${where}: 未注册的状态 → "${sel.has_status}"`);
  }
}

function checkCondition(cond: any, where: string, errs: string[]) {
  if (cond == null) return;
  for (const k of Object.keys(cond)) {
    if (k === '__value') continue;
    if (!CONDITION_FIELDS.has(k)) { errs.push(`${where}: condition 字段未注册 → "${k}"`); continue; }
    if (k === 'exists') checkSelector(cond.exists, where + '.exists', errs);
    if (k === 'count') checkSelector(cond.count?.selector, where + '.count.selector', errs);
    if (k === 'count_vs') {
      checkSelector(cond.count_vs.left, where + '.count_vs.left', errs);
      checkSelector(cond.count_vs.right, where + '.count_vs.right', errs);
    }
    if (k === 'all_of' || k === 'any_of') {
      asList(cond[k]).forEach((c: any, i: number) => checkCondition(c, `${where}.${k}[${i}]`, errs));
    }
  }
}

function checkEffect(eff: any, where: string, errs: string[]) {
  for (const k of Object.keys(eff)) {
    if (k === '__value') continue;
    if (!EFFECT_FIELDS.has(k)) errs.push(`${where}: effect 字段未注册 → "${k}"`);
  }
  const a = eff.action;
  if (!(IMPLEMENTED_ACTIONS as ReadonlySet<string>).has(a)) {
    errs.push(`${where}: action 未实现 → "${a}"`);
  }
  if (eff.turns !== undefined) errs.push(`${where}: 🔴 ${SILENT_TRAPS[0].msg}`);
  if (a === 'modify' && eff.target?.lord === true && eff.duration !== 'this_turn') {
    errs.push(`${where}: 🔴 ${SILENT_TRAPS[1].msg}`);
  }
  if (a === 'draw' && eff.target && eff.target.side !== 'enemy') {
    errs.push(`${where}: 🔴 ${SILENT_TRAPS[2].msg}`);
  }
  if (a === 'summon' && !eff.unit) errs.push(`${where}: 🔴 ${SILENT_TRAPS[3].msg}`);
  if (eff.status && !(eff.status in STATUSES)) errs.push(`${where}: 未注册的状态 → "${eff.status}"`);
  if (eff.unit && !loaded.cards.get(eff.unit)) errs.push(`${where}: summon 目标卡不存在 → "${eff.unit}"`);
  checkSelector(eff.target, where + '.target', errs);
  checkCondition(eff.condition, where + '.condition', errs);
  if (eff.on_death) asList(eff.on_death).forEach((e: any, i: number) => checkEffect(e, `${where}.on_death[${i}]`, errs));
  for (const dyn of ['attack_from', 'health_from', 'value_from']) {
    if (eff[dyn]) checkSelector(eff[dyn], `${where}.${dyn}`, errs);
  }
}

// ── 主流程 ──
const file = process.argv[2]
  ?? new URL('./shu_new_candidates_2026_10_07_v0.yaml', import.meta.url).pathname;
const cards = parseYaml(readFileSync(file, 'utf8'));

let totalErr = 0;
const rows: string[] = [];
for (const c of cards) {
  const errs: string[] = [];
  const id = c.id;
  if (typeof id !== 'string' || !/^(shu|wei|wu|qun|neutral|tactic|event|elite|token)_/.test(id)) {
    errs.push(`id 不符命名约定 → "${id}"`);
  }
  if (loaded.cards.get(id)) errs.push(`**这张卡已经在 data/cards.yaml 里了**`);
  if (!c.memo) errs.push('缺 memo（AGENTS.md 要求每张卡必填）');
  if (c.type === 'strategist' && c.attack > 1 && !c.type_explicit) {
    errs.push(`谋臣 ${c.attack} 攻但没有 type_explicit（ADR-072：1 攻才算谋臣）`);
  }
  for (const k of Object.keys(c)) {
    if (!CARD_FIELDS.has(k)) errs.push(`卡级字段不在白名单 → "${k}"`);
  }
  for (const kw of asList(c.keywords)) {
    if (!(kw in KEYWORDS)) errs.push(`未注册的关键词 → "${kw}"`);
  }
  for (const t of asList(c.tags)) {
    if (!(t in TAGS)) errs.push(`未注册的标签 → "${t}"`);
  }
  const skills = asList(c.skills);
  if (typeof c.attack === 'number' && c.type === 'general' && c.attack <= 1) {
    errs.push('武将 1 攻需要 type_explicit');
  }
  for (const s of skills) {
    const where = `${c.name}·${s.name}`;
    for (const k of Object.keys(s)) {
      if (!SKILL_FIELDS.has(k)) errs.push(`${where}: 技能级字段不在白名单 → "${k}"`);
    }
    if (!s.name) errs.push(`${where}: 缺技能名`);
    if (s.kind && !['active', 'trigger', 'aura'].includes(s.kind)) errs.push(`${where}: 未知 kind → "${s.kind}"`);
    if (s.kind === 'trigger' && s.trigger && !(TIMING_VALUES as Set<string>).has(s.trigger)) {
      errs.push(`${where}: 未注册的触发时机 → "${s.trigger}"`);
    }
    if (s.kind === 'active' && !asList(c.keywords).includes('zhan_ji') && s.cost === undefined && s.name !== '虎痴') {
      // 无战技关键词的主动技在本项目里只有许褚「虎痴」一例，这里只提示不报错
      errs.push(`⚠️ ${where}: 免费主动技但卡面没有「战技」关键词（项目内仅许褚·虎痴如此）`);
    }
    if (!s.text) errs.push(`${where}: 缺 text（卡面文案）`);
    checkSelector(s.target, where + '.target', errs);
    asList(s.effects).forEach((e: any, i: number) => checkEffect(e, `${where}.effects[${i}]`, errs));
    for (const m of asList(s.modes)) {
      asList(m.effects).forEach((e: any, i: number) => checkEffect(e, `${where}.modes[${i}]`, errs));
    }
  }
  // 卡级 effects（简雍/马谡 那种写法）
  asList(c.effects).forEach((e: any, i: number) => checkEffect(e, `${c.name}(卡级).effects[${i}]`, errs));

  totalErr += errs.length;
  rows.push(
    `${errs.length === 0 ? '✅' : '❌'} ${(c.name ?? id).padEnd(4)} ${c.type === 'general' ? '武将' : '谋臣'}`
    + ` ${c.cost} 费 ${c.attack}/${c.health}｜技能 ${skills.length}`
    + (errs.length ? '\n     ' + errs.join('\n     ') : ''),
  );
}
console.log(rows.join('\n'));
console.log(`\n共 ${cards.length} 张提案，${totalErr} 条问题。`);
process.exit(totalErr === 0 ? 0 : 1);