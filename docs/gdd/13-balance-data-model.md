# 13 · 数值模型与数据格式

攻击击杀奖励可组合 `condition: { event: killed, victim_type: troop }`：普通攻击在伤害前记录目标类型，伤害交换结束且攻击者存活后判断击杀条件，避免阵亡目标离场后类型丢失。

同一个条件对象中的 `event` 与类型等限制须同时满足；事件匹配不能提前返回并跳过其他限制。

ADR-117 补充通用 DSL：

后续修订：`damage.bonus_vs_keyword: { keyword, value }` 对每个目标在伤害前独立判定关键词，将加成合并进本次伤害，不产生第二段伤害。霹雳车基础2点，对架盾目标单次3点；披坚免疫整段。主动技能显式选择必须属于技能合法目标池，非法目标在扣统率和消耗技能次数前拒绝。

ADR-119 同轮补充：`damage.bonus_vs_troop_kind: { troopKind, value }` 按被命中单位当前兵种判定额外伤害，普通兵与其同兵种升变形态共用判定；加成合并为单次伤害。原强弩营更名冀州强弩，2费1/2，随机对非主公敌方单位造成3点伤害，命中骑兵时单次4点；删除此前新增的3费1/3破盾弩手。青州兵劫掠改为 `clashMode: cost`，与敌方场上最高统率比较，胜利后夺取牌顶。主公只要拥有本回合攻击力即可普攻一次，这是通用规则，不绑定车下虎士。

- `attack_target.damaged: false/true`：本次攻击前目标是否受伤，只用于场上单位；满血 +1 攻为本次攻击加成，不永久增加。
- `after_attack`：普通攻击伤害交换及攻击次数记账完成后，攻击者存活才触发；`event: damaged` 表示本次普攻实际造成生命伤害（不沿用上次攻击的结果）。
- `steal_card` 的 `from_deck: top`：移走敌方牌顶并放入己方手牌，不复制、不触发抽到时技能，空牌库不产生粮尽。
- `summon` 的 `copy_source_stats: true`：召唤前记录来源当前攻击和生命，赋给衍生物；只复制攻血，不复制状态、技能或升变资格。右部衍生物保留对应的架盾/先攻，不再召唤右部。
- `target.filter.offset_from_chosen: 1/2`：选择目标所在排中右侧固定格子；空格跳过但不压缩距离。目标阵亡不改变已选坐标。
- `on_lord_damaged`：己方主公实际扣血后触发；`value_from_flag: lord_damage` 取实际生命损失（不含护甲吸收和过量伤害）。反射伤害使用 `damage_origin: reflected`，不再次触发主公受伤联动，避免双方互相无限反射。
- `mian_shang` 状态：当前回合免疫所有伤害，在该回合结束时清除，不是一次性披坚。披坚也可以施加给主公，免疫一次伤害且消耗后清除。

当前口径（ADR-119）：车下虎士为 3 费 3/4，架盾，亡语使主公当前回合 +2 攻/+2 甲；敢死营为 3 费 2/3，亡语随机对敌方角色（含主公）造成 2 点水攻；无难兵为 3 费 1/3，召唤同攻血右部；霹雳车、楼船军、蒙冲斗舰改为军械且无法普通攻击。楼船军选择目标不含主公，后续固定对敌方主公的 2 点水攻保留。完整定稿见 `07-troops.md`。

> ## ⚠️ 第 1~5 章（数值预算模型）已退役 —— ADR-092（2026-09-27）
>
> 「属性 + 关键词 + 技能 ≈ 2×费用+1」这套**预算闸门与 `value:` 核算块已整个删除**。
> 原因：它是按公式估算、**从未实机校准**的启发式（ADR-047 自己就写着"按度量算的，不是实机测的"），
> 遇到光环/发现/单挑这类机制估不准，反而会拦住设计者有意为之的数值
> —— 关羽/张飞/周瑜/蒋济/郭淮/姜维都只能靠 `rarity: elite` 豁免过闸。
>
> **现在**：`data/cards.yaml` 里不再有 `value:` 块，也没有任何脚本会写它；
> 「这张卡强不强」由设计者与实机测试判断。下面第 1~5 章保留作**历史与口径记录**
> （想恢复这套自检，见 ADR-043 / ADR-047 与 git 历史）。
>
> **第 6 章（卡牌 Schema）与第 7 章（效果 DSL）完全有效**，且第 6 章的 `value` 字段已移除。

> 状态：**已定**。本文件是 `core` 与内容管线的直接输入。

## 1. 总价值预算模型

> **总价值 = 属性点 + 关键词价值 + 技能价值 + 羁绊协同价值 − 负面代价**

### 1.1 为什么不是"费用绑定属性"

费用**不绑定属性**——高费卡可以是"低属性 + 强技能"，也可以是"高属性 + 无技能"。
费用绑定的是**总价值**，属性只是其中一个可分配项。

| 卡 | 属性点 | 技能/关键词 | 总价值 | 8 费基准 | 判定 |
|---|---|---|---|---|---|
| 路线 B：8 费 8/8 + 无双 | 16 | −2 | 18 | 17 | 超 1，可接受 |
| 路线 A：8 费 4/4 + 强力计略 | 8 | +9 | 17 | 17 | ✅ |

### 1.2 适用区分

| 卡类 | 定价方式 |
|---|---|
| 基础兵种卡（无技能） | **属性基准严格适用** |
| 人物卡（有技能/关键词） | **总价值预算适用**，属性可高可低 |
| 事件卡 / 战法卡 / 进化卡 | 按**等效效果价值**定价（见 §3） |

## 2. 属性点基准

> **白板属性点 ≈ 2 × 统率 + 1**

| 统率 | 基准属性点 | 典型白板 |
|---|---|---|
| 1 | 3 | 2/1、1/2 |
| 2 | 5 | 3/2、2/3 |
| 3 | 7 | 4/3、3/4 |
| 4 | 9 | 4/5、5/4 |
| 5 | 11 | 5/6、6/5 |
| 6 | 13 | 6/7、7/6 |
| 7 | 15 | 7/8、8/7 |
| 8 | 17 | 8/8 |
| 9 | 19 | 9/9 |
| 10 | 21 | 10/10 |

> 该曲线由《炉石传说》白板单位实测归纳，误差 ≤ 1 点。

## 3. 关键词价值表

| 关键词 | 价值 | 备注 |
|---|---|---|
| 神射 | −0.5 | 条件性 |
| 架盾 | −1 | 全局嘲讽 |
| 伤害免疫 | −1 | 免疫一次 |
| 先攻 | −1 | |
| 奇袭 | −1 | |
| 饮血 | −1 | |
| 疾行 | −1.5 | |
| 连击 | −1.5 | |
| 遗计 | −2 | 已含死亡概率折扣 |
| 无双 | −2 | |
| 忠义 | 视效果 | 按等效价值另算 |

**组合折扣**：多个关键词同时出现时，总价值 = 各关键词之和 × **0.9**。

## 4. 技能定价方法

```
技能价值 = 等效效果价值 × 触发概率 × 可互动折扣
```

### 4.1 等效效果价值

| 效果 | 价值 |
|---|---|
| 造成 N 点伤害 | N × 0.5 |
| 恢复 N 点生命 | N × 0.4 |
| 抽 1 张牌 | 3 |
| 召唤 1/1 | 3 |
| 召唤 2/2 | 5 |
| 使目标无法行动 1 回合（震慑） | 4–6（视目标强度） |
| 全体 +1 攻击（光环） | 受益单位数 × 1 |
| 获得 1 点护甲 | 1 |

### 4.2 触发概率

| 触发类型 | 概率 |
|---|---|
| 入场（战吼） | 100% |
| 回合开始（需存活） | ~70% |
| 回合结束（需存活） | ~70% |
| 阵亡（需死亡） | ~60% |
| 受到伤害后 | 视对局而定，默认 60% |

### 4.3 可互动折扣

| 情形 | 折扣 |
|---|---|
| 技能可被震慑/移除打断 | ×0.8 |
| 技能需要铺垫（如先满足某条件） | ×0.8 |
| 技能目标由对手选择 | ×0.7 |
| 技能必然生效且无法反制 | ×1.0（并需警惕超模） |

## 5. 校验规则（CI 自动检查）

数据校验器需在 CI 中执行以下检查：

| # | 检查 | 失败处理 |
|---|---|---|
| 1 | 总价值超出同费预算 ±1.5 点 | 警告 |
| 2 | 总价值超出 ±3 点 | **报错，阻止合并** |
| 3 | 卡名长度 > 4 字 | 报错 |
| 4 | 非法关键词组合（架盾 + 奇袭） | 报错 |
| 5 | 谋臣卡攻击力 ≠ 0 | 报错 |
| 6 | 进化卡目标兵种不存在 | 报错 |
| 7 | 羁绊引用的人物 id 不存在 | 报错 |
| 8 | 效果引用了未注册的 action / status | 报错 |
| 9 | 缺少 `memo`（一句话记忆点） | 警告 |
| 10 | 同一阵营同类卡数量失衡（超过均值 ±50%） | 警告 |

## 6. 卡牌 Schema

```yaml
# data/cards.yaml（ADR-091 起为唯一手写真源；ADR-092 起无 value 块）
- id: shu_infantry              # 必填，唯一
  name: 步兵                    # 必填，≤4 字
  faction: neutral              # shu | wei | wu | qun | neutral
  type: troop                   # troop | general | strategist | event | tactic | elite
  cost: 1                       # 0-10
  attack: 2                     # 人物卡必填
  health: 1                     # 人物卡必填
  keywords: [jie_zhen]          # 关键词 id
  upgradeFrom: infantry         # 仅特种兵可填；表示允许由该类普通兵升变
  skills: []                    # 技能定义
  bonds: []                     # 羁绊 id
  memo: "相邻有步兵时攻击 +1"     # 必填，设计用
  flavor: "盾如铁壁，寸步不让。"     # 可选，收藏页显示
```

### 6.1 非人物卡

```yaml
- id: tactic_huogong
  name: 火攻
  faction: neutral
  type: tactic
  cost: 3
  target:
    side: enemy
    filter: { type: character }
    count: 1
    mode: choose
  effects:
    - action: damage
      value: 4
  memo: "3 费 4 点单体伤害"
```

### 6.2 进化卡

```yaml
- id: elite_hubaogi
  name: 虎骑营
  faction: wei
  type: elite
  cost: 3
  upgradeTarget:
    from: { type: troop, troopKind: infantry, side: ally }
    to:
      id: wei_tiger_cavalry
      name: 虎骑营
      attack: 3
      health: 2
      keywords: [xian_gong]
  memo: "把步兵变成先攻骑兵"
```

### 6.3 升变的统率费用（ADR-133，纯规则、无新字段）

玩家确认的兵种升变（`UPGRADE_UNIT`）按**印刷费用差**消耗当前回合统率：

```
d = 目标特种兵卡的 cost − 该单位当前卡的 cost        # 都取 CardDef.cost（印刷费用）
升变统率费用 = max(0, d − 1)                        # d ≤ 1 =「自然升级」= 0 统率；d = 2 → 1；d = 3 → 2
```

- **没有任何新的 YAML 字段**：费用由引擎按两张卡的既有 `cost` 现算（唯一真源 `upgradeCommandCost`，`core/src/engine.ts`），
  所以 `data/*.yaml` **零改动**；调费即自动改价，不需要维护对照表。
- 判定**先于扣除**：`command.cur` 不足 → 动作被拒（不扣统率、不换形态、不派发战吼）。
- `upgradeStatus()` 的候选带 `commandCost`（与实扣同源；`0` 即「自然升级」）与 `affordable`；`ready` 只表示进度条件。
- 流程与设计口径见 `03-turn-flow.md` §2.3、`07-troops.md` §2.2。

## 7. 效果 DSL

### 7.1 结构

```yaml
effects:
  - action: <动作>
    target: <选择器>
    value: <数值>
    duration: <持续>
    condition: <条件>
```

**`duration` 的取值**（ADR-089）：

| 写法 | 含义 | 典型用途 |
|---|---|---|
| 数字 `N` | **N 个自己回合**（在自己回合结束时递减，减到 0 清除） | 「虚弱 2 回合」 |
| `this_turn` | 同 `1`，只到本回合结束 | 「本回合 +1 攻」 |
| `until_next_turn` | 1 回合，但**施加当回合不递减** | 陈宫「忠烈」的守护 |
| 省略 | 永久 / 直到被消耗（看状态定义） | 架盾、伤害免疫 |

> `until_next_turn` 为什么必须单独存在：状态是在**自己回合**施加的，而守护类效果
> 要挡的恰恰是**对手回合**的伤害。按 `duration: 1` 会在自己回合结束时就减到 0 被清掉，
> 玩家看到的就是「陈宫明明说替我承伤，结果还是我自己掉血」。
> 祖茂「护主」（ADR-071）踩过同一个坑，那次是靠光环接管生命周期绕过去的。
> 注意它只影响**该状态自己**：刘封「犹豫不决·本回合无法行动」仍然用 `1`。

**决斗锁定**（`jue_dou`，许褚「虎痴」）在两条路径上都要拦：
效果选目标（`resolveTargets`）与**普通攻击**（`legalTargets`）。
ADR-089 之前只拦了前者，于是「分出胜负前其他人无法对两人进行攻击」完全没生效。

### 7.2 动作表

| action | 参数 | 说明 |
|---|---|---|
| `damage` | value, damage_type | 造成伤害；`damage_type: fire` 时**自动对该次伤害的目标挂 1 层灼烧**（ADR-134，见下） |
| `chain_damage` | value, damage_type, target | 以一个敌方单位为起火点，沿同一排左右相邻且连续的敌方单位传播伤害；起火点不受伤害，每个目标在本次结算中最多受伤一次（陆逊「火烧连营」） |
| `draw_random` | target.filter | 从己方牌库随机取出一张符合筛选条件的牌加入手牌，不暂停等待选择（魏国「求贤令」） |
| `heal` | value | 恢复生命（≤30） |
| `draw` | value | 抽牌 |
| `summon` | unit, count, position | 召唤人物卡 |
| `apply_status` | status, stacks, duration | 施加状态 |
| `remove_status` | status | 移除状态 |
| `move` | target, target2, move_bonus | 将指定单位移动到空位；支持第二目标选择器指定目的格。`move_bonus: facing_type` 按移动后正对的敌方单位类型给予强化：武将 +2 生命、谋臣 +2 攻击、其他情况 +1/+1（张郃「巧变」） |
| `destroy` | — | 直接摧毁 |
| `modify` | attack / health, value, duration | 属性修正（数值用 `modify`，规则级加强用 `override_status`）。**目标可以是手牌**（ADR-141）：手牌没有派生属性，改写 `HandMod.kind: 'attack' / 'health'`，在**打出时**由 `engine.playCard` 一次性结算到单位身上。⚠️ 带 `auraId` 的（光环施加，如孟获「蛮王」给手牌里的蛮族 +2/+2）**不跟着进场**；不带的是永久代价（孟获每次收回的 −1 血上限） |
| `gain_armor` | value | 获得护甲（主将） |
| `cost_modifier` | value, limit | 费用修正（作用于手牌 → 写 `HandMod.kind: 'cost'`） |
| `transform` | to | 变形/进化（技能效果直接执行） |
| `upgrade` | to | 玩家确认的兵种升变；目标卡只需存在于卡池，不消耗牌库/手牌 |
| `attack_bonus` | value、condition | 本次普通攻击临时增加伤害，不改变单位属性；可按攻击目标及双方主公生命比较设置条件 |
| `random_pick` | from, count | 随机选择 |
| `sacrifice` | target | **牺牲**己方单位，并把它的 `maxHp` / 当前 `hp` 写进 `ctx.flags`（ADR-071，程昱） |
| `attack_each` | target | 对目标集**挨个发动真正的普通攻击**（含反击），自己阵亡即停（ADR-071，张苞） |
| `draw_until` | until_not_type | 一直抽，直到抽出一张不是该类型的牌（ADR-071，姜维） |
| `mill` | count, from_deck | 弃掉目标方**牌库**的 N 张（ADR-074，司马懿②「使敌方卡池随机丢弃一张」）|

> 动作分两张表：`ACTIONS` 只是**注册表**，`IMPLEMENTED_ACTIONS`（`core/src/effects.ts`）
> 才是**已实现**。两者不一致时用该动作的卡会**静默空转**（华佗的 `remove_status` 就这样
> 空转过一整轮）。`validate` 现在逐卡核对并直接报 error。

### 7.3 目标选择器

```yaml
target:
  side: ally | enemy | both | self      # 阵营（self = 来源方阵营）
  zone: board | hand | both             # 作用区域，默认 board；both = 手牌 + 场上（ADR-071）
  source: true                          # 只选「来源单位自身」（ADR-033）
  pick: 1 | 2                           # 取玩家的第几个选择（ADR-071，见 §7.11）
  lord: true                            # 选该方主帅
  event: killer | victim                # 本次事件里的另一方单位（ADR-070）
  filter:                               # 过滤条件
    type: troop | general | strategist | character
    keyword: xian_gong
    tag: xi_liang                       # 归属标签（见 §7.5）
    faction: shu
    gender: male | female | unknown     # 性别（ADR-071，见 §7.11）
    lane: 1-5
    row: front | back
    health_max: 2
    cost_max: 3 / cost_min: 4
    attack_below_source: true            # 攻击力低于来源单位
    exclude_source: true                 # 排除来源自身（ADR-071，陆抗）
    adjacent_to: self                    # 相邻
    has_status: zhen_she
    include_lord: true                   # 候选池额外纳入主将（范围/随机伤害**默认 true**，见下）
  count: 1 | all | 2                    # 数量
  mode: choose | random | first | lowest_health
  require_empty: true                   # 是否要求空格
```

#### 范围 / 随机伤害默认含主公（ADR-087，设计者裁定）

> 「还有一些范围伤害和随机伤害，如果没有说只能针对非主公的，默认就是主公也在攻击目标内也能被选择。」

引擎在结算前会自动补 `include_lord: true`，条件是**同时**满足：

1. 动作是 `damage`；
2. 选择器是**范围**（`count: 'all'`）或**随机**（`mode: 'random'`）；
3. 打的是敌方或双方（`side` 缺省即敌方；写 `self` / `ally` 的"打自己人"不吃这条）；
4. 卡面**没有**显式写 `include_lord`。

因此：
* **要打主将** —— 什么都不用写（万箭齐发 / 关羽水淹七军 / 司马懿 / 陆逊 / 火烧洛阳 / 张角 / 程昱）；
* **不打主将** —— 卡面显式写 `include_lord: false`（张飞「咆哮」，卡面写明「不含主公」）；
* **单点指定目标**（`count: 1` + `mode: choose`）**不受影响** —— 它本来就要玩家点人，点不到主将。

#### 火攻自动挂灼烧（ADR-134，全局规则）

**对敌方释放的火攻（`damage_type: fire` 且目标属敌方阵营）都对该次伤害的目标挂 1 层「灼烧」** ——
不需要在卡面里再写一条 `apply_status: zhuo_shao`（写了就是**双倍**：伤害自带 1 层 + 显式 1 层）。

> **判据（设计者原话：「释放的火攻只对敌人」）**：`eff.damage_type === 'fire'` **且**目标阵营 ≠ 施法方。
> 施法者自己与己方单位**永远**不会因为自己的火攻中灼烧。

| 口径 | 规则 |
|---|---|
| 触发条件 | 执行 `damage` 效果、`damage_type: fire`、**目标是敌方阵营**；**每个火攻效果各 +1 层** |
| 数值无关 | 与这一下打多少点**无关**：3 点火伤也只 +1 层 |
| 多段 | 同一张卡的多段火攻**各算一次**（蒙冲斗舰「蒙冲」对敌 3 段 → 3 层） |
| **只对敌人** | **打自己人/自身不挂**：蒙冲斗舰第 4 段是"对自身 2 点火伤"→ 只掉血、**不挂层**；对己方 AoE 同理 |
| 层数含义 | 该方**回合开始**受 N 点火伤（N = 层数），**永久、不封顶**（ADR-132 的机制不变，见 `10-skills-statuses.md` §3.2） |
| 伤害被减到 0 | **仍然挂层**（披坚 / 免伤 / 藤甲减伤）——「火攻打出去了」即挂 |
| 挡得住的情况 | 只剩两条**既有规则**：目标**进不了目标池**（`untargetable`：免疫 / 翻面 / 空城）与 `applyStatus` 的 **`immune_debuff`**（发 `STATUS_BLOCKED`） |
| 目标已阵亡 | 单位被这一下打死 → 已移出战场，不再挂状态（不给尸体挂层） |
| 主公 | 照常吃**当次**火伤（ADR-087 的范围/随机默认含主公），但**不吃灼烧层** —— `dot_fire` 在回合开始只遍历场上单位，挂了也不会跳伤（ADR-134 自裁定，见 ADR 行） |
| 伤害被重定向 | 「守护 / 护主」把伤害转给守护者时，层数挂在**效果声明的目标**身上（重定向是 `dealDamage` 内部的事，效果层看不到） |
| 董卓「暴虐」 | **方案乙（最终）**：对敌方全体男性造成 **1 点火攻**，走这条统一路径；**方案甲（保留显式施加）已被设计者否决**（留档在卡面 note 与 ADR-134） |

##### ⚠️ 实现硬约束：挂在**效果层**，不在伤害管线

```ts
// core/src/effects.ts —— case 'damage' 里，dealDamage(...) 之后：
if (eff.damage_type === 'fire' && t.kind === 'unit' && t.side !== ctx.side) {
  applyStatus(state, t, 'zhuo_shao', 1, events);   // 只对敌方阵营的场上单位
}
//  ↑ 只能写在这里
```

**绝不能**下沉到 `mutate.dealDamage` 里按 `damageType === 'fire'` 判断：灼烧自己的回合开始跳伤
（`mutate.resolveTurnStartDamage`）**也是火属性**（ADR-108 为「藤甲·遇火即燃」特意如此），
挂进伤害管线就会**自己给自己叠层、每回合无限增长**。
DoT 跳伤 / 水困行动税 / 中毒削上限 / 藤甲反伤都**绕过效果层**直接调 `dealDamage`，
所以挂在效果层能从**结构上**排除它们（`core/test/fire-ignite.test.ts` 用「连续 3 回合层数不变」钉死）。

> **收口（ADR-134）**：荀攸「乌巢袭粮」/ 陆逊「策火流云」的显式 `apply_status: zhuo_shao` 已删；
> 董卓「暴虐」按**方案乙**把显式施加换成"对敌方全体男性 1 点火攻"（目标写 `include_lord: false`，
> 与方案甲的目标池一致）。其余火攻卡（火攻 / 火烧洛阳 / 潘璋 / 蒙冲斗舰 / 黄权）**数值一律未动**，
> 行为因这条全局规则自动改变。

#### force_attack 的两个语义字段（ADR-087）

| 字段 | 取值 | 含义 |
|---|---|---|
| `attack_side` | `'own'`（缺省）/ `'foe'` | 被强制者打**自己人**（混乱内讧，趁火打劫）/ 打**施法方**（当前没有卡在用 `'foe'`，草船借箭已在 ADR-090 改版） |
| `victim_mode` | `'random'`（缺省）/ `'highest_health'` | 挨打的人怎么挑 |

#### duel：双方立即互攻（ADR-141）

`duel` 用于许褚「虎痴」这类决斗技能。效果目标必须先由技能的 `target` 选择器确定为一名敌方单位；结算时来源单位与目标单位各进行一次真实普攻，完整经过攻击前后触发、伤害、反击、护盾和阵亡流程。两次攻击不消耗双方本回合的普通攻击次数；任一方在第一次攻击后阵亡，另一方不再进行第二次攻击。

```yaml
- action: duel
  target:
    side: enemy
    filter: { type: general }
    mode: choose
```

#### scheme_duel：两名敌方人物真实互攻，并按存活者反噬（ADR-180）

王允「密谋诛恶」专用。效果 `target` 用 `count: 2, pick: 2` 选**两名敌方人物**；
`ctx.chosen` 是第 1 个（攻击者），`ctx.chosen2` 是第 2 个（被攻击者）。结算：
第 1 个对第 2 个发起一次真实普攻（含反击、亡语、攻击触发）；交锋后按 `survivor_condition` 判断：
- `'any'`（缺省）：两名中**至少一名**存活 → 触发；
- `'both'`：**两名都存活**才触发。

触发时：王允**真实阵亡**（`killUnit`，不是 9999 伤害，披坚挡不住）；己方主公受到
`lord_damage` 的伤害（缺省 `'max_attack'` = 存活目标中最高攻击；也可写固定数字）。
⚠️ 普通攻击的反击是**同时结算**（ADR-062），目标死了也会反击；所以双方同归于尽是可能的：
`any` 下只死一个/两名都存活触发，**双方同归于尽不触发**（0 代价 2 换 1 的上限）。
`self_destruct: false` 可关掉王允阵亡（当前卡池无载体）。

```yaml
- action: scheme_duel
  survivor_condition: any        # any = 任一存活；both = 两名都存活
  self_destruct: true
  lord_damage: max_attack        # 或固定数字
  target:
    side: enemy
    filter: { type: character, include_lord: false }
    count: 2
    mode: choose
    pick: 2
```

#### 攻击事件的溢出量标记 `overflow`（ADR-088）

`resolveAttack` 在**击杀**目标时把溢出量写成事件标记 `overflow:N`，
DSL 侧用 `value_from_flag: overflow` 取值（张辽「冲锋陷阵」：
斩杀后溢出伤害转打敌方主将）。

```yaml
- action: damage
  value_from_flag: overflow      # 5 攻打 2 血 → 3
  condition: { event: killed }   # 只有击杀那一趟才带这个标记
  target: { side: enemy, lord: true }
```

只在**攻击人物**时产生（打主将本身就没有「溢出」的意义）。没击杀 → 没有该标记 →
`value_from_flag` 取不到值，退回 `eff.value ?? 0`，即不掉血。

#### 抽到时释放的卡，效果只写一份（ADR-088）

`on_draw` 技能的卡若**自己没写 effects**，引擎在「抽到时释放」时改用**卡级 effects**。
于是「打出」与「抽到」共用同一组效果，不会两处各写一份而漂移：

```yaml
tactic_wanjianqifa:
  effects:                      # ← 打出时结算（也是抽到时用的那份）
  - action: damage
    value: 1
    target: { side: enemy, filter: { type: character }, count: all }
  skills:
  - id: wan_jian_qi_fa
    kind: trigger
    trigger: on_draw            # ← 只声明「抽到时释放」，不重复写效果
    text: 抽到时释放：对所有敌方人物造成 1 点伤害。
```

> 背景：袁绍战吼会往**手牌**塞一张万箭齐发（`add_to_deck: to hand`）。
> 原先效果只挂在 `on_draw` 技能上，那张手牌打出去什么都不会发生。

#### 标记的阵亡结算 `on_death`（ADR-087）

写在 `apply_status` 上：被标记者阵亡时，由**施法方**结算这组效果。
（草船借箭原本用它做「敌方每阵亡一个武将，己方抽两张」，ADR-090 改版后已不用；
机制本身留在引擎里备用，`core/test/cards-v1.test.ts` 有一条合成卡的回归测试守着。）

```yaml
- action: apply_status
  status: zhen_wang
  on_death: [{ action: draw, value: 2 }]
  target: { side: enemy, filter: { type: character }, count: all }
```

`mode: choose` 的取值顺序：**先看玩家给的选择**（`pick` 指定用哪个），
该选择不在合法池内、或调用方（AI / 测试 / 未接入选目标的 UI）没给，才退回「合法池取前 N 个」。
**绝不**因为玩家选错了就照打 —— 例如貂蝉指定一个女性目标时，退回合法池里的男性目标。

### 7.4 事件卡的"双方"表达

```yaml
target:
  side: both          # 双方同时生效 → 天道无情
  filter: { type: character }
```

### 7.5 归属标签（ADR-029）

人物除**阵营**（shu / wei / wu / qun，决定可用卡池）外，还可带**归属标签**，
表示黄巾军、蛮族、西凉这类身份归属。两者是**正交**的：

| 概念 | 取值 | 作用 |
|---|---|---|
| 阵营 `faction` | shu / wei / wu / qun / neutral | 构筑时可用的卡池边界 |
| 归属标签 `tags` | 见 `data/tags.yaml` | 技能条件与目标过滤；**可多个，可跨阵营** |

```yaml
- id: shu_madai
  name: 马岱
  faction: shu            # 蜀国卡
  tags: [xi_liang]        # 但同时是西凉人物
  skills:
    - name: 西凉子弟
      effects:
        - action: modify
          value: 1
          target: { side: 'both', filter: { tag: xi_liang } }   # 全体西凉人物
```

**为什么不做成子阵营**：马岱是蜀将也是西凉人，若做成子阵营会与阵营互斥；
标签是叠加的，同一人物可同时是「群 + 黄巾 + 黄巾统领」（见张角三兄弟），队伍归属与身份归属因此不互斥。

**价值**：标签本身 `value: 0`（不占预算）。它的强度体现在**联动卡**上——
所以含标签联动的卡在算总价值时，联动部分要单独估算。

**当前标签**（唯一真源 `data/tags.yaml`，共 7 个）：西凉 `xi_liang`、**南蛮 `man_zu`**、黄巾 `huang_jin`（+ 黄巾统领 `huang_jin_tongling` / 黄巾众 `huang_jin_zhong`）、曹氏宗亲 `cao_clan`、**袁氏 `yuan_shi`**（ADR-143）。
> ⚠️ 旧的**士族 `shi_zu` 已作废删除**（ADR-143）：它是早期设计，与袁氏体系重复，袁绍体系（袁绍 / 士族兵 / 将来的袁术）统一用 `yuan_shi`。
新增标签须先登记进 `data/tags.yaml`，否则校验报错（`validate` 第 ⑪ 条）。

> ⚠️ **显示名与 id 可以不一致**（ADR-143）：标签 id 一旦被卡牌引用就不能改（改了就是一堆"未注册的归属标签"错误），
> 但**卡面显示名**随时可改 —— `man_zu` 的显示名就从「蛮族」改成了「**南蛮**」（更贴史实语境）。
> 改显示名只动 `data/tags.yaml` 的 `name`，不需要动任何卡牌。

### 7.6 概率 · 条件 · 动态取值（ADR-033）

> 设计原则：**卡牌效果没有"特殊机制"，只有"通用算子的组合"**。
> 概率 = 掷一次骰子；随机 = 目标集合里随机取；条件 = 结算前查一次局面；
> 动态取值 = 数一个集合的大小。全部用确定性 RNG，保证回放可复现。

#### ① 概率 `chance`

任何效果都可加 `chance`（0–1），结算前掷一次骰子，不中则整个效果跳过。

```yaml
- action: apply_status
  status: zhen_she
  chance: 0.5                 # 一半概率
  target: { side: enemy, filter: { type: 'character' }, count: 1, mode: 'random' }
```

#### ② 条件 `condition`

效果可加 `condition`，不满足则跳过。下列写法覆盖卡池全部需求：

```yaml
# a) exists —— 该集合非空（"当场上有低于 3 统帅的人时"）
condition: { exists: { side: 'both', filter: { type: 'character', cost_max: 3 } } }

# b) count —— 某集合数量与定值比较（"场上只有典韦一名己方人物时"）
condition: { count: { side: ally, filter: { type: 'character' } }, op: '==', value: 1 }

# c) count_vs —— 两个集合数量互比（"对方场上卡牌数不少于己方时"）
condition: { count_vs: { left: { side: enemy }, right: { side: ally }, op: '>=' } }

# d) event —— 本次结算中发生过某事（"如若斩杀敌人"）
condition: { event: killed }        # killed | clash_won | clash_lost

# e) lord_hp —— 按主公当前生命比较
condition: { lord_hp: { side: enemy, op: '<', value: 15 } }

# f) lord_full_hp —— 判断主公在本次技能结算开始时是否满血
condition: { lord_full_hp: { side: self, value: true } }

# g) chosen_side / chosen_lord / chosen_damaged / chosen_dead / chosen_attack_max —— 判断**玩家本次所选的那个目标**
#    读 `ctx.chosen`，与选择器无关；这组是姊妹条件（ADR-069 陈宫 / ADR-148 华佗 / ADR-159 黄忠 / ADR-179 吕布 / ADR-182 李儒）
condition: { chosen_side: 'enemy' }     # 所选目标属于哪一方（'ally' 判己方）
condition: { chosen_lord: true }        # 所选目标是主将吗
condition: { chosen_damaged: true }     # 所选目标**已受伤**吗（hp < maxHp；主将也适用）
condition: { chosen_dead: true }        # 所选目标**已阵亡/已不在场**吗（求值时的当前状态，ADR-179）
condition: { chosen_attack_max: 3 }     # 所选目标**当前攻击力 ≤ 3**（李儒「鸩酒」＝攻击 <4；求值时读，ADR-182）

# h) has_fallen —— 某张卡**本局是否已经阵亡过**（ADR-160，姜维「复汉」公开判胜技）
condition: { has_fallen: { side: 'enemy', card_id: 'wei_dengai' } }
```

**关于 `chosen_dead`（ADR-179）**：

- 读 `ctx.chosen` 的**当前**状态：单位看 `getUnit(...)` 是否为空或 `hp <= 0`；主将看 `lord.hp <= 0`。
- 与 `chosen_damaged` 的区别：`chosen_damaged` 是**技能开始时**的快照（黄忠「百步穿杨」），
  本条件**必须放在伤害效果之后**求值，才表示“打完之后所选目标死没死”。
- 典型用法：吕布「一骑当千」——5 点主伤害 → 3 点相邻伤害 → **若主目标阵亡**才震慑相邻；
  相邻 3 点造成的击杀**不算**（它们不是 `chosen`）。这就是“先吃 3 伤、再挂震慑”的严格顺序。

**关于 `has_fallen`（ADR-160）**：

- 数据来源是 `SideState.fallen: string[]` —— **该方本局阵亡过的卡 id 列表**（在 `killUnit` 里 push，不去重、不清理）。
- ⚠️ **它和"当前不在场上"是两回事**：`has_fallen` 问的是「**死过**」，不是「**现在不在**」。
  一张还没被打出的卡、和一张已经阵亡的卡，在场上都是"看不见"的 —— 只有 `fallen` 能区分。
- ⚠️ **为什么必须有它**：`v0` 的 `草船借箭` 卡面曾承诺「敌方每阵亡一个武将，己方抽取两张卡」，
  而当时引擎**没有任何"谁死过"的记录**（阵亡单位既不进 `discard`，也没有墓地），
  于是这条效果**一次都没生效过**，最后靠**把卡面改成数场上人物**绕开（ADR-087 记录）。
  `fallen` 把这个缺口补上了。
- ⚠️ **标记机制不能替代它**：`apply_status` 的 `on_death` 载荷虽然能在**被标记单位阵亡的那一刻**执行，
  但它跑的是 `runEffects(state, cards, inst.payoff, { side: inst.srcSide }, rng, events)` ——
  **`ctx.source` 是空的**，所以载荷无法把"某某已亡"记回某个具体单位身上，也就无法支撑
  「A 已阵亡 **且** B 在我方」这类**跨时间合取**条件。
- 🔴 **`on_death` 载荷曾经是坏的（ADR-164 修复）**：`runMarkDeath` 原本只从
  `dead.statuses.chou_di_shou ?? dead.statuses.zhen_wang` 里读标记实例，
  ⚠️ 而 **`chou_di_shou` 这个状态在整个仓库根本不存在**（只在那一行出现过），
  `zhen_wang` 又是**引擎内部**的阵亡标记（`caps: ['dead']`，不可能由卡牌预先挂上并带 `payoff`）。
  ⇒ 后果：**卡牌给 `chou_di`（仇敌）挂的 `on_death` 载荷会被写进 `inst.payoff`，却永远没有人读** ——
  「标记单位阵亡时结算」这条 ADR-087 机制**从落地起就没生效过**；同理 `on_mark_death` 触发技
  也因为同一个早退（`if (!inst?.srcUid) return;`）而**从未触发过**（这也是池内 0 张卡在用它的原因）。
  **修法**：`runMarkDeath` 的取值改为 **`dead.statuses.chou_di ?? ...`**（把 `chou_di` 放在最前）。
  ✅ **向后兼容**：`chou_di` 标记此前从不带 `payoff`，所以旧卡（如旧的「恩怨分明」）行为不变。
  **判据**：`chou_di` 与 `on_mark_damaged` 必须成对 —— **`on_mark_damaged` 读的就是 `chou_di`**，
  而 `runMarkDeath` 却去读一个不存在的名字，两者从第一天起就不一致。
- 🔴 **`on_mark_damaged`（仇敌受伤联动）原本只覆盖 3 条路径（ADR-164 二次修复）**：
  `dealDamage` 有 **14 个调用点**，而 `runMarkDamaged` 只在 **3 处**被显式调用 ——
  单位普攻（`effects.ts`）、DSL 的 `damage` 效果、主公攻击。
  **漏掉的**包括：**灼烧跳伤**（`resolveTurnStartDamage`）、**反击**、**反伤（thorns）**、
  **疲劳**、**护卫/甲士格挡**、**`9999` 摧毁**、以及升变等杂项路径。
  ⇒ 后果：卡面写「仇敌**每次受到伤害时**」，但**被烧死、被反伤、被反击都不算** —— 又一次"卡面承诺了、代码没做到"。
  **修法（架构级，一次覆盖全部）**：把联动**搬进 `dealDamage` 自己** ——
  照 `afterLordDamagedResolver` 的样子加一个 **`afterUnitDamagedResolver`**，
  在**单位分支扣血之后、`killUnit` 之前**（`if (actual > 0)`）触发。
  · **位置在 `killUnit` 之前是有意的**：**致命伤也要触发**（单位对象还在，标记还读得到），
    而"阵亡载荷"（`on_death`）由 `killUnit` → `runMarkDeath` 另行结算，两者互不干扰。
  · **`rng` 不新增参数**：用 `createRng(state.rngState)` 派生、用后 `state.rngState = rng.getState()` 写回
    —— 与 `tryLethalSave` 同一套做法，**14 个调用点一个都不用改签名**。
  · ⚠️ **必须同时删掉原来那 3 处显式调用**，否则会**双重触发**（仇敌挨一下打，主公掉 2 点）。
  · **判据**：任何**实质性掉血**（`actual > 0`）都算「受到伤害」—— 这是设计者 2026-10-11 的口径原话：
    「只要这个有仇敌 debuff 状态的人**受到了任何伤害（实质性掉血）**都会对这个 debuff 仇敌携带者的主公造成 1 点伤」。


> ⚠️ **`chosen_damaged` 读的是「本次技能结算开始时」的快照，不是实时状态**（ADR-159 踩出来的）。
> `condition` 是在**结算到那一条效果时**求值的，而效果**按顺序**发生 —— 若技能自己先打了一段伤害，
> 目标就当场从满血变成受伤，后面那条"若已受伤则加成"的条件就**必然成立**，
> "满血 3 点"会整个退化成"必定 4 点"（实测：第一版实现跑出来永远是 4 点）。
> 与 `lord_full_hp` 用的是同一套做法（`lordFullHpAtStart` / `chosenDamagedAtStart`，都在 `runEffects` 开头快照一次）。
>
> ⚠️ **`chosen_*` 三兄弟是判断"所选目标"的唯一手段**。不要试图用
> `count: { selector: {…, filter: { damaged: true }, mode: 'choose' } }` 去**试探**所选目标的属性 ——
> `resolveTargets` 在"所选目标不在筛选后的池子里"时会走**兜底**（`narrowByMode` → `pool.slice(0, n)`），
> 于是"目标没受伤"会静默变成"**打场上第一个受伤的人**"。要判断属性就用 `chosen_*`。
>
> ⚠️ **两个提前 `return` 的坑（实测，见 `17-troop-system-rework.md` §三个通用落地坑）**：
> `count` / `exists` / `count_vs` 会**提前 return**，写在同一 `condition` 对象里、排在它们后面的
> `event` / `turn_max` / `victim_type` / `chosen_*` 会被**静默忽略**；同理 `chosen_side` 也提前 `return`。
> 需要组合时用 `all_of` / `any_of`（它们是 `return false`，不短路，可安全与同级条件共存）。


#### ③ 动态取值 `value_from`

数值不再写死，改为**数一个集合**（"场上每有 1 名蛮族人物，自身 +1 攻 +1 血"）：

```yaml
- action: modify
  attack_from: { side: 'both', filter: { tag: man_zu } }      # +1 × 蛮族人物数
  health_from: { side: 'both', filter: { tag: man_zu } }
```

`*_from` 的取值 = 该选择器命中的单位数 ×（可选）`per` 系数；也支持 `limit` 上限。

效果数值也可以直接取来源单位的当前属性：`value_from_source: attack` 或
`value_from_source: health`，用于“按自身当前攻击力/生命值造成伤害或治疗”等效果。

**重复次数也可以动态取**（ADR-183，沮授「缓师蓄粮」）：`count_from` 让 `draw` / `heal` / `damage`
按**未使用的统率**重复 —— 每 `divisor` 点重复 1 次、封顶 `max`；缺省退回 `count ?? 1`。

```yaml
- action: draw
  value: 1
  count_from: { resource: command, divisor: 2, max: 3 }   # 每 2 点未使用统率抽 1，最多 3 次
- action: heal
  value: 2
  count_from: { resource: command, divisor: 2, max: 3 }
  target: { side: ally, filter: { damaged: true, include_lord: true }, count: 1, mode: random }
```

`damage` 可标注 `damage_type: water` 表示水攻；来源单位身上的 `water_damage`
能力状态层数会在结算时加到水攻伤害上。单位触发 `on_lord_skill_used` 时机可用于
表达“每次使用主公技后”的联动效果。

目标过滤器的 `damaged: true` 表示当前生命低于生命上限；`damage_type: fire`
用于标记火攻伤害。`discover_to: deck_top` 表示发现后将所选牌置于己方牌库顶。

**`damage_type` 的四个取值**（ADR-108 / **ADR-117**）：

| 取值 | 含义 | 与藤甲（`reduce_physical` / `vulnerable_fire`）的关系 |
|---|---|---|
| 省略 / `physical` | 普通攻击、无属性效果伤害 | **减 N**（1 点会被完全减成 0） |
| `fire` | 火攻 | **加 N**（「遇火即燃」） |
| `water` | 水攻 | 原样结算（且吃 `water_damage` 加成） |
| **`poison`** | **毒攻**（ADR-117 新增，无当飞军「毒箭」） | **原样结算** —— 藤甲挡箭不挡毒 |

#### ④ 新增动作

| action | 参数 | 说明 |
|---|---|---|
| `override_rule` | caps | 覆盖**无状态**的规则档位（ADR-150）。与 `override_status` 同源，区别是不带 `status` → 恒生效。当前唯一用途：`proc_chance`（木鹿大王把象兵「象阵」的 50% 抬到 100%）—— 场上写 `mods`、手牌写 `HandMod.kind='rule'` |
| `deploy_from_hand` | target.filter（`card_id`/`type`/`tag`…）, count | **手牌 → 场上（免费）**：把手牌里按筛选找到的那张**直接搬上场**（ADR-149，诸葛瞻/诸葛尚「同赴」）。与 `summon` 的分工：`summon` 是**凭空造一个**（手牌里那张还在），本动作搬的是**手里已有的那张** —— 不消耗统率、不多出牌。手牌没有匹配项时**空转**；场上满了则**不动手牌**（不吞牌）；新单位的手牌数值修正随牌进场，其「战吼」照常发动 |
| `discard` | target.side, count, **mode** | 弃牌：**按「方」结算**。缺省从该方手牌**随机**弃 N 张；`mode: choose` 则**由玩家点一张**（读 `ctx.handIndex`）——此时 `unitSkillTargetPlan` 会把它报成一步 `zone: 'hand'`（ADR-146；**当前卡池暂无载体**，原载体华佗「青囊」已按 ADR-148 改成「医圣」） |
| `return_to_hand` | target | 返回手牌（"收回手中""回到对方手牌"）| ⭐ **ADR-175**：新增 `value`（费用增减）＋`duration`（持续回合）—— 收回手牌的同时给**那张手牌**挂费用修正（关平「鸣金救主」"其费用下回合 −2"）。⚠️ 回手后重下是**全新单位**（满血、无状态），所以"回满血清 debuff"是回手自带的，无需额外效果。
| `clash` | target, then | **拼点**：双方各翻一张，比点数；结果写入 `event` 供条件判定 |
| `scheme_duel` | target(count/pick=2), survivor_condition, self_destruct, lord_damage | **两名敌方人物真实互攻**（ADR-180，王允「密谋诛恶」）：第 1 个对第 2 个普攻一次；交锋后按任一/两名存活触发“王允真实阵亡 + 己方主公受伤”。`lord_damage: max_attack` ＝ 存活者最高攻击。⚠️ 反击同时结算（ADR-062），目标死了也会反击。 |
| `scry` | target, count, to | 查看/移动卡池顶或底（"查看卡池第一张牌""放到最底层"）|
| `discover` | target.filter, count, value, discover_to, discover_from, discover_modifiers, discover_tag_modifiers | 默认从己方牌库随机展示最多 `count` 张满足条件的牌；`discover_from: pool` 时改从全局卡池展示，选择后不移除牌库中的同名牌；暂停等待玩家选择；默认加入手牌，`discover_to: deck_top` 时将所选牌置于牌库顶部；`value` 为统一费用修正；`discover_modifiers` 可按人物类型给选择结果附加费用/攻/血修正，`discover_tag_modifiers` 可按卡牌标签附加修正 | **筛选支持 `card_id`**（ADR-149：候选池可精确到一张，用于“把牌库里某张具体卡拉到手”）
| `discover_tactic_pair` | target.filter（`zone: hand`、`type: tactic`、`mode: choose`）, pool_faction | 弃置玩家选择的手牌战法，从指定阵营可构筑的战法池（含公共战法）随机获得两张；优先使费用总和等于被弃牌当前费用，无法精确匹配时改为相差 1；允许同名，无任何组合时只弃牌 |
| `send_hand_to_deck` | to, mode, from_drawn | **把手牌放回牌库的指定位置，且不抽牌**（ADR-139）。`to`：`deck_top` / `deck_bottom`（缺省）/ `random`；`mode: choose` 用 `ctx.handIndex` 指定哪张；**没给下标时挂起等玩家选**（`pendingHandChoice`，ADR-144），`from_drawn: N` 把候选锁死在刚抽到的最近 N 张。配合 `draw` 可写「先抽 N 张、再把其中一张放回底部」这类两段式效果（杨仪「筹度粮谷」）。⚠️ 与 `cycle_to_deck` 的区别：那个是"随机位置 + 必抽 1 张"的置换 |
| `defect_to_deck` | unit, position | **叛变：阵亡后把「这张卡」换成另一张卡、放进对手牌库的随机位置**（ADR-174，糜芳「叛迎」）。`unit` ＝ 替代卡 id（缺省＝原卡，用来做"叛变后变成无技能版本"）；`position: 'top'` 才放顶，缺省＝随机位置。⚠️ 与 `self_to_hand` 的区别：落点是**牌库**不是手牌、且可以**换成另一张卡**。牌库方向沿用全项目约定（数组末尾＝顶、开头＝底） |
| `discover`（扩展 ADR-178） | count, picks, pool, rest, discover_to | **发现候选牌并由玩家选择**。`count` ＝ 展示几张；**`picks`（新）** ＝ 要选几张（缺省 1）—— 选满前 `pendingDiscover` 保持挂起，每次 `CHOOSE_DISCOVER` 选一张；**`rest`（新）** ＝ 选完后**剩余候选**的去向（`'deck'` ＝ 放入牌库；缺省丢弃）。**`pool`（新）** ＝ 候选来源改为**公共卡池**（`{type, factions}`，写法同 `cast_random`；ADR-181 追加 `cards` 指定卡 id 列表），缺省才从**牌库**取。⚠️ 池来源时 `chooseDiscover` 不会从牌库切除；牌库来源时才切除。诸葛亮「隆中对」＝ 5 选 3、余 2 进牌库 |
| `discover`（扩展 ADR-181） | pool.cards | **指定卡 id 列表**：给出时只在这些卡里选，忽略 `type`/`factions`；卡表查无的 id 直接跳过。用于袁术「传国玉玺」3 选 2（`count: 3`、`picks: 2`，第 3 张默认丢弃、不进牌库/手牌）。`fromPool: true` ⇒ `chooseDiscover` 不切牌库 |
| `override_status` | status, caps, target | **把目标身上某状态的若干档位（cap）覆盖为指定值**（ADR-142，兀突骨「藤甲统率」）。`status` = 作用的状态（如 `teng_jia`），`caps` = `{ <cap>: <绝对值> }`（如 `{ reduce_physical: 2, vulnerable_fire: 0 }` ＝ 物理 −2 且不再怕火），`target` 支持 `zone: hand`（手牌写 `HandMod.kind: rule`，**打出时随牌进场**）。⚠️ **仅当该状态确实存在于目标身上时才生效**（被净化即失效、重新获得即恢复）；**绝对值**不是增减量；同一 (状态,档位) 幂等。**为什么不用加层数**：一个状态的多个 cap 共用层数（藤甲的减伤与怕火同源），加层会一起放大 |
| `CHOOSE_HAND`（**动作**，不是效果） | handIndex | 结算中途的手牌选择（ADR-144）：只在 `pendingHandChoice` 挂起时可用，其它动作会被引擎拒绝。由 UI/AI 发出；AI 的候选枚举在 `ai/options.ts`，口径是"费用低的先放回"。 |
| `gain_command` | value, **permanent** | 统率。缺省只加**本回合可用值** `cur` 且夹在 `max` 内；**`permanent: true`（ADR-139）同时抬统率上限**（封顶 `COMMAND.MAX` = 10）并发 `COMMAND_MAX_CHANGED`。⚠️ 回合开始会把 `cur` 回满，所以「回合开始 +N 统率」**必须**用 `permanent: true`，否则收益恒为 0 |
| `silence` | target, duration | 禁用技能（"技能禁用一回合"）|
| `flip` | target | 翻面（"将卡牌翻面"，翻面期间不可被选中）|
| `sacrifice` | target | 牺牲己方单位并记下它的血量（ADR-071） |
| `attack_each` | target | 挨个发动真正的普攻（ADR-071） |
| `draw_until` | until_not_type | 抽到非某类牌为止（ADR-071） |
| `damage` / `heal` | `value_from_flag` | 数值取自 `ctx.flags` 里的 `"<name>:N"`（ADR-041），
`sacrifice` 写入 `sacrificed_max_hp` / `sacrificed_hp` |
| `remove_status` | `remove_kind: debuff \| buff` | 按**类别**批量驱散（ADR-071）。载体：**华佗「医圣」**（治疗的同时净化，2026-10-10 设计者追加）—— 与治疗共用同一选择器，plan 里合并成**同一步**，UI 不会问两次 |
| `cast_random` | count, `pool: { type, factions }` | **从卡池里随机取 N 张卡直接释放**（ADR-162，庞统「连环」）。<br>⚠️ 三条语义必须记住：<br>**① 不消耗任何东西** —— 不碰手牌、不碰牌库、不付统率、不进弃牌堆；卡池是**只读**的 `cards` 表。<br>**② 目标一律随机** —— 释放前对这张卡的所有 `target`/`target2` 递归改写为 `mode: 'random'`（与「混乱」`random_target` 是同一套做法，`effects.ts:787`），**包括 `side: ally` 的选择器**。所以池子里若有"作用于己方"的卡，随机释放时会**打到自己人**，这是**有意保留的风险**（卡面必须写清）。<br>**③ 效果来源** —— 优先取该卡 `skills[].effects`，技能用 `modes` 抉择时**随机挑一个分支**；两者都没有才用 `card.effects`（对齐 ADR-088 的口径）。<br>⚠️ 每张释放的卡发一次现成的 `CARD_AUTO_CAST` 事件（UI 据此播动画）。<br>⚠️ **不要再让池子里的卡自己也带 `cast_random`** —— 那会递归，当前没有这样的卡 |

#### ⑤ 目标选择器补充

```yaml
filter:
  cost_max: 3          # 统帅值上限（"低于自己统帅的敌军"）
  adjacent_to: self    # 相邻（"相邻的己方人物"）
```

### 7.7 光环与属性修正层（ADR-037）

> **问题**：原实现直接改 `u.atk` / `u.maxHp`（加完回不去），导致
> ① 光环无法"条件变化时重算" ② 临时修正在到期后无法回滚。

#### 属性两层结构

```
最终属性 = 基础属性（卡面值）+ Σ 修正层
             ↑ 固定不变          ↑ 光环 / 临时 buff / 永久 debuff
```

每个单位持有 `mods: StatMod[]`，引擎按需重算派生值：

```ts
interface StatMod {
  id: string;          // 来源标识（技能 id），重算时按来源整体替换
  kind: 'aura' | 'temp' | 'permanent';
  attack?: number;
  health?: number;
  turns?: number;      // 'temp' 专用：剩余回合
}
```

#### 光环（aura）

技能声明 `kind: aura`，其 `effects` **不立即生效**，而是被"收集"成修正项。
收集时完整复用 DSL —— 条件、动态取值、目标选择器全部可用：

```yaml
- id: hu_wang
  name: 胡王
  kind: aura                      # 光环
  effects:
    - action: modify
      attack_from: { side: both, filter: { tag: man_zu } }   # 每有 1 名蛮族 +1
      health_from: { side: both, filter: { tag: man_zu } }
      target: { source: true }
```

**重算时机**（对应 `10-skills-statuses.md` §4 时机表）：

| 时机表步骤 | 事件 | 为什么 |
|---|---|---|
| 第 3 步 | 回合开始 | 回合间的状态变化 |
| 第 7 步 | 入场后 | 新单位可能改变光环条件 |
| 第 19 步 | 死亡后 | 来源阵亡或条件集合缩小 |
| 第 21 步 | 清除临时效果后 | 临时修正到期需重算 |

**重算算法**：① 清除全部 `kind: 'aura'` 修正 → ② 遍历双方存活单位的 aura 技能重新收集
→ ③ 按 `基础值 + Σ修正` 重写 `atk` / `maxHp`。

#### 生命修正的处理

生命上限变化时，当前生命**等量增减**并夹在 `[1, 上限]`：
获得 +1 上限同时回 1 血；失去 +1 上限则减 1 血，但**不会因光环失效而死亡**。

#### 约束

| 项 | 规则 |
|---|---|
| 光环内不用 `chance` | 每次重算都掷骰会导致数值抖动；需要随机请改用触发技 |
| 光环 id 唯一 | 同名光环不叠加，重算时整体替换，避免重复累加 |
| 临时修正有 `turns` | 到期由时机表第 21 步移除并触发重算 |

### 7.8 伤害重定向与免死（ADR-039）

> **公共逻辑**：三国卡的核心互动之一是"替人挨打"。周泰援护、陈宫分担、曹操护驾
> 三者机制**完全相同**——伤害本该打在 A 身上，改由 B 承受。做成一个通用机制，
> 卡面文案各自表述。

#### 伤害重定向

给**被保护者**施加带 `redirect_damage` 能力的守护状态，状态记录**守护者的 uid**；
`dealDamage` 在扣血前先查这个状态，命中则把伤害整体转给守护者。

```yaml
- action: apply_status
  status: shou_hu                  # 守护（caps: [redirect_damage]）
  duration: 1
  status_source: self              # ★ 把「来源单位」记为守护者
  target: { side: ally, filter: { type: character }, count: 1, mode: choose }
```

| 规则 | 说明 |
|---|---|
| 传递顺序 | 伤害**整体转移**（不是分摊），转移后原目标完全不受影响 |
| 守护者阵亡 | 守护者血量 ≤ 0 时守护自动失效，伤害回落到原目标 |
| 不自我守护 | 守护者 === 被保护者时忽略，避免自环 |
| 递归上限 | 最多转移 3 层，防止 A→B→A 死循环 |
| 触发时机 | 时机表**第 10 步之前**（免疫判定之前），因为"伤害根本没打到原目标" |

#### 免死（on_lethal）

单位受到致命伤害时触发一次判定，成功则以 1 血存活。用于周泰、夏侯惇。

```yaml
- id: bu_si
  name: 不屈
  kind: trigger
  trigger: on_lethal               # ★ 致命伤害时
  chance: 0.5                      # 一半概率（写在技能上）
  effects:
    - action: survive               # 以 1 血存活
```

| 规则 | 说明 |
|---|---|
| 频率 | 由技能声明 `frequency`；若用状态层数表达充能，则每层可抵消一次致命伤害（周泰「不屈」） |
| 与免疫的区别 | 免疫在**扣血前**取消伤害；免死在**血量归零后**抬回 1 血 |
| 判定顺序 | 先免疫，再免死 |

周泰「不屈」使用可消耗的数值状态：入场获得 1 层，致命伤害时消耗 1 层并保留 1 点生命；当周泰从非满血被治疗至满血时，若状态已耗尽则补回 1 层。该补充规则由状态定义的 `replenish_on_full_health` 驱动，不绑定具体卡牌 id。

### 7.9 主公状态 · 费用规则 · 弃牌属性（ADR-040）

#### ① 主公也可承载状态

`apply_status` 的目标可以是主帅（`target: { lord: true }`），
主帅状态存放在 `Lord.statuses`，与单位状态同构（`stacks` / `turns` / `srcUid`）。

用途：断粮（统率上限 −N）、主公技封锁、主公技次数加成。

```yaml
- action: apply_status
  status: duan_liang
  stacks: 2
  target: { side: enemy, lord: true }
```

| 相关能力 | 作用 |
|---|---|
| `block_lord_skill` | 该方主帅不能使用主公技（田丰） |
| `extra_lord_skill` | 该方主帅每回合主公技次数 +N（黄权，读取 `stacks`） |

断粮对统率上限的影响在**回合开始**结算：`上限 = min(10, 基础上限 + 1 − Σ断粮层数)`。

#### ② 卡牌自身的费用规则 `cost_rule`

手牌费用除受 `mods` 影响外，还可由卡牌定义声明一条**条件规则**（丁奉）：

```yaml
- id: wu_dingfeng
  cost: 4
  cost_rule:
    condition: { exists: { side: ally, filter: { type: character, health_max: 1 } } }
    value: -1                    # 满足条件时费用 −1
```

结算顺序：`卡面费用 → cost_rule → Σ mods`，下限 0。
规则在**每次计算费用时重新判定**，因此条件变化会自动反映。

#### ③ 读取被弃/被牺牲卡牌的属性

`discard` 等动作会把被弃的牌记入 `ctx.lastDiscarded`；后续效果可用
`value_from_discarded` 取其属性（程昱、华佗）：

```yaml
- action: discard
  count: 1
  target: { side: self, zone: hand }
- action: heal
  value_from_discarded: cost      # 按被弃牌的统帅值回血
  target: { side: ally, filter: { type: character }, count: 1 }
```

`value_from_discarded` 取值：`cost` | `health`。

### 7.11 抉择 · 性别 · 双目标 · 守护范围（ADR-071）

> 来源：`docs/BACKLOG-skills.md` 的 B-3 ~ B-11。这一节记的四项都是**通用 DSL 能力**，
> 不是某张卡的私货 —— 加卡不改代码的前提是"表达力够用"。

#### ① 抉择 `modes`（B-3，曹彰「猛袭」）

```yaml
skills:
  - id: meng_xi
    kind: trigger
    trigger: on_play
    modes:                              # 有 modes 时 effects 被忽略
      - name: 蓄势（抽 1 张牌）
        effects: [{ action: draw, value: 1 }]
      - name: 奋击（本回合攻击 +1）
        effects: [{ action: modify, attack: 1, duration: this_turn, target: { source: true } }]
```

- 玩家通过 `PLAY_CARD.modeIndex`（`USE_SKILL` / `USE_LORD_SKILL` 同）选择分支；
- `on_play` 技能的 `modes` 同样适用于非人物卡（如战法）：出牌时按 `PLAY_CARD.modeIndex`
  执行选中的分支；若卡牌同时声明卡牌级 `effects`，这些公共效果仍会在分支效果后执行；
- **缺省 / 越界 / 非整数一律取 `modes[0]`**（`effectsOf()` 是唯一真源），
  这样 AI 与尚未接分支选择的 UI 都能跑；
- 每个分支自己带完整的一组效果，不做"公共前缀"合并；
- **计价按各分支的最大值**，不能相加 —— 相加等于把「二选一」当成「都拿到」。

#### ② 性别 `gender`（B-4，貂蝉「祸国倾城」）

- `TargetSelector.filter.gender`，运行期读 `Unit.gender`；
- 数据侧 `CardDef.gender: 'male' | 'female' | 'unknown'`，由 `cards_decisions.draft.yaml`
  的 `card_gender` 段驱动。**口径：场上"有攻血的单位"默认 `male`**（含兵种 / 衍生物 ——
  它们也是场上的角色），女性角色显式登记；战法 / 事件 / 状态等非单位卡记 `unknown`。
  123 张里只有 3 位女性（貂蝉 / 蔡文姬 / 黄月英），逐张写反而更容易写错。
- ⚠️ **别把兵种记成 `unknown`**：那样貂蝉在纯基础兵的对局里会**完全空转**
  （目标池被性别过滤清空，技能什么都不做）。这是实现时实际踩到的。

#### ③ 双目标 `pick`（B-8，程昱「审时度势」）

卡面要"牺牲一个己方人物，把血量上限恢复给**指定人物**"，一次结算里有两个玩家选择：

- `Action` 增加 `target2`，`EffectContext` 增加 `chosen2`；
- `TargetSelector.pick: 1 | 2` 指定该效果读哪一个（缺省 1）；
- **只给了 `target` 时 `pick: 2` 退回第一个选择**，AI / 测试 / 旧 UI 不会因此空转；
- 目前最多两个玩家选择。程昱卡面的第三个"指定敌人"以**随机敌人**落地 ——
  ADR-072 已确认这是设计者口径，不是实现妥协。

#### ④ 类型定型：1 攻武将必须显式标注（ADR-072）

`ADR-018` 的自动判定（**攻击 > 1 → 武将；否则默认谋臣**）是在**照片稿的攻击力**上跑的，
而攻击力会被 `card_stats` 改 —— 所以「1 攻的武将」必须由设计者显式裁定，否则一律算谋臣：

**ADR-091 起直接在卡条目上标**（`data/cards.yaml` 是唯一手写真源）：

```yaml
# data/cards.yaml
- id: wu_zumao           # 祖茂 2 费 1/3 —— 设计者：即便 1 攻仍是武将
  type: general
  type_explicit: true    # 显式裁定「1 攻也算武将」
- id: shu_xiangchong     # 向宠 2 费 1/4 —— 攻击 ≤ 1 且无显式标注 → 按 ADR-018 算谋臣
  type: strategist
```

- 规则落在 `core/tools/validate.ts`：`general && attack <= 1 && !type_explicit` → **error**；
- `type_explicit` 在字段白名单里（`CARD_FIELDS`）—— 写了名单外的字段会直接报 error，
  不再有"生成器按 `KEEP` 静默丢弃"这回事（陷阱 #3 已随 ADR-091 结项）；
- 早年的 `gen-cards-v1.py` 里 `TYPE_FIX = {'shu_huangquan': 'general'}`
  这种**按 id 的类型硬编码**已删除（卡牌数据不该写进代码，铁律 1）。

#### ⑤ 选目标的判定一律在 core（ADR-077）

「要不要选目标 / 有几个选择 / **能选谁**」三处共用同一套判定，UI 不自己按 `side` 猜
（否则会忽略 `filter`：貂蝉只认男性、陆抗排除自己、华佗只认人物都会失效）：

| core 入口 | 场景 |
|---|---|
| `playTargetPlan(state, side, card, modeIndex?)` | 战吼 / 卡级效果出牌前 |
| `unitSkillTargetPlan(state, side, row, col)` | 主动技 |
| `lordSkillTargetPlan(state, side)` | 主公技 |

三者共用内部 `choiceOf()`：用 `count: 'all'` 取**整个候选池**（而不是"取前 N 个"），
所以返回的 `targets` 就是玩家可点的那一批。原型据此高亮，并用
`nearestHit` 的 18px 吸附半径做命中判定。

#### ⑥ 条件的与 / 或 组合（ADR-074）

```yaml
condition:
  all_of:            # 全部满足（张宝/张梁「张氏三兄弟同时在场」）
    - exists: { side: ally, filter: { card_id: qun_zhangliang } }
    - exists: { side: ally, filter: { card_id: qun_zhangjiao } }
  any_of:            # 任一满足（司马懿③「场上只剩他一人时，②同样生效」）
    - acted_this_turn: true
      dealt_damage_this_turn: true
    - count: { selector: { side: ally, filter: { type: character } }, op: '==', value: 1 }
```

- 单个字段之间仍是「与」；`all_of` / `any_of` 先判，再与其余字段相与。
- **计价**：每个子句 ×0.7 连乘；子句指名具体卡（`filter.card_id`）再 ×0.5（组合技）；
  `all_of` 连乘、`any_of` 取最宽的一支。

#### ⑦ 本回合行为（ADR-074，司马懿）

| 条件 | 含义 | 设定时机 |
|---|---|---|
| `acted_this_turn` | 来源单位本回合是否**行动过**（攻击或使用主动技） | 回合开始重置；攻击 / 用主动技时置真 |
| `dealt_damage_this_turn` | 来源单位本回合的攻击是否**造成过伤害** | 只有实际伤害 > 0 才置真 |

#### ⑧ 跳过回合（ADR-074，休养生息）

`StatusDef.caps` 里的 `skip_turn`：该方主帅带此状态时，其**下一个回合整个被跳过**
（引擎在换手后循环结算，上限 4 次防呆）。`xiu_zheng`（休整）即此能力的状态实现。

> ⚠️ **当前没有卡在使用它**：休养生息在 ADR-075 改为「己方全体 +3 血，抽 1 张」后已摘掉。
> 能力与测试都保留（随时可挂回某张卡），不是遗留的空实现。

#### ⑨ 守护范围 `guard_scope`（B-11，祖茂「替主」）

`STATUSES[id].guard_scope`：

| 值 | 代表状态 | 语义 |
|---|---|---|
| `any`（默认） | `shou_hu` 守护 | **被守护单位**受到的伤害都转给 `srcUid`（陈宫「忠烈」） |
| `lord` | `hu_zhu` 护主 | **只有该方主帅**受到的伤害才转给 `srcUid`（祖茂「替主」） |

- 主帅不是 `Unit`，所以 `findGuard`（扫单位身上的状态）之外另开 `findLordGuard`
  （反扫**主帅身上**的守护状态，用 `srcUid` 找替他挨打的人）；
- 光环施加的状态**不带 `turns`**，生命周期交给光环（每次 `recomputeAuras` 先清后加）。
  否则它会在**自己回合结束**时被"回合到期"清掉，而护主要挡的恰恰是对手回合的伤害。

#### ⑩ 层数上限 `max_stacks` 与合并方式 `stack_mode`（ADR-117 / ADR-132）

`StatusDef.max_stacks`：数值型状态的**层数上限**，未声明 = 不封顶。
`StatusDef.stack_mode`：重复施加时**怎么合并层数**（ADR-132 新增），`'add'`（默认，累加）| `'max'`（取较大者）。

```ts
// 当前**没有任何状态**声明 max_stacks（三系 debuff 都不封顶）：
zhuo_shao: { name: '灼烧', kind: 'debuff', numeric: true, duration: 'permanent', caps: ['dot_fire'],        note: '…' },
zhong_du:  { name: '中毒', kind: 'debuff', numeric: true, duration: 'permanent', caps: ['shrink_max_hp'], note: '…' },
shui_kun:  { name: '水困', kind: 'debuff', numeric: true, duration: 'permanent',
             caps: ['damage_on_action', 'stage_up'], stack_mode: 'max', note: '层数＝阶段' },
```

| 规则 | 说明 |
|---|---|
| 夹紧时机 | **`applyStatus` 里施加时夹**（`Math.min(合并结果, max_stacks)`），不是结算时夹 |
| 为什么 | 卡面减益徽章**直接显示层数**（ADR-116 实测 `["水困2","震慑","中毒3"]`）；徽章写 5 而实际结算 3，玩家算不出这一下掉多少 |
| 不声明 | 三系 debuff / 振奋 / 急救等都保持**不封顶**（中毒的 `max_stacks: 3` 已随 ADR-132 删除） |
| `stack_mode: 'max'` | 取 `max(旧层数, 新施加)`、**不降级**。水困的层数＝**阶段**，按累加会让同一张 2 费卡连发两次把阶段顶到 4（行动一次掉 8 点）；按重置又会让阶段倒退。**只有水困在用** |
| `stack_mode: 'add'` | 默认，层数累加（灼烧/中毒：再施加一次就多 1 层） |

> 三系的重新定位、时点节奏（火＝回合开始 / 水＝行动时 / 毒＝回合结束）、
> 设计者原案（二次增长）与修正过程见 `10-skills-statuses.md` §3.2.2 ~ §3.2.4。

#### ⑪ 三系的结算能力（cap）登记表（ADR-132）

> **引擎只查能力、不认状态 id**（ADR-034/116）。下表是**按回合 / 行动时点自动结算**的那一类 cap
> （`block_attack` / `untargetable` 这类判定型 cap 不在此列），新增机制必须在这里先登记、再改代码（铁律 1）。

| cap | 挂在哪 | 时点 | 引擎读它的地方 | 效果 |
|---|---|---|---|---|
| `dot_fire` | `zhuo_shao` | **回合开始**（第 0 步） | `mutate.resolveTurnStartDamage`（由 `engine.startTurn` 最开头调用） | 受 **N** 点 `fire` 伤害（N = 层数） |
| `damage_on_action` | `shui_kun` | **行动后** | `engine.chargeWaterTax`（`attack()` / `useUnitSkill()` 两处） | 受 **2^(阶段-1)** 点 `water` 伤害（阶段 = 该状态的层数）；普攻与主动技都算，升变不算 |
| `stage_up` | `shui_kun` | **回合结束**（第 20 步②） | `mutate.resolveTurnEndStatuses` | 该状态**层数 +1**（＝阶段 +1），不封顶 |
| `shrink_max_hp` | `zhong_du` | **回合结束**（第 20 步①） | `mutate.resolveTurnEndStatuses` → `mutate.shrinkMaxHp` | **永久降低 N 点生命上限**（N = 层数）；不造成伤害；只夹不缩；上限归零即阵亡 |
| `skip_turn` | `xiu_zheng` | 换手后 | `engine.consumeSkipTurn` | 该方整个回合被跳过（ADR-074） |

**两条实现约束**（都是踩过的坑）：

1. **回合末分趟跑**：`resolveTurnEndStatuses` 先跑 `shrink_max_hp`、再跑 `stage_up`，
   各是一趟独立循环 —— 若在同一趟里边遍历状态边判断 cap，"谁先谁后"会取决于状态在对象里的**插入顺序**，
   同样的场面会因施加次序不同而结果不同（不可回放）。
2. **上限可以削到 0，因此不能复用 `applyMods` 的 `[1, ∞)` 夹紧**：`applyMods` 的"上限不低于 1"
   是为「光环失效不致死」服务的（`state.ts`）；中毒的 `shrinkMaxHp` 另算一次
   `max(0, baseMaxHp + Σmods.health)`，把削减量记进**永久 `mods`**（这样光环重算/临时修正到期都不会把它抹掉），
   再把当前生命**只夹不缩**地压到新上限，最后走既有 `hp <= 0` 的阵亡路径。

## 7.10 平衡的基本等式（ADR-043）

> **这是本作数值设计的第一原则，任何时候都不许只看属性栏。**

```
属性点 + 关键词成本 + 技能价值 ≈ 2 × 费用 + 1
```

三项**互为替代**：属性低可以用强技能补，属性高就得砍技能。
所以看到"高费低属性"的卡，**先看它的技能值多少分**，再判断强弱。

| 项 | 计价方式 |
|---|---|
| 属性点 | 攻击 + 生命，1 点 = 1 分 |
| 关键词 | 见 `13-§4` 的成本表（负值，占用预算） |
| **技能价值** | 按效果折算，见下方 `effectValue` |

### 技能价值的折算表（实现于 `core/tools/validate.ts`）

| 效果 | 价值 | 说明 |
|---|---|---|
| 伤害 | ×0.5 / 点 | |
| 治疗 | ×0.4 / 点 | |
| 抽牌 | ×3 / 张 | |
| 召唤 | ×3 / 个 | |
| 施加震慑 | 5 | 强力控制 |
| 销毁 | 8 | |
| 夺取手牌 | ×3.5 | |
| 控制权转移 | 7 | |
| 免死 | 6 | |
| 复制技能 | 5 | |
| 属性修正 | ×1.5 / 点 × 目标数 | 动态取值（`*_from`）另按 2 点估 |
| 进化（transform） | `(进化后总价值 − 进化前总价值) × 单位数` | **ADR-046**：原先固定 4 分，会把最强与最弱的同构卡算成一样；来源卡从同技能的 `summon` 推断，取不到才退回 4 |
| 打 N 次（`eff.count`） | 上述单价 × N | **ADR-046**：`伤害/治疗/施加状态` 的 `count` 是次数，原先被忽略（张角 `count: 5` 只算 1 次） |
| AOE（`target.count: 'all'`） | 单价 × `AOE_NOMINAL`(2.5) | **ADR-046**：实际张数取决于场面，取名义值 |
| 牺牲（`sacrifice`） | 0 | **ADR-071**：销毁自己的单位是**代价**，按 `discard` 的先例记 0；收益由后续 `value_from_flag` 记 |
| `value_from_flag` | damage ×0.5 / heal ×0.4（名义值 3） | **ADR-071**：不记的话程昱整条"牺牲换血"链会被算成白板 |
| 连续普攻（`attack_each`） | 3 | **ADR-071**：名义值 ≈ 一次额外普攻的伤害；要吃反击、自己阵亡即中断，故不给满值 |
| 抽到非某类为止（`draw_until`） | 3 | **ADR-071**：名义值 ≈ 比抽 1 张多拿半张 |
| 批量驱散（`remove_kind`） | ×3 / 次 | **ADR-071**：一次清掉一堆 debuff，不能还按"1 层"计价 |
| 抉择（`modes`） | 各分支取**最大值** | **ADR-071**：相加等于把「二选一」当成「都拿到」 |
| 主动技折扣 | ×0.8 | 可被震慑打断 |
| 触发技折扣 | 按时机 0.6–1.0 | 见 `TRIGGER_RATE` |

### 工程约定（踩过的坑）

- **DSL 存在 `skills[].dsl`**，不在 `skills[].effects`。
  计价时必须先摊平 `skills[].dsl`，否则**技能价值会被算成 0**，
  导致所有技能卡都被误判为"严重偏弱"。
- 新增效果动作时，**必须同步在 `effectValue` 里加估值**，
  否则该动作按 0 分计，同样会造成误判。

## 8. 示例校验（占位数值，非最终设计）

| 卡 | 费用 | 属性点 | 关键词 | 技能 | 总价值 | 预算 | 判定 |
|---|---|---|---|---|---|---|---|
| 步兵 | 1 | 3 | — | — | 3.0 | 3 | 合规 |
| 盾兵 | 1 | 3 | 架盾 −1 | — | 4.0 | 3 | **超模 1 点，需调** |
| 弓箭手 | 1 | 2 | 神射 −0.5 | — | 2.5 | 3 | **偏弱 0.5 点** |
| 火攻（战法） | 3 | — | — | 4 伤害 = 2 | 2.0 | 7 | 偏弱（单体伤害价值低） |
| 灾年（事件） | 2 | — | — | 双方各 −1 血 | 对称 | 5 | 需实测 |

> 上表是**示例**，用于演示公式如何工作。人物卡的实际数值由策划提供后填入。

## 9. 数据文件组织

```
data/
├── cards.yaml            # 所有卡牌
├── keywords.yaml         # 关键词定义（id → 显示名、图标、价值）
├── statuses.yaml         # 状态定义
├── bonds.yaml            # 羁绊
├── jiuling.yaml          # 酒令
├── heroes.yaml           # 主公与主公技
└── schema/
    ├── card.schema.json
    ├── bond.schema.json
    └── jiuling.schema.json
```

## 10. 待调项

### 伤害目标类型条件

`condition.last_damage_target_not_type` 读取本次效果链最近一段伤害结算前记录的目标卡牌类型；类型不同才满足，没有伤害目标则不满足。目标阵亡离场后仍保留该快照，不能重新随机选目标用于条件判断。用于锦帆军伤害命中非武将后夺取敌方牌顶。

| 编号 | 项 | 说明 |
|---|---|---|
| T-13-1 | 关键词价值表的最终数值 | 实机测试后校准 |
| T-13-2 | 技能定价的等效价值系数 | 用模拟器回归 |
| T-13-3 | 组合折扣系数（当前 0.9） | 观察组合卡强度 |
| T-13-4 | 校验阈值（±1.5 / ±3） | 依据团队容忍度调整 |
## 附：选择器 `attack_target`（ADR-130）

`TargetSelector.attack_target: true` —— 只选「**本次普通攻击的目标**」。

- **用途**：以攻击目标为**作用对象**的效果（象兵「象阵」：攻击命中后 50% 使该目标震慑）；
- **与 `condition.attack_target` 的分工**：那个只能**读**攻击目标做条件判断（西凉铁骑「突骑」＝打武将/谋臣 +2），
  这个才是"打谁就给谁挂状态"；
- **可复用场景**：破甲、标记、点燃、吸血等一切"针对被打者"的效果；
- **回退语义**：非攻击语境（`ctx.attackTarget` 缺失）→ 返回空池，效果自然跳过（不会误伤别人）；
- **为何不用 `event: 'victim'`**：它在攻击语境里只在**目标阵亡**时才有效 —— 而死了就不必再挂状态了。
- 实现：`effects.ts` 的 `resolveTargets` 首段分支；攻击语境由 `runOnAttackPhase` 注入 `ctx.attackTarget`。

## 军械、升变费用与主公普攻（ADR-119，2026-10-06）

`machine`（军械）是可加入普通卡组、占据战场位置的单位类型，有费用、攻击、生命及技能，但没有 `troopKind` / `upgradeFrom`，不属于兵种或兵种升变目标。通用单位选择器 `character` 包含军械，武将、谋臣、兵种专属选择器不包含军械。

### 主公伤害免疫的两个状态：`mian_shang` 与 `kong_cheng`（ADR-156）

`dealDamage` 的主公分支**本来就支持两档免疫**（`mutate.ts:298-303`）：

| 状态 | 能力 | 语义 | 时长 |
|---|---|---|---|
| `mian_shang` 免伤 | `immune_all_damage` | **免疫所有伤害**（含效果伤害） | ⚠️ `duration: 'this_turn'` —— **只覆盖当前半回合** |
| `sheng_dun_status` 披坚 | `immune_damage` | 免疫**一次**伤害（消耗后消失） | `until_consumed` |

⚠️ **`mian_shang` 有一个硬约束**：它的定义是 `duration: 'this_turn'`，`applyStatus` 会据此写入
`expiresAtHalfTurn = state.halfTurn`（`mutate.ts:609`），`expireStatuses` 随后按该字段删除它 ——
**无论效果里传多大的 `turns`，它都撑不过当前半回合**。所以"主公在下个回合免疫伤害"**不能**用它。

因此 **`kong_cheng`（空城）** 被改造为"跨回合的主公免疫"载体（ADR-156）：
它在原有 `untargetable`（主帅不能被普通攻击指定）之上**增加 `immune_all_damage`**，
于是空城计打出后 = **主帅既不能被攻击、也免疫一切效果伤害**，覆盖到对手的下个回合
（配合 `duration: 2` —— 见下方"时长写 2 的理由"）。

> **时长写 2 的理由**（ADR-074 ① 踩过的坑）：主公状态在**持有者自己的回合结束**才递减（`expireStatuses`），
> 所以在自己回合打出、要挡住**对手**那一回合，必须写 `duration: 2`：自己回合结束 2→1（仍生效），
> 回到自己回合再结束时 1→0 才过期。写 1 会在对手动手之前就消失。

现行 4 张军械（ADR-152 追加蜀·木牛流马）：霹雳车（魏 3 费 0/3）、楼船军（吴 3 费 2/4）、蒙冲斗舰（吴 3 费 1/3）、**木牛流马（蜀 2 费 0/2，己方回合结束抽 1）**。同名上限按 `maxCopiesOf` 为 **1**（非 troop）。同一个 id 也可被效果**召唤**（黄月英「机巧出阵」）：`summon` 是凭空造一份新实例，与卡组里带没带它无关。

> **军械的「攻击力」是给反击用的（ADR-153，设计者口径）**：「机械卡没办法普通攻击，**带的攻击值是为了别人打的时候有一定的伤害**。」
> 即：`attack` 对军械而言**不是输出手段，而是"打它要付的代价"**（反击伤害，ADR-062 同时结算）。
> 因此**军械一律不能普通攻击**，且这条规则**由引擎按 `type` 强制**（`rules.ts` 的 `canAttack`：
> `u.type === 'machine'` → 直接拒绝），与基础弓兵「只能放箭」同一类**类型级**硬规则 ——
> 此前只靠每张卡自己挂一个 `jin_gong` 光环来落实，结果 3 张里漏了 2 张（楼船军／蒙冲斗舰仍能普攻）。
> 每张军械**仍应保留** `jin_gong` 光环：它提供卡面的「无法攻击」徽章，是玩家的可见反馈；
> 引擎那条类型规则是**兜底与唯一真源**，新增军械卡忘记写光环也不会出事。

升变费用从当前卡池定义读取原始形态和目标形态费用，不使用场上缓存费用或手牌减费。费用差 `d ≤ 1` 时免费；差额超出 1 的部分按 `max(0, d - 1)` 消耗统率。不返还负差额。统率不足时整个升变动作拒绝，不消耗资源、不改变单位。

通用 `modify` 效果可对主公增加攻击力；该效果仅支持 `duration: this_turn`，主公没有基础攻击力。获得正攻击力后可在己方当前回合普攻一次，不因重复加攻刷新次数，遵循架盾、不可选中、无法攻击等限制。攻击单位时受到其攻击力反击，攻击主公不反击。当前半回合结束时清除双方主公临时攻击力。本回合护甲使用 `gain_armor` 的 `duration: this_turn`；临时护甲优先吸收伤害，剩余临时护甲在当前半回合结束移除，永久护甲不受影响。

`adjacent_to: killer` 选择击杀者同排左右相邻单位；击杀者为主公或无来源时没有相邻单位。单位技能伤害也携带击杀来源，反伤不会因此误触发。蒙冲斗舰亡语先对击杀者造成 2 点火攻，再对其左右相邻单位各造成 1 点火攻。

## 魏国人物技能扩展（ADR-141，2026-10-09）

本轮魏国人物卡使用以下通用 DSL 能力：

- `grant_hand`：按手牌筛选器选择一张手牌，可同时修改其费用、攻击、生命并附加展示技能；`mode: highest_cost` 按当前卡面费用选取，费用相同使用确定性 RNG 打破平局。
- `value_from_discarded: cost` 在同一组效果中读取本次 `discard` 实际弃掉的牌的费用，不读取上一次效果残留的弃牌记录。
- 手牌筛选器支持 `tag`，场上筛选器支持 `types`（类型或集合）与 `basic_troop`（四种基础兵）。
- `value_from_status` 从来源单位身上的指定状态层数取值，供司马懿「蓄谋」等效果使用。
- 主动技能可声明 `requires.deck_tag` 牌库门槛；引擎、UI 与 AI 共用同一门控。
- `replace_lord` 以数据声明清除标签卡牌、替换主公定义和新主公技；清除单位不触发亡语，也不单独判定胜负。
- `same_side` 与 `played_rightmost` 用于限定“己方打出最右侧手牌”的触发技，避免敌方出牌或移除手牌后的索引漂移。

## 吴国人物技能扩展（ADR-142，2026-10-11）

本轮按吴国人物最终设计表更新李异、宋谦、朱然、祖茂、马忠、丁奉、韩当、黄盖、陆抗、孙坚、朱桓、甘宁、凌统、孙策和程普。除卡牌数据外，新增或收口以下通用 DSL 语义：

- `enemy_turn_start`：在行动方完成回合开始流程后，触发另一方的敌方回合开始技能；宋谦用它在敌方回合开始时永久增加攻击力。
- `on_water_damage`：其他己方来源实际造成水攻伤害后触发；触发来源单位会被排除，技能产生的额外水攻不会递归触发同一协同追击。经甘宁光环转换的普通攻击、战法、事件和主公技也按水攻处理。
- `water_convert`：甘宁光环授予己方单位，并把物理/无属性伤害转换为水攻；水攻强化在转换后再计算。
- `roll` 与 `condition.roll`：使用引擎确定性 RNG 记录一次概率结果，供黄盖「苦肉计」的成功分支复用，避免同一技能重复掷骰。
- `duration: until_full_health`：马忠「设伏」同时施加攻击力归零和震慑，目标恢复满生命时一起移除；治疗满血仍按正常治疗流程结算。
- `dingfeng_aura`：丁奉只强化光环生效后召唤的武将、谋臣和兵种；获得先攻，攻击力和生命上限各降低 1，最低保留 1，token 不被误强化。
- `shou_hu` 默认永久，来源单位离场后通过 `srcUid` 自动失效；祖茂「换帻」因此能保护任意选定友军，陈宫和周泰仍可通过显式时长覆盖该默认值。
- 普通攻击与主动伤害统一携带水攻转换结果，保证李异协同追击、蒋钦水攻强化等联动不因伤害入口不同而漂移。

## 魏国后期人物技能扩展（ADR-181，2026-10-13）

本轮新增司马师、司马昭、曹冲、曹叡和曹爽，并补充以下通用语义：

- `deck_tag`：效果条件统计当前己方牌库中带指定标签的卡牌数量，供司马昭判断曹氏宗亲是否已经从牌库中清空。
- `discover_modifiers`：发现选择完成后，按卡牌类型给进入手牌的牌附加费用、攻击或生命修正；曹叡用它区分谋臣与武将。
- `discover_tag_modifiers`：发现选择完成后，按卡牌标签附加手牌修正；曹爽用 `cao_clan` 标签只降低曹氏宗亲的统帅消耗。
- `send_hand_to_deck` 支持手牌人物过滤，曹叡只会把人物牌放回牌库底部。
- `discover_tactic_pair`：从手牌选择并弃置一张战法后，按原战法费用从魏国可构筑战法池（含公共战法）随机组成两张战法；优先精确费用配对，无法精确配对时允许相差 1；允许两张结果同名。
- 曹叡「知人善任」只接受手牌中的武将或谋臣，先将所选牌放到牌库底部，再从牌库随机展示 3 张人物牌供选择；选中的谋臣减 1 费，武将获得 +1/+1。
- 曹爽「宗亲辅政」从牌库随机发现 1 张人物牌；若选中牌带 `cao_clan` 标签，则减 1 费。其光环只检查其他曹氏宗亲，避免把自身重复计入条件。

## 吴国人物技能扩展（ADR-143，2026-10-12）

本轮更新太史慈、诸葛恪、鲁肃、陆逊、周瑜、潘璋、徐盛、董袭、陈武与张昭：

- 主动技能支持 `modes` 抉择；陆逊初版曾用它区分“引火”和“焚烧”，现已按 ADR-180 改用 `chain_damage` 连续相邻传播，不再抉择。
- `has_any_status` 选择器支持按多个状态的并集筛选；用于一次性命中“引火或灼烧”的敌方单位。
- `fire_damage` 状态能力为己方直接火攻伤害提供统一加成；持续伤害不重复吃该加成。
- `on_defend` 在防守单位受攻击、伤害结算前触发；`once_per_turn` 以敌方回合为周期，徐盛「疑城」按手牌中的武将与兵种数量动态获得临时攻击力。
- `on_ally_death` 在友军离场后触发，陈武「芦荡死战」据此获得攻击力成长。
- `discard_status_count` 按来源单位状态层数弃置手牌，手牌不足的部分从牌库顶铣除，并写入弃牌成功标记供后续效果使用。
- 拼点支持指定目标、记录目标拼点前攻击力及平局中立分支，周瑜「反间计」据此实现胜负与平局三分支。
- 先攻伤害主公时，董袭可从手牌免费上场并承受该次伤害；该路径在伤害重定向前处理，场上无空位时不消耗手牌，并通过对局级一次性标记保证「每局限一次」。
- 太史慈「神射」的单体指向效果锁定玩家选中的敌方单位，不开放主公目标；当前造成 3 点伤害，并使同一目标攻击力 -2 至己方回合结束。陆逊当前选择起火点后，沿同排连续相邻单位传播 2 点火攻，空位阻断、起火点不受伤害、每个目标只受一次伤害。

## 魏吴补充人物扩展（ADR-182，2026-10-14）

本轮按补充人物设计表新增魏国李典、庞德、郝昭、满宠、陈泰、牵招、王基、田豫、文聘、臧霸、陈群、钟繇、华歆、王朗，以及吴国阚泽、孙桓、顾雍、步骘、吕范、吕岱、朱治、朱据、孙韶、孙皓、滕胤、虞翻，并同步加入辎车衍生单位。

- `block_summon` 与 `wei_cheng_suo`：王基拼点成功后给敌方主公施加封锁，覆盖下个敌方回合新抽到的武将、兵种，避免只封当前手牌。
- `linkedUid`：庞德「死战」与孙桓「夷道牵制」把控制状态绑定到指定敌方武将；绑定目标阵亡后自动解除，状态仍可被驱散。
- `damaged_or_controlled`：陈泰只能选择受伤或处于震慑、禁锢、无法攻击、混乱、翻面状态的己方人物，再移动、治疗并清除控制。

## 吴魏战法与军械补充（2026-10-21）

- 蒙冲斗舰通过 `machine_attackable` 归属标签获得普通攻击例外；其他军械仍由 `canAttack` 的类型规则禁止普通攻击。
- `draw_random` 从己方牌库随机取出一张符合 `target.filter` 的牌加入手牌，用于魏国「求贤令」分别取得武将与谋臣。
- 吴国新增「吴舰齐射」「扎草为兵」「联刘抗曹」「铁锁横江」「火烧连营」五张战法；其中「火烧连营」复用 `chain_damage`，保证起火点、连续相邻传播和每目标一次的语义一致。
- 铁锁衍生物的 `iron_lock` 状态同时提供 `immune_all_damage` 与 `break_on_fire`：普通伤害不会移除铁锁，火攻会使其立即离场；`enemy_turn_end` 触发负责敌方回合结束失效，光环负责阻止敌方单位普攻。
- 魏国新增「望梅止渴」「屯田募兵」「虎豹突袭」「求贤令」「十面埋伏」「焚疑安众」「乌巢焚粮」七张战法；群雄新增「齐卒保帅」。

- `any_of`：支持“孙氏宗亲或武将”这类并集筛选，朱治因此可以从牌库发现符合任一条件的人物。
- `reveal_hand`：孙韶按己方统率上限+1（最高10）从敌方手牌中随机观察一张符合费用的牌；没有符合项时不产生展示事件。
- 直接写出虞翻与陈泰的五类控制状态驱散，避免 `remove_kind: debuff` 把灼烧、水困和中毒一并误清。

上述新增人物继续使用现有 `discover`、`clash`、`grant_hand`、`summon_random`、`on_ally_upgrade`、水攻/火攻与架盾能力，不在卡牌配置外硬编码数值。卡牌的费用、攻血、技能文案与背景设计已集中归档在 [魏吴人物卡牌设计 v3](../design-archives/魏吴人物卡牌设计_v3_2026-10-15.md)。旧补充人物 v1/v2 文档已整合清理。

## 吴国人物费用、身材与技能数值同步（ADR-183，2026-10-18）

吴国 46 张人物牌的当前费用、攻击、生命与类型统一见 [人物设计总表](../design-archives/魏吴人物卡牌设计_v3_2026-10-15.md)，数值以本轮明确调整项目和 `data/cards.yaml` 为准，旧版“保持不变”摘要中的冲突数值不再适用。

- 高费核心：周瑜 10/1/12；陆逊 9/5/8；孙坚 8/6/7、吕蒙 8/5/7、孙策 8/6/6、太史慈 8/5/7；周泰 7/4/8、黄盖 7/5/6、甘宁 7/5/6。
- 技能数值同步：全琮水攻 4；韩当治疗 4；太史慈神射伤害 3、减攻仍为 2；鲁肃资粮强化 +2/+2；诸葛恪战吼抽 3 张；诸葛瑾双方主公各恢复 4；阚泽下一次直接火攻 +3；步骘回合结束治疗 2；虞翻治疗 3。
- 周瑜「反间计」为每回合一次战技；按目标被消灭前攻击力伤害敌方主公，平局无效果。周泰保留架盾与不屈充能，不增加旧版浴血突围；陆逊保留 ADR-180 的相邻传播设计。
- 本次仅同步文档，不调整卡牌数据或引擎机制；特种兵和军械设计不在本轮范围内。

## 战法卡池收束与名称调整（ADR-187，2026-10-24）

- 删除吴国战法「借东风」与「火烧赤壁」，避免与当前火攻体系重复；移除仅服务于「借东风」的主公范围准备状态，保留阚泽使用的角色范围直接火攻准备能力。
- 「水军突袭」改名为「吴舰齐射」，4 费：可选择任意场上单位造成 6 点水攻伤害。
- 「铁锁横江」调整为 3 费；「火烧连营」保留 4 费并继续使用连续相邻火攻传播机制。
- 「虎豹突袭」调整为 7 费，同时召唤虎骑营和豹骑营。
- 魏国战法名称统一调整：「联盟抗曹」改为「联刘抗曹」；「唯才是举」改为「求贤令」；「焚书安众」改为「焚疑安众」。
- 删除「割发代首」；「宁我负人」改为群雄战法「齐卒保帅」，保留牺牲单位、主公恢复 3 点生命并抽 2 张牌的效果。

## 乌巢焚粮效果强化（ADR-189，2026-10-24）

- 「乌巢焚粮」调整为 4 费；结算时移除敌方牌库顶 1 张牌，并随机弃置敌方 1 张手牌。

## 扎草为兵（ADR-190，2026-10-24）

- 新增 5 费吴国战法「扎草为兵」：召唤 3 个 0/1 草兵，并使敌方所有场上单位在下个敌方回合无法普通攻击。
- 草兵为 `type: token` 衍生单位，不进入卡组；无法攻击状态复用 `jin_gong`，持续 1 个敌方回合。

## 八门金锁阵（ADR-191，2026-10-24）

- 新增 4 费魏国战法「八门金锁阵」：选择敌方场上单位，使其及同排左右紧邻的敌方单位获得震慑，持续至下个敌方回合结束；空位不补位、不延伸。
- 新增通用选择器 `target.opposite_of: TargetSelector`：先解析内层选择器，再从外层候选池保留位于内层单位另一方、同排同列的单位；内层为空或只含主公/手牌时无目标。沿用张郃「巧变」的正对位置定义，支持从任意一方施法。
- 此战法先施加震慑，再对实际带有震慑的受影响目标解析正对单位；己方这些单位永久获得 +2 攻击和先攻。不存在敌方单位的位置不会产生强化，后续进入该位置的单位不继承强化。
- 按设计者指定保留五字完整卡名，仅为此卡登记命名校验例外，其余卡牌仍执行 1–4 字限制。
