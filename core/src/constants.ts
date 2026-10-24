/**
 * 常量表：关键词、状态、结算时机
 * 对应 docs/gdd/06-keywords.md 与 docs/gdd/10-skills-statuses.md
 */

import type { Row } from './types.ts';

/**
 * 战场：**一行 8 格**（ADR-051）。
 *
 * 原设计是 5 列 × 2 排（前后军），现已改为单排——「同列」「穿透」「前后军」概念全部作废。
 * `back` 这一排在数据模型里保留（值为空、任何迭代都不会读它），
 * 以免一次性改动过大；后续清理时可整体删除。
 */
export const BOARD = {
  COLS: 8,
  ROWS: ['front'] as Row[],
  MAX_UNITS: 8,
};

export const LORD_HP = 30;

export const COMMAND = { START: 1, MAX: 10 };

/** 主公技默认统率消耗（数据未给 cost 时兜底）；ADR-049 起统一 2 */
export const LORD_SKILL_COST = 2;

export const DECK = {
  SIZE: 30,
  /** 起手张数（ADR-087，设计者裁定）：**先手与后手同为 3 张**，
   *  各自在自己回合开始时再抽 1 张 → 双方第一次行动时都是 4 张手牌。
   *  原先后手 4 张 + 「后手补偿多抽 1 张」= 6 张，比先手多 2 张，实测明显偏多。 */
  HAND_START_FIRST: 3,
  HAND_START_SECOND: 3,
  HAND_LIMIT: 10,
  DRAW_PER_TURN: 1,
};

/**
 * 对局终止（ADR-054）：**只有主将阵亡一种结束方式，没有回合上限、没有平局**。
 *
 * 依据：每回合至少抽 1 张；牌库抽空后触发「粮尽」递增伤害（1、2、3…），
 * 必然会把某一方主将扣死——所以对局一定会自然收束，不需要人为设上限。
 */
export const MATCH = {
  TURN_LIMIT: Infinity,
  /**
   * 每方回合时限（秒）。到点自动结束该方回合（ADR-065）。
   * 放在 core 而不是原型里 —— 它与「回合上限」「统率上限」同属对局规则常量。
   */
  TURN_SECONDS: 60,
};

/** 关键词表（implemented=false 表示引擎尚未实现，校验器会告警） */
/**
 * 关键词表（ADR-054：定义由设计者逐条给出，2026-09-12）
 *
 * `implemented: false` 表示**定义已定、引擎尚未实现**——校验器会对使用者告警，
 * 避免"卡面写了但实际不生效"的静默白板。
 */
export const KEYWORDS: Record<string, { name: string; implemented: boolean; note: string }> = {
  jia_dun:   { name: '架盾', implemented: true,
               note: '嘲讽：敌方普通攻击必须先打它（ADR-051）' },
  xian_gong: { name: '先攻', implemented: true,
               note: '入场当回合即可行动攻击（ADR-055 设计者澄清：这就是它的全部含义，与「疾行」是同一个）' },
  lian_ji:   { name: '连击', implemented: true,
               note: '当前回合普通攻击可执行 2 次' },
  yi_ji:     { name: '遗计', implemented: true,
               note: '类亡语：阵亡时触发该卡定义的 on_death 逻辑' },
  yin_xue:   { name: '饮血', implemented: true,
               note: '对敌人造成的伤害，为该单位自身恢复等量生命（ADR-057 设计者定稿：回自己，不回主将）' },
  shen_she:  { name: '神射', implemented: false,
               note: '对随机敌人造成远程伤害，且不受对方攻击影响（待实现）' },
  qi_xi:     { name: '奇袭', implemented: false,
               note: '上场先隐身（不能被选定）；下回合可选择行动攻击，执行过行动后隐身消失（待实现）' },
  zhong_yi:  { name: '忠义', implemented: false,
               note: '免疫混乱、离间等状态（待实现。注：原实现误做成"阵亡触发亡语"，已纠正）' },
  zhan_ji:   { name: '战技', implemented: true,
               note: '每回合一次的主动技能；使用后本回合不能再次使用该技能' },
  ji_li:     { name: '激励', implemented: true,
               note: '己方主公技完成结算后触发；具体收益由卡牌技能定义' },
  ju_du:     { name: '剧毒', implemented: true,
               note: '该单位造成伤害并实际命中后，直接消灭受伤单位（只对场上单位生效，**对主将无效**）' },
};

/** 已取消的关键词（保留列表以免数据误用） */
export const RETIRED_KEYWORDS: Record<string, string> = {
  ji_xing: '疾行 —— 与「先攻」是同一个东西（设计者裁定），已合并，请改用 xian_gong',
  fang_jian: '放箭 —— 已改为带有「放箭」技能名的战技，不再作为自动触发关键词',
  sheng_dun: '圣盾 —— 关键词已删除；一次伤害免疫保留为内部状态 sheng_dun_status',
  wu_shuang: '无双 —— 设计者：暂时没有这个状态',
  wu_sheng: '武圣 —— 设计者：废弃此名（关羽的技能名用「水淹七军」）；一次伤害免疫改由内部状态承载',
  jie_zhen: '结阵 —— 设计者：移除该效果（引擎里"相邻有友方步兵时 +1 攻"是 AI 自己推的，从未被设计）',
};


/**
 * 归属标签注册表（ADR-029）
 * 与关键词/状态同理：数据里引用未注册的标签，校验直接报错。
 */
export const TAGS: Record<string, { name: string; note: string }> = {
  xi_liang:  { name: '西凉', note: '西凉出身：马腾、马超、马岱' },
  man_zu:    { name: '南蛮', note: '南方异族：沙摩柯' },
  huang_jin: { name: '黄巾', note: '黄巾军出身或其旧部' },
  // 黄巾统领：黄巾兵「黄巾众」按已方统领数量成长（ADR-120）。只算张角/张宝/张梁三位首领，
  // 不含周仓、张燕等「黄巾旧部」—— 故不能复用 huang_jin 标签（黄巾兵自己就带它，会自我循环）。
  huang_jin_tongling: { name: '黄巾统领', note: '黄巾首领：张角、张宝、张梁' },
  // 黄巾众：黄巾的兵众（黄巾兵衍生物 + 黄巾力士）—— 统领上场时给它们永久 +1/+1（ADR-121）。
  // 与 huang_jin 分开：统领自己也带 huang_jin，不能拿它当「被统领带领的兵」的判据。
  huang_jin_zhong: { name: '黄巾众', note: '黄巾兵衍生物与黄巾力士' },
  // 袁氏（ADR-143）：**袁绍体系统一用这一个标签** —— 袁绍本人 + 他召唤的士族兵 + 将来的袁术。
  // ⚠️ 旧的 `shi_zu`（士族）**已作废删除**：它是早期设计，与袁氏体系重复且没有别的门阀在用。
  yuan_shi:  { name: '袁氏', note: '袁绍体系：袁绍、士族兵（袁术待入库）' },
  cao_clan:  { name: '曹氏宗亲', note: '曹操宗族人物：曹昂、曹休、曹彰、曹仁、曹丕等' },
  sun_clan:  { name: '孙氏宗亲', note: '孙氏宗亲人物：孙坚、孙策、孙尚香、孙翊及其后继者' },
  machine_attackable: { name: '可攻击军械', note: '允许指定军械进行普通攻击' },
};

export const FORBIDDEN_KEYWORD_COMBOS: string[][] = [
  ['jia_dun', 'qi_xi'],
];

/**
 * 状态能力（ADR-034）
 *
 * 引擎**只查能力、不认状态 id**——新增状态只需在数据里声明能力，无需改代码。
 */
export type StatusCap =
  | 'block_attack'      // 不能普通攻击
  | 'block_skill'       // 不能使用主动技
  | 'block_summon'      // 不能召唤武将和兵种
  | 'block_action'      // 完全无法行动（攻击与技能都封）
  | 'untargetable'      // 不能被指定为目标（含攻击与效果）
  | 'random_target'     // 攻击与技能的目标在**全场**随机（混乱）
  | 'immune_debuff'     // 免疫负面状态（负面 debuff 施加无效）
  | 'immune_control'    // 免疫震慑、禁锢、无法攻击等行动控制
  | 'immune_damage'     // 免疫伤害（一次性，触发后消耗）
  | 'immune_all_damage' // 当前回合免疫所有伤害，不消耗
  | 'break_on_fire'     // 受到火攻时立即失效（如铁锁）
  | 'redirect_damage'   // 伤害重定向：伤害转由状态的 srcUid 承受（ADR-039）
  | 'block_lord_skill'  // 该方主帅不能使用主公技（ADR-040）
  | 'extra_lord_skill'   // 该方主帅每回合主公技次数 +stacks（ADR-040）
  | 'block_draw'         // 该方不能抽牌（灾年，ADR-041）
  | 'duel_lock'          // 单挑锁定：不可被第三方选中（许褚，ADR-041）
  | 'mark_damage'        // 被标记：受到伤害时触发标记者的联动（法正，ADR-041）
  | 'water_damage'       // 水攻伤害加成
  | 'fire_damage'        // 直接火攻伤害加成
  | 'fire_damage_ready'  // 下一次直接火攻伤害加成，消耗全部层数
  | 'water_convert'      // 将来源的物理/无属性伤害转为水攻
  | 'attack_zero'        // 攻击力固定为 0
  | 'future_summon'      // 后续召唤的单位获得预设强化
  | 'die_at_turn_end'    // 当前回合结束时消灭
  // 受伤侧减伤 / 反伤（ADR-108 藤甲兵）—— 此前引擎只在「发起伤害」侧读 damage_type，
  // 受伤侧拿不到属性，这三个能力是藤甲「刀枪不入、遇火即燃」的实现载体。
  // 技能**触发概率**的覆盖（ADR-150，木鹿大王「象兵统领」）：象兵「象阵」写死 50% 震慑，
  // 木鹿在场时要把这个概率抬到 100% —— 概率不在"某状态"上，所以它是**无状态覆盖**。
  | 'proc_chance'        // 该单位技能的 `chance` 一律按此值结算（1 = 必定触发）
  | 'reduce_physical'    // 受到普通/无属性伤害时 −N（最低 0）
  | 'vulnerable_fire'    // 受到火属性伤害时 +N
  | 'thorns'             // 本次实际受伤后，伤害来源反弹 N 点
  | 'reduce_troop_damage' // 受到兵种伤害 −N
  | 'thorns_machine'     // 受到军械伤害后反伤军械 N 点
  | 'immune_water_damage' // 免疫水攻伤害
  // 水困（ADR-116/132）：火惩罚「存在」（每回合掉血），水惩罚「行动」（动就掉血）。
  // 这一条是行动税的实现载体 —— 引擎在 attack() / useUnitSkill() 两处检查。
  // 扣血量 = `2^(阶段-1)`（阶段 = 该状态层数），故读的是**每个状态自己的层数**。
  | 'damage_on_action'   // 该单位主动行动（普攻/主动技）时额外受到 2^(层数-1) 点水攻伤害
  // 回合开始时结算的持续伤害（ADR-116 立项，ADR-132 起只剩火这一条、且移到回合开始）。
  // 按能力驱动，**不再按状态 id 硬编码** —— 原先 resolveTurnEndStatuses 写死 `zhong_du`，新增状态必漏。
  | 'dot_fire'           // 该方**回合开始时**受 N 点火属性伤害（N = 层数）
  // 回合末的两段结算（ADR-132）：中毒（削上限）→ 水困（阶段推进）。
  // 两者都是**能力**，`resolveTurnEndStatuses` 分两趟跑，顺序与状态插入顺序无关。
  // （灼烧已不在回合末：它是回合开始的第一步，见上面的 `dot_fire`。）
  | 'shrink_max_hp'      // 回合结束时**永久降低 N 点生命上限**（N = 层数，中毒；不造成伤害）
  | 'stage_up'           // 回合结束时**阶段 +1**（层数＝阶段；水困，用于 2^(阶段-1) 的行动税）
  | 'xu_mou'             // 蓄谋层数（司马懿）
  | 'skip_turn';         // 该方整个回合被跳过（ADR-074，休养生息「下一回合不进行任何活动」）

export interface StatusDef {
  name: string;
  kind: 'buff' | 'debuff';
  numeric: boolean;
  duration: 'permanent' | 'turns' | 'until_consumed' | 'conditional' | 'this_turn' | 'until_enemy_turn_end';
  scope?: 'character' | 'lord';
  note: string;
  caps?: StatusCap[];    // 能力列表：引擎据此判定行为
  /**
   * 数值型状态的**层数上限**（ADR-117 中毒）。
   *
   * 在 `applyStatus` 施加时就夹紧 —— 不是在结算时夹 —— 否则卡面徽章会显示
   * 「中毒 5」而实际只结算 3 点，玩家无法从界面推断伤害（ADR-116 的减益徽章
   * 直接显示层数，见 GDD 10 §3.2.2 实测记录）。
   * 未声明 = 不封顶（灼烧/水困/中毒等都不封顶，ADR-132）。
   */
  max_stacks?: number;
  /**
   * 重复施加时的**层数合并方式**（ADR-132）。
   *
   *   · `'add'`（默认）—— 层数累加（灼烧：再烧一次就多 1 层）
   *   · `'max'`         —— 取较大者，**不降级**（水困：层数＝阶段，连续施加不能让阶段倒退；
   *                        若用累加，2 费卡连发两次就能把阶段顶到 4 → 行动一次掉 8 点）
   *
   * 只影响 `numeric: true` 的状态；标志型（numeric: false）本就只判"存在与否"。
   */
  stack_mode?: 'add' | 'max';
  /** 满血治疗后补回一层的充能状态（如周泰「不屈」）。 */
  replenish_on_full_health?: boolean;
  /**
   * 守护范围（ADR-071）：只有这个状态挂在**谁**身上、以及它拦截**谁**的伤害。
   *   · 'any'（默认）—— `shou_hu`：被守护者受到的伤害都转给 srcUid（陈宫「忠烈」）
   *   · 'lord'        —— `hu_zhu`：只有**该方主帅**受到的伤害才转给 srcUid（祖茂「替主」）
   * 见 `mutate.findGuard` / `mutate.findLordGuard`。
   */
  guard_scope?: 'any' | 'lord';
}

export const STATUSES: Record<string, StatusDef> = {
  zhen_fen:   { name: '振奋', kind: 'buff',   numeric: true,  duration: 'permanent', note: '攻击 +N' },
  ji_jiu:     { name: '急救', kind: 'buff',   numeric: true,  duration: 'permanent', note: '回合开始恢复 N 点生命' },
  jia_dun_status: { name: '架盾', kind: 'buff',   numeric: false, duration: 'conditional', note: '嘲讽（ADR-051）' },
  xian_gong_status: { name: '先攻', kind: 'buff',   numeric: false, duration: 'permanent',
                note: '入场当回合即可行动攻击（ADR-055）' },
  qi_xi_status: { name: '奇袭', kind: 'buff',   numeric: false, duration: 'until_consumed', note: '不能被指定为目标' },
  sheng_dun_status:   { name: '披坚', kind: 'buff',   numeric: false, duration: 'until_consumed', caps: ['immune_damage'],
                note: '披坚：免疫一次伤害（原「圣盾」，ADR-103 起不再是公开关键词；触发后消耗）' },
  hu_jia:     { name: '护甲', kind: 'buff',   numeric: true,  duration: 'permanent', scope: 'lord', note: '吸收伤害' },
  zhen_she:   { name: '震慑', kind: 'debuff', numeric: false, duration: 'turns', caps: ['block_action'],
                note: '不能普攻，也不能使用主动技' },
  hun_luan:   { name: '混乱', kind: 'debuff', numeric: false, duration: 'turns', caps: ['random_target'],
                note: '普攻与主动技的目标在**全场**中随机（不分敌我）' },
  zhen_wang:  { name: '阵亡标记', kind: 'debuff', numeric: false, duration: 'permanent',
                note: '被标记：阵亡时为标记者触发效果' },
  duan_chou:  { name: '断抽', kind: 'debuff', numeric: false, duration: 'turns', caps: ['block_draw'],
                note: '该方本回合不能抽牌' },
  jue_dou:    { name: '决斗', kind: 'debuff', numeric: false, duration: 'turns', caps: ['duel_lock'],
                note: '单挑中：第三方无法对其出手' },
  chou_di:    { name: '仇敌', kind: 'debuff', numeric: false, duration: 'permanent', caps: ['mark_damage'],
                note: '被法正标记：受到伤害时为其指定友方回血' },
  jin_yan:    { name: '进言', kind: 'debuff', numeric: false, duration: 'turns', caps: ['block_lord_skill'],
                note: '该方主帅不能使用主公技' },
  can_mou:    { name: '参谋', kind: 'buff',   numeric: true,  duration: 'permanent', scope: 'lord',
                caps: ['extra_lord_skill'], note: '该方主帅每回合主公技次数 +N' },
  shou_hu:    { name: '守护', kind: 'buff',   numeric: false, duration: 'permanent', caps: ['redirect_damage'],
                guard_scope: 'any',
                note: '受到的伤害转由守护者承受（援护/分担/护驾共用）' },
  hu_zhu:     { name: '护主', kind: 'buff',   numeric: false, duration: 'turns', caps: ['redirect_damage'],
                guard_scope: 'lord',
                note: '只把**该方主帅**受到的伤害转给守护者（祖茂「替主」，ADR-071）' },
  kong_cheng: { name: '空城', kind: 'buff',   numeric: false, duration: 'turns', scope: 'lord',
                caps: ['untargetable', 'immune_all_damage'],
                note: '该方主帅**不能被普通攻击指定为目标**，且**免疫一切伤害**（空城计，ADR-074 / ADR-156）。'
                    + '⚠️ 跨回合的主公免疫只能靠它 —— `mian_shang` 是 `this_turn`，撑不过当前半回合' },
  xiu_zheng:  { name: '休整', kind: 'debuff', numeric: false, duration: 'until_consumed', scope: 'lord',
                caps: ['skip_turn'],
                note: '该方下一个回合整个被跳过（休养生息「下一回合不进行任何活动」，ADR-074）' },
  jin_yong:   { name: '禁用', kind: 'debuff', numeric: false, duration: 'turns', caps: ['block_skill'],
                note: '不能使用主动技与触发技（silence）' },
  jin_gu:     { name: '禁锢', kind: 'debuff', numeric: false, duration: 'turns',
                caps: ['block_attack', 'block_skill'],
                note: '不能普攻也不能用主动技（陈宫「忠烈」对敌军分支，ADR-069）' },
  jin_gong:   { name: '无法攻击', kind: 'debuff', numeric: false, duration: 'turns',
                caps: ['block_attack'],
                note: '本回合不能普通攻击' },
  wei_cheng_suo: { name: '围城封锁', kind: 'debuff', numeric: false, duration: 'until_enemy_turn_end', scope: 'lord',
                caps: ['block_summon'], note: '下个敌方回合不能召唤武将和兵种' },
  yi_dao_qian_zhi: { name: '夷道牵制', kind: 'debuff', numeric: false, duration: 'permanent',
                caps: ['block_action'], note: '与孙桓互相牵制，任一方阵亡时解除' },
  he_bing_target: { name: '合兵目标', kind: 'debuff', numeric: false, duration: 'this_turn',
                note: '李典本回合强化己方武将对该目标的普通攻击' },
  si_zhan: { name: '死战', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['immune_debuff', 'immune_control'], note: '庞德锁定死敌后免疫行动控制' },
  yin_cheng: { name: '因敌制变', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['reduce_troop_damage', 'thorns_machine'], note: '郝昭针对兵种和军械的守城防御' },
  jiang_fang: { name: '江防', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['immune_water_damage'], note: '己方单位免疫水攻伤害' },
  fire_gong_ready: { name: '火攻准备', kind: 'buff', numeric: true, duration: 'until_consumed',
                caps: ['fire_damage_ready'], note: '下一次直接火攻伤害增加N点' },
  zhuran_skill_lock: { name: '截江封技', kind: 'debuff', numeric: false, duration: 'until_enemy_turn_end',
                caps: ['block_skill'], note: '战技被封锁至敌方下个回合结束' },
  zhuran_lord_lock: { name: '截江封主公技', kind: 'debuff', numeric: false, duration: 'until_enemy_turn_end', scope: 'lord',
                caps: ['block_lord_skill'], note: '主公技被封锁至敌方下个回合结束' },
  ku_rou_fire_ready: { name: '苦肉火计', kind: 'buff', numeric: false, duration: 'until_enemy_turn_end',
                note: '下个敌方回合结束时触发火攻' },
  pi_kun:     { name: '疲困', kind: 'debuff', numeric: false, duration: 'permanent', note: '朱桓与其战斗时攻击力+2' },
  attack_zero: { name: '伏击压制', kind: 'debuff', numeric: false, duration: 'conditional',
                caps: ['attack_zero'], note: '攻击力固定为 0，恢复满生命时解除' },
  water_convert: { name: '水军转攻', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['water_convert'], note: '来源的物理/无属性伤害改为水攻' },
  dingfeng_aura: { name: '雪中突袭', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['future_summon'], note: '后续召唤的单位获得先攻但攻血各降低1' },
  iron_lock: { name: '铁锁', kind: 'buff', numeric: false, duration: 'permanent',
                caps: ['immune_all_damage', 'break_on_fire'], note: '免疫伤害；受到火攻时失效' },
  die_at_turn_end: { name: '断后', kind: 'debuff', numeric: false, duration: 'this_turn',
                caps: ['die_at_turn_end'], note: '本回合结束时阵亡' },
  shui_gong_bonus: { name: '水攻强化', kind: 'buff', numeric: true, duration: 'permanent',
                caps: ['water_damage'], note: '水攻伤害 +N' },
  fire_gong_bonus: { name: '火攻强化', kind: 'buff', numeric: true, duration: 'permanent',
                caps: ['fire_damage'], note: '直接火攻伤害 +N' },
  yin_huo:      { name: '引火', kind: 'debuff', numeric: false, duration: 'permanent',
                note: '陆逊火烧连营的引火标记' },
  jiao_kuang:   { name: '骄狂', kind: 'buff', numeric: true, duration: 'permanent',
                note: '诸葛恪回合结束时按层数弃牌并发动乱击' },
  zi_liang:     { name: '资粮', kind: 'buff', numeric: true, duration: 'permanent', max_stacks: 3,
                note: '鲁肃仗义疏财的可用次数' },
  teng_jia:   { name: '藤甲', kind: 'buff', numeric: true, duration: 'permanent',
                caps: ['reduce_physical', 'vulnerable_fire'],
                note: '受到普通/无属性伤害 −N（最低 0），受到火属性伤害 +N（ADR-108；ADR-110 删反伤层）' },
  zhong_yong_status: { name: '忠勇', kind: 'buff', numeric: true, duration: 'permanent',
                caps: ['thorns'],
                note: '受到**普通攻击**并实际受伤后，对攻击者额外造成 N 点伤害（与自动反击分开结算；技能伤害不触发）。ADR-110 释放的 thorns cap 的首个使用者' },
  xu_mou:     { name: '蓄谋', kind: 'buff', numeric: true, duration: 'permanent', max_stacks: 3,
                note: '司马懿未行动时积累；行动并造成伤害后转为范围伤害' },
  bu_qu:      { name: '不屈', kind: 'buff', numeric: true, duration: 'until_consumed',
                replenish_on_full_health: true, note: '受到致命伤害时消耗一层并保留1点生命；恢复满血后补回一层' },
  shui_kun:   { name: '水困', kind: 'debuff', numeric: true, duration: 'permanent',
                caps: ['damage_on_action', 'stage_up'], stack_mode: 'max',
                note: '**层数＝阶段**（徽章上的数字就是阶段）。① 只有**主动行动**（普攻/主动技）才受水伤，数值 = 2^(阶段-1)：阶段 1/2/3/4 → 1/2/4/8，**无上限**；不行动则完全不受伤 ② 阶段在该方**回合结束时 +1**（施加当回合为阶段 1）③ **永久**，直到被净化；重复施加取较大者、不降级。见 GDD 10 §3.2.2（ADR-116/132）' },
  mian_shang: { name: '免伤', kind: 'buff', numeric: false, duration: 'this_turn', caps: ['immune_all_damage'], scope: 'lord', note: '当前回合免疫所有伤害' },
  mian_yi:    { name: '免疫', kind: 'buff',   numeric: false, duration: 'turns', caps: ['immune_debuff', 'untargetable'],
                note: '免疫负面状态，且不能被指定为目标' },
  fan_mian:   { name: '翻面', kind: 'debuff', numeric: false, duration: 'conditional',
                caps: ['block_action', 'untargetable'],
                note: '被翻面：当回合不能行动、不能被指定为目标；自己的下个回合开始时翻回正面（ADR-059）' },
  // ADR-117 拆名：zhuo_shao = 火（永久、不封顶）；zhong_du = 毒。
  // ADR-132 重做：灼烧时机由"回合末"改到"**回合开始**"（三系节奏错开）；
  //               中毒不再是"回合末受 N 点毒伤"，改为"回合末**永久降低 N 点生命上限**"。
  zhuo_shao:  { name: '灼烧', kind: 'debuff', numeric: true,  duration: 'permanent',
                caps: ['dot_fire'],
                note: '该方**回合开始时**受 N 点火属性伤害（N = 层数）—— 回合的第一步，早于统率回满/抽牌/任何行动；层数叠加**不封顶**、**永久**（可净化，不自然到期）。**来源：对敌方释放的火攻效果各 +1 层**（ADR-134，挂在效果层见 `effects.ts` 的 damage 分支）—— 每次火攻效果各算一次、与伤害数值无关，火攻被减到 0 也照挂；**打自己人/自身不挂**（蒙冲斗舰自损段只掉血），**DoT 跳伤本身不计**（否则每回合自我叠层、无限增长）。三系节奏：回合开始＝灼烧（火）／行动时＝水困（水）／回合结束＝中毒（毒）。（ADR-108 起按 fire 结算；ADR-116 起由 dot_fire 能力驱动；ADR-117 由 zhong_du 改名；ADR-132 改时机；ADR-134 全局挂层）' },
  zhong_du:   { name: '中毒', kind: 'debuff', numeric: true,  duration: 'permanent',
                caps: ['shrink_max_hp'],
                note: '该方回合结束时**永久降低 N 点生命上限**（N = 层数，ADR-132）；**不造成伤害**；层数叠加**不封顶**、**永久**（净化后停止，已削的不恢复）。削完当前生命高于新上限则夹到新上限，上限归零即阵亡。只有场上单位会中毒，主公免疫（ADR-117）' },
  xu_ruo:     { name: '虚弱', kind: 'debuff', numeric: true,  duration: 'turns', note: '攻击 −N' },
  duan_liang: { name: '断粮', kind: 'debuff', numeric: true,  duration: 'turns', scope: 'lord', note: '统率上限 −N' },
};

export const TIMING = {
  TURN_START: 'turn_start',
  DRAW: 'draw',
  ON_PLAY: 'on_play',
  ON_DEATH: 'on_death',
  ON_DAMAGED: 'on_damaged',
  TURN_END: 'turn_end',
  ENEMY_TURN_END: 'enemy_turn_end',
  ENEMY_TURN_START: 'enemy_turn_start',
  ON_ATTACK: 'on_attack',
  AFTER_ATTACK: 'after_attack',
  ON_LORD_DAMAGED: 'on_lord_damaged',
  ON_DEFEND: 'on_defend',
  ON_LETHAL: 'on_lethal',
  ON_CARD_PLAYED: 'on_card_played',
  ON_MARK_DAMAGED: 'on_mark_damaged',
  ON_MARK_DEATH: 'on_mark_death',
  ON_KILL: 'on_kill',          // 击杀者视角：每次击杀时（ADR-070）
} as const;

export const ACTIONS = [
  'damage', 'heal', 'draw', 'summon', 'apply_status', 'remove_status',
  'move', 'destroy', 'modify', 'gain_armor', 'gain_command', 'cost_modifier', 'transform', 'random_pick',
  'discard', 'return_to_hand', 'clash', 'flip', 'scry', 'ban_play', 'steal_card', 'survive',
  'extra_attack', 'take_control', 'copy_skill', 'force_attack', 'duel',
  'attack_bonus',  // 普通攻击结算前的临时伤害加成
  'cast_random',   // 从卡池随机取 N 张直接释放（ADR-162，庞统「连环」）
  'add_to_deck',   // 往牌库随机位置塞 N 张指定卡（ADR-050）
  'send_to_deck',  // 把牌库里剩下的指定牌全塞给对方（ADR-050）
  'cycle_to_deck', // 手牌放回牌库随机位置再抽 1 张（ADR-050）
  'sacrifice',     // 牺牲一个己方单位，把它的 maxHp/hp 写进 flags（ADR-071，程昱）
  'attack_each',   // 挨个发动**真正的普攻**（含反击），自己阵亡即停（ADR-071，张苞）
  'draw_until',    // 一直抽到抽出一张「非某类型」的牌为止（ADR-071，姜维）
  'roll',          // 生成可供后续 condition.roll 读取的确定性概率结果
  'mill',          // 弃掉目标方牌库的 N 张牌（ADR-074，司马懿「谋定后动」②）
  'discover',      // 从牌库随机展示候选牌并由玩家选择（曹丕）
  'draw_random',   // 从牌库随机取一张符合条件的牌加入手牌
  'discover_tactic_pair', // 弃置一张战法后按其费用随机获得两张指定阵营可构筑战法（曹冲）
  'send_hand_to_deck', // 把一张手牌放回牌库顶/底/随机位置，**不抽牌**（ADR-139，杨仪「筹度粮谷」）
  'self_to_hand',      // 阵亡后把手牌重建出来（ADR-141，孟获「蛮王」——亡语作用于**阵亡单位自身**）
  'defect_to_deck',    // 叛变：阵亡后换成另一张卡进对手牌库随机位置（ADR-174，糜芳「叛迎」）
  'deploy_from_hand',  // 手牌 → 场上（免费，按 card_id 精准搬牌；ADR-149，诸葛瞻/诸葛尚「同赴」）
  'discard_status_count', // 按状态层数弃牌，不足时铣牌库
  'override_rule',     // 覆盖**无状态**的规则档位（ADR-150，木鹿大王「象兵统领」抬概率）
  'override_status',   // 覆盖目标身上某状态的若干档位（ADR-142，兀突骨「藤甲统率」）
  'summon_random',     // 从候选列表随机召唤一个单位
  'reveal_hand',       // 观察对手手牌中的指定费用牌（孙韶）
  'chain_damage',      // 从起火点沿相邻站位向外传播伤害（陆逊）
  'grant_hand',    // 强化一张手牌
  'replace_lord',  // 清除指定标签并替换主公
] as const;

/** 稀有度（ADR-068）：普通 / 精英。精英卡允许强于同费预算 */
export const RARITIES = ['common', 'elite'] as const;

export const CARD_TYPES = ['troop', 'general', 'strategist', 'machine', 'event', 'tactic', 'elite', 'special',
  'lord',     // 主将卡：开局置于主将位，不进卡组（ADR-044）
  'token',    // 衍生物：只能由效果召唤，不可组入卡组（ADR-044）
  'status',   // 状态卡：持续性全局效果，置于状态区（ADR-044）
] as const;

/** 不可组入卡组的类型（由规则或效果放入场） */
export const NON_DECK_TYPES = ['elite', 'lord', 'token', 'status', 'special'] as const;
