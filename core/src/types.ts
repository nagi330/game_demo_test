/**
 * core 的类型定义
 *
 * 铁律：core 只依赖这里的类型，**不引用任何引擎（Cocos）类型**。
 * 客户端把 core 产出的 Event 翻译成动画即可。
 */

/** 状态档位：定义在 `constants.ts`（状态表的唯一真源），这里转出供 DSL / 覆盖使用 */
import type { StatusCap } from './constants.ts';
export type { StatusCap };

export type Side = 'own' | 'enemy';
export type Row = 'front' | 'back';
/**
 * 性别（ADR-071）：貂蝉「祸国倾城」只认「男性角色」，需要按性别筛目标。
 *
 * 数据侧口径：**人物卡默认男性**，女性角色在 `card_gender` 决策段显式登记；
 * 兵种/衍生物/进化卡等非具体人物的卡保持 `unknown`（不参与性别选择）。
 */
export type Gender = 'male' | 'female' | 'unknown';
export type CardType =
  | 'troop' | 'general' | 'strategist' | 'machine' | 'event' | 'tactic' | 'elite' | 'special'
  | 'lord'      // 主公卡（不进卡组，见 ADR-014）
  | 'token'     // 衍生物（召唤产生，不进卡组）
  | 'status';   // 属性/状态卡（如「架盾」）
export type Faction = 'shu' | 'wei' | 'wu' | 'qun' | 'neutral';

/* ============================================================
   卡牌数据（来自 data/*.yaml，见 docs/gdd/05-cards.md）
   ============================================================ */

/** 效果条件（ADR-033）：四种写法见 docs/gdd/13-balance-data-model.md §7.6 */
export interface EffectCondition {
  last_damage_target_not_type?: CardType;
  exists?: TargetSelector;                                   // 该集合非空
  count?: { selector: TargetSelector; op: CompareOp; value: number };   // 数量与定值比
  count_vs?: { left: TargetSelector; right: TargetSelector; op: CompareOp };  // 两集合互比
  event?: 'killed' | 'clash_won' | 'clash_lost' | 'damaged'; // 本次结算中的事件
  roll?: string;                                           // 本组效果中的随机结果标识
  source_status?: string;                                  // 来源单位具有指定状态
  /** 所选目标属于哪一方（陈宫「忠烈」：选敌将 vs 选友将走不同分支，ADR-069） */
  chosen_side?: 'ally' | 'enemy';
  /**
   * 所选目标**是不是主公**（ADR-148，华佗「医圣」＝治人物回 2 血、治主公额外抽一张）。
   *
   * `chosen_side` 的姊妹条件：那个判"哪一方"，这个判"是不是主将"。配合
   * `filter: { include_lord: true }` 的选择器使用（候选池里同时有人物与主公）。
   */
  chosen_lord?: boolean;
  chosen_kind?: 'unit' | 'lord';
  /** 完整回合数上限（马超「首回合击杀」= turn_max:1，ADR-070） */
  turn_max?: number;
  /** 本次被击杀者的卡牌类型（马超只认「武将」，ADR-070） */
  victim_type?: 'troop' | 'general' | 'strategist';
  /**
   * 来源单位**本回合是否行动过**（攻击或使用主动技），ADR-074 —— 司马懿「谋定后动」①
   * 需要「如果当前回合司马懿没有任何行动」。
   */
  acted_this_turn?: boolean;
  /** 来源单位本回合的攻击**是否造成过伤害**（ADR-074，司马懿②） */
  dealt_damage_this_turn?: boolean;
  /** 主公当前生命条件（陈武「奋死」等） */
  lord_hp?: { side: 'self' | 'enemy'; op: CompareOp; value: number };
  /** 主公是否处于满生命 */
  lord_full_hp?: { side: 'self' | 'enemy'; value: boolean };
  /** 双方主公当前生命值比较；self 始终是效果来源方。 */
  lord_hp_vs_enemy?: CompareOp;
  /** 本次普通攻击的目标类别或固有关键词。 */
  attack_target?: { type?: CardType | 'character' | 'lord'; keyword?: string; damaged?: boolean; has_status?: string };
  /**
   * 条件的**与 / 或**组合（ADR-074）
   *
   * 单个条件字段之间是「与」，但有些卡面写的是"要么…要么…"或"三者同时在场"：
   *   · `all_of` —— 张宝 / 张梁「张氏三兄弟同时在场」
   *   · `any_of` —— 司马懿③「场上只剩司马懿时，效果同时包含②」
   * 两者可与其它字段共存（先判 and/or，再与其余字段相与）。
   */
  all_of?: EffectCondition[];
  any_of?: EffectCondition[];
}

export type CompareOp = '>=' | '<=' | '==' | '>' | '<' | '!=';

/**
 * 伤害属性（ADR-108 藤甲兵）
 *
 * 缺省 `physical` 覆盖**普通攻击**与**无属性效果伤害**（如万箭齐发、火烧洛阳
 * 补 damage_type 之前的状态）。`fire` / `water` / `poison` 由卡面 `damage_type` 显式声明。
 *
 * `poison`（ADR-117，无当飞军「毒箭」）：毒攻**不吃藤甲的 `reduce_physical`**
 * —— 藤甲挡箭不挡毒，这是它与火/水并列的第三条属性轴（火/水/毒各有一条 DoT）。
 */
export type DamageType = 'physical' | 'fire' | 'water' | 'poison';

export interface CardEffect {
  action: string;
  value?: number;
  bonus_vs_keyword?: { keyword: string; value: number };
  bonus_vs_troop_kind?: { troopKind: 'infantry' | 'shield' | 'cavalry' | 'archer'; value: number };
  chance?: number;               // 概率 0–1（ADR-033）
  condition?: EffectCondition;   // 条件（ADR-033）
  clashMode?: 'roll' | 'cost';   // clash 的比法
  from?: 'top' | 'bottom';       // scry 的取牌端
  status_source?: 'self';        // apply_status 时把来源单位记为状态的 srcUid（ADR-039）
  /**
   * `override_status` 专用（ADR-142）：把 `status` 的若干档位覆盖为指定值。
   * 例：`{ reduce_physical: 2, vulnerable_fire: 0 }` ＝ 藤甲强化（物理 −2、不再怕火）。
   */
  caps?: Partial<Record<StatusCap, number>>;
  /**
   * `send_hand_to_deck` + `mode: 'choose'` 专用（ADR-144）：**只在本次结算刚抽到的最近 N 张里选**。
   *
   * 杨仪「筹度粮谷」＝抽 2 选 1，候选应当是**刚抽到的那两张**，而不是整只手牌
   *（否则等于"任意弃一张"，比卡面写的强）。缺省 = 全部手牌。
   */
  from_drawn?: number;
  value_from_discarded?: 'cost' | 'health';   // 取「最近被弃牌」的属性作为数值（ADR-040）
  value_from_source?: 'attack' | 'health';    // 取来源单位当前攻/血作为数值
  value_from_status?: string;                  // 取来源单位身上某状态的层数
  damage_type?: DamageType;       // damage 专用：水攻/火攻/毒攻伤害（缺省 physical，见 DamageType）
  /**
   * gain_command 专用（ADR-139，蒋琬「足食」）：**永久提升统率上限**而不只是本回合可用值。
   *
   * 缺省 `false` = 只加本回合 `cur`（且夹在上限内）；`true` = `max` 与 `cur` 一起涨，
   * 上限封顶 `COMMAND.MAX`。回合开始时会回满 `cur`，所以"回合开始 +N"必须用这个模式，
   * 否则加出来的那 1 点会立刻被回满覆盖掉（＝完全没有收益）。
   */
  permanent?: boolean;
  /**
   * `self_to_hand` 专用（ADR-141，孟获「蛮王」）：**超过次数上限之后**这张卡去哪。
   *
   *   · `'enemy'`（缺省）= 转给对手手牌（"第 7 次会到对手手牌"）
   *   · `'none'`        = 超过上限就**不再重建**（正常进弃牌堆）
   */
  overflow?: 'enemy' | 'none';
  damage_origin?: 'reflected';    // 反射伤害不再触发主公受伤联动
  minimum_hp?: number;            // 伤害后目标至少保留的生命值
  roll_id?: string;               // roll 动作写入的结果标识
  copy_source_stats?: boolean;    // summon：复制来源当前攻血，不复制技能或状态
  discover_to?: 'hand' | 'deck_top'; // discover 专用：选择后进手牌或牌库顶
  value_from_flag?: string;                   // 取 flags 中 "<name>:N" 的 N 作为数值（ADR-041）        // apply_status 时把来源单位记为状态的 srcUid（ADR-039）
  attack_from?: TargetSelector;  // 动态取值：攻击 = 该集合数量
  health_from?: TargetSelector;  // 动态取值：生命 = 该集合数量
  value_from?: TargetSelector;   // 动态取值：value = 该集合数量（damage/heal/draw 等通用）
  attack?: number;               // modify 专用：单独修正攻击（ADR-030）
  health?: number;               // modify 专用：单独修正生命上限
  status?: string;
  stacks?: number;
  duration?: string | number;
  unit?: string;                 // summon 的召唤物 id；scry 的 'top' | 'bottom'
  count?: number;
  position?: string;
  to?: 'hand' | 'deck_top' | 'deck_bottom' | 'discard' | 'board';   // scry/steal 的落点
  // transform：进化目标卡 id（写在 to 上，与 scry 的落点区分由 action 决定）
  target?: TargetSelector;
  /** discard 专用：'choose' 表示由调用方通过 ctx.handIndex 指定弃哪张 */
  mode?: 'choose' | 'random';
  /**
   * remove_status 专用（ADR-071，华佗「青囊」）：按**状态类别**批量驱散。
   * 卡面写「清除其负面效果状态」——只知道具体状态 id 无法表达，
   * 玩家身上挂几个 debuff 就得列几条。给 `remove_kind: 'debuff'` 即清掉全部负面。
   */
  remove_kind?: 'debuff' | 'buff';
  /**
   * draw_until 专用（ADR-071，姜维「文武双全」）：一直抽，直到抽出一张
   * **不是** `until_not_type` 的牌为止（该牌也进手牌）。
   */
  until_not_type?: CardType | 'character';
  /**
   * mill 专用（ADR-074，司马懿「谋定后动」②）：从哪一端弃。
   * 缺省 `'random'`（卡面写的是"随机丢弃一张"），`'top'` 则固定弃牌库顶。
   */
  from_deck?: 'top' | 'random';
  /**
   * force_attack 专用（ADR-087）：被强制者去打**哪一方**。
   *
   *   · `'own'`（缺省）= 打自己人 —— 混乱内讧（趁火打劫「使其随机攻击己方单位」）
   *   · `'foe'`        = 打施法方 —— 草船借箭「使其攻击我方场上血量最高单位」
   *
   * 两张开卡的需求正好相反，原先实现一律打"对方的对面"，导致施法方自己的单位挨打。
   */
  attack_side?: 'own' | 'foe';
  /** force_attack 专用：被攻击者怎么挑（缺省 `'random'`；草船借箭要「血量最高」） */
  victim_mode?: 'random' | 'highest_health';
  /**
   * apply_status 专用（ADR-087）：被标记者**阵亡时由施法方结算**的效果。
   *
   * 草船借箭「敌方每阵亡一个武将，己方抽取两张卡」原先用 `status_source: self` 挂标记，
   * 但**卡牌没有来源单位**（`ctx.source` 为空）→ `srcUid` 是 undefined →
   * 既有的 `on_mark_death` 联动直接 return，这条效果一次都没生效过。
   * 现在把"该结算什么"直接写在标记上，不再依赖某个单位持有 `on_mark_death` 技能。
   */
  on_death?: CardEffect[];
  /** grant_hand：给筛选出的手牌附加属性、费用和展示技能 */
  hand_attack?: number;
  hand_health?: number;
  hand_skill?: SkillDef;
  /** replace_lord：清除标签并将主公替换为声明的定义 */
  purge_tag?: string;
  lord_id?: string;
  lord_name?: string;
  lord_faction?: Faction;
  lord_skill_def?: SkillDef;
}

export interface TargetSelector {
  side?: 'ally' | 'enemy' | 'both' | 'self';
  /** 作用区域，默认 board（ADR-038）。'both' = 手牌 + 场上都算候选（ADR-071，陆抗） */
  zone?: 'board' | 'hand' | 'both';
  source?: boolean;              // true = 只选「来源单位自身」（ADR-033）
  /**
   * true = 只选「**本次普通攻击的目标**」（ADR-130，象兵「象阵」）。
   *
   * 与 `condition.attack_target` 的区别：那个只能**读**攻击目标用于条件判断
   * （西凉铁骑「突骑」＝打武将/谋臣 +2），这个是**以攻击目标为作用对象**
   * （"打谁就给谁挂状态"：震慑、破甲、标记…）。
   */
  attack_target?: boolean;
  /** 本次事件里的另一方单位（华雄亡语：使**击杀者**获得 +1/+1，ADR-070） */
  event?: 'killer' | 'victim' | 'attacker';
  lord?: boolean;                // true = 选该方主帅（ADR-036）
  /**
   * 取玩家的第几个选择（ADR-071，程昱「审时度势」需要同时指定「牺牲谁」与「治疗谁」）。
   *   · 1（默认）= `ctx.chosen`，即 `action.target`
   *   · 2         = `ctx.chosen2`，即 `action.target2`
   * 未提供时退回「合法池取前 N 个」，供 AI 与测试兜底。
   */
  pick?: 1 | 2;
  filter?: {
    type?: CardType | 'character';
    types?: CardType[];
    keyword?: string;
    tag?: string;                  // 归属标签，见 data/tags.yaml（ADR-029）
    faction?: Faction;
    gender?: Gender;               // 性别筛选（ADR-071，貂蝉「祸国倾城」只认男性）
    lane?: number;
    row?: Row;
    health_max?: number;
    damaged?: boolean;          // true=低于生命上限；false=**毫发无伤**（越骑「厉志」用）
    attacked_this_turn?: boolean;
    acted_this_turn?: boolean;
    cost_max?: number;             // 统帅值上限（绝对，含）
    cost_min?: number;             // 统帅值下限（绝对，含）——与 cost_max 配合可写出互斥分支
    cost_below_source?: boolean;   // 统帅值低于来源单位（相对，"低于自己统帅的敌军"）ADR-036
    attack_below_source?: boolean; // 攻击力低于来源单位（张飞「咆哮」）ADR-069
    attack_max?: number;           // 攻击力上限（绝对，含）——越骑「厉志」的 +3 硬上限
    card_id?: string;              // 指定具体卡（关平亡语指定「关羽」）ADR-069
    damage_type?: DamageType;      // 发现/卡牌筛选：效果伤害属性
  troopKind?: 'infantry' | 'shield' | 'cavalry' | 'archer';   // 兵种（进化卡按兵种选目标，ADR-042）
    has_status?: string;
    adjacent_to?: 'self' | 'chosen' | 'killer'; // 来源、选定目标或击杀者的相邻单位
    offset_from_chosen?: number;   // 已选目标右侧固定格偏移，空格不压缩距离
    /** 排除来源单位自身（ADR-071，陆抗「手里**或**场上友方将领」：不能复制自己） */
    exclude_source?: boolean;
    include_lord?: boolean;        // 候选池额外纳入该方主将（ADR-051，弓兵射箭「含主将」）
    basic_troop?: boolean;         // 四种可升变的基础兵
  };
  count?: number | 'all';
  mode?: 'choose' | 'random' | 'first' | 'lowest_health' | 'highest_cost';
  require_empty?: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
  kind: 'active' | 'trigger' | 'aura';
  /** 效果 DSL（翻译后的可执行定义，见 docs/gdd/13-balance-data-model.md §7） */
  dsl?: SkillDef[];
  cost?: number;
  frequency?: 'once_per_turn' | 'unlimited' | 'once';
  trigger?: string;              // TIMING 常量
  /** 触发技能的有效期限；this_turn 表示仅来源单位入场的本回合生效 */
  duration?: 'this_turn';
  chance?: number;               // 技能级概率（免死等，ADR-039）
  target?: TargetSelector;
  same_side?: boolean;
  played_rightmost?: boolean;
  requires?: { deck_tag?: { tag: string; op: CompareOp; value: number } };
  effects?: CardEffect[];
  /**
   * 抉择：同一技能的二选一分支（ADR-071，曹彰「猛袭」）。
   *
   * 给出 `modes` 时**忽略 `effects`**，由 `PLAY_CARD.modeIndex` 选中的分支执行；
   * `modeIndex` 缺省或越界一律取 `modes[0]`（AI 与测试的兜底路径）。
   * 每个分支自己带完整的一组效果，不做"公共前缀"合并 —— 分支之间往往互斥。
   */
  modes?: SkillMode[];
  /** 卡面技能文案（来自手写卡；仅用于显示与校验，不参与结算） */
  text?: string;
}

/** 抉择的一个分支（ADR-071） */
export interface SkillMode {
  name: string;
  effects: CardEffect[];
}

export interface CardDef {
  /**
   * 稀有度（ADR-068）：普通卡必须贴合同费预算；
   * **精英卡（橙卡）允许强于预算** —— 设计者明确"有些卡稍强是预期的，类似炉石的橙卡"。
   * 校验器据此把"偏离预算"从 error 降为提示。
   */
  rarity?: 'common' | 'elite' | 'legendary';
  id: string;
  name: string;
  faction: Faction;
  type: CardType;
  cost: number;
  attack?: number;
  health?: number;
  troopKind?: 'infantry' | 'shield' | 'cavalry' | 'archer';
  /** 特种兵升变来源；只有显式声明此字段的卡才可被 UPGRADE_UNIT 选择。 */
  upgradeFrom?: 'infantry' | 'shield' | 'cavalry' | 'archer';
  /** 性别（ADR-071）：有攻血的单位默认 male，女性角色在 card_gender 决策段显式登记 */
  gender?: Gender;
  /**
   * 类型是否由**设计者显式裁定**（ADR-072）。
   *
   * ADR-018 的自动判定是「攻击 > 1 → 武将；否则默认谋臣」，而攻击力会被后续调值改掉。
   * 1 攻的武将必须带这个标记，否则校验器报 error —— 防止"数值改了、类型没跟着改"的静默错误。
   */
  type_explicit?: boolean;
  keywords?: string[];
  tags?: string[];               // 归属标签：西凉/蛮族/黄巾/士族（ADR-029）
  skills?: SkillDef[];
  bonds?: string[];
  effects?: CardEffect[];        // 非人物卡的直接效果
  cost_rule?: { condition: EffectCondition; value: number };   // 条件费用规则（ADR-040）
  upgradeTarget?: unknown;
  memo?: string;
  flavor?: string;
  art?: string;
}

export interface LordDef extends CardDef {
  skill?: string;                // 主公技显示名
  skillDef?: SkillDef;
}

/* ============================================================
   对局状态
   ============================================================ */

/** 状态实例（ADR-034）：层数 + 剩余回合数 */
export interface StatusInstance {
  stacks: number;                // 数值型的层数；标志型恒为 1
  turns?: number;                // 剩余回合数；undefined = 永久
  srcUid?: string;               // 状态来源单位（守护类状态据此找到「谁替我挨打」，ADR-039）
  auraId?: string;               // 由哪个光环施加（重算时先清后加，避免累加，ADR-041）
  /** 卡牌级标记的阵亡结算（ADR-087）：持有者阵亡时由 `srcSide` 一方结算 */
  payoff?: CardEffect[];
  /** `payoff` 属于哪一方 */
  srcSide?: Side;
  /**
   * 施加当回合**不递减**（ADR-089，`duration: 'until_next_turn'`）
   *
   * 「友军受到的伤害由陈宫承担」这类守护，要挡的恰恰是**对手回合**的伤害，
   * 而状态是在自己回合施加的 —— 按常规在自己回合结束时就减到 0 被清掉，等于形同虚设
   * （ADR-071 给「护主」记过同一笔账，那次是靠光环接管生命周期绕过去的）。
   * 置位后：本回合结束跳过第一次递减，从下一次起正常计时。
   */
  skipTick?: boolean;
  expiresAtHalfTurn?: number;     // 当前行动方回合结束时清除，不按状态拥有方递减
  untilFullHealth?: boolean;      // 恢复满血时移除该控制状态
}

/**
 * 规则覆盖（ADR-142）：把这个单位身上**某个状态**的**某个档位（cap）**覆盖为指定值。
 *
 * 为什么需要它：cap（如 `reduce_physical`）平时由**状态层数**驱动（`capStacks`），
 * 而一个状态的多个 cap 共用同一个层数 —— 典型例子是**藤甲**：
 * `reduce_physical` 与 `vulnerable_fire` 都等于层数，所以"加一层"会把
 * 「物理 −1」变成「物理 −2」**同时**把「遇火 +1」变成「遇火 +2」，
 * 想只要前者（或想连后者一起消掉）就必须**覆盖档位**，而不是加层数。
 *
 * 语义：**仅当该状态确实存在于这个单位身上时才生效**（被净化 → 覆盖自动失效；
 * 重新获得状态 → 覆盖自动恢复，因为覆盖是挂在实例上、每次结算现读的）。
 */
export interface RuleOverride {
  /**
   * 作用于哪个状态（如 `'teng_jia'`）。
   *
   * **缺省 = 无状态覆盖**（ADR-150）：与状态无关的档位用它，例如 `proc_chance`
   * （木鹿大王把象兵的震慑概率从 50% 抬到 100%）—— 单位身上并没有哪个状态代表"概率"。
   */
  statusId?: string;
  cap: StatusCap;                // 覆盖哪个档位（如 'reduce_physical'）
  value: number;                 // 覆盖成多少（绝对值，不是增减量）
}

/** 属性修正项（ADR-037）：最终属性 = 基础值 + Σ mods */
export interface StatMod {
  id: string;                    // 来源技能 id；重算时按来源整体替换
  /**
   * `aura` 光环（重算时先清后加）｜ `temp` 限时｜ `permanent` 永久
   * ｜ `rule` **规则覆盖**（ADR-142，不改属性，改的是某状态某档位的结算值）
   */
  kind: 'aura' | 'temp' | 'permanent' | 'rule';
  attack?: number;
  health?: number;
  turns?: number;                // 'temp' 专用：剩余回合
  rule?: RuleOverride;           // 'rule' 专用
  expiresAtHalfTurn?: number;    // 跨到指定半回合结束时失效
}

/** 手牌实例（ADR-038）：包住共享的卡牌定义，承载"这张手牌"的独立状态 */
export interface HandCard {
  card: CardDef;                 // 卡牌定义（共享、不可变）
  mods: HandMod[];               // 手牌级修正
}

/** 手牌修正项（ADR-038，与 Unit.mods 同构） */
export interface HandMod {
  id: string;
  /**
   * `cost` 费用增减 ｜ `ban` 禁止上场 ｜ `attack` / `health` **手牌数值修正**（ADR-141）
   * ｜ `rule` **规则覆盖**（ADR-142，打出时随牌进场）
   *
   * `attack` / `health` 在**打出时**结算到上场的单位身上（`engine.playCard`），
   * 用于「手牌里的 X 获得 +N/+N」（孟获「蛮王」）与「收回时留下永久减益」（孟获自身）两类效果。
   * `rule` 同样在打出时搬进单位的 `mods`，用来表达「手牌里的 X 上场后其某个状态按新档位结算」
   *（兀突骨「藤甲统率」＝手牌里的藤甲兵上场后物理减伤 −2、且不再怕火）。
   * 与 `cost` 一样支持 `auraId`：光环施加的会在每次 `recomputeAuras` 先清后加，不会累积。
   */
  kind: 'cost' | 'ban' | 'attack' | 'health' | 'rule';
  value?: number;                // cost / attack / health 专用
  turns?: number;                // 剩余回合；undefined = 永久
  auraId?: string;               // 由哪个光环施加（重算时先清后加，ADR-041）
  rule?: RuleOverride;           // 'rule' 专用（ADR-142）
}

export interface Unit {
  uid: string;
  cardId: string;
  name: string;
  type: CardType;
  faction: Faction;
  cost: number;
  baseAtk: number;               // 卡面基础攻击（ADR-037）
  baseMaxHp: number;             // 卡面基础上限
  mods: StatMod[];               // 修正层
  atk: number;                   // 派生值 = baseAtk + Σmods.attack
  hp: number;
  maxHp: number;                 // 派生值 = baseMaxHp + Σmods.health
  troopKind?: string;
  /** 普通兵独立升变进度（BDSB v0.4）；离场后随 Unit 一起清除。 */
  upgradeProgress?: {
    damage: number;
    shieldSurvival: number;
    basicKills: number;
    characterKills: number;
    heroHits: number;
  };
  gender?: Gender;              // 性别（ADR-071）
  kw: string[];
  tags: string[];                // 归属标签（ADR-029）
  statuses: Record<string, StatusInstance>;   // 状态实例（ADR-034）
  skills?: SkillDef[];
  attackedThisTurn: number;
  /** 本回合是否行动过（攻击 / 使用主动技）—— ADR-074，司马懿①「没有任何行动」 */
  actedThisTurn: boolean;
  /** 本回合的攻击是否造成过伤害 —— ADR-074，司马懿② */
  dealtDamageThisTurn: boolean;
  /**
   * 已经播报过「技能发动」的光环 id（ADR-074）
   *
   * `recomputeAuras` 每次重算都会重跑所有光环 —— 入场、死亡、回合开始/结束各一次。
   * 若每次都发 SKILL_TRIGGERED，客户端会不停弹"某某的光环"，把日志和动画全淹掉。
   * 光环是持续生效的被动，播报一次即可（属性/状态的**变化**另有 STAT_MODIFIED /
   * STATUS_APPLIED 事件兜底）。
   */
  auraAnnounced?: string[];
  enteredTurn: number;
  /** 本回合各主动技已使用次数，key = 技能 id 或下标（GDD 10 §1.1 频率限制） */
  skillUsesThisTurn: Record<string, number>;
  /** 本局已用过的「一局一次」技能键 */
  skillsUsedOnce: string[];
}

export interface Lord {
  attackThisTurn?: number;
  attackedThisTurn?: boolean;
  temporaryArmor?: number;
  id: string;
  name: string;
  faction: Faction;
  hp: number;
  maxHp: number;
  armor: number;
  skill: string;
  skillDef?: SkillDef;
  skillUsedThisTurn: boolean;
  statuses?: Record<string, StatusInstance>;   // 主公状态（ADR-040）
  skillUsesPerTurn?: number;                   // 主公技每回合可用次数（默认 1）
}

export interface SideState {
  lord: Lord;
  rows: { front: Array<Unit | null>; back: Array<Unit | null> };
  hand: HandCard[];
  deck: string[];
  discard: CardDef[];
  command: { cur: number; max: number };
  fatigue: number;
  /** 本局是否已用过换牌机会（GDD 03 §1 第③步） */
  mulliganDone: boolean;
}

export interface MatchState {
  seed: number;
  uidSeq: number;
  rngState: number;
  /**
   * **完整回合数**（双方各行动一次 = 一个完整回合，ADR-064）。
   * 只在双方都行动完后 +1 —— 与统率值上限的增长严格同步。
   * 需要"半回合"粒度时用 halfTurn。
   */
  turn: number;
  /** 半回合数：每有一方开始行动就 +1（先手 = 1，后手 = 2，先手 = 3 …） */
  halfTurn: number;
  active: Side;
  sides: Record<Side, SideState>;
  winner: Side | 'draw' | null;
  /** 后手补偿方式（ADR-053） */
  secondCompensation?: 'none' | 'extra_draw';
  /** 发现牌流程：候选牌生成后等待当前玩家选择。 */
  pendingDiscover?: {
    side: Side;
    candidates: string[];
    costModifier?: number;
    destination?: 'hand' | 'deck_top';
  };
  /** 发现流程暂停时，等待继续结算的同一时机触发技队列。 */
  pendingTriggerSkills?: { side: Side; trigger: string; nextIndex: number };
  /**
   * 「结算中途要求玩家选一张**手牌**」（ADR-144，杨仪「筹度粮谷」）
   *
   * 与 `pendingDiscover` 同一套暂停机制，区别是**候选在手牌里**而不是牌库里。
   * 为什么必须有它：`mode: 'choose'` 读的是 `ctx.handIndex`，那是**动作提交时**就固定下来的下标；
   * 而「先抽两张、再选一张放回牌库底」的选择发生在**结算中间**（抽完才知道有哪些候选），
   * 提交动作时根本传不出正确下标 —— 没有这套暂停就只能退化成随机，与卡面文案不符。
   */
  pendingHandChoice?: {
    side: Side;
    /** 选完之后做什么（目前只有放回牌库顶/底，为"弃一张""交给对手"留扩展位） */
    kind: 'deck_top' | 'deck_bottom' | 'random' | 'discard';
    /** 只允许在这些手牌下标里选（如"刚抽到的那两张"）；缺省 = 全部手牌 */
    indices?: number[];
  };
  /**
   * 「阵亡后重建于手牌」的次数计数（ADR-141，孟获「蛮王」）
   *
   * 按 **cardId** 计数（孟获同名唯一，一个卡组只放 1 张）。放下这里而不是手牌 mod 的原因：
   * 单位在场上时手牌 mod 已经不存在了，而"第几次收回"必须跨「手牌 ↔ 战场」存活。
   * 只有用过 `self_to_hand` 的对局才会创建这个字段，老回放不受影响。
   */
  recalls?: Record<string, number>;
}

/* ============================================================
   动作
   ============================================================ */

export type Action =
  | { type: 'PLAY_CARD'; cardIndex: number; row?: Row; col?: number;
      /** 战吼（on_play）需要玩家选目标时，在此带上所选目标（ADR-069） */
      target?: { side: Side; row?: Row; col?: number };
      /** 第二个玩家选择（ADR-071，程昱）：`TargetSelector.pick: 2` 读它 */
      target2?: { side: Side; row?: Row; col?: number };
      /** 抉择分支下标（ADR-071，曹彰）：缺省 / 越界一律取 modes[0] */
      modeIndex?: number;
      /**
       * 战吼里"由玩家挑一张**手牌**"的效果用哪个下标（ADR-139，与 USE_SKILL 同一约定）。
       * 缺省 / 越界时效果自己退回随机，绝不静默失败。
       */
      handIndex?: number }
  | { type: 'CHOOSE_DISCOVER'; cardId: string }
  /** 结算中途的**手牌**选择（ADR-144，杨仪「筹度粮谷」）：只在 `pendingHandChoice` 挂起时可用 */
  | { type: 'CHOOSE_HAND'; handIndex: number }
  /**
   * 升变（ADR-114 / ADR-116）。
   *
   * `target` 是给**新形态的指向性战吼**用的：升变会派发新形态的 `on_play`（ADR-114），
   * 而像虎步军「越水」这种"对指定敌方人物"的战吼需要玩家选目标。
   * 此前本 action 没有 target 字段 → `mode: 'choose'` 只能走 `narrowByMode` 的兜底
   * （`pool.slice(0, n)`，即"第一个合法目标"），玩家**无法指定** ——
   * 而升变恰恰是获得特种兵的**主要途径**。
   *
   * 形状与 `USE_SKILL` 一致（`row` 省略 = 指向该方主帅）。
   */
  | { type: 'UPGRADE_UNIT'; row: Row; col: number; toCardId: string; target?: { side: Side; row?: Row; col?: number }; modeIndex?: number }
  | { type: 'ATTACK'; from: { row: Row; col: number }; to: { kind: 'unit'; row: Row; col: number } | { kind: 'lord' } }
  | { type: 'LORD_ATTACK'; to: { kind: 'unit'; row: Row; col: number } | { kind: 'lord' } }
  | { type: 'USE_LORD_SKILL'; target?: { side: Side; row?: Row; col?: number }; handIndex?: number; modeIndex?: number }
  | { type: 'USE_SKILL'; row: Row; col: number; target?: { side: Side; row?: Row; col?: number }; handIndex?: number; modeIndex?: number; skillId?: string }
  | { type: 'END_TURN' };

/* ============================================================
   事件流（客户端只消费这个）
   ============================================================ */

export type GameEvent =
  | { type: 'LORD_ATTACK_DECLARED'; side: Side; to: { kind: 'unit'; row: Row; col: number } | { kind: 'lord' } }
  | { type: 'LORD_ATTACK_GAINED'; side: Side; attack: number }
  /** 统率**上限**被永久改变（ADR-139，`gain_command` + `permanent: true`） */
  | { type: 'COMMAND_MAX_CHANGED'; side: Side; max: number; delta: number }
  | { type: 'TURN_START'; side: Side; turn: number; halfTurn: number; command: { cur: number; max: number } }
  | { type: 'TURN_END'; side: Side; turn: number; halfTurn: number }
  | { type: 'CARD_DRAWN'; side: Side; card: CardDef; deckLeft: number }
  | { type: 'CARD_AUTO_CAST'; side: Side; card: CardDef }
  | { type: 'DECK_ADDED'; side: Side; card: CardDef; count: number; to?: 'hand' | 'deck' }
  | { type: 'DISCOVER_OPTIONS'; side: Side; cards: CardDef[] }
  | { type: 'CARD_DISCOVERED'; side: Side; card: CardDef; costModifier?: number; destination?: 'hand' | 'deck_top' }
  /** 牌库被弃牌（milled）：ADR-074 */
  | { type: 'CARD_MILLED'; side: Side; cardId: string; from: 'top' | 'random' }
  /**
   * 某个技能**发动了**（ADR-074）
   *
   * 原先客户端只能从效果事件（DAMAGE / STATUS_APPLIED…）间接猜"是不是技能干的"，
   * 玩家看不出「咆哮」「五雷轰顶」这类技能什么时候生效。现在引擎在技能真正执行的
   * 前一刻发这条事件，客户端据此播"技能发动"的提示（技能名 + 时机）。
   */
  | { type: 'SKILL_TRIGGERED'; side: Side; row?: Row; col?: number; unitName: string;
      skillName: string; skillId: string; kind: SkillDef['kind']; timing?: string;
      /** 触发技的来源（击杀者 / 亡语 / 光环重算…），便于日志分组 */
      from: 'on_play' | 'active' | 'trigger' | 'aura' | 'lord_skill' | 'card' }
  /** 该方整个回合被跳过（ADR-074，休养生息「下一回合不进行任何活动」） */
  | { type: 'TURN_SKIPPED'; side: Side; reason: string }
  | { type: 'DECK_SENT'; side: Side; cardId: string; count: number }
  | { type: 'CARD_RETURNED_TO_DECK'; side: Side; card: CardDef;
      /** 落点（ADR-139，`send_hand_to_deck` 专用）：顶 / 底 / 随机。缺省 = 旧的随机位置 */
      to?: 'deck_top' | 'deck_bottom' | 'random' }
  /** 阵亡后重建于手牌（ADR-141，孟获「蛮王」）：`times` = 第几次收回，`exceeded` = 已超过上限转给对手 */
  | { type: 'CARD_REBUILT_IN_HAND'; side: Side; card: CardDef; times: number; exceeded: boolean;
      costDelta: number; healthDelta: number }
  /** 结算中途要求玩家选一张手牌（ADR-144）：`indices` = 可选的候选手牌下标 */
  | { type: 'HAND_CHOICE_OPTIONS'; side: Side; kind: string; indices: number[] }
  /** 玩家选定了哪张手牌与它的去向（ADR-144，杨仪「筹度粮谷」） */
  | { type: 'HAND_CHOSEN'; side: Side; card: CardDef; kind: string }
  /** 某状态的某个档位被规则覆盖（ADR-142，兀突骨「藤甲统率」） */
  | { type: 'STATUS_OVERRIDDEN'; side: Side; target: { kind: 'unit' | 'hand'; row?: Row; col?: number; index?: number };
      statusId?: string; cap: StatusCap; value: number }
  | { type: 'FATIGUE'; side: Side; amount: number; hp: number }
  | { type: 'CARD_PLAYED'; side: Side; card: CardDef; row?: Row; col?: number; handIndex?: number }
  | { type: 'UNIT_SUMMONED'; side: Side; row: Row; col: number; unit: Unit }
  | { type: 'ATTACK_DECLARED'; side: Side; from: { row: Row; col: number }; to: unknown }
  | { type: 'DAMAGE'; target: { kind: 'unit' | 'lord'; side: Side; row?: Row; col?: number }; amount: number; source: string }
  | { type: 'HEAL'; target: { kind: 'unit' | 'lord'; side: Side; row?: Row; col?: number }; amount: number; hp: number }
  | { type: 'ARMOR_GAINED'; side: Side; amount: number; armor: number }
  | { type: 'STATUS_APPLIED'; side: Side; row?: Row; col?: number; status: string; stacks: number; turns?: number }
  | { type: 'UNIT_TRANSFORMED'; side: Side; row: Row; col: number; from: string; to: string; unit: Unit }
  | { type: 'UNIT_UPGRADED'; side: Side; row: Row; col: number; from: string; to: string; unit: Unit }
  | { type: 'DRAW_BLOCKED'; side: Side }
  | { type: 'EXTRA_ATTACK'; side: Side; row: Row; col: number }
  | { type: 'CONTROL_TAKEN'; from: Side; to: Side; unit: Unit }
  | { type: 'SKILL_COPIED'; side: Side; from: string; skill: string }
  | { type: 'FORCED_ATTACK'; side: Side; row: Row; col: number }
  | { type: 'LORD_STATUS_EXPIRED'; side: Side; status: string }
  | { type: 'DAMAGE_REDIRECTED'; side: Side; row?: Row; col?: number; to: Side; guardName: string;
      /** true = 被守护的是**主帅**（护主，ADR-071）：没有 row/col，客户端应指向主公条 */
      lord?: boolean }
  | { type: 'UNIT_SURVIVED'; side: Side; row: Row; col: number; unit: Unit }
  | { type: 'UNIT_FLIPPED'; side: Side; row: Row; col: number; to: 'front' | 'back'; unit: Unit }
  | { type: 'HAND_MODIFIED'; side: Side; index: number; kind: 'cost' | 'ban' | 'attack' | 'health'; value?: number; turns?: number }
  | { type: 'CARD_STOLEN'; from: Side; to: Side; card: CardDef }
  | { type: 'CARD_SCRYED'; side: Side; cardId: string; from: 'top' | 'bottom' }
  | { type: 'CLASH'; side: Side; mine: number; theirs: number; won: boolean }
  | { type: 'STATUS_BLOCKED'; side: Side; row?: Row; col?: number; status: string; reason: string }
  | { type: 'CARD_DISCARDED'; side: Side; card: CardDef }
  | { type: 'UNIT_RETURNED'; side: Side; row: Row; col: number; unit: Unit }
  | { type: 'STAT_MODIFIED'; side: Side; row: Row; col: number;
      attack?: number; health?: number; value?: number; duration?: string | number;
      /** 本次修正的来源名（中毒削上限用「中毒」，便于日志/飘字说明"为什么上限掉了"；ADR-132） */
      source?: string }
  | { type: 'STATUS_EXPIRED'; side: Side; row: Row; col: number; status: string }
  | { type: 'UNIT_DIED'; side: Side; row: Row; col: number; unit: Unit }
  | { type: 'UNIT_REMOVED'; side: Side; row: Row; col: number; unit: Unit; reason: string }
  | { type: 'LORD_REPLACED'; side: Side; from: string; to: string; name: string }
  | { type: 'LORD_SKILL_USED'; side: Side; skill: string }
  | { type: 'GAME_OVER'; winner: Side | 'draw' }
  | { type: 'REJECTED'; reason: string; action: Action };

export interface ApplyResult {
  ok: boolean;
  state: MatchState;
  events: GameEvent[];
  error?: string;
}

/** 引擎上下文：卡牌索引（不放进 state，避免快照体积膨胀） */
export interface EngineContext {
  cards: Map<string, CardDef>;
  lords: Record<Side, LordDef>;
}
