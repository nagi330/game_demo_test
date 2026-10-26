"use strict";
var Core = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    ACTIONS: () => ACTIONS,
    BASIC_TROOP_COPIES: () => BASIC_TROOP_COPIES,
    BOARD: () => BOARD,
    CARD_TYPES: () => CARD_TYPES,
    COMMAND: () => COMMAND,
    DECK: () => DECK,
    FORBIDDEN_KEYWORD_COMBOS: () => FORBIDDEN_KEYWORD_COMBOS,
    KEYWORDS: () => KEYWORDS,
    LORD_HP: () => LORD_HP,
    LORD_SKILL_COST: () => LORD_SKILL_COST,
    MATCH: () => MATCH,
    MAX_COPIES: () => MAX_COPIES,
    NON_DECK_TYPES: () => NON_DECK_TYPES,
    PLAYABLE_FACTIONS: () => PLAYABLE_FACTIONS,
    PUBLIC_POOL: () => PUBLIC_POOL,
    RARITIES: () => RARITIES,
    RETIRED_KEYWORDS: () => RETIRED_KEYWORDS,
    STATUSES: () => STATUSES,
    SUGGESTED_CURVE: () => SUGGESTED_CURVE,
    TAGS: () => TAGS,
    TIMING: () => TIMING,
    UNIQUE_COPIES: () => UNIQUE_COPIES,
    activeStatuses: () => activeStatuses,
    aiMulligan: () => aiMulligan,
    allUnits: () => allUnits,
    applyAction: () => applyAction,
    applyMods: () => applyMods,
    applyStatus: () => applyStatus,
    autoDeck: () => autoDeck,
    canAttack: () => canAttack,
    canPlayCard: () => canPlayCard,
    canUseLordSkill: () => canUseLordSkill,
    canUseUnitSkill: () => canUseUnitSkill,
    capOverride: () => capOverride,
    capStacks: () => capStacks,
    capValue: () => capValue,
    cardPool: () => cardPool,
    checkWinner: () => checkWinner,
    chooseAction: () => chooseAction,
    cloneState: () => cloneState,
    collectDamaged: () => collectDamaged,
    createMatch: () => createMatch,
    createRng: () => createRng,
    dealDamage: () => dealDamage,
    decide: () => decide,
    discardOverflow: () => discardOverflow,
    drawCard: () => drawCard,
    effectiveAttack: () => effectiveAttack,
    effectiveCost: () => effectiveCost,
    expireHandMods: () => expireHandMods,
    expireMods: () => expireMods,
    expireStatuses: () => expireStatuses,
    findByUid: () => findByUid,
    findGuard: () => findGuard,
    findLordGuard: () => findLordGuard,
    formatSummary: () => formatSummary,
    gainArmor: () => gainArmor,
    getUnit: () => getUnit,
    handLimit: () => handLimit,
    handOverflow: () => handOverflow,
    handRef: () => handRef,
    hasCap: () => hasCap,
    hasCapOn: () => hasCapOn,
    hasKeyword: () => hasKeyword,
    hasTrait: () => hasTrait,
    hashSeed: () => hashSeed,
    healTarget: () => healTarget,
    isBanned: () => isBanned,
    isBasicTroop: () => isBasicTroop,
    isDeckable: () => isDeckable,
    isMelee: () => isMelee,
    isPlayableBy: () => isPlayableBy,
    killUnit: () => killUnit,
    legalPlacements: () => legalPlacements,
    legalTargets: () => legalTargets,
    loadData: () => loadData,
    lordAlive: () => lordAlive,
    lordAttackTargets: () => lordAttackTargets,
    lordRef: () => lordRef,
    lordSkillTargetPlan: () => lordSkillTargetPlan,
    lordStatusStacks: () => lordStatusStacks,
    makeUnit: () => makeUnit,
    maxCopiesOf: () => maxCopiesOf,
    mulligan: () => mulligan,
    newMatch: () => newMatch,
    nextUidSeq: () => nextUidSeq,
    openColumns: () => openColumns,
    other: () => other,
    playTargetPlan: () => playTargetPlan,
    refAlive: () => refAlive,
    refHp: () => refHp,
    registerAfterDeathResolver: () => registerAfterDeathResolver,
    registerAfterDrawResolver: () => registerAfterDrawResolver,
    registerAfterLordDamagedResolver: () => registerAfterLordDamagedResolver,
    registerAfterUnitDamagedResolver: () => registerAfterUnitDamagedResolver,
    registerMarkDeathResolver: () => registerMarkDeathResolver,
    registerOnAllyDeathResolver: () => registerOnAllyDeathResolver,
    registerOnDeathResolver: () => registerOnDeathResolver,
    registerOnDrawResolver: () => registerOnDrawResolver,
    registerOnKillResolver: () => registerOnKillResolver,
    removeStatus: () => removeStatus,
    resolveTargets: () => resolveTargets,
    resolveTurnEndStatuses: () => resolveTurnEndStatuses,
    resolveTurnStartDamage: () => resolveTurnStartDamage,
    resolveTurnStartStatuses: () => resolveTurnStartStatuses,
    rollFirstSide: () => rollFirstSide,
    runEffects: () => runEffects,
    setLastDiscarded: () => setLastDiscarded,
    setUnit: () => setUnit,
    setupMatch: () => setupMatch,
    shieldUnits: () => shieldUnits,
    shrinkMaxHp: () => shrinkMaxHp,
    startHandSize: () => startHandSize,
    startMatch: () => startMatch,
    statusStacks: () => statusStacks,
    statusTurns: () => statusTurns,
    summarizeMatch: () => summarizeMatch,
    summonUnit: () => summonUnit,
    takeTurn: () => takeTurn,
    unitCount: () => unitCount,
    unitRef: () => unitRef,
    unitSkillTargetPlan: () => unitSkillTargetPlan,
    upgradeCommandCost: () => upgradeCommandCost,
    upgradeCost: () => upgradeCost,
    upgradeProgress: () => upgradeProgress,
    upgradeStatus: () => upgradeStatus,
    validateDeck: () => validateDeck
  });

  // src/rng.ts
  function createRng(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = s + 1831565813 >>> 0;
      let t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    return {
      getState: () => s,
      setState: (v) => {
        s = v >>> 0;
      },
      next,
      int: (n) => Math.floor(next() * n),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        return arr;
      }
    };
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // src/constants.ts
  var BOARD = {
    COLS: 8,
    ROWS: ["front"],
    MAX_UNITS: 8
  };
  var LORD_HP = 30;
  var COMMAND = { START: 1, MAX: 10 };
  var LORD_SKILL_COST = 2;
  var DECK = {
    SIZE: 30,
    /** 起手张数（ADR-087，设计者裁定）：**先手与后手同为 3 张**，
     *  各自在自己回合开始时再抽 1 张 → 双方第一次行动时都是 4 张手牌。
     *  原先后手 4 张 + 「后手补偿多抽 1 张」= 6 张，比先手多 2 张，实测明显偏多。 */
    HAND_START_FIRST: 3,
    HAND_START_SECOND: 3,
    HAND_LIMIT: 10,
    DRAW_PER_TURN: 1
  };
  var MATCH = {
    TURN_LIMIT: Infinity,
    /**
     * 每方回合时限（秒）。到点自动结束该方回合（ADR-065）。
     * 放在 core 而不是原型里 —— 它与「回合上限」「统率上限」同属对局规则常量。
     */
    TURN_SECONDS: 60
  };
  var KEYWORDS = {
    jia_dun: {
      name: "\u67B6\u76FE",
      implemented: true,
      note: "\u5632\u8BBD\uFF1A\u654C\u65B9\u666E\u901A\u653B\u51FB\u5FC5\u987B\u5148\u6253\u5B83\uFF08ADR-051\uFF09"
    },
    xian_gong: {
      name: "\u5148\u653B",
      implemented: true,
      note: "\u5165\u573A\u5F53\u56DE\u5408\u5373\u53EF\u884C\u52A8\u653B\u51FB\uFF08ADR-055 \u8BBE\u8BA1\u8005\u6F84\u6E05\uFF1A\u8FD9\u5C31\u662F\u5B83\u7684\u5168\u90E8\u542B\u4E49\uFF0C\u4E0E\u300C\u75BE\u884C\u300D\u662F\u540C\u4E00\u4E2A\uFF09"
    },
    lian_ji: {
      name: "\u8FDE\u51FB",
      implemented: true,
      note: "\u5F53\u524D\u56DE\u5408\u666E\u901A\u653B\u51FB\u53EF\u6267\u884C 2 \u6B21"
    },
    yi_ji: {
      name: "\u9057\u8BA1",
      implemented: true,
      note: "\u7C7B\u4EA1\u8BED\uFF1A\u9635\u4EA1\u65F6\u89E6\u53D1\u8BE5\u5361\u5B9A\u4E49\u7684 on_death \u903B\u8F91"
    },
    yin_xue: {
      name: "\u996E\u8840",
      implemented: true,
      note: "\u5BF9\u654C\u4EBA\u9020\u6210\u7684\u4F24\u5BB3\uFF0C\u4E3A\u8BE5\u5355\u4F4D\u81EA\u8EAB\u6062\u590D\u7B49\u91CF\u751F\u547D\uFF08ADR-057 \u8BBE\u8BA1\u8005\u5B9A\u7A3F\uFF1A\u56DE\u81EA\u5DF1\uFF0C\u4E0D\u56DE\u4E3B\u5C06\uFF09"
    },
    shen_she: {
      name: "\u795E\u5C04",
      implemented: false,
      note: "\u5BF9\u968F\u673A\u654C\u4EBA\u9020\u6210\u8FDC\u7A0B\u4F24\u5BB3\uFF0C\u4E14\u4E0D\u53D7\u5BF9\u65B9\u653B\u51FB\u5F71\u54CD\uFF08\u5F85\u5B9E\u73B0\uFF09"
    },
    qi_xi: {
      name: "\u5947\u88AD",
      implemented: false,
      note: "\u4E0A\u573A\u5148\u9690\u8EAB\uFF08\u4E0D\u80FD\u88AB\u9009\u5B9A\uFF09\uFF1B\u4E0B\u56DE\u5408\u53EF\u9009\u62E9\u884C\u52A8\u653B\u51FB\uFF0C\u6267\u884C\u8FC7\u884C\u52A8\u540E\u9690\u8EAB\u6D88\u5931\uFF08\u5F85\u5B9E\u73B0\uFF09"
    },
    zhong_yi: {
      name: "\u5FE0\u4E49",
      implemented: false,
      note: '\u514D\u75AB\u6DF7\u4E71\u3001\u79BB\u95F4\u7B49\u72B6\u6001\uFF08\u5F85\u5B9E\u73B0\u3002\u6CE8\uFF1A\u539F\u5B9E\u73B0\u8BEF\u505A\u6210"\u9635\u4EA1\u89E6\u53D1\u4EA1\u8BED"\uFF0C\u5DF2\u7EA0\u6B63\uFF09'
    },
    zhan_ji: {
      name: "\u6218\u6280",
      implemented: true,
      note: "\u6BCF\u56DE\u5408\u4E00\u6B21\u7684\u4E3B\u52A8\u6280\u80FD\uFF1B\u4F7F\u7528\u540E\u672C\u56DE\u5408\u4E0D\u80FD\u518D\u6B21\u4F7F\u7528\u8BE5\u6280\u80FD"
    },
    ji_li: {
      name: "\u6FC0\u52B1",
      implemented: true,
      note: "\u5DF1\u65B9\u4E3B\u516C\u6280\u5B8C\u6210\u7ED3\u7B97\u540E\u89E6\u53D1\uFF1B\u5177\u4F53\u6536\u76CA\u7531\u5361\u724C\u6280\u80FD\u5B9A\u4E49"
    },
    ju_du: {
      name: "\u5267\u6BD2",
      implemented: true,
      note: "\u8BE5\u5355\u4F4D\u9020\u6210\u4F24\u5BB3\u5E76\u5B9E\u9645\u547D\u4E2D\u540E\uFF0C\u76F4\u63A5\u6D88\u706D\u53D7\u4F24\u5355\u4F4D\uFF08\u53EA\u5BF9\u573A\u4E0A\u5355\u4F4D\u751F\u6548\uFF0C**\u5BF9\u4E3B\u5C06\u65E0\u6548**\uFF09"
    }
  };
  var RETIRED_KEYWORDS = {
    ji_xing: "\u75BE\u884C \u2014\u2014 \u4E0E\u300C\u5148\u653B\u300D\u662F\u540C\u4E00\u4E2A\u4E1C\u897F\uFF08\u8BBE\u8BA1\u8005\u88C1\u5B9A\uFF09\uFF0C\u5DF2\u5408\u5E76\uFF0C\u8BF7\u6539\u7528 xian_gong",
    fang_jian: "\u653E\u7BAD \u2014\u2014 \u5DF2\u6539\u4E3A\u5E26\u6709\u300C\u653E\u7BAD\u300D\u6280\u80FD\u540D\u7684\u6218\u6280\uFF0C\u4E0D\u518D\u4F5C\u4E3A\u81EA\u52A8\u89E6\u53D1\u5173\u952E\u8BCD",
    sheng_dun: "\u5723\u76FE \u2014\u2014 \u5173\u952E\u8BCD\u5DF2\u5220\u9664\uFF1B\u4E00\u6B21\u4F24\u5BB3\u514D\u75AB\u4FDD\u7559\u4E3A\u5185\u90E8\u72B6\u6001 sheng_dun_status",
    wu_shuang: "\u65E0\u53CC \u2014\u2014 \u8BBE\u8BA1\u8005\uFF1A\u6682\u65F6\u6CA1\u6709\u8FD9\u4E2A\u72B6\u6001",
    wu_sheng: "\u6B66\u5723 \u2014\u2014 \u8BBE\u8BA1\u8005\uFF1A\u5E9F\u5F03\u6B64\u540D\uFF08\u5173\u7FBD\u7684\u6280\u80FD\u540D\u7528\u300C\u6C34\u6DF9\u4E03\u519B\u300D\uFF09\uFF1B\u4E00\u6B21\u4F24\u5BB3\u514D\u75AB\u6539\u7531\u5185\u90E8\u72B6\u6001\u627F\u8F7D",
    jie_zhen: '\u7ED3\u9635 \u2014\u2014 \u8BBE\u8BA1\u8005\uFF1A\u79FB\u9664\u8BE5\u6548\u679C\uFF08\u5F15\u64CE\u91CC"\u76F8\u90BB\u6709\u53CB\u65B9\u6B65\u5175\u65F6 +1 \u653B"\u662F AI \u81EA\u5DF1\u63A8\u7684\uFF0C\u4ECE\u672A\u88AB\u8BBE\u8BA1\uFF09'
  };
  var TAGS = {
    xi_liang: { name: "\u897F\u51C9", note: "\u897F\u51C9\u51FA\u8EAB\uFF1A\u9A6C\u817E\u3001\u9A6C\u8D85\u3001\u9A6C\u5CB1" },
    man_zu: { name: "\u5357\u86EE", note: "\u5357\u65B9\u5F02\u65CF\uFF1A\u6C99\u6469\u67EF" },
    huang_jin: { name: "\u9EC4\u5DFE", note: "\u9EC4\u5DFE\u519B\u51FA\u8EAB\u6216\u5176\u65E7\u90E8" },
    // 黄巾统领：黄巾兵「黄巾众」按已方统领数量成长（ADR-120）。只算张角/张宝/张梁三位首领，
    // 不含周仓、张燕等「黄巾旧部」—— 故不能复用 huang_jin 标签（黄巾兵自己就带它，会自我循环）。
    huang_jin_tongling: { name: "\u9EC4\u5DFE\u7EDF\u9886", note: "\u9EC4\u5DFE\u9996\u9886\uFF1A\u5F20\u89D2\u3001\u5F20\u5B9D\u3001\u5F20\u6881" },
    // 黄巾众：黄巾的兵众（黄巾兵衍生物 + 黄巾力士）—— 统领上场时给它们永久 +1/+1（ADR-121）。
    // 与 huang_jin 分开：统领自己也带 huang_jin，不能拿它当「被统领带领的兵」的判据。
    huang_jin_zhong: { name: "\u9EC4\u5DFE\u4F17", note: "\u9EC4\u5DFE\u5175\u884D\u751F\u7269\u4E0E\u9EC4\u5DFE\u529B\u58EB" },
    // 袁氏（ADR-143）：**袁绍体系统一用这一个标签** —— 袁绍本人 + 他召唤的士族兵 + 将来的袁术。
    // ⚠️ 旧的 `shi_zu`（士族）**已作废删除**：它是早期设计，与袁氏体系重复且没有别的门阀在用。
    yuan_shi: { name: "\u8881\u6C0F", note: "\u8881\u7ECD\u4F53\u7CFB\uFF1A\u8881\u7ECD\u3001\u58EB\u65CF\u5175\uFF08\u8881\u672F\u5F85\u5165\u5E93\uFF09" },
    cao_clan: { name: "\u66F9\u6C0F\u5B97\u4EB2", note: "\u66F9\u64CD\u5B97\u65CF\u4EBA\u7269\uFF1A\u66F9\u6602\u3001\u66F9\u4F11\u3001\u66F9\u5F70\u3001\u66F9\u4EC1\u3001\u66F9\u4E15\u7B49" },
    sun_clan: { name: "\u5B59\u6C0F\u5B97\u4EB2", note: "\u5B59\u6C0F\u5B97\u4EB2\u4EBA\u7269\uFF1A\u5B59\u575A\u3001\u5B59\u7B56\u3001\u5B59\u5C1A\u9999\u3001\u5B59\u7FCA\u53CA\u5176\u540E\u7EE7\u8005" },
    machine_attackable: { name: "\u53EF\u653B\u51FB\u519B\u68B0", note: "\u5141\u8BB8\u6307\u5B9A\u519B\u68B0\u8FDB\u884C\u666E\u901A\u653B\u51FB" },
    // 董卓集团（ADR-182）：李儒是董卓帐下谋臣；董卓本人是主公（heroes.yaml），不在这张表里。
    dong_zhuo: { name: "\u8463\u5353", note: "\u8463\u5353\u96C6\u56E2\uFF08\u8463\u5353\u5E10\u4E0B\uFF09\uFF1A\u674E\u5112" }
  };
  var FORBIDDEN_KEYWORD_COMBOS = [
    ["jia_dun", "qi_xi"]
  ];
  var STATUSES = {
    zhen_fen: { name: "\u632F\u594B", kind: "buff", numeric: true, duration: "permanent", note: "\u653B\u51FB +N" },
    ji_jiu: { name: "\u6025\u6551", kind: "buff", numeric: true, duration: "permanent", note: "\u56DE\u5408\u5F00\u59CB\u6062\u590D N \u70B9\u751F\u547D" },
    jia_dun_status: { name: "\u67B6\u76FE", kind: "buff", numeric: false, duration: "conditional", note: "\u5632\u8BBD\uFF08ADR-051\uFF09" },
    xian_gong_status: {
      name: "\u5148\u653B",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      note: "\u5165\u573A\u5F53\u56DE\u5408\u5373\u53EF\u884C\u52A8\u653B\u51FB\uFF08ADR-055\uFF09"
    },
    qi_xi_status: { name: "\u5947\u88AD", kind: "buff", numeric: false, duration: "until_consumed", note: "\u4E0D\u80FD\u88AB\u6307\u5B9A\u4E3A\u76EE\u6807" },
    sheng_dun_status: {
      name: "\u62AB\u575A",
      kind: "buff",
      numeric: false,
      duration: "until_consumed",
      caps: ["immune_damage"],
      note: "\u62AB\u575A\uFF1A\u514D\u75AB\u4E00\u6B21\u4F24\u5BB3\uFF08\u539F\u300C\u5723\u76FE\u300D\uFF0CADR-103 \u8D77\u4E0D\u518D\u662F\u516C\u5F00\u5173\u952E\u8BCD\uFF1B\u89E6\u53D1\u540E\u6D88\u8017\uFF09"
    },
    hu_jia: { name: "\u62A4\u7532", kind: "buff", numeric: true, duration: "permanent", scope: "lord", note: "\u5438\u6536\u4F24\u5BB3" },
    zhen_she: {
      name: "\u9707\u6151",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_action"],
      note: "\u4E0D\u80FD\u666E\u653B\uFF0C\u4E5F\u4E0D\u80FD\u4F7F\u7528\u4E3B\u52A8\u6280"
    },
    hun_luan: {
      name: "\u6DF7\u4E71",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["random_target"],
      note: "\u666E\u653B\u4E0E\u4E3B\u52A8\u6280\u7684\u76EE\u6807\u5728**\u5168\u573A**\u4E2D\u968F\u673A\uFF08\u4E0D\u5206\u654C\u6211\uFF09"
    },
    zhen_wang: {
      name: "\u9635\u4EA1\u6807\u8BB0",
      kind: "debuff",
      numeric: false,
      duration: "permanent",
      note: "\u88AB\u6807\u8BB0\uFF1A\u9635\u4EA1\u65F6\u4E3A\u6807\u8BB0\u8005\u89E6\u53D1\u6548\u679C"
    },
    duan_chou: {
      name: "\u65AD\u62BD",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_draw"],
      note: "\u8BE5\u65B9\u672C\u56DE\u5408\u4E0D\u80FD\u62BD\u724C"
    },
    jue_dou: {
      name: "\u51B3\u6597",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["duel_lock"],
      note: "\u5355\u6311\u4E2D\uFF1A\u7B2C\u4E09\u65B9\u65E0\u6CD5\u5BF9\u5176\u51FA\u624B"
    },
    chou_di: {
      name: "\u4EC7\u654C",
      kind: "debuff",
      numeric: false,
      duration: "permanent",
      caps: ["mark_damage"],
      note: "\u88AB\u6CD5\u6B63\u6807\u8BB0\uFF1A\u53D7\u5230\u4F24\u5BB3\u65F6\u4E3A\u5176\u6307\u5B9A\u53CB\u65B9\u56DE\u8840"
    },
    jin_yan: {
      name: "\u7981\u8A00",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_lord_skill"],
      note: "\u8BE5\u65B9\u4E3B\u5E05\u4E0D\u80FD\u4F7F\u7528\u4E3B\u516C\u6280"
    },
    can_mou: {
      name: "\u53C2\u8C0B",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      scope: "lord",
      caps: ["extra_lord_skill"],
      note: "\u8BE5\u65B9\u4E3B\u5E05\u6BCF\u56DE\u5408\u4E3B\u516C\u6280\u6B21\u6570 +N"
    },
    shou_hu: {
      name: "\u5B88\u62A4",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["redirect_damage"],
      guard_scope: "any",
      note: "\u53D7\u5230\u7684\u4F24\u5BB3\u8F6C\u7531\u5B88\u62A4\u8005\u627F\u53D7\uFF08\u63F4\u62A4/\u5206\u62C5/\u62A4\u9A7E\u5171\u7528\uFF09"
    },
    hu_zhu: {
      name: "\u62A4\u4E3B",
      kind: "buff",
      numeric: false,
      duration: "turns",
      caps: ["redirect_damage"],
      guard_scope: "lord",
      note: "\u53EA\u628A**\u8BE5\u65B9\u4E3B\u5E05**\u53D7\u5230\u7684\u4F24\u5BB3\u8F6C\u7ED9\u5B88\u62A4\u8005\uFF08\u7956\u8302\u300C\u66FF\u4E3B\u300D\uFF0CADR-071\uFF09"
    },
    kong_cheng: {
      name: "\u7A7A\u57CE",
      kind: "buff",
      numeric: false,
      duration: "turns",
      scope: "lord",
      caps: ["untargetable", "immune_all_damage"],
      note: "\u8BE5\u65B9\u4E3B\u5E05**\u4E0D\u80FD\u88AB\u666E\u901A\u653B\u51FB\u6307\u5B9A\u4E3A\u76EE\u6807**\uFF0C\u4E14**\u514D\u75AB\u4E00\u5207\u4F24\u5BB3**\uFF08\u7A7A\u57CE\u8BA1\uFF0CADR-074 / ADR-156\uFF09\u3002\u26A0\uFE0F \u8DE8\u56DE\u5408\u7684\u4E3B\u516C\u514D\u75AB\u53EA\u80FD\u9760\u5B83 \u2014\u2014 `mian_shang` \u662F `this_turn`\uFF0C\u6491\u4E0D\u8FC7\u5F53\u524D\u534A\u56DE\u5408"
    },
    xiu_zheng: {
      name: "\u4F11\u6574",
      kind: "debuff",
      numeric: false,
      duration: "until_consumed",
      scope: "lord",
      caps: ["skip_turn"],
      note: "\u8BE5\u65B9\u4E0B\u4E00\u4E2A\u56DE\u5408\u6574\u4E2A\u88AB\u8DF3\u8FC7\uFF08\u4F11\u517B\u751F\u606F\u300C\u4E0B\u4E00\u56DE\u5408\u4E0D\u8FDB\u884C\u4EFB\u4F55\u6D3B\u52A8\u300D\uFF0CADR-074\uFF09"
    },
    jin_yong: {
      name: "\u7981\u7528",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_skill"],
      note: "\u4E0D\u80FD\u4F7F\u7528\u4E3B\u52A8\u6280\u4E0E\u89E6\u53D1\u6280\uFF08silence\uFF09"
    },
    jin_gu: {
      name: "\u7981\u9522",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_attack", "block_skill"],
      note: "\u4E0D\u80FD\u666E\u653B\u4E5F\u4E0D\u80FD\u7528\u4E3B\u52A8\u6280\uFF08\u9648\u5BAB\u300C\u5FE0\u70C8\u300D\u5BF9\u654C\u519B\u5206\u652F\uFF0CADR-069\uFF09"
    },
    jin_gong: {
      name: "\u65E0\u6CD5\u653B\u51FB",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      caps: ["block_attack"],
      note: "\u672C\u56DE\u5408\u4E0D\u80FD\u666E\u901A\u653B\u51FB"
    },
    wei_cheng_suo: {
      name: "\u56F4\u57CE\u5C01\u9501",
      kind: "debuff",
      numeric: false,
      duration: "until_enemy_turn_end",
      scope: "lord",
      caps: ["block_summon"],
      note: "\u4E0B\u4E2A\u654C\u65B9\u56DE\u5408\u4E0D\u80FD\u53EC\u5524\u6B66\u5C06\u548C\u5175\u79CD"
    },
    yi_dao_qian_zhi: {
      name: "\u5937\u9053\u7275\u5236",
      kind: "debuff",
      numeric: false,
      duration: "permanent",
      caps: ["block_action"],
      note: "\u4E0E\u5B59\u6853\u4E92\u76F8\u7275\u5236\uFF0C\u4EFB\u4E00\u65B9\u9635\u4EA1\u65F6\u89E3\u9664"
    },
    he_bing_target: {
      name: "\u5408\u5175\u76EE\u6807",
      kind: "debuff",
      numeric: false,
      duration: "this_turn",
      note: "\u674E\u5178\u672C\u56DE\u5408\u5F3A\u5316\u5DF1\u65B9\u6B66\u5C06\u5BF9\u8BE5\u76EE\u6807\u7684\u666E\u901A\u653B\u51FB"
    },
    si_zhan: {
      name: "\u6B7B\u6218",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["immune_debuff", "immune_control"],
      note: "\u5E9E\u5FB7\u9501\u5B9A\u6B7B\u654C\u540E\u514D\u75AB\u884C\u52A8\u63A7\u5236"
    },
    yin_cheng: {
      name: "\u56E0\u654C\u5236\u53D8",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["reduce_troop_damage", "thorns_machine"],
      note: "\u90DD\u662D\u9488\u5BF9\u5175\u79CD\u548C\u519B\u68B0\u7684\u5B88\u57CE\u9632\u5FA1"
    },
    jiang_fang: {
      name: "\u6C5F\u9632",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["immune_water_damage"],
      note: "\u5DF1\u65B9\u5355\u4F4D\u514D\u75AB\u6C34\u653B\u4F24\u5BB3"
    },
    fire_gong_ready: {
      name: "\u706B\u653B\u51C6\u5907",
      kind: "buff",
      numeric: true,
      duration: "until_consumed",
      caps: ["fire_damage_ready"],
      note: "\u4E0B\u4E00\u6B21\u76F4\u63A5\u706B\u653B\u4F24\u5BB3\u589E\u52A0N\u70B9"
    },
    zhuran_skill_lock: {
      name: "\u622A\u6C5F\u5C01\u6280",
      kind: "debuff",
      numeric: false,
      duration: "until_enemy_turn_end",
      caps: ["block_skill"],
      note: "\u6218\u6280\u88AB\u5C01\u9501\u81F3\u654C\u65B9\u4E0B\u4E2A\u56DE\u5408\u7ED3\u675F"
    },
    zhuran_lord_lock: {
      name: "\u622A\u6C5F\u5C01\u4E3B\u516C\u6280",
      kind: "debuff",
      numeric: false,
      duration: "until_enemy_turn_end",
      scope: "lord",
      caps: ["block_lord_skill"],
      note: "\u4E3B\u516C\u6280\u88AB\u5C01\u9501\u81F3\u654C\u65B9\u4E0B\u4E2A\u56DE\u5408\u7ED3\u675F"
    },
    ku_rou_fire_ready: {
      name: "\u82E6\u8089\u706B\u8BA1",
      kind: "buff",
      numeric: false,
      duration: "until_enemy_turn_end",
      note: "\u4E0B\u4E2A\u654C\u65B9\u56DE\u5408\u7ED3\u675F\u65F6\u89E6\u53D1\u706B\u653B"
    },
    pi_kun: { name: "\u75B2\u56F0", kind: "debuff", numeric: false, duration: "permanent", note: "\u6731\u6853\u4E0E\u5176\u6218\u6597\u65F6\u653B\u51FB\u529B+2" },
    attack_zero: {
      name: "\u4F0F\u51FB\u538B\u5236",
      kind: "debuff",
      numeric: false,
      duration: "conditional",
      caps: ["attack_zero"],
      note: "\u653B\u51FB\u529B\u56FA\u5B9A\u4E3A 0\uFF0C\u6062\u590D\u6EE1\u751F\u547D\u65F6\u89E3\u9664"
    },
    water_convert: {
      name: "\u6C34\u519B\u8F6C\u653B",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["water_convert"],
      note: "\u6765\u6E90\u7684\u7269\u7406/\u65E0\u5C5E\u6027\u4F24\u5BB3\u6539\u4E3A\u6C34\u653B"
    },
    dingfeng_aura: {
      name: "\u96EA\u4E2D\u7A81\u88AD",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["future_summon"],
      note: "\u540E\u7EED\u53EC\u5524\u7684\u5355\u4F4D\u83B7\u5F97\u5148\u653B\u4F46\u653B\u8840\u5404\u964D\u4F4E1"
    },
    iron_lock: {
      name: "\u94C1\u9501",
      kind: "buff",
      numeric: false,
      duration: "permanent",
      caps: ["immune_all_damage", "break_on_fire"],
      note: "\u514D\u75AB\u4F24\u5BB3\uFF1B\u53D7\u5230\u706B\u653B\u65F6\u5931\u6548"
    },
    die_at_turn_end: {
      name: "\u65AD\u540E",
      kind: "debuff",
      numeric: false,
      duration: "this_turn",
      caps: ["die_at_turn_end"],
      note: "\u672C\u56DE\u5408\u7ED3\u675F\u65F6\u9635\u4EA1"
    },
    shui_gong_bonus: {
      name: "\u6C34\u653B\u5F3A\u5316",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      caps: ["water_damage"],
      note: "\u6C34\u653B\u4F24\u5BB3 +N"
    },
    fire_gong_bonus: {
      name: "\u706B\u653B\u5F3A\u5316",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      caps: ["fire_damage"],
      note: "\u76F4\u63A5\u706B\u653B\u4F24\u5BB3 +N"
    },
    yin_huo: {
      name: "\u5F15\u706B",
      kind: "debuff",
      numeric: false,
      duration: "permanent",
      note: "\u9646\u900A\u706B\u70E7\u8FDE\u8425\u7684\u5F15\u706B\u6807\u8BB0"
    },
    jiao_kuang: {
      name: "\u9A84\u72C2",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      note: "\u8BF8\u845B\u606A\u56DE\u5408\u7ED3\u675F\u65F6\u6309\u5C42\u6570\u5F03\u724C\u5E76\u53D1\u52A8\u4E71\u51FB"
    },
    zi_liang: {
      name: "\u8D44\u7CAE",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      max_stacks: 3,
      note: "\u9C81\u8083\u4ED7\u4E49\u758F\u8D22\u7684\u53EF\u7528\u6B21\u6570"
    },
    teng_jia: {
      name: "\u85E4\u7532",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      caps: ["reduce_physical", "vulnerable_fire"],
      note: "\u53D7\u5230\u666E\u901A/\u65E0\u5C5E\u6027\u4F24\u5BB3 \u2212N\uFF08\u6700\u4F4E 0\uFF09\uFF0C\u53D7\u5230\u706B\u5C5E\u6027\u4F24\u5BB3 +N\uFF08ADR-108\uFF1BADR-110 \u5220\u53CD\u4F24\u5C42\uFF09"
    },
    zhong_yong_status: {
      name: "\u5FE0\u52C7",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      caps: ["thorns"],
      note: "\u53D7\u5230**\u666E\u901A\u653B\u51FB**\u5E76\u5B9E\u9645\u53D7\u4F24\u540E\uFF0C\u5BF9\u653B\u51FB\u8005\u989D\u5916\u9020\u6210 N \u70B9\u4F24\u5BB3\uFF08\u4E0E\u81EA\u52A8\u53CD\u51FB\u5206\u5F00\u7ED3\u7B97\uFF1B\u6280\u80FD\u4F24\u5BB3\u4E0D\u89E6\u53D1\uFF09\u3002ADR-110 \u91CA\u653E\u7684 thorns cap \u7684\u9996\u4E2A\u4F7F\u7528\u8005"
    },
    xu_mou: {
      name: "\u84C4\u8C0B",
      kind: "buff",
      numeric: true,
      duration: "permanent",
      max_stacks: 3,
      note: "\u53F8\u9A6C\u61FF\u672A\u884C\u52A8\u65F6\u79EF\u7D2F\uFF1B\u884C\u52A8\u5E76\u9020\u6210\u4F24\u5BB3\u540E\u8F6C\u4E3A\u8303\u56F4\u4F24\u5BB3"
    },
    bu_qu: {
      name: "\u4E0D\u5C48",
      kind: "buff",
      numeric: true,
      duration: "until_consumed",
      replenish_on_full_health: true,
      note: "\u53D7\u5230\u81F4\u547D\u4F24\u5BB3\u65F6\u6D88\u8017\u4E00\u5C42\u5E76\u4FDD\u75591\u70B9\u751F\u547D\uFF1B\u6062\u590D\u6EE1\u8840\u540E\u8865\u56DE\u4E00\u5C42"
    },
    shui_kun: {
      name: "\u6C34\u56F0",
      kind: "debuff",
      numeric: true,
      duration: "permanent",
      caps: ["damage_on_action", "stage_up"],
      stack_mode: "max",
      note: "**\u5C42\u6570\uFF1D\u9636\u6BB5**\uFF08\u5FBD\u7AE0\u4E0A\u7684\u6570\u5B57\u5C31\u662F\u9636\u6BB5\uFF09\u3002\u2460 \u53EA\u6709**\u4E3B\u52A8\u884C\u52A8**\uFF08\u666E\u653B/\u4E3B\u52A8\u6280\uFF09\u624D\u53D7\u6C34\u4F24\uFF0C\u6570\u503C = 2^(\u9636\u6BB5-1)\uFF1A\u9636\u6BB5 1/2/3/4 \u2192 1/2/4/8\uFF0C**\u65E0\u4E0A\u9650**\uFF1B\u4E0D\u884C\u52A8\u5219\u5B8C\u5168\u4E0D\u53D7\u4F24 \u2461 \u9636\u6BB5\u5728\u8BE5\u65B9**\u56DE\u5408\u7ED3\u675F\u65F6 +1**\uFF08\u65BD\u52A0\u5F53\u56DE\u5408\u4E3A\u9636\u6BB5 1\uFF09\u2462 **\u6C38\u4E45**\uFF0C\u76F4\u5230\u88AB\u51C0\u5316\uFF1B\u91CD\u590D\u65BD\u52A0\u53D6\u8F83\u5927\u8005\u3001\u4E0D\u964D\u7EA7\u3002\u89C1 GDD 10 \xA73.2.2\uFF08ADR-116/132\uFF09"
    },
    mian_shang: { name: "\u514D\u4F24", kind: "buff", numeric: false, duration: "this_turn", caps: ["immune_all_damage"], scope: "lord", note: "\u5F53\u524D\u56DE\u5408\u514D\u75AB\u6240\u6709\u4F24\u5BB3" },
    mian_yi: {
      name: "\u514D\u75AB",
      kind: "buff",
      numeric: false,
      duration: "turns",
      caps: ["immune_debuff", "untargetable"],
      note: "\u514D\u75AB\u8D1F\u9762\u72B6\u6001\uFF0C\u4E14\u4E0D\u80FD\u88AB\u6307\u5B9A\u4E3A\u76EE\u6807"
    },
    fan_mian: {
      name: "\u7FFB\u9762",
      kind: "debuff",
      numeric: false,
      duration: "conditional",
      caps: ["block_action", "untargetable"],
      note: "\u88AB\u7FFB\u9762\uFF1A\u5F53\u56DE\u5408\u4E0D\u80FD\u884C\u52A8\u3001\u4E0D\u80FD\u88AB\u6307\u5B9A\u4E3A\u76EE\u6807\uFF1B\u81EA\u5DF1\u7684\u4E0B\u4E2A\u56DE\u5408\u5F00\u59CB\u65F6\u7FFB\u56DE\u6B63\u9762\uFF08ADR-059\uFF09"
    },
    // ADR-117 拆名：zhuo_shao = 火（永久、不封顶）；zhong_du = 毒。
    // ADR-132 重做：灼烧时机由"回合末"改到"**回合开始**"（三系节奏错开）；
    //               中毒不再是"回合末受 N 点毒伤"，改为"回合末**永久降低 N 点生命上限**"。
    zhuo_shao: {
      name: "\u707C\u70E7",
      kind: "debuff",
      numeric: true,
      duration: "permanent",
      caps: ["dot_fire"],
      note: "\u8BE5\u65B9**\u56DE\u5408\u5F00\u59CB\u65F6**\u53D7 N \u70B9\u706B\u5C5E\u6027\u4F24\u5BB3\uFF08N = \u5C42\u6570\uFF09\u2014\u2014 \u56DE\u5408\u7684\u7B2C\u4E00\u6B65\uFF0C\u65E9\u4E8E\u7EDF\u7387\u56DE\u6EE1/\u62BD\u724C/\u4EFB\u4F55\u884C\u52A8\uFF1B\u5C42\u6570\u53E0\u52A0**\u4E0D\u5C01\u9876**\u3001**\u6C38\u4E45**\uFF08\u53EF\u51C0\u5316\uFF0C\u4E0D\u81EA\u7136\u5230\u671F\uFF09\u3002**\u6765\u6E90\uFF1A\u5BF9\u654C\u65B9\u91CA\u653E\u7684\u706B\u653B\u6548\u679C\u5404 +1 \u5C42**\uFF08ADR-134\uFF0C\u6302\u5728\u6548\u679C\u5C42\u89C1 `effects.ts` \u7684 damage \u5206\u652F\uFF09\u2014\u2014 \u6BCF\u6B21\u706B\u653B\u6548\u679C\u5404\u7B97\u4E00\u6B21\u3001\u4E0E\u4F24\u5BB3\u6570\u503C\u65E0\u5173\uFF0C\u706B\u653B\u88AB\u51CF\u5230 0 \u4E5F\u7167\u6302\uFF1B**\u6253\u81EA\u5DF1\u4EBA/\u81EA\u8EAB\u4E0D\u6302**\uFF08\u8499\u51B2\u6597\u8230\u81EA\u635F\u6BB5\u53EA\u6389\u8840\uFF09\uFF0C**DoT \u8DF3\u4F24\u672C\u8EAB\u4E0D\u8BA1**\uFF08\u5426\u5219\u6BCF\u56DE\u5408\u81EA\u6211\u53E0\u5C42\u3001\u65E0\u9650\u589E\u957F\uFF09\u3002\u4E09\u7CFB\u8282\u594F\uFF1A\u56DE\u5408\u5F00\u59CB\uFF1D\u707C\u70E7\uFF08\u706B\uFF09\uFF0F\u884C\u52A8\u65F6\uFF1D\u6C34\u56F0\uFF08\u6C34\uFF09\uFF0F\u56DE\u5408\u7ED3\u675F\uFF1D\u4E2D\u6BD2\uFF08\u6BD2\uFF09\u3002\uFF08ADR-108 \u8D77\u6309 fire \u7ED3\u7B97\uFF1BADR-116 \u8D77\u7531 dot_fire \u80FD\u529B\u9A71\u52A8\uFF1BADR-117 \u7531 zhong_du \u6539\u540D\uFF1BADR-132 \u6539\u65F6\u673A\uFF1BADR-134 \u5168\u5C40\u6302\u5C42\uFF09"
    },
    zhong_du: {
      name: "\u4E2D\u6BD2",
      kind: "debuff",
      numeric: true,
      duration: "permanent",
      caps: ["shrink_max_hp"],
      note: "\u8BE5\u65B9\u56DE\u5408\u7ED3\u675F\u65F6**\u6C38\u4E45\u964D\u4F4E N \u70B9\u751F\u547D\u4E0A\u9650**\uFF08N = \u5C42\u6570\uFF0CADR-132\uFF09\uFF1B**\u4E0D\u9020\u6210\u4F24\u5BB3**\uFF1B\u5C42\u6570\u53E0\u52A0**\u4E0D\u5C01\u9876**\u3001**\u6C38\u4E45**\uFF08\u51C0\u5316\u540E\u505C\u6B62\uFF0C\u5DF2\u524A\u7684\u4E0D\u6062\u590D\uFF09\u3002\u524A\u5B8C\u5F53\u524D\u751F\u547D\u9AD8\u4E8E\u65B0\u4E0A\u9650\u5219\u5939\u5230\u65B0\u4E0A\u9650\uFF0C\u4E0A\u9650\u5F52\u96F6\u5373\u9635\u4EA1\u3002\u53EA\u6709\u573A\u4E0A\u5355\u4F4D\u4F1A\u4E2D\u6BD2\uFF0C\u4E3B\u516C\u514D\u75AB\uFF08ADR-117\uFF09"
    },
    xu_ruo: { name: "\u865A\u5F31", kind: "debuff", numeric: true, duration: "turns", note: "\u653B\u51FB \u2212N" },
    duan_liang: { name: "\u65AD\u7CAE", kind: "debuff", numeric: true, duration: "turns", scope: "lord", note: "\u7EDF\u7387\u4E0A\u9650 \u2212N" },
    anjian_status: {
      name: "\u6697\u7BAD",
      kind: "debuff",
      numeric: false,
      duration: "permanent",
      scope: "lord",
      note: "\u9EC4\u7956\u5E03\u4E0B\u7684\u516C\u5F00\u6697\u7BAD\uFF1A\u654C\u65B9\u4E0B\u4E00\u4E2A\u6253\u51FA\u7684\u4EBA\u7269\u843D\u5730\u540E\u53D7 3 \u70B9\u4F24\u5BB3\uFF0C\u968F\u5373\u6D88\u5931\uFF08ADR-200\uFF09"
    },
    gong_qing_pending: {
      name: "\u516C\u537F\u5C3D\u8D28\xB7\u5F85\u52AB",
      kind: "debuff",
      numeric: false,
      duration: "turns",
      scope: "lord",
      note: "\u654C\u65B9\u56DE\u5408\u7ED3\u675F\u65F6\u68C0\u67E5\u624B\u724C\uFF0C\u82E5\u591A\u4E8E\u90ED\u6C5C\u65B9\u5219\u88AB\u593A 1 \u5F20"
    }
  };
  var TIMING = {
    TURN_START: "turn_start",
    DRAW: "draw",
    ON_PLAY: "on_play",
    ON_DEATH: "on_death",
    ON_DAMAGED: "on_damaged",
    TURN_END: "turn_end",
    ENEMY_TURN_END: "enemy_turn_end",
    ENEMY_TURN_START: "enemy_turn_start",
    ON_ATTACK: "on_attack",
    AFTER_ATTACK: "after_attack",
    ON_LORD_DAMAGED: "on_lord_damaged",
    ON_DEFEND: "on_defend",
    ON_LETHAL: "on_lethal",
    ON_CARD_PLAYED: "on_card_played",
    ON_MARK_DAMAGED: "on_mark_damaged",
    ON_MARK_DEATH: "on_mark_death",
    ON_KILL: "on_kill",
    // 击杀者视角：每次击杀时（ADR-070）
    ON_ALLY_DAMAGED: "on_ally_damaged"
    // 友方受伤时（ADR-193，蔡文姬「悲愤成诗」）
  };
  var ACTIONS = [
    "damage",
    "heal",
    "draw",
    "summon",
    "apply_status",
    "remove_status",
    "move",
    "destroy",
    "modify",
    "gain_armor",
    "gain_command",
    "cost_modifier",
    "transform",
    "random_transform",
    "grant_card_keyword",
    "random_pick",
    "discard",
    "return_to_hand",
    "clash",
    "flip",
    "scry",
    "ban_play",
    "steal_card",
    "survive",
    "extra_attack",
    "take_control",
    "copy_skill",
    "force_attack",
    "duel",
    "scheme_duel",
    "attack_bonus",
    // 普通攻击结算前的临时伤害加成
    "cast_random",
    // 从卡池随机取 N 张直接释放（ADR-162，庞统「连环」）
    "add_to_deck",
    "add_to_hand",
    // 往牌库随机位置塞 N 张指定卡（ADR-050）
    "send_to_deck",
    // 把牌库里剩下的指定牌全塞给对方（ADR-050）
    "cycle_to_deck",
    // 手牌放回牌库随机位置再抽 1 张（ADR-050）
    "sacrifice",
    // 牺牲一个己方单位，把它的 maxHp/hp 写进 flags（ADR-071，程昱）
    "attack_each",
    // 挨个发动**真正的普攻**（含反击），自己阵亡即停（ADR-071，张苞）
    "draw_until",
    // 一直抽到抽出一张「非某类型」的牌为止（ADR-071，姜维）
    "roll",
    // 生成可供后续 condition.roll 读取的确定性概率结果
    "mill",
    // 弃掉目标方牌库的 N 张牌（ADR-074，司马懿「谋定后动」②）
    "discover",
    // 从牌库随机展示候选牌并由玩家选择（曹丕）
    "draw_random",
    // 从牌库随机取一张符合条件的牌加入手牌
    "discover_tactic_pair",
    // 弃置一张战法后按其费用随机获得两张指定阵营可构筑战法（曹冲）
    "send_hand_to_deck",
    // 把一张手牌放回牌库顶/底/随机位置，**不抽牌**（ADR-139，杨仪「筹度粮谷」）
    "self_to_hand",
    // 阵亡后把手牌重建出来（ADR-141，孟获「蛮王」——亡语作用于**阵亡单位自身**）
    "defect_to_deck",
    // 叛变：阵亡后换成另一张卡进对手牌库随机位置（ADR-174，糜芳「叛迎」）
    "deploy_from_hand",
    // 手牌 → 场上（免费，按 card_id 精准搬牌；ADR-149，诸葛瞻/诸葛尚「同赴」）
    "deploy_from_deck",
    // 牌库 → 场上（免费，按 card_id 精准搬牌；何进「诏召猛将」）
    "discard_status_count",
    // 按状态层数弃牌，不足时铣牌库
    "steal_attack",
    // 临时夺取目标攻击力（张绣「盗戟夜袭」）
    "override_rule",
    // 覆盖**无状态**的规则档位（ADR-150，木鹿大王「象兵统领」抬概率）
    "override_status",
    // 覆盖目标身上某状态的若干档位（ADR-142，兀突骨「藤甲统率」）
    "summon_random",
    // 从候选列表随机召唤一个单位
    "reveal_hand",
    // 观察对手手牌中的指定费用牌（孙韶）
    "chain_damage",
    // 从起火点沿相邻站位向外传播伤害（陆逊）
    "grant_hand",
    // 强化一张手牌
    "replace_lord"
    // 清除指定标签并替换主公
  ];
  var RARITIES = ["common", "elite"];
  var CARD_TYPES = [
    "troop",
    "general",
    "strategist",
    "machine",
    "event",
    "tactic",
    "elite",
    "special",
    "lord",
    // 主将卡：开局置于主将位，不进卡组（ADR-044）
    "token",
    // 衍生物：只能由效果召唤，不可组入卡组（ADR-044）
    "status"
    // 状态卡：持续性全局效果，置于状态区（ADR-044）
  ];
  var NON_DECK_TYPES = ["elite", "lord", "token", "status", "special"];

  // src/state.ts
  function rollFirstSide(rng) {
    for (let i = 0; i < 100; i++) {
      const own = rng.int(6) + 1;
      const enemy = rng.int(6) + 1;
      if (own !== enemy) return { side: own > enemy ? "own" : "enemy", own, enemy };
    }
    return { side: "own", own: 6, enemy: 1 };
  }
  function createMatch(opts) {
    const {
      // 后手补偿默认关闭（ADR-087）：起手双方同为 3 张，不再额外多抽
      seed = 1,
      lords,
      decks,
      cards,
      secondCompensation = "none"
    } = opts;
    const rng = createRng(seed);
    const firstSide = opts.rollFirst ? rollFirstSide(rng).side : opts.firstSide ?? "own";
    const makeSide = (side) => {
      const lordCard = lords[side];
      const deck = rng.shuffle([...decks[side]]);
      const handSize = side === firstSide ? DECK.HAND_START_FIRST : DECK.HAND_START_SECOND;
      const hand = [];
      for (let i = 0; i < handSize && deck.length; i++) {
        const id = deck.pop();
        const c = cards.get(id);
        if (c) hand.push({ card: c, mods: [] });
      }
      return {
        lord: {
          id: lordCard.id,
          name: lordCard.name,
          faction: lordCard.faction,
          hp: LORD_HP,
          maxHp: LORD_HP,
          armor: 0,
          skill: lordCard.skill ?? "",
          skillDef: lordCard.skillDef,
          skillUsedThisTurn: false
        },
        rows: {
          // ADR-051：仅 front 一排参与游戏（8 格）；back 保留为空壳以免大改
          front: new Array(BOARD.COLS).fill(null),
          back: new Array(BOARD.COLS).fill(null)
        },
        hand,
        deck,
        discard: [],
        fallen: [],
        // ADR-160：本局阵亡过的卡 id（has_fallen 条件读它）
        command: { cur: COMMAND.START, max: COMMAND.START },
        fatigue: 0,
        mulliganDone: false
      };
    };
    return {
      seed,
      uidSeq: 0,
      rngState: rng.getState(),
      turn: 1,
      // 完整回合数：开局即第 1 个完整回合
      halfTurn: 0,
      // 半回合数：第一次 startTurn 后变 1
      active: firstSide,
      secondCompensation,
      sides: { own: makeSide("own"), enemy: makeSide("enemy") },
      winner: null
    };
  }
  var cloneState = (s) => structuredClone(s);
  var other = (side) => side === "own" ? "enemy" : "own";
  var getUnit = (s, side, row, col) => s.sides[side].rows[row][col] ?? null;
  function setUnit(s, side, row, col, u) {
    s.sides[side].rows[row][col] = u;
  }
  function allUnits(s, side) {
    const out = [];
    for (const row of BOARD.ROWS) {
      s.sides[side].rows[row].forEach((unit, col) => {
        if (unit) out.push({ side, row, col, unit });
      });
    }
    return out;
  }
  function findByUid(s, uid) {
    for (const side of ["own", "enemy"]) {
      for (const row of BOARD.ROWS) {
        const arr = s.sides[side].rows[row];
        for (let col = 0; col < arr.length; col++) {
          const u = arr[col];
          if (u && u.uid === uid) return { side, row, col, unit: u };
        }
      }
    }
    return null;
  }
  var unitCount = (s, side) => allUnits(s, side).length;
  var hasKeyword = (u, kw) => !!u && u.kw.includes(kw);
  var statusStacks = (u, id) => u?.statuses[id]?.stacks ?? 0;
  var lordStatusStacks = (l, id) => l?.statuses?.[id]?.stacks ?? 0;
  var statusTurns = (u, id) => u?.statuses[id]?.turns;
  function hasTrait(u, keyword) {
    if (!u) return false;
    if (u.kw.includes(keyword)) return true;
    const st = u.statuses[`${keyword}_status`];
    return !!st && st.stacks > 0;
  }
  function hasCap(u, cap) {
    if (!u) return false;
    return hasCapOn(u.statuses, cap);
  }
  function hasCapOn(statuses, cap) {
    for (const [id, inst] of Object.entries(statuses ?? {})) {
      if (inst.stacks <= 0) continue;
      if (STATUSES[id]?.caps?.includes(cap)) return true;
    }
    return false;
  }
  function capStacks(statuses, cap) {
    let n = 0;
    for (const [id, inst] of Object.entries(statuses ?? {})) {
      if (inst.stacks > 0 && STATUSES[id]?.caps?.includes(cap)) n += inst.stacks;
    }
    return n;
  }
  function capOverride(u, cap) {
    let v;
    for (const m of u?.mods ?? []) {
      if (m.kind !== "rule" || !m.rule || m.rule.cap !== cap) continue;
      if (m.rule.statusId !== void 0 && !((u?.statuses[m.rule.statusId]?.stacks ?? 0) > 0)) continue;
      v = m.rule.value;
    }
    return v;
  }
  function capValue(u, cap) {
    return capOverride(u, cap) ?? capStacks(u.statuses, cap);
  }
  var activeStatuses = (u) => Object.entries(u?.statuses ?? {}).filter(([, v]) => v.stacks > 0).map(([k]) => k);
  var shieldUnits = (s, side) => allUnits(s, side).filter(({ unit }) => hasTrait(unit, "jia_dun") && unit.hp > 0);
  var lordAlive = (s, side) => s.sides[side].lord.hp > 0;
  function openColumns(s, side) {
    const out = [];
    for (let c = 0; c < BOARD.COLS; c++) {
      if (!s.sides[side].rows.front[c] && !s.sides[side].rows.back[c]) out.push(c);
    }
    return out;
  }
  function makeUnit(card, turn, seq) {
    return {
      uid: `${card.id}#${seq}`,
      cardId: card.id,
      name: card.name,
      type: card.type,
      faction: card.faction,
      cost: card.cost,
      baseAtk: card.attack ?? 0,
      baseMaxHp: card.health ?? 1,
      mods: [],
      atk: card.attack ?? 0,
      hp: card.health ?? 1,
      maxHp: card.health ?? 1,
      troopKind: card.troopKind,
      upgradeProgress: {
        damage: 0,
        shieldSurvival: 0,
        basicKills: 0,
        characterKills: 0,
        heroHits: 0
      },
      gender: card.gender,
      kw: [...card.keywords ?? []],
      tags: [...card.tags ?? []],
      statuses: {},
      skills: card.skills ? structuredClone(card.skills) : void 0,
      attackedThisTurn: 0,
      actedThisTurn: false,
      dealtDamageThisTurn: false,
      enteredTurn: turn,
      skillUsesThisTurn: {},
      skillsUsedOnce: []
    };
  }
  function upgradeProgress(u) {
    u.upgradeProgress ??= {
      damage: 0,
      shieldSurvival: 0,
      basicKills: 0,
      characterKills: 0,
      heroHits: 0
    };
    return u.upgradeProgress;
  }
  var isBasicTroop = (u) => u.type === "troop" && (u.cardId === "neutral_infantry" || u.cardId === "neutral_shieldman" || u.cardId === "neutral_archer" || u.cardId === "neutral_cavalry");
  function applyMods(u) {
    const dAtk = u.mods.reduce((s, m) => s + (m.attack ?? 0), 0);
    const dHp = u.mods.reduce((s, m) => s + (m.health ?? 0), 0);
    const newMax = Math.max(1, u.baseMaxHp + dHp);
    const delta = newMax - u.maxHp;
    u.atk = Math.max(0, u.baseAtk + dAtk);
    u.maxHp = newMax;
    if (u.hp > 0) u.hp = Math.max(1, Math.min(newMax, u.hp + delta));
  }
  function nextUidSeq(state) {
    state.uidSeq += 1;
    return state.uidSeq;
  }

  // src/rules.ts
  var isMelee = (u) => u.type !== "strategist" && !hasTrait(u, "shen_she");
  function needsHandPick(skill) {
    const scan = (effs) => (effs ?? []).some((e) => e.action === "discard" && e.mode === "choose" || e.action === "cycle_to_deck");
    if (scan(skill.effects)) return true;
    return (skill.modes ?? []).some((m) => scan(m.effects));
  }
  function canUseUnitSkill(state, side, row, col, skillId, cards) {
    const u = getUnit(state, side, row, col);
    if (!u) return { ok: false, reason: "\u8BE5\u683C\u6CA1\u6709\u5355\u4F4D" };
    if (hasCap(u, "block_action") || hasCap(u, "block_skill")) return { ok: false, reason: "\u88AB\u7981\u7528\u6280\u80FD" };
    const skill = (u.skills ?? []).find((sk) => sk.kind === "active" && (!skillId || sk.id === skillId));
    if (!skill) return { ok: false, reason: "\u6CA1\u6709\u4E3B\u52A8\u6280" };
    const key = skill.id || skill.name || "0";
    const freq = skill.frequency ?? "once_per_turn";
    if (freq === "once" && u.skillsUsedOnce.includes(key)) return { ok: false, reason: "\u672C\u5C40\u5DF2\u7528\u8FC7" };
    if (freq === "once_per_turn" && (u.skillUsesThisTurn[key] ?? 0) >= 1) {
      return { ok: false, reason: "\u672C\u56DE\u5408\u5DF2\u7528\u8FC7" };
    }
    if (state.sides[side].command.cur < (skill.cost ?? 0)) return { ok: false, reason: "\u7EDF\u7387\u503C\u4E0D\u8DB3" };
    if (needsHandPick(skill) && state.sides[side].hand.length === 0) {
      return { ok: false, reason: "\u624B\u724C\u4E3A\u7A7A\uFF0C\u6CA1\u6709\u53EF\u4EE5\u5F03\u6389\u7684\u724C" };
    }
    const req = skill.requires?.deck_tag;
    if (req && cards) {
      const count = state.sides[side].deck.reduce((n, id) => n + ((cards.get(id)?.tags ?? []).includes(req.tag) ? 1 : 0), 0);
      const ok = req.op === ">=" ? count >= req.value : req.op === "<=" ? count <= req.value : req.op === "==" ? count === req.value : req.op === ">" ? count > req.value : req.op === "<" ? count < req.value : count !== req.value;
      if (!ok) return { ok: false, reason: `\u724C\u5E93\u4E2D${req.tag}\u6570\u91CF\u4E0D\u6EE1\u8DB3\u53D1\u52A8\u6761\u4EF6` };
    }
    const statusReq = skill.requires?.status;
    if (statusReq && (u.statuses[statusReq.id]?.stacks ?? 0) < (statusReq.min ?? 1)) {
      return { ok: false, reason: `\u9700\u8981${statusReq.id}\u72B6\u6001` };
    }
    return { ok: true, skill };
  }
  function canUseLordSkill(state, side) {
    const lord = state.sides[side].lord;
    const skill = lord.skillDef;
    if (!skill || skill.kind !== "active") return { ok: false, reason: "\u6CA1\u6709\u4E3B\u52A8\u578B\u4E3B\u516C\u6280" };
    if (hasCapOn(lord.statuses, "block_lord_skill")) return { ok: false, reason: "\u4E3B\u516C\u6280\u88AB\u5C01\u9501\uFF08\u8FDB\u8A00\uFF09" };
    if (lord.skillUsedThisTurn && capStacks(lord.statuses, "extra_lord_skill") <= 0) {
      return { ok: false, reason: "\u672C\u56DE\u5408\u5DF2\u7528\u8FC7" };
    }
    const cost = skill.cost ?? LORD_SKILL_COST;
    if (state.sides[side].command.cur < cost) return { ok: false, reason: "\u7EDF\u7387\u503C\u4E0D\u8DB3" };
    return { ok: true, skill };
  }
  function canAttack(state, side, row, col) {
    const u = getUnit(state, side, row, col);
    if (!u) return { ok: false, reason: "\u8BE5\u683C\u6CA1\u6709\u4EBA\u7269\u5361" };
    if (u.cardId === "neutral_archer") return { ok: false, reason: "\u5F13\u5175\u53EA\u80FD\u653E\u7BAD\uFF0C\u4E0D\u80FD\u666E\u901A\u653B\u51FB" };
    if (u.type === "machine" && !u.tags.includes("machine_attackable")) {
      return { ok: false, reason: "\u519B\u68B0\u65E0\u6CD5\u666E\u901A\u653B\u51FB\uFF08\u653B\u51FB\u529B\u53EA\u7528\u4E8E\u53CD\u51FB\uFF09" };
    }
    if (effectiveAttack(state, side, row, col) <= 0) {
      return { ok: false, reason: "\u653B\u51FB\u529B\u4E3A 0\uFF0C\u65E0\u6CD5\u666E\u901A\u653B\u51FB" };
    }
    if (hasCap(u, "block_action") || hasCap(u, "block_attack")) {
      return { ok: false, reason: "\u5F53\u524D\u72B6\u6001\u65E0\u6CD5\u666E\u901A\u653B\u51FB" };
    }
    const maxAttacks = hasTrait(u, "lian_ji") ? 2 : 1;
    if (u.attackedThisTurn >= maxAttacks) {
      return { ok: false, reason: `\u672C\u56DE\u5408\u5DF2\u653B\u51FB ${u.attackedThisTurn} \u6B21` };
    }
    if (u.enteredTurn === state.turn && !hasTrait(u, "xian_gong")) {
      return { ok: false, reason: "\u672C\u56DE\u5408\u5165\u573A\uFF0C\u65E0\u6CD5\u653B\u51FB\uFF08\u300C\u5148\u653B\u300D\u9664\u5916\uFF09" };
    }
    return { ok: true };
  }
  function lordAttackTargets(state, side) {
    const lord = state.sides[side].lord;
    if (state.active !== side || state.winner || state.pendingDiscover) return { targets: [], why: "\u5F53\u524D\u4E0D\u80FD\u653B\u51FB" };
    if ((lord.attackThisTurn ?? 0) <= 0 || lord.attackedThisTurn) return { targets: [], why: "\u4E3B\u516C\u6CA1\u6709\u53EF\u7528\u653B\u51FB\u673A\u4F1A" };
    if (hasCapOn(lord.statuses, "block_action") || hasCapOn(lord.statuses, "block_attack")) {
      return { targets: [], why: "\u5F53\u524D\u72B6\u6001\u65E0\u6CD5\u666E\u901A\u653B\u51FB" };
    }
    const foe = other(side);
    const shields = shieldUnits(state, foe);
    if (shields.length) return { targets: shields.map(({ row, col }) => ({ kind: "unit", side: foe, row, col })), why: "\u5FC5\u987B\u5148\u653B\u51FB\u67B6\u76FE\u5355\u4F4D" };
    const targets = allUnits(state, foe).filter(({ unit }) => unit.hp > 0 && !hasCap(unit, "untargetable") && !hasTrait(unit, "qi_xi") && !hasCap(unit, "duel_lock")).map(({ row, col }) => ({ kind: "unit", side: foe, row, col }));
    if (!hasCapOn(state.sides[foe].lord.statuses, "untargetable")) targets.push({ kind: "lord", side: foe });
    return { targets, why: "\u4E3B\u516C\u53EF\u653B\u51FB\u4E00\u6B21" };
  }
  function effectiveAttack(state, side, row, col) {
    const u = getUnit(state, side, row, col);
    if (!u) return 0;
    if (hasCap(u, "attack_zero")) return 0;
    let atk = u.atk;
    atk += statusStacks(u, "zhen_fen");
    atk -= statusStacks(u, "xu_ruo");
    return Math.max(0, atk);
  }
  function legalTargets(state, side, row, col) {
    const u = getUnit(state, side, row, col);
    if (!u) return { targets: [], why: "\u7A7A\u683C" };
    const gate = canAttack(state, side, row, col);
    if (!gate.ok) return { targets: [], why: gate.reason };
    const foe = other(side);
    const shields = shieldUnits(state, foe);
    if (shields.length) {
      return {
        targets: shields.map((sh) => ({ kind: "unit", side: foe, row: sh.row, col: sh.col })),
        why: `\u654C\u65B9\u5B58\u5728\u300C\u67B6\u76FE\u300D${shields.map((sh) => `\u7B2C${sh.col + 1}\u683C`).join("\u3001")} \u2192 \u5FC5\u987B\u5148\u653B\u51FB\u5B83\uFF08\u5632\u8BBD\uFF09`
      };
    }
    const iAmDuelist = hasCap(u, "duel_lock");
    const targets = allUnits(state, foe).filter(({ unit }) => unit.hp > 0 && !hasCap(unit, "untargetable") && !hasTrait(unit, "qi_xi") && !(hasCap(unit, "duel_lock") && !iAmDuelist)).map(({ row: r, col: c }) => ({ kind: "unit", side: foe, row: r, col: c }));
    if (!hasCapOn(state.sides[foe].lord.statuses, "untargetable")) {
      targets.push({ kind: "lord", side: foe });
    }
    return {
      targets,
      why: "\u65E0\u654C\u65B9\u67B6\u76FE \u2192 \u53EF\u81EA\u7531\u9009\u62E9\u4EFB\u610F\u654C\u65B9\u4EBA\u7269\uFF0C\u6216\u76F4\u63A5\u653B\u51FB\u654C\u65B9\u4E3B\u5C06"
    };
  }
  function legalPlacements(state, side) {
    const out = [];
    if (unitCount(state, side) >= BOARD.MAX_UNITS) return out;
    for (const row of BOARD.ROWS) {
      for (let col = 0; col < BOARD.COLS; col++) {
        if (!state.sides[side].rows[row][col]) out.push({ row, col });
      }
    }
    return out;
  }
  function canPlayCard(state, side, card, slot, costOverride) {
    const s = state.sides[side];
    const cost = costOverride ?? card.cost ?? 0;
    if ((card.type === "general" || card.type === "troop") && hasCapOn(s.lord.statuses, "block_summon")) {
      return { ok: false, reason: "\u56F4\u57CE\u5C01\u9501\uFF1A\u672C\u56DE\u5408\u4E0D\u80FD\u53EC\u5524\u6B66\u5C06\u548C\u5175\u79CD" };
    }
    if (cost > s.command.cur) {
      return { ok: false, reason: `\u7EDF\u7387\u503C\u4E0D\u8DB3\uFF08\u9700\u8981 ${cost}\uFF0C\u5F53\u524D ${s.command.cur}\uFF09` };
    }
    if (card.type === "troop" || card.type === "general" || card.type === "strategist" || card.type === "machine") {
      if (!slot) return { ok: false, reason: "\u4EBA\u7269\u5361\u9700\u8981\u6307\u5B9A\u90E8\u7F72\u4F4D\u7F6E" };
      if (state.sides[side].rows[slot.row][slot.col]) return { ok: false, reason: "\u8BE5\u683C\u5DF2\u6709\u5355\u4F4D" };
      if (unitCount(state, side) >= BOARD.MAX_UNITS) return { ok: false, reason: "\u6218\u573A\u5DF2\u6EE1" };
    }
    return { ok: true };
  }
  var handOverflow = (state, side) => Math.max(0, state.sides[side].hand.length - DECK.HAND_LIMIT);

  // src/mutate.ts
  var unitRef = (side, row, col) => ({ kind: "unit", side, row, col });
  var lordRef = (side) => ({ kind: "lord", side });
  var handRef = (side, index) => ({ kind: "hand", side, index });
  function effectiveCost(hc, ruleDelta = 0) {
    const delta = hc.mods.filter((m) => m.kind === "cost").reduce((s, m) => s + (m.value ?? 0), 0);
    return Math.max(0, (hc.card.cost ?? 0) + ruleDelta + delta);
  }
  var isBanned = (hc) => hc.mods.some((m) => m.kind === "ban");
  function findGuard(state, u) {
    for (const [id, inst] of Object.entries(u.statuses)) {
      if (inst.stacks <= 0 || !inst.srcUid) continue;
      const def = STATUSES[id];
      if (!def?.caps?.includes("redirect_damage")) continue;
      if (def.guard_scope === "lord") continue;
      for (const side of ["own", "enemy"]) {
        for (const row of ["front", "back"]) {
          for (let col = 0; col < BOARD.COLS; col++) {
            const g = state.sides[side].rows[row][col];
            if (g && g.uid === inst.srcUid && g.uid !== u.uid && g.hp > 0) {
              return { side, row, col, unit: g };
            }
          }
        }
      }
    }
    return null;
  }
  function findLordGuard(state, side) {
    const lord = state.sides[side].lord;
    for (const [id, inst] of Object.entries(lord.statuses ?? {})) {
      if (inst.stacks <= 0 || !inst.srcUid) continue;
      if (!STATUSES[id]?.caps?.includes("redirect_damage")) continue;
      for (const s of ["own", "enemy"]) {
        for (const row of ["front", "back"]) {
          for (let col = 0; col < BOARD.COLS; col++) {
            const g = state.sides[s].rows[row][col];
            if (g && g.uid === inst.srcUid && g.hp > 0) return { side: s, row, col, unit: g };
          }
        }
      }
    }
    return null;
  }
  function refHp(state, ref) {
    if (ref.kind === "lord") return state.sides[ref.side].lord.hp;
    if (ref.kind === "hand") return 0;
    return getUnit(state, ref.side, ref.row, ref.col)?.hp ?? 0;
  }
  function refAlive(state, ref) {
    if (ref.kind === "lord") return state.sides[ref.side].lord.hp > 0;
    if (ref.kind === "hand") return false;
    const u = getUnit(state, ref.side, ref.row, ref.col);
    return !!u && u.hp > 0;
  }
  var onDrawResolver = null;
  function registerOnDrawResolver(fn) {
    onDrawResolver = fn;
  }
  var afterDrawResolver = null;
  function registerAfterDrawResolver(fn) {
    afterDrawResolver = fn;
  }
  var onDeathResolver = null;
  var onKillResolver = null;
  function registerOnKillResolver(fn) {
    onKillResolver = fn;
  }
  var onAllyDeathResolver = null;
  function registerOnAllyDeathResolver(fn) {
    onAllyDeathResolver = fn;
  }
  function registerOnDeathResolver(fn) {
    onDeathResolver = fn;
  }
  var afterLordDamagedResolver = null;
  var afterUnitDamagedResolver = null;
  function registerAfterUnitDamagedResolver(fn) {
    afterUnitDamagedResolver = fn;
  }
  function registerAfterLordDamagedResolver(fn) {
    afterLordDamagedResolver = fn;
  }
  var markDeathResolver = null;
  function registerMarkDeathResolver(fn) {
    markDeathResolver = fn;
  }
  var afterDeathResolver = null;
  function registerAfterDeathResolver(fn) {
    afterDeathResolver = fn;
  }
  function drawCard(state, cards, side, events, rng) {
    const s = state.sides[side];
    if (s.deck.length === 0) {
      s.fatigue += 1;
      events.push({ type: "FATIGUE", side, amount: s.fatigue, hp: Math.max(0, s.lord.hp - s.fatigue) });
      dealDamage(state, cards, lordRef(side), s.fatigue, events, "fatigue");
      return;
    }
    if (hasCapOn(state.sides[side].lord.statuses, "block_draw")) {
      events.push({ type: "DRAW_BLOCKED", side });
      return;
    }
    const id = s.deck.pop();
    const card = cards.get(id);
    if (!card) return;
    events.push({ type: "CARD_DRAWN", side, card, deckLeft: s.deck.length });
    if (onDrawResolver) {
      const r = rng ?? createRng(state.rngState);
      const result = onDrawResolver(state, cards, side, card, events, r);
      if (result) {
        if (result.discard) s.discard.push(card);
        events.push({ type: "CARD_AUTO_CAST", side, card });
        return;
      }
    }
    s.hand.push({ card, mods: [] });
    afterDrawResolver?.(state, cards, events, rng ?? createRng(state.rngState));
  }
  function dealDamage(state, cards, ref, amount, events, source, depth = 0, killerRef, sourceUnit, damageType = "physical", reflected = false, deathSource) {
    if (amount <= 0 || !refAlive(state, ref)) return 0;
    if (sourceUnit && damageType === "physical") {
      const sourceSide = ["own", "enemy"].find((sd) => allUnits(state, sd).some((r) => r.unit.uid === sourceUnit.uid));
      if (sourceSide && allUnits(state, sourceSide).some((r) => hasCap(r.unit, "water_convert"))) {
        damageType = "water";
      }
    }
    if (ref.kind === "lord") {
      const lord = state.sides[ref.side].lord;
      const hpBefore2 = lord.hp;
      if (hasCapOn(lord.statuses, "immune_all_damage")) return 0;
      const shield = Object.keys(lord.statuses ?? {}).find((k) => STATUSES[k]?.caps?.includes("immune_damage"));
      if (shield) {
        delete lord.statuses[shield];
        events.push({ type: "LORD_STATUS_EXPIRED", side: ref.side, status: shield });
        return 0;
      }
      const dongxiTriggerKey = `wu_dongxi:dang_feng_hu_jia:${ref.side}`;
      if (sourceUnit && hasTrait(sourceUnit, "xian_gong") && !state.onceTriggers?.[dongxiTriggerKey]) {
        const handIndex = state.sides[ref.side].hand.findIndex((hc) => hc.card.id === "wu_dongxi");
        if (handIndex >= 0) {
          let slot = null;
          for (const row of BOARD.ROWS) {
            const col = state.sides[ref.side].rows[row].findIndex((u2) => !u2);
            if (col >= 0) {
              slot = { row, col };
              break;
            }
          }
          if (slot) {
            const [hc] = state.sides[ref.side].hand.splice(handIndex, 1);
            const guard2 = hc ? summonUnit(state, cards, ref.side, slot.row, slot.col, hc.card.id, events) : null;
            if (guard2) {
              state.onceTriggers = state.onceTriggers ?? {};
              state.onceTriggers[dongxiTriggerKey] = true;
              events.push({
                type: "DAMAGE_REDIRECTED",
                side: ref.side,
                lord: true,
                to: ref.side,
                guardName: guard2.name
              });
              return dealDamage(
                state,
                cards,
                unitRef(ref.side, slot.row, slot.col),
                amount,
                events,
                source,
                depth + 1,
                killerRef,
                sourceUnit,
                damageType,
                reflected,
                deathSource
              );
            }
            if (hc) state.sides[ref.side].hand.splice(handIndex, 0, hc);
          }
        }
      }
      const lguard = findLordGuard(state, ref.side);
      if (lguard && depth < 3) {
        events.push({
          type: "DAMAGE_REDIRECTED",
          side: ref.side,
          lord: true,
          to: lguard.side,
          guardName: lguard.unit.name
        });
        return dealDamage(
          state,
          cards,
          unitRef(lguard.side, lguard.row, lguard.col),
          amount,
          events,
          source,
          depth + 1,
          killerRef,
          sourceUnit,
          damageType,
          reflected,
          deathSource
        );
      }
      let dmg = amount;
      if (lord.armor > 0) {
        const absorbed = Math.min(lord.armor, dmg);
        lord.armor -= absorbed;
        lord.temporaryArmor = Math.max(0, (lord.temporaryArmor ?? 0) - absorbed);
        dmg -= absorbed;
      }
      lord.hp -= dmg;
      const actual2 = Math.min(dmg, hpBefore2);
      if (sourceUnit && actual2 > 0 && isBasicTroop(sourceUnit)) {
        const p = upgradeProgress(sourceUnit);
        if (sourceUnit.troopKind === "infantry") p.damage += actual2;
        if (sourceUnit.troopKind === "archer") p.heroHits += 1;
      }
      events.push({ type: "DAMAGE", target: ref, amount, source });
      if (lord.hp <= 0) {
        lord.hp = 0;
        checkWinner(state, events);
      }
      if (actual2 > 0) afterLordDamagedResolver?.(state, cards, events, ref.side, actual2, reflected);
      return actual2;
    }
    if (ref.kind !== "unit") return 0;
    const u = getUnit(state, ref.side, ref.row, ref.col);
    if (!u) return 0;
    const guard = findGuard(state, u);
    if (guard && depth < 3) {
      events.push({
        type: "DAMAGE_REDIRECTED",
        side: ref.side,
        row: ref.row,
        col: ref.col,
        to: guard.side,
        guardName: guard.unit.name
      });
      return dealDamage(
        state,
        cards,
        unitRef(guard.side, guard.row, guard.col),
        amount,
        events,
        source,
        depth + 1,
        killerRef,
        sourceUnit,
        damageType,
        reflected,
        deathSource
      );
    }
    if (damageType === "fire" && hasCap(u, "break_on_fire")) {
      killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, deathSource ?? killerRef);
      return 0;
    }
    const shieldStatus = Object.keys(u.statuses).find((k) => STATUSES[k]?.caps?.includes("immune_damage"));
    if (hasCap(u, "immune_all_damage")) return 0;
    const shieldKeyword = u.kw.includes("sheng_dun");
    if (shieldStatus || shieldKeyword) {
      if (shieldStatus) delete u.statuses[shieldStatus];
      if (shieldKeyword) u.kw = u.kw.filter((k) => k !== "sheng_dun");
      events.push({
        type: "STATUS_EXPIRED",
        side: ref.side,
        row: ref.row,
        col: ref.col,
        status: shieldStatus ?? "sheng_dun_status"
      });
      return 0;
    }
    const hpBefore = u.hp;
    const reducePhysical = capValue(u, "reduce_physical");
    const vulnerableFire = capValue(u, "vulnerable_fire");
    let finalAmount = amount;
    if (damageType === "physical" && reducePhysical > 0) {
      finalAmount = Math.max(0, finalAmount - reducePhysical);
    } else if (damageType === "fire" && vulnerableFire > 0) {
      finalAmount = finalAmount + vulnerableFire;
    }
    if (finalAmount <= 0) {
      events.push({ type: "DAMAGE", target: ref, amount: 0, source });
      return 0;
    }
    u.hp -= finalAmount;
    const actual = Math.min(finalAmount, hpBefore);
    if (sourceUnit && actual > 0 && isBasicTroop(sourceUnit)) {
      const p = upgradeProgress(sourceUnit);
      if (sourceUnit.troopKind === "infantry") p.damage += actual;
      if (sourceUnit.troopKind === "archer" && ["general", "strategist"].includes(u.type)) p.heroHits += 1;
    }
    events.push({ type: "DAMAGE", target: ref, amount: finalAmount, source });
    if (actual > 0 && sourceUnit?.kw.includes("ju_du") && u.hp > 0) {
      killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, deathSource ?? killerRef);
      return actual;
    }
    const thorns = capValue(u, "thorns");
    if (actual > 0 && thorns > 0 && sourceUnit && killerRef && sourceUnit.uid !== u.uid) {
      const { side: srcSide, row: srcRow, col: srcCol } = killerRef;
      const v = getUnit(state, srcSide, srcRow, srcCol);
      if (v) {
        const before = v.hp;
        dealDamage(
          state,
          cards,
          unitRef(srcSide, srcRow, srcCol),
          thorns,
          events,
          u.name,
          depth + 1,
          null,
          u,
          "physical"
        );
        if (before > 0 && v.hp <= 0) {
          killUnit(state, cards, { side: srcSide, row: srcRow, col: srcCol, unit: v }, events, null);
        }
      }
    }
    if (actual > 0 && thorns > 0 && deathSource && deathSource.row === void 0) {
      dealDamage(
        state,
        cards,
        lordRef(deathSource.side),
        thorns,
        events,
        u.name,
        depth + 1,
        null,
        u,
        "physical"
      );
    }
    if (u.hp <= 0 && tryLethalSave(state, u, ref, events)) return finalAmount;
    if (actual > 0) {
      afterUnitDamagedResolver?.(
        state,
        cards,
        { kind: "unit", side: ref.side, row: ref.row, col: ref.col },
        actual,
        events
      );
    }
    if (u.hp <= 0) killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, deathSource ?? killerRef);
    return finalAmount;
  }
  function tryLethalSave(state, u, ref, events) {
    const saves = (u.skills ?? []).filter((sk) => sk.trigger === "on_lethal");
    if (!saves.length) return false;
    const rng = createRng(state.rngState);
    for (const sk of saves) {
      const key = sk.id || sk.name || "on_lethal";
      if (sk.frequency === "once" && u.skillsUsedOnce.includes(key)) continue;
      const req = sk.requires?.status;
      if (req && (u.statuses[req.id]?.stacks ?? 0) < (req.min ?? 1)) continue;
      const chance = sk.chance ?? 1;
      const roll = rng.next();
      if (roll < chance) {
        state.rngState = rng.getState();
        u.hp = 1;
        if (req) {
          const charge = u.statuses[req.id];
          if (charge) charge.stacks = Math.max(0, charge.stacks - (req.min ?? 1));
        }
        if (sk.frequency === "once") u.skillsUsedOnce.push(key);
        events.push({ type: "UNIT_SURVIVED", side: ref.side, row: ref.row, col: ref.col, unit: u });
        return true;
      }
    }
    state.rngState = rng.getState();
    return false;
  }
  function collectDamaged(state, side, uid) {
    for (const ref of allUnits(state, side)) if (ref.unit.uid === uid) return ref;
    return null;
  }
  function healTarget(state, ref, amount, events) {
    if (amount <= 0 || !refAlive(state, ref)) return;
    if (ref.kind === "lord") {
      const lord = state.sides[ref.side].lord;
      lord.hp = Math.min(lord.maxHp, lord.hp + amount);
      events.push({ type: "HEAL", target: ref, amount, hp: lord.hp });
      return;
    }
    if (ref.kind !== "unit") return;
    const u = getUnit(state, ref.side, ref.row, ref.col);
    if (!u) return;
    const wasFull = u.hp >= u.maxHp;
    u.hp = Math.min(u.maxHp, u.hp + amount);
    if (!wasFull && u.hp >= u.maxHp) {
      for (const [id, inst] of Object.entries(u.statuses)) {
        if (!inst.untilFullHealth) continue;
        delete u.statuses[id];
        events.push({ type: "STATUS_EXPIRED", side: ref.side, row: ref.row, col: ref.col, status: id });
      }
      for (const [id, inst] of Object.entries(u.statuses)) {
        if (inst.stacks > 0 || !STATUSES[id]?.replenish_on_full_health) continue;
        inst.stacks = 1;
        events.push({ type: "STATUS_APPLIED", side: ref.side, row: ref.row, col: ref.col, status: id, stacks: 1 });
      }
    }
    events.push({ type: "HEAL", target: ref, amount, hp: u.hp });
  }
  function gainArmor(state, side, amount, events) {
    const lord = state.sides[side].lord;
    lord.armor += amount;
    events.push({ type: "ARMOR_GAINED", side, amount, armor: lord.armor });
  }
  function mergeStacks(def, numeric, prev, incoming) {
    if (!numeric) return Math.max(1, incoming);
    const merged = def?.stack_mode === "max" ? Math.max(prev, incoming) : prev + incoming;
    return def?.max_stacks !== void 0 ? Math.min(merged, def.max_stacks) : merged;
  }
  function removeStatus(state, ref, status, events, stacks) {
    if (ref.kind === "hand") return 0;
    if (ref.kind === "lord") {
      const lord = state.sides[ref.side].lord;
      const inst2 = lord.statuses?.[status];
      if (!inst2) return 0;
      const removed2 = stacks === void 0 ? inst2.stacks : Math.min(stacks, inst2.stacks);
      if (stacks === void 0 || removed2 >= inst2.stacks) {
        delete lord.statuses[status];
        events.push({ type: "LORD_STATUS_EXPIRED", side: ref.side, status });
      } else {
        inst2.stacks -= removed2;
      }
      return removed2;
    }
    const u = getUnit(state, ref.side, ref.row, ref.col);
    if (!u) return 0;
    const inst = u.statuses[status];
    if (!inst) return 0;
    const removed = stacks === void 0 ? inst.stacks : Math.min(stacks, inst.stacks);
    if (stacks === void 0 || removed >= inst.stacks) {
      delete u.statuses[status];
      u.kw = u.kw.filter((k) => k !== status);
      events.push({ type: "STATUS_EXPIRED", side: ref.side, row: ref.row, col: ref.col, status });
    } else {
      inst.stacks -= removed;
    }
    return removed;
  }
  function applyStatus(state, ref, status, stacks, events, turns, srcUid, auraId, skipTick = false, untilFullHealth = false) {
    if (ref.kind === "hand") return;
    const def = STATUSES[status];
    if (ref.kind === "lord") {
      const lord = state.sides[ref.side].lord;
      lord.statuses = lord.statuses ?? {};
      if (def?.kind === "debuff" && hasCapOn(lord.statuses, "immune_debuff")) return;
      const prevL = lord.statuses[status];
      const numericL = def?.numeric ?? true;
      const turnsL = untilFullHealth ? void 0 : auraId !== void 0 && turns === void 0 ? void 0 : turns !== void 0 ? turns : def?.duration === "until_enemy_turn_end" ? void 0 : def?.duration === "permanent" || def?.duration === "until_consumed" ? void 0 : def?.duration === "turns" || def?.duration === "this_turn" ? 1 : void 0;
      lord.statuses[status] = {
        stacks: mergeStacks(def, numericL, prevL?.stacks ?? 0, stacks),
        turns: turnsL,
        srcUid,
        auraId,
        ...def?.duration === "this_turn" && auraId === void 0 ? { expiresAtHalfTurn: state.halfTurn } : {},
        ...def?.duration === "until_enemy_turn_end" ? { expiresAtHalfTurn: state.halfTurn + 1 } : {},
        ...untilFullHealth ? { untilFullHealth: true } : {},
        ...skipTick && turnsL !== void 0 ? { skipTick: true } : {}
      };
      if (auraId === void 0) events.push({ type: "STATUS_APPLIED", side: ref.side, status, stacks, turns: turnsL });
      return;
    }
    const u = getUnit(state, ref.side, ref.row, ref.col);
    if (!u) return;
    if (def?.kind === "debuff" && hasCap(u, "immune_debuff")) {
      events.push({ type: "STATUS_BLOCKED", side: ref.side, row: ref.row, col: ref.col, status, reason: "\u514D\u75AB" });
      return;
    }
    if (def?.kind === "debuff" && hasCap(u, "immune_control") && (def.caps ?? []).some((cap) => ["block_action", "block_attack", "block_skill", "random_target", "untargetable"].includes(cap))) {
      events.push({ type: "STATUS_BLOCKED", side: ref.side, row: ref.row, col: ref.col, status, reason: "\u514D\u75AB\u63A7\u5236" });
      return;
    }
    const numeric = def?.numeric ?? true;
    const prev = u.statuses[status];
    const nextStacks = mergeStacks(def, numeric, prev?.stacks ?? 0, stacks);
    const nextTurns = untilFullHealth ? void 0 : auraId !== void 0 && turns === void 0 ? void 0 : turns !== void 0 ? turns : def?.duration === "until_enemy_turn_end" ? void 0 : prev?.turns !== void 0 ? Math.max(prev.turns, 1) : def?.duration === "permanent" || def?.duration === "until_consumed" ? void 0 : def?.duration === "turns" || def?.duration === "this_turn" ? 1 : void 0;
    u.statuses[status] = {
      stacks: nextStacks,
      turns: nextTurns,
      srcUid,
      auraId,
      ...def?.duration === "this_turn" && auraId === void 0 ? { expiresAtHalfTurn: state.halfTurn } : {},
      ...def?.duration === "until_enemy_turn_end" ? { expiresAtHalfTurn: state.halfTurn + 1 } : {},
      ...untilFullHealth ? { untilFullHealth: true } : {},
      ...skipTick && nextTurns !== void 0 ? { skipTick: true } : {}
    };
    if (auraId === void 0) events.push({ type: "STATUS_APPLIED", side: ref.side, row: ref.row, col: ref.col, status, stacks, turns: nextTurns });
  }
  function shrinkMaxHp(state, cards, ref, amount, events, statusId, source = "\u4E2D\u6BD2") {
    if (amount <= 0) return 0;
    const u = getUnit(state, ref.side, ref.row, ref.col);
    if (!u || u.hp <= 0) return 0;
    const before = u.maxHp;
    const modId = `shrink:${statusId}`;
    const mod = u.mods.find((m) => m.id === modId);
    if (mod) mod.health = (mod.health ?? 0) - amount;
    else u.mods.push({ id: modId, kind: "permanent", health: -amount });
    const dHp = u.mods.reduce((s, m) => s + (m.health ?? 0), 0);
    u.maxHp = Math.max(0, u.baseMaxHp + dHp);
    u.hp = Math.max(0, Math.min(u.hp, u.maxHp));
    const shrunk = before - u.maxHp;
    if (shrunk > 0) {
      events.push({ type: "STAT_MODIFIED", side: ref.side, row: ref.row, col: ref.col, health: -shrunk, source });
    }
    if (u.hp <= 0) killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, null);
    return shrunk;
  }
  function summonUnit(state, cards, side, row, col, cardId, events) {
    const card = cards.get(cardId);
    if (!card) return null;
    if (state.sides[side].rows[row][col]) return null;
    const u = makeUnit(card, state.turn, nextUidSeq(state));
    for (const kw of state.sides[side].cardKeywords?.[card.id] ?? []) {
      if (!u.kw.includes(kw)) u.kw.push(kw);
    }
    setUnit(state, side, row, col, u);
    const dingfengEligible = ["troop", "general", "strategist"].includes(card.type);
    if (dingfengEligible && allUnits(state, side).some((ref) => ref.unit.uid !== u.uid && hasCap(ref.unit, "future_summon"))) {
      u.kw = [.../* @__PURE__ */ new Set([...u.kw, "xian_gong"])];
      u.statuses.xian_gong_status = { stacks: 1 };
      u.mods.push({ id: `dingfeng#${u.uid}`, kind: "permanent", attack: -1, health: -1 });
      applyMods(u);
    }
    events.push({ type: "UNIT_SUMMONED", side, row, col, unit: u });
    return u;
  }
  function killUnit(state, cards, ref, events, killer) {
    const { side, row, col, unit } = ref;
    if (!getUnit(state, side, row, col)) return;
    if (killer?.row !== void 0 && killer.col !== void 0) {
      const killerUnit = getUnit(state, killer.side, killer.row, killer.col);
      if (killerUnit?.troopKind === "cavalry" && isBasicTroop(killerUnit)) {
        const p = upgradeProgress(killerUnit);
        if (isBasicTroop(unit)) p.basicKills += 1;
        if (unit.type === "general" || unit.type === "strategist") p.characterKills += 1;
      }
    }
    setUnit(state, side, row, col, null);
    state.sides[side].fallen.push(unit.cardId);
    events.push({ type: "UNIT_DIED", side, row, col, unit });
    for (const owner of ["own", "enemy"]) {
      for (const other3 of allUnits(state, owner)) {
        for (const [status, inst] of Object.entries(other3.unit.statuses)) {
          if (inst.linkedUid !== unit.uid) continue;
          delete other3.unit.statuses[status];
          events.push({ type: "STATUS_EXPIRED", side: owner, row: other3.row, col: other3.col, status });
        }
      }
    }
    onAllyDeathResolver?.(state, cards, side, unit, events, createRng(state.rngState));
    if (markDeathResolver) {
      markDeathResolver(state, cards, unit, createRng(state.rngState), events);
    }
    if (hasTrait(unit, "yi_ji")) drawCard(state, cards, side, events);
    const card = cards.get(unit.cardId);
    const deathSkills = (card?.skills ?? []).filter((sk) => sk.trigger === "on_death");
    if (deathSkills.length && onDeathResolver) {
      onDeathResolver(state, cards, side, unit, deathSkills, events, createRng(state.rngState), killer);
    }
    if (killer?.row !== void 0 && killer.col !== void 0 && onKillResolver) {
      onKillResolver(state, cards, { side: killer.side, row: killer.row, col: killer.col }, { name: unit.name, side, row, col, type: unit.type }, events, createRng(state.rngState));
    }
    if (afterDeathResolver) afterDeathResolver(state, cards, events);
  }
  function checkWinner(state, events) {
    if (state.winner) return;
    const ownDead = state.sides.own.lord.hp <= 0;
    const enemyDead = state.sides.enemy.lord.hp <= 0;
    if (!ownDead && !enemyDead) return;
    state.winner = ownDead ? "enemy" : "own";
    events.push({ type: "GAME_OVER", winner: state.winner });
  }
  function resolveTurnStartStatuses(state, cards, side, events) {
    for (const ref of allUnits(state, side)) {
      const heal = statusStacks(ref.unit, "ji_jiu");
      if (heal > 0) healTarget(state, unitRef(ref.side, ref.row, ref.col), heal, events);
    }
  }
  function resolveTurnStartDamage(state, cards, side, events) {
    for (const ref of allUnits(state, side)) {
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.stacks <= 0) continue;
        const def = STATUSES[id];
        if (!def?.caps?.includes("dot_fire")) continue;
        dealDamage(
          state,
          cards,
          unitRef(ref.side, ref.row, ref.col),
          inst.stacks,
          events,
          def.name,
          0,
          void 0,
          void 0,
          "fire"
        );
      }
    }
  }
  function resolveTurnEndStatuses(state, cards, side, events) {
    const units = allUnits(state, side).map((r) => ({ side: r.side, row: r.row, col: r.col, unit: r.unit }));
    for (const ref of units) {
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.stacks <= 0) continue;
        const def = STATUSES[id];
        if (!def?.caps?.includes("shrink_max_hp")) continue;
        shrinkMaxHp(
          state,
          cards,
          { side: ref.side, row: ref.row, col: ref.col },
          inst.stacks,
          events,
          id,
          def.name
        );
      }
    }
    for (const ref of units) {
      if (ref.unit.hp <= 0) continue;
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.stacks <= 0) continue;
        if (!STATUSES[id]?.caps?.includes("stage_up")) continue;
        inst.stacks += 1;
        events.push({
          type: "STATUS_APPLIED",
          side: ref.side,
          row: ref.row,
          col: ref.col,
          status: id,
          stacks: inst.stacks
        });
      }
    }
  }
  function expireMods(state, side) {
    for (const owner of ["own", "enemy"]) {
      for (const ref of allUnits(state, owner)) {
        const u = ref.unit;
        const before = u.mods.length;
        u.mods = u.mods.filter((m) => {
          if (m.expiresAtHalfTurn !== void 0 && m.expiresAtHalfTurn <= state.halfTurn) return false;
          if (m.kind !== "temp" || m.turns === void 0) return true;
          m.turns -= 1;
          return m.turns > 0;
        });
        if (u.mods.length !== before) applyMods(u);
      }
    }
  }
  function setLastDiscarded(state, card, side) {
    state.lastDiscarded = { card, side };
  }
  function expireHandMods(state, side) {
    for (const hc of state.sides[side].hand) {
      if (!hc.mods.length) continue;
      hc.mods = hc.mods.filter((m) => {
        if (m.turns === void 0) return true;
        m.turns -= 1;
        return m.turns > 0;
      });
    }
  }
  function expireStatuses(state, side, events) {
    for (const owner of ["own", "enemy"]) {
      const lordStatuses = state.sides[owner].lord.statuses ?? {};
      for (const [id, inst] of Object.entries(lordStatuses)) {
        if (inst.expiresAtHalfTurn !== void 0 && inst.expiresAtHalfTurn <= state.halfTurn) {
          delete lordStatuses[id];
          events.push({ type: "LORD_STATUS_EXPIRED", side: owner, status: id });
        }
      }
      for (const ref of allUnits(state, owner)) {
        for (const [id, inst] of Object.entries(ref.unit.statuses)) {
          if (inst.expiresAtHalfTurn !== void 0 && inst.expiresAtHalfTurn <= state.halfTurn) {
            delete ref.unit.statuses[id];
            events.push({ type: "STATUS_EXPIRED", side: owner, row: ref.row, col: ref.col, status: id });
          }
        }
      }
    }
    const lord = state.sides[side].lord;
    if (lord.statuses) {
      for (const [id, inst] of Object.entries(lord.statuses)) {
        if (inst.turns === void 0) continue;
        if (inst.skipTick) {
          inst.skipTick = false;
          continue;
        }
        inst.turns -= 1;
        if (inst.turns <= 0) {
          delete lord.statuses[id];
          events.push({ type: "LORD_STATUS_EXPIRED", side, status: id });
        }
      }
    }
    for (const ref of allUnits(state, side)) {
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.turns === void 0) continue;
        if (inst.skipTick) {
          inst.skipTick = false;
          continue;
        }
        inst.turns -= 1;
        if (inst.turns <= 0) {
          delete ref.unit.statuses[id];
          events.push({ type: "STATUS_EXPIRED", side: ref.side, row: ref.row, col: ref.col, status: id });
        }
      }
    }
  }
  function discardOverflow(state, side) {
    const s = state.sides[side];
    const dropped = [];
    while (s.hand.length > DECK.HAND_LIMIT) {
      const c = s.hand.pop();
      if (c) {
        s.discard.push(c.card);
        dropped.push(c.card);
      }
    }
    return dropped;
  }

  // src/deck.ts
  var BASIC_TROOP_COPIES = 3;
  var UNIQUE_COPIES = 1;
  function maxCopiesOf(card) {
    if (!card) return UNIQUE_COPIES;
    return card.type === "troop" ? BASIC_TROOP_COPIES : UNIQUE_COPIES;
  }
  var MAX_COPIES = UNIQUE_COPIES;
  var PUBLIC_POOL = ["neutral", "qun"];
  var PLAYABLE_FACTIONS = ["shu", "wei", "wu"];
  var isDeckable = (c) => !NON_DECK_TYPES.includes(c.type);
  var isPlayableBy = (c, faction) => isDeckable(c) && (c.faction === faction || PUBLIC_POOL.includes(c.faction));
  function cardPool(data, faction) {
    return PUBLIC_POOL.reduce(
      (acc, f) => acc.concat(data.byFaction.get(f) ?? []),
      [...data.byFaction.get(faction) ?? []]
    ).filter((c) => isPlayableBy(c, faction));
  }
  var SUGGESTED_CURVE = { 1: 4, 2: 7, 3: 7, 4: 6, 5: 4, 6: 2 };
  function computeStats(cards) {
    const curve = {};
    let units = 0;
    for (const c of cards) {
      curve[c.cost] = (curve[c.cost] ?? 0) + 1;
      if (["troop", "general", "strategist", "machine"].includes(c.type)) units += 1;
    }
    const size = cards.length;
    return {
      size,
      unique: new Set(cards.map((c) => c.id)).size,
      curve,
      avgCost: size ? cards.reduce((a, c) => a + c.cost, 0) / size : 0,
      units,
      nonUnits: size - units
    };
  }
  function validateDeck(data, faction, deckIds) {
    const errors = [];
    const warnings = [];
    const cards = [];
    for (const id of deckIds) {
      const c = data.cards.get(id);
      if (!c) {
        errors.push({ kind: "unknown", message: `\u5361\u7EC4\u91CC\u6709\u4E0D\u5B58\u5728\u7684\u5361\uFF1A${id}` });
        continue;
      }
      if (c.type === "lord") {
        errors.push({ kind: "lord", message: `\u4E3B\u516C\u5361\u4E0D\u8FDB\u5361\u7EC4\uFF0C\u5F00\u5C40\u81EA\u52A8\u4EFB\u547D\uFF1A${c.name}` });
        continue;
      }
      if (!isDeckable(c)) {
        errors.push({ kind: "type", message: `${c.name}\uFF08${c.type}\uFF09\u4E0D\u53EF\u7EC4\u5165\u5361\u7EC4` });
        continue;
      }
      if (!isPlayableBy(c, faction)) {
        errors.push({
          kind: "faction",
          message: `${c.name} \u5C5E\u4E8E ${c.faction}\uFF0C\u4E0D\u80FD\u8FDB ${faction} \u5361\u7EC4\uFF08\u53EA\u5141\u8BB8\u672C\u65B9\u9635\u8425 + ${PUBLIC_POOL.join("/")}\uFF09`
        });
        continue;
      }
      cards.push(c);
    }
    if (deckIds.length !== DECK.SIZE) {
      errors.push({ kind: "size", message: `\u5361\u7EC4\u5FC5\u987B ${DECK.SIZE} \u5F20\uFF0C\u5F53\u524D ${deckIds.length} \u5F20` });
    }
    const copies = /* @__PURE__ */ new Map();
    for (const c of cards) copies.set(c.id, (copies.get(c.id) ?? 0) + 1);
    for (const [id, n] of copies) {
      const c = data.cards.get(id);
      const cap = maxCopiesOf(c);
      if (n > cap) {
        errors.push({ kind: "copies", message: `${c?.name ?? id} \u540C\u540D\u4E0A\u9650 ${cap} \u5F20\uFF0C\u5F53\u524D ${n} \u5F20` });
      }
    }
    const stats = computeStats(cards);
    const cheap = (stats.curve[1] ?? 0) + (stats.curve[2] ?? 0);
    if (stats.size >= DECK.SIZE && cheap < 5) {
      warnings.push({ kind: "curve", message: `1\u20132 \u8D39\u53EA\u6709 ${cheap} \u5F20\uFF0C\u524D\u671F\u5BB9\u6613\u7A7A\u8FC7\uFF08\u5EFA\u8BAE \u22655\uFF09` });
    }
    const top = Object.entries(stats.curve).filter(([k]) => Number(k) >= 7).reduce((a, [, n]) => a + n, 0);
    if (stats.size >= DECK.SIZE && top > 6) {
      warnings.push({ kind: "curve", message: `7 \u8D39\u4EE5\u4E0A ${top} \u5F20\uFF0C\u5361\u624B\u98CE\u9669\u9AD8\uFF08\u5EFA\u8BAE \u22646\uFF09` });
    }
    if (stats.size >= DECK.SIZE && stats.units < 14) {
      warnings.push({ kind: "curve", message: `\u4EBA\u7269\u5361\u53EA\u6709 ${stats.units} \u5F20\uFF0C\u7AD9\u573A\u80FD\u529B\u504F\u5F31\uFF08\u5EFA\u8BAE \u226514\uFF09` });
    }
    if (stats.unique < 15) {
      warnings.push({ kind: "duplicate", message: `\u53EA\u6709 ${stats.unique} \u79CD\u5361\uFF0C\u5361\u7EC4\u8FC7\u4E8E\u5355\u4E00` });
    }
    return { ok: errors.length === 0, errors, warnings, stats };
  }
  function autoDeck(data, faction, seed = 1) {
    const pool = cardPool(data, faction);
    if (!pool.length) throw new Error(`\u9635\u8425 ${faction} \u6CA1\u6709\u53EF\u7528\u5361\u724C`);
    const buckets = /* @__PURE__ */ new Map();
    for (const c of [...pool].sort((a, b) => a.id < b.id ? -1 : 1)) {
      const b = buckets.get(c.cost) ?? [];
      b.push(c);
      buckets.set(c.cost, b);
    }
    const used = /* @__PURE__ */ new Map();
    const deck = [];
    const take = (c) => {
      const n = used.get(c.id) ?? 0;
      if (n >= maxCopiesOf(c)) return false;
      used.set(c.id, n + 1);
      deck.push(c.id);
      return true;
    };
    const costs = [...Object.keys(SUGGESTED_CURVE).map(Number), ...[...buckets.keys()].filter((k) => !(k in SUGGESTED_CURVE))].sort((a, b) => a - b);
    const offset = seed % Math.max(1, pool.length);
    let cursor = offset;
    for (const cost of costs) {
      const want = SUGGESTED_CURVE[cost] ?? 0;
      const bucket = buckets.get(cost) ?? [];
      if (!bucket.length) continue;
      let placed = 0;
      let guard2 = 0;
      while (placed < want && guard2 < bucket.length * BASIC_TROOP_COPIES + bucket.length) {
        const c = bucket[cursor % bucket.length];
        cursor += 1;
        guard2 += 1;
        if (take(c)) placed += 1;
      }
    }
    const flat = [...pool].sort((a, b) => a.id < b.id ? -1 : 1);
    let guard = 0;
    while (deck.length < DECK.SIZE && guard < flat.length * BASIC_TROOP_COPIES + flat.length) {
      const c = flat[cursor % flat.length];
      cursor += 1;
      guard += 1;
      take(c);
    }
    if (deck.length < DECK.SIZE) {
      throw new Error(`\u9635\u8425 ${faction} \u5361\u6C60\u4E0D\u8DB3\u4EE5\u7EC4\u51FA ${DECK.SIZE} \u5F20\u5361\u7EC4\uFF08\u5F53\u524D ${deck.length} \u5F20\uFF0C\u6C60\u5B50\u4EC5 ${pool.length} \u79CD\uFF09`);
    }
    return deck.slice(0, DECK.SIZE);
  }

  // src/effects.ts
  var ELEMENTAL_DOT = {
    fire: "zhuo_shao",
    // 灼烧：回合开始受 N 点火伤，层数可叠加、不封顶
    water: "shui_kun",
    // 水困：层数＝阶段，主动行动时受 2^(阶段-1) 水伤（stack_mode: max，不叠层）
    poison: "zhong_du"
    // 中毒：回合结束永久降低 N 点生命上限（层数可叠加、不封顶）
  };
  function resolveDrawTrigger(state, cards, side, card, events, rng) {
    const sk = (card.skills ?? []).find((k) => k.trigger === "on_draw");
    if (!sk) return false;
    if (["troop", "general", "strategist", "machine"].includes(card.type)) {
      const col = state.sides[side].rows.front.findIndex((unit) => unit === null);
      if (col < 0) return false;
      emitSkillTriggered(state, side, null, sk, "trigger", events);
      runEffects(state, cards, sk.effects ?? [], { side }, rng, events);
      return { discard: false };
    }
    emitSkillTriggered(state, side, null, sk, "trigger", events);
    const effs = sk.effects?.length ? sk.effects : card.effects ?? [];
    runEffects(state, cards, effs, { side }, rng, events);
    return { discard: true };
  }
  registerOnDrawResolver(resolveDrawTrigger);
  registerAfterDrawResolver((state, cards, events, rng) => {
    recomputeAuras(state, cards, rng, events);
  });
  registerAfterUnitDamagedResolver((state, cards, ref, actual, events) => {
    const victim = getUnit(state, ref.side, ref.row, ref.col);
    if (victim?.statuses.chou_di) {
      const rng = createRng(state.rngState);
      runMarkDamaged(state, cards, victim, actual, rng, events);
      state.rngState = rng.getState();
    }
    runAllyDamagedTriggers(state, cards, ref.side, events);
  });
  function cardCastEffects(card, rng) {
    const out = [];
    for (const sk of card.skills ?? []) {
      if (sk.modes?.length) {
        const m = sk.modes[rng.int(sk.modes.length)];
        if (m) out.push(...m.effects);
      } else if (sk.effects?.length) {
        out.push(...sk.effects);
      }
    }
    return out.length ? out : card.effects ?? [];
  }
  function forceRandomTargets(effs) {
    return effs.map((e) => e.target ? { ...e, target: { ...e.target, mode: "random" } } : { ...e });
  }
  function inCastPool(card, pool) {
    if (!pool?.type || card.type !== pool.type) return false;
    if (pool.factions?.length && !pool.factions.includes(card.faction)) return false;
    return true;
  }
  registerOnDeathResolver((state, cards, side, unit, skills, events, rng, killer) => {
    for (const sk of skills) {
      emitSkillTriggered(state, side, unit, sk, "trigger", events);
      runEffects(
        state,
        cards,
        sk.effects ?? [],
        { side, source: unit, killer: killer ?? void 0 },
        rng,
        events
      );
    }
  });
  registerOnAllyDeathResolver((state, cards, side, _dead, events, rng) => {
    for (const ref of allUnits(state, side)) {
      if (ref.unit.hp <= 0) continue;
      for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === "on_ally_death")) {
        emitSkillTriggered(state, side, ref.unit, sk, "trigger", events);
        runEffects(state, cards, effectsOf(sk), { side, source: ref.unit }, rng, events);
      }
    }
  });
  registerAfterDeathResolver((state, cards, events) => {
    recomputeAuras(state, cards, createRng(state.rngState), events);
  });
  registerAfterLordDamagedResolver((state, cards, events, side, amount, reflected) => {
    recomputeAuras(state, cards, createRng(state.rngState), events);
    if (reflected) return;
    const rng = createRng(state.rngState);
    for (const ref of allUnits(state, side)) {
      if (ref.unit.hp <= 0) continue;
      for (const sk of (ref.unit.skills ?? []).filter((sk2) => sk2.trigger === TIMING.ON_LORD_DAMAGED)) {
        emitSkillTriggered(state, side, ref.unit, sk, "trigger", events);
        runEffects(state, cards, effectsOf(sk), { side, source: ref.unit, flags: [`lord_damage:${amount}`] }, rng, events);
      }
    }
  });
  registerMarkDeathResolver((state, cards, dead, rng, events) => {
    runMarkDeath(state, cards, dead, rng, events);
  });
  registerOnKillResolver((state, cards, killer, victim, events, rng) => {
    const k = getUnit(state, killer.side, killer.row, killer.col);
    if (!k || k.hp <= 0) return;
    const card = cards.get(k.cardId);
    const killSkills = (card?.skills ?? []).filter((sk) => sk.trigger === "on_kill");
    for (const sk of killSkills) {
      emitSkillTriggered(state, killer.side, k, sk, "trigger", events);
      runEffects(
        state,
        cards,
        sk.effects ?? [],
        { side: killer.side, source: k, eventVictim: victim, victimType: victim.type },
        rng,
        events
      );
    }
  });
  var pickOf = (ctx, sel) => sel?.pick === 2 ? ctx.chosen2 ?? ctx.chosen : ctx.chosen;
  var hpOf = (s, t) => t.kind === "lord" ? s.sides[t.side].lord.hp : t.kind === "hand" ? 0 : getUnit(s, t.side, t.row, t.col)?.hp ?? 0;
  var sameTarget = (a, b) => a.kind === b.kind && a.side === b.side && (a.kind === "lord" || a.kind === "hand" && b.kind === "hand" && a.index === b.index || a.kind === "unit" && b.kind === "unit" && a.row === b.row && a.col === b.col);
  var CHARACTER_TYPES = ["troop", "general", "strategist", "machine", "token"];
  var isCharacterType = (t) => CHARACTER_TYPES.includes(t);
  var matchesCardType = (t, want) => {
    if (!want) return true;
    if (want === "character") return isCharacterType(t);
    return t === want;
  };
  var cardHasDamageType = (card, damageType) => {
    const effects = (card.effects ?? []).concat((card.skills ?? []).flatMap((s) => s.effects ?? []));
    return effects.some((e) => e.action === "damage" && (e.damage_type ?? "physical") === damageType);
  };
  var matchesHandFilter = (hc, f, srcCardId) => {
    if (!f) return true;
    if (!matchesCardType(hc.card.type, f.type)) return false;
    if (f.types && !f.types.includes(hc.card.type)) return false;
    if (f.gender && hc.card.gender !== f.gender) return false;
    if (f.faction && hc.card.faction !== f.faction) return false;
    if (typeof f.cost_max === "number" && hc.card.cost > f.cost_max) return false;
    if (typeof f.cost_min === "number" && hc.card.cost < f.cost_min) return false;
    if (f.keyword && !(hc.card.keywords ?? []).includes(f.keyword)) return false;
    if (f.card_id && hc.card.id !== f.card_id) return false;
    if (f.tag && !(hc.card.tags ?? []).includes(f.tag)) return false;
    if (f.any_of && !f.any_of.some((alt) => {
      if (alt.type && (alt.type === "character" ? !isCharacterType(hc.card.type) : hc.card.type !== alt.type)) return false;
      if (alt.tag && !(hc.card.tags ?? []).includes(alt.tag)) return false;
      if (alt.faction && hc.card.faction !== alt.faction) return false;
      return true;
    })) return false;
    if (f.exclude_source && srcCardId !== void 0 && hc.card.id === srcCardId) return false;
    return true;
  };
  var matchesFilter = (u, f, row, srcCost, srcAtk, srcUid) => {
    if (!f) return true;
    if (f.exclude_source && srcUid !== void 0 && u.uid === srcUid) return false;
    if (f.type) {
      if (f.type === "character") {
        if (!isCharacterType(u.type)) return false;
      } else if (u.type !== f.type) return false;
    }
    if (f.types && !f.types.includes(u.type)) return false;
    if (f.gender && u.gender !== f.gender) return false;
    if (f.keyword && !u.kw.includes(f.keyword)) return false;
    if (f.tag && !(u.tags ?? []).includes(f.tag)) return false;
    if (f.faction && u.faction !== f.faction) return false;
    if (f.row && row !== f.row) return false;
    if (typeof f.health_max === "number" && u.hp > f.health_max) return false;
    if (typeof f.hp_min === "number" && u.hp < f.hp_min) return false;
    if (f.damaged !== void 0 && f.damaged !== u.hp < u.maxHp) return false;
    if (f.damaged_or_controlled) {
      const controlled = ["zhen_she", "jin_gu", "jin_gong", "hun_luan", "fan_mian"].some((id) => (u.statuses[id]?.stacks ?? 0) > 0);
      if (!(u.hp < u.maxHp || controlled)) return false;
    }
    if (f.attacked_this_turn !== void 0 && u.attackedThisTurn > 0 !== f.attacked_this_turn) return false;
    if (f.acted_this_turn !== void 0 && u.actedThisTurn !== f.acted_this_turn) return false;
    if (f.has_status && !((u.statuses[f.has_status]?.stacks ?? 0) > 0)) return false;
    if (f.has_any_status && !f.has_any_status.some((id) => (u.statuses[id]?.stacks ?? 0) > 0)) return false;
    if (f.any_of && !f.any_of.some((alt) => {
      if (alt.type && (alt.type === "character" ? !isCharacterType(u.type) : u.type !== alt.type)) return false;
      if (alt.tag && !(u.tags ?? []).includes(alt.tag)) return false;
      if (alt.faction && u.faction !== alt.faction) return false;
      return true;
    })) return false;
    if (f.without_status && (u.statuses[f.without_status]?.stacks ?? 0) > 0) return false;
    if (typeof f.attack_max === "number" && u.atk > f.attack_max) return false;
    if (typeof f.cost_max === "number" && u.cost > f.cost_max) return false;
    if (typeof f.cost_min === "number" && u.cost < f.cost_min) return false;
    if (f.troopKind && u.troopKind !== f.troopKind) return false;
    if (f.cost_below_source && srcCost !== void 0 && u.cost >= srcCost) return false;
    if (f.attack_below_source && srcAtk !== void 0 && u.atk >= srcAtk) return false;
    if (f.card_id && u.cardId !== f.card_id) return false;
    if (f.basic_troop && !isBasicTroop(u)) return false;
    return true;
  };
  var cmp = (a, op, b) => op === ">=" ? a >= b : op === "<=" ? a <= b : op === "==" ? a === b : op === ">" ? a > b : op === "<" ? a < b : op === "!=" ? a !== b : false;
  function chosenDamagedNow(state, t) {
    if (t.kind === "lord") {
      const lord = state.sides[t.side].lord;
      return lord.hp < lord.maxHp;
    }
    if (t.kind === "unit") {
      const u = getUnit(state, t.side, t.row, t.col);
      return u ? u.hp < u.maxHp : null;
    }
    return null;
  }
  function checkCondition(state, cond, ctx, rng) {
    if (!cond) return true;
    if (cond.last_damage_target_not_type && (!ctx.lastDamageTargetType || ctx.lastDamageTargetType === cond.last_damage_target_not_type)) return false;
    if (cond.all_of?.length && !cond.all_of.every((c) => checkCondition(state, c, ctx, rng))) return false;
    if (cond.any_of?.length && !cond.any_of.some((c) => checkCondition(state, c, ctx, rng))) return false;
    if (cond.acted_this_turn !== void 0) {
      const src = ctx.source;
      if (!src || !!src.actedThisTurn !== cond.acted_this_turn) return false;
    }
    if (cond.dealt_damage_this_turn !== void 0) {
      const src = ctx.source;
      if (!src || !!src.dealtDamageThisTurn !== cond.dealt_damage_this_turn) return false;
    }
    if (cond.lord_hp) {
      const side = cond.lord_hp.side === "self" ? ctx.side : other(ctx.side);
      if (!cmp(state.sides[side].lord.hp, cond.lord_hp.op, cond.lord_hp.value)) return false;
    }
    if (cond.lord_hp_vs_enemy && !cmp(
      state.sides[ctx.side].lord.hp,
      cond.lord_hp_vs_enemy,
      state.sides[other(ctx.side)].lord.hp
    )) return false;
    if (cond.last_discarded_type) {
      const last = ctx.lastDiscarded;
      const matches = last && (cond.last_discarded_type === "character" ? isCharacterType(last.type) : last.type === cond.last_discarded_type);
      if (!matches) return false;
    }
    if (cond.chosen_health) {
      if (!ctx.chosen || ctx.chosen.kind !== "unit") return false;
      const chosen = getUnit(state, ctx.chosen.side, ctx.chosen.row, ctx.chosen.col);
      if (!chosen || !cmp(chosen.hp, cond.chosen_health.op, cond.chosen_health.value)) return false;
    }
    if (cond.deck_tag) {
      const count = state.sides[ctx.side].deck.reduce((n, id) => n + ((ctx.cards?.get(id)?.tags ?? []).includes(cond.deck_tag.tag) ? 1 : 0), 0);
      if (!cmp(count, cond.deck_tag.op, cond.deck_tag.value)) return false;
    }
    if (cond.lord_status) {
      const side = cond.lord_status.side === "self" ? ctx.side : other(ctx.side);
      if (!state.sides[side].lord.statuses?.[cond.lord_status.status]) return false;
    }
    if (cond.attack_target) {
      const t = ctx.attackTarget;
      if (!t) return false;
      if (cond.attack_target.type === "lord") {
        if (t.kind !== "lord") return false;
      } else {
        if (t.kind !== "unit") return false;
        const target = getUnit(state, t.side, t.row, t.col);
        if (!target) return false;
        if (cond.attack_target.type && !matchesCardType(target.type, cond.attack_target.type)) return false;
        if (cond.attack_target.keyword && !hasTrait(target, cond.attack_target.keyword)) return false;
        if (cond.attack_target.has_status && !((target.statuses[cond.attack_target.has_status]?.stacks ?? 0) > 0)) return false;
        if (cond.attack_target.damaged !== void 0 && target.hp < target.maxHp !== cond.attack_target.damaged) return false;
      }
    }
    if (cond.lord_full_hp) {
      const side = cond.lord_full_hp.side === "self" ? ctx.side : other(ctx.side);
      const lord = state.sides[side].lord;
      const full = ctx.lordFullHpAtStart?.[side] ?? lord.hp === lord.maxHp;
      if (full !== cond.lord_full_hp.value) return false;
    }
    if (cond.exists) {
      return resolveTargets(state, { ...cond.exists, count: "all" }, ctx, rng).length > 0;
    }
    if (cond.count) {
      const n = resolveTargets(state, { ...cond.count.selector, count: "all" }, ctx, rng).length;
      return cmp(n, cond.count.op, cond.count.value);
    }
    if (cond.count_vs) {
      const l = resolveTargets(state, { ...cond.count_vs.left, count: "all" }, ctx, rng).length;
      const r = resolveTargets(state, { ...cond.count_vs.right, count: "all" }, ctx, rng).length;
      return cmp(l, cond.count_vs.op, r);
    }
    if (cond.event && !(ctx.flags ?? []).includes(cond.event)) return false;
    if (cond.roll && !(ctx.flags ?? []).includes(`roll:${cond.roll}`)) return false;
    if (cond.source_status && !(ctx.source?.statuses[cond.source_status]?.stacks ?? 0)) return false;
    if (typeof cond.turn_max === "number" && state.turn > cond.turn_max) return false;
    if (cond.victim_type) {
      if (ctx.victimType !== cond.victim_type) return false;
    }
    if (cond.chosen_kind && ctx.chosen?.kind !== cond.chosen_kind) return false;
    if (cond.chosen_side) {
      const t = ctx.chosen;
      if (!t) return false;
      const targetSide = t.side;
      return cond.chosen_side === "ally" ? targetSide === ctx.side : targetSide !== ctx.side;
    }
    if (cond.chosen_lord !== void 0) {
      const t = ctx.chosen;
      if (!t) return false;
      if (t.kind === "lord" !== cond.chosen_lord) return false;
    }
    if (cond.has_fallen) {
      const fs = cond.has_fallen.side === "ally" ? ctx.side : other(ctx.side);
      if (!state.sides[fs].fallen.includes(cond.has_fallen.card_id)) return false;
    }
    if (cond.chosen_damaged !== void 0) {
      const t = ctx.chosen;
      if (!t) return false;
      const damaged = ctx.chosenDamagedAtStart ?? chosenDamagedNow(state, t);
      if (damaged === null) return false;
      if (damaged !== cond.chosen_damaged) return false;
    }
    if (cond.chosen_dead !== void 0) {
      const t = ctx.chosen;
      if (!t) return false;
      if (t.kind === "hand") return false;
      const dead = t.kind === "lord" ? state.sides[t.side].lord.hp <= 0 : (() => {
        const u = getUnit(state, t.side, t.row, t.col);
        return !u || u.hp <= 0;
      })();
      if (dead !== cond.chosen_dead) return false;
    }
    if (cond.chosen_attack_max !== void 0) {
      const t = ctx.chosen;
      if (!t || t.kind !== "unit") return false;
      const u = getUnit(state, t.side, t.row, t.col);
      if (!u || u.atk > cond.chosen_attack_max) return false;
    }
    if (cond.chosen_attack_min !== void 0) {
      const t = ctx.chosen;
      if (!t || t.kind !== "unit") return false;
      const u = getUnit(state, t.side, t.row, t.col);
      if (!u || u.atk < cond.chosen_attack_min) return false;
    }
    return true;
  }
  function emitSkillTriggered(state, side, source, sk, from, events) {
    let row;
    let col;
    if (source) {
      const pos = findPos(state, side, source.uid);
      if (pos) {
        row = pos.row;
        col = pos.col;
      }
    }
    events.push({
      type: "SKILL_TRIGGERED",
      side,
      row,
      col,
      unitName: source?.name ?? "",
      skillName: sk.name || sk.id || "(\u6280\u80FD)",
      skillId: sk.id || "",
      kind: sk.kind,
      timing: sk.trigger,
      from
    });
  }
  function runTriggerSkills(state, cards, side, trigger, rng, events) {
    const refs = allUnits(state, side);
    const start = state.pendingTriggerSkills?.side === side && state.pendingTriggerSkills.trigger === trigger ? state.pendingTriggerSkills.nextIndex : 0;
    delete state.pendingTriggerSkills;
    for (let index = start; index < refs.length; index++) {
      const ref = refs[index];
      const u = ref.unit;
      if (u.hp <= 0) continue;
      for (const sk of (u.skills ?? []).filter((s) => s.trigger === trigger)) {
        if (!freqAllows(u, sk, trigger)) continue;
        const skCtx = { side, source: u };
        if (!freqConditionOk(state, sk, skCtx, rng)) continue;
        emitSkillTriggered(state, side, u, sk, "trigger", events);
        runEffects(state, cards, effectsOf(sk), skCtx, rng, events);
        freqMarkUsed(u, sk, trigger);
        if (state.pendingDiscover) {
          state.pendingTriggerSkills = { side, trigger, nextIndex: index + 1 };
          return;
        }
      }
    }
  }
  function costRuleDelta(state, card, side, rng) {
    if (!card.cost_rule) return 0;
    return checkCondition(state, card.cost_rule.condition, { side }, rng) ? card.cost_rule.value : 0;
  }
  function recomputeAuras(state, cards, rng, events) {
    const sides = ["own", "enemy"];
    for (const side of sides) {
      for (const ref of allUnits(state, side)) {
        ref.unit.mods = ref.unit.mods.filter((m) => m.kind !== "aura");
        for (const [id, inst] of Object.entries(ref.unit.statuses)) {
          if (inst.auraId) delete ref.unit.statuses[id];
        }
      }
      for (const hc of state.sides[side].hand) {
        hc.mods = hc.mods.filter((m) => !m.auraId);
      }
      const lord = state.sides[side].lord;
      for (const [id, inst] of Object.entries(lord.statuses ?? {})) {
        if (inst.auraId) delete lord.statuses[id];
      }
    }
    for (const side of sides) {
      for (const ref of allUnits(state, side)) {
        const u = ref.unit;
        if (u.hp <= 0) continue;
        for (const sk of (u.skills ?? []).filter((s) => s.kind === "aura")) {
          u.auraAnnounced = u.auraAnnounced ?? [];
          if (!u.auraAnnounced.includes(sk.id)) {
            u.auraAnnounced.push(sk.id);
            emitSkillTriggered(state, side, u, sk, "aura", events);
          }
          runEffects(
            state,
            cards,
            effectsOf(sk),
            { side, source: u, auraId: `${u.uid}#${sk.id}` },
            rng,
            events
          );
        }
      }
    }
    for (const side of sides) {
      for (const ref of allUnits(state, side)) applyMods(ref.unit);
    }
  }
  function runCardPlayedTriggers(state, cards, played, rng, events, playedSide = state.active, playedRightmost = false, playedUnitRef) {
    for (const side of ["own", "enemy"]) {
      for (const ref of allUnits(state, side)) {
        const u = ref.unit;
        if (u.hp <= 0) continue;
        for (const sk of (u.skills ?? []).filter((x) => x.trigger === "on_card_played")) {
          if (sk.same_side && side !== playedSide) continue;
          if (sk.played_by === "enemy" && side === playedSide) continue;
          if (sk.played_by === "ally" && side !== playedSide) continue;
          if (sk.played_rightmost && !playedRightmost) continue;
          if (sk.duration === "this_turn" && u.enteredTurn !== state.turn) continue;
          const want = sk.target?.filter?.type;
          if (want === "character") {
            if (!isCharacterType(played.type)) continue;
          } else if (want && played.type !== want) continue;
          emitSkillTriggered(state, side, u, sk, "trigger", events);
          runEffects(state, cards, effectsOf(sk), { side, source: u, playedCard: played, playedUnitRef }, rng, events);
        }
      }
    }
  }
  function runMarkDamaged(state, cards, victim, amount, rng, events) {
    const inst = victim.statuses.chou_di;
    if (!inst?.srcUid) return;
    for (const side of ["own", "enemy"]) {
      for (const ref of allUnits(state, side)) {
        const marker = ref.unit;
        if (marker.uid !== inst.srcUid || marker.hp <= 0) continue;
        for (const sk of (marker.skills ?? []).filter((x) => x.trigger === "on_mark_damaged")) {
          runEffects(
            state,
            cards,
            sk.effects,
            { side, source: marker, flags: [`mark_amount:${amount}`] },
            rng,
            events
          );
        }
      }
    }
  }
  function runMarkDeath(state, cards, dead, rng, events) {
    const inst = dead.statuses.chou_di ?? dead.statuses.chou_di_shou ?? dead.statuses.zhen_wang;
    if (inst?.payoff?.length && inst.srcSide) {
      runEffects(state, cards, inst.payoff, { side: inst.srcSide }, rng, events);
    }
    if (!inst?.srcUid) return;
    for (const side of ["own", "enemy"]) {
      for (const ref of allUnits(state, side)) {
        const marker = ref.unit;
        if (marker.uid !== inst.srcUid || marker.hp <= 0) continue;
        for (const sk of (marker.skills ?? []).filter((x) => x.trigger === "on_mark_death")) {
          runEffects(state, cards, sk.effects, { side, source: marker }, rng, events);
        }
      }
    }
  }
  function freqKeyOf(sk, trigger) {
    return sk.id || sk.name || trigger;
  }
  function freqAllows(u, sk, trigger) {
    const freq = sk.frequency;
    if (!freq || freq === "unlimited") return true;
    const key = freqKeyOf(sk, trigger);
    return freq === "once" ? !u.skillsUsedOnce.includes(key) : (u.skillUsesThisTurn[key] ?? 0) < 1;
  }
  function freqMarkUsed(u, sk, trigger) {
    const freq = sk.frequency;
    if (!freq || freq === "unlimited") return;
    const key = freqKeyOf(sk, trigger);
    if (freq === "once") {
      if (!u.skillsUsedOnce.includes(key)) u.skillsUsedOnce.push(key);
    } else {
      u.skillUsesThisTurn[key] = (u.skillUsesThisTurn[key] ?? 0) + 1;
    }
  }
  function freqConditionOk(state, sk, ctx, rng) {
    if (!sk.frequency) return true;
    const effs = sk.effects ?? [];
    if (!effs.length) return true;
    return effs.some((e) => checkCondition(state, e.condition, ctx, rng));
  }
  function runUnitTrigger(state, cards, unit, trigger, rng, events) {
    if (unit.hp <= 0) return;
    const side = findSide(state, unit.uid);
    if (!side) return;
    for (const sk of (unit.skills ?? []).filter((x) => x.trigger === trigger)) {
      if (!freqAllows(unit, sk, trigger)) continue;
      const skCtx = { side, source: unit };
      if (!freqConditionOk(state, sk, skCtx, rng)) continue;
      emitSkillTriggered(state, side, unit, sk, "trigger", events);
      runEffects(state, cards, effectsOf(sk), skCtx, rng, events);
      freqMarkUsed(unit, sk, trigger);
    }
  }
  var allyDamagedDepth = 0;
  function runAllyDamagedTriggers(state, cards, side, events) {
    if (allyDamagedDepth > 0) return;
    allyDamagedDepth += 1;
    try {
      for (const ref of allUnits(state, side)) {
        const u = ref.unit;
        if (u.hp <= 0) continue;
        const skills = (u.skills ?? []).filter((x) => x.trigger === "on_ally_damaged");
        if (!skills.length) continue;
        for (const sk of skills) {
          if (!freqAllows(u, sk, "on_ally_damaged")) continue;
          const skCtx = { side, source: u };
          const rng = createRng(state.rngState);
          if (!freqConditionOk(state, sk, skCtx, rng)) continue;
          state.rngState = rng.getState();
          emitSkillTriggered(state, side, u, sk, "trigger", events);
          runEffects(state, cards, effectsOf(sk), skCtx, rng, events);
          state.rngState = rng.getState();
          freqMarkUsed(u, sk, "on_ally_damaged");
        }
      }
    } finally {
      allyDamagedDepth -= 1;
    }
  }
  function runWaterDamageSynergies(state, cards, side, source, rng, events) {
    for (const ref of allUnits(state, side)) {
      if (ref.unit.hp <= 0 || ref.unit.uid === source?.uid) continue;
      for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === "on_water_damage")) {
        emitSkillTriggered(state, side, ref.unit, sk, "trigger", events);
        runEffects(
          state,
          cards,
          effectsOf(sk),
          { side, source: ref.unit, skipWaterSynergy: true },
          rng,
          events
        );
      }
    }
  }
  function runAllyAttackTriggers(state, cards, side, attacker, row, col, rng, events) {
    if (attacker.type !== "general" || attacker.hp <= 0) return;
    for (const ref of allUnits(state, side)) {
      if (ref.unit.uid === attacker.uid || ref.unit.hp <= 0) continue;
      for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === "on_ally_attack")) {
        const key = sk.id || sk.name || "on_ally_attack";
        if ((ref.unit.skillUsesThisTurn[key] ?? 0) >= 1) continue;
        ref.unit.skillUsesThisTurn[key] = (ref.unit.skillUsesThisTurn[key] ?? 0) + 1;
        emitSkillTriggered(state, side, ref.unit, sk, "trigger", events);
        runEffects(
          state,
          cards,
          effectsOf(sk),
          { side, source: ref.unit, eventAttacker: { side, row, col } },
          rng,
          events
        );
      }
    }
  }
  function runAllyUpgradeTriggers(state, cards, side, upgraded, rng, events) {
    const upgradedUnit = getUnit(state, side, upgraded.row, upgraded.col);
    if (!upgradedUnit || upgradedUnit.troopKind !== "cavalry") return;
    for (const ref of allUnits(state, side)) {
      if (ref.unit.hp <= 0) continue;
      for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === "on_ally_upgrade")) {
        emitSkillTriggered(state, side, ref.unit, sk, "trigger", events);
        runEffects(state, cards, effectsOf(sk), {
          side,
          source: ref.unit,
          eventUpgraded: { side, row: upgraded.row, col: upgraded.col }
        }, rng, events);
      }
    }
  }
  function findSide(state, uid) {
    for (const side of ["own", "enemy"]) {
      for (const r of BOARD.ROWS) {
        if (state.sides[side].rows[r].some((u) => u?.uid === uid)) return side;
      }
    }
    return null;
  }
  function findCol(state, side, uid) {
    for (const r of BOARD.ROWS) {
      const i = state.sides[side].rows[r].findIndex((u) => u?.uid === uid);
      if (i >= 0) return i;
    }
    return -1;
  }
  function topCost(state, side) {
    let max = 0;
    for (const r of BOARD.ROWS) {
      for (const u of state.sides[side].rows[r]) if (u && u.cost > max) max = u.cost;
    }
    return max;
  }
  function handSides(selector, ctx) {
    const sideSel = selector.side ?? "enemy";
    return sideSel === "both" ? ["own", "enemy"] : sideSel === "self" || sideSel === "ally" ? [ctx.side] : [other(ctx.side)];
  }
  function narrowByMode(state, pool, selector, rng) {
    if (selector.mode === "random" && pool.length) {
      const n2 = selector.count === "all" ? pool.length : selector.count ?? 1;
      const picked = [];
      const copy = [...pool];
      for (let i = 0; i < n2 && copy.length; i++) {
        picked.push(copy.splice(rng.int(copy.length), 1)[0]);
      }
      return picked;
    }
    if (selector.count === "all") return pool;
    const n = selector.count ?? 1;
    if (selector.mode === "first") return pool.slice(0, n);
    if (selector.mode === "lowest_health") {
      return [...pool].sort((a, b) => hpOf(state, a) - hpOf(state, b)).slice(0, n);
    }
    if (selector.mode === "highest_cost") {
      return [...pool].sort((a, b) => {
        const cost = (t) => t.kind === "hand" ? state.sides[t.side].hand[t.index]?.card.cost ?? 0 : 0;
        return cost(b) - cost(a);
      }).slice(0, n);
    }
    return pool.slice(0, n);
  }
  function resolveTargets(state, selector, ctx, rng) {
    if (selector?.attack_target) {
      return ctx.attackTarget ? [ctx.attackTarget] : [];
    }
    if (selector?.played) {
      return ctx.playedUnitRef ? [ctx.playedUnitRef] : [];
    }
    if (selector?.event) {
      const k = selector.event === "killer" ? ctx.killer : selector.event === "attacker" ? ctx.eventAttacker : selector.event === "upgraded" ? ctx.eventUpgraded : ctx.eventVictim;
      if (!k) return [];
      return k.row !== void 0 && k.col !== void 0 ? [unitRef(k.side, k.row, k.col)] : [lordRef(k.side)];
    }
    if (!selector) return ctx.chosen ? [ctx.chosen] : [];
    if (selector.pick !== void 0) {
      const picked = pickOf(ctx, selector);
      if (picked) {
        const validationSelector = { ...selector, pick: void 0, mode: "choose" };
        const validationCtx = { ...ctx, chosen: picked, chosen2: void 0 };
        const valid = resolveTargets(state, validationSelector, validationCtx, rng);
        return valid.some((target) => sameTarget(target, picked)) ? [picked] : [];
      }
    }
    if (selector.zone === "hand") {
      const out = [];
      for (const sd of handSides(selector, ctx)) {
        state.sides[sd].hand.forEach((hc, i) => {
          if (matchesHandFilter(hc, selector.filter, ctx.source?.cardId)) out.push(handRef(sd, i));
        });
      }
      if (selector.select === "highest_cost") {
        const costOf = (t) => t.kind === "hand" ? state.sides[t.side].hand[t.index]?.card.cost ?? 0 : 0;
        out.sort((a, b) => costOf(b) - costOf(a));
      }
      const pick2 = pickOf(ctx, selector);
      if (selector.mode !== "random" && pick2 && out.some((t) => sameTarget(t, pick2))) return [pick2];
      return narrowByMode(state, out, selector, rng);
    }
    if (selector.lord) {
      const sideSel2 = selector.side ?? "enemy";
      const ls = sideSel2 === "both" ? ["own", "enemy"] : sideSel2 === "self" || sideSel2 === "ally" ? [ctx.side] : [other(ctx.side)];
      const f = selector.filter;
      const kept = ls.filter((sd) => {
        if (!f) return true;
        const lord = state.sides[sd].lord;
        if (f.has_status && !((lord.statuses?.[f.has_status]?.stacks ?? 0) > 0)) return false;
        if (f.faction && lord.faction !== f.faction) return false;
        return true;
      });
      return kept.map((x) => lordRef(x));
    }
    if (selector.source) {
      const src = ctx.source;
      if (!src) return [];
      for (const r of BOARD.ROWS) {
        for (let c = 0; c < BOARD.COLS; c++) {
          const u = state.sides[ctx.side].rows[r][c];
          if (u?.uid !== src.uid) continue;
          if (selector.filter && !matchesFilter(u, selector.filter, r, src.cost, src.atk, src.uid)) return [];
          return [unitRef(ctx.side, r, c)];
        }
      }
      return [];
    }
    const sideSel = selector.side ?? "enemy";
    const sides = sideSel === "both" ? ["own", "enemy"] : sideSel === "self" ? [ctx.side] : sideSel === "ally" ? [ctx.side] : [other(ctx.side)];
    const confused = hasCap(ctx.source ?? null, "random_target");
    const poolSides = confused ? ["own", "enemy"] : sides;
    const pool = [];
    for (const s of poolSides) {
      for (const r of BOARD.ROWS) {
        state.sides[s].rows[r].forEach((u, c) => {
          if (!u) return;
          if (hasCap(u, "untargetable")) return;
          if (hasCap(u, "duel_lock") && ctx.source && !hasCap(ctx.source, "duel_lock")) return;
          if (matchesFilter(u, selector.filter ?? {}, r, ctx.source?.cost, ctx.source?.atk, ctx.source?.uid)) pool.push(unitRef(s, r, c));
        });
      }
    }
    const zoneSel = selector.zone;
    if (zoneSel === "both" || zoneSel === "hand") {
      for (const sd of poolSides) {
        state.sides[sd].hand.forEach((hc, i) => {
          if (matchesHandFilter(hc, selector.filter, ctx.source?.cardId)) pool.push(handRef(sd, i));
        });
      }
    }
    if (selector.filter?.include_lord) {
      for (const s of poolSides) {
        const lord = state.sides[s].lord;
        if (lord.hp <= 0) continue;
        if (selector.filter?.damaged === true && lord.hp >= lord.maxHp) continue;
        if (selector.filter?.damaged === false && lord.hp < lord.maxHp) continue;
        pool.push(lordRef(s));
      }
    }
    if (selector.select === "highest_cost") {
      const costOf = (t) => {
        if (t.kind === "hand") return state.sides[t.side].hand[t.index]?.card.cost ?? 0;
        if (t.kind === "unit") return getUnit(state, t.side, t.row, t.col)?.cost ?? 0;
        return 0;
      };
      pool.sort((a, b) => costOf(b) - costOf(a));
    }
    let finalPool = pool;
    if (selector.filter?.adjacent_to === "self" && ctx.source) {
      const srcCol = ctx.source ? findCol(state, ctx.side, ctx.source.uid) : -1;
      finalPool = srcCol < 0 ? [] : pool.filter((t) => t.kind === "unit" && Math.abs(t.col - srcCol) <= 1);
    }
    if (selector.filter?.adjacent_to === "chosen") {
      const chosen = pickOf(ctx, selector);
      finalPool = chosen?.kind === "unit" ? finalPool.filter((t) => t.kind === "unit" && t.side === chosen.side && t.row === chosen.row && Math.abs(t.col - chosen.col) === 1) : [];
    }
    if (selector.filter?.adjacent_to === "killer") {
      const k = ctx.killer;
      finalPool = k?.row !== void 0 && k.col !== void 0 ? finalPool.filter((t) => t.kind === "unit" && t.side === k.side && t.row === k.row && Math.abs(t.col - k.col) === 1) : [];
    }
    if (selector.filter?.offset_from_chosen !== void 0) {
      const chosen = pickOf(ctx, selector);
      const offset = selector.filter.offset_from_chosen;
      finalPool = chosen?.kind === "unit" ? finalPool.filter((t) => t.kind === "unit" && t.side === chosen.side && t.row === chosen.row && t.col === chosen.col + offset) : [];
    }
    if (selector.opposite_of) {
      const origins = resolveTargets(state, selector.opposite_of, ctx, rng);
      finalPool = finalPool.filter((target) => target.kind === "unit" && origins.some((origin) => origin.kind === "unit" && target.side !== origin.side && target.row === origin.row && target.col === origin.col));
    }
    const sel = confused ? { ...selector, mode: "random" } : selector;
    const pick = pickOf(ctx, sel);
    if (sel.mode === "choose" && pick && finalPool.some((t) => sameTarget(t, pick))) {
      return [pick];
    }
    return narrowByMode(state, finalPool, sel, rng);
  }
  function findPos(state, side, uid) {
    for (const r of BOARD.ROWS) {
      const i = state.sides[side].rows[r].findIndex((u) => u?.uid === uid);
      if (i >= 0) return { row: r, col: i };
    }
    return null;
  }
  function statusIdsOfKind(state, ref, kind) {
    const bags = ref.kind === "unit" ? getUnit(state, ref.side, ref.row, ref.col)?.statuses : ref.kind === "lord" ? state.sides[ref.side].lord.statuses : void 0;
    return Object.entries(bags ?? {}).filter(([id, inst]) => inst.stacks > 0 && STATUSES[id]?.kind === kind).map(([id]) => id);
  }
  function runOnAttackPhase(state, cards, attacker, phase, killed, rng, events, overflow = 0, attackTarget, victimType) {
    if (attacker.hp <= 0) return 0;
    const side = findSide(state, attacker.uid);
    if (!side) return 0;
    let bonus = 0;
    for (const sk of (attacker.skills ?? []).filter((x) => x.trigger === TIMING.ON_ATTACK)) {
      const effs = (sk.effects ?? []).filter((e) => phase === "after" ? e.condition?.event === "killed" : e.condition?.event !== "killed");
      const ctx = {
        side,
        source: attacker,
        attackTarget,
        victimType,
        flags: killed ? ["killed", ...overflow > 0 ? [`overflow:${overflow}`] : []] : []
      };
      const applicable = effs.filter((e) => checkCondition(state, e.condition, ctx, rng));
      if (!applicable.length) continue;
      emitSkillTriggered(state, side, attacker, sk, "trigger", events);
      bonus += applicable.filter((e) => e.action === "attack_bonus").reduce((sum, e) => sum + (e.value ?? 0), 0);
      runEffects(state, cards, applicable.filter((e) => e.action !== "attack_bonus"), ctx, rng, events);
    }
    return bonus;
  }
  function resolveAttack(state, cards, side, from, to, events, rng, opts = {}) {
    const attacker = getUnit(state, side, from.row, from.col);
    if (!attacker || attacker.hp <= 0) return false;
    const foe = opts.toSide ?? other(side);
    events.push({ type: "ATTACK_DECLARED", side, from: { ...from }, to });
    const attackTarget = to.kind === "lord" ? lordRef(foe) : unitRef(foe, to.row, to.col);
    const victimType = to.kind === "lord" ? "lord" : getUnit(state, foe, to.row, to.col)?.type;
    const focus = to.kind === "unit" ? getUnit(state, foe, to.row, to.col)?.statuses.he_bing_target : void 0;
    const focusOwner = focus?.srcUid && allUnits(state, side).some((ref) => ref.unit.uid === focus.srcUid);
    const focusBonus = focus && focusOwner && attacker.type === "general" ? 2 : 0;
    const attackBonus = focusBonus + runOnAttackPhase(state, cards, attacker, "before", false, rng, events, 0, attackTarget);
    const me = getUnit(state, side, from.row, from.col);
    if (!me || me.hp <= 0) return false;
    const dmg = effectiveAttack(state, side, from.row, from.col) + attackBonus;
    const hasYinXue = hasTrait(me, "yin_xue");
    let killed = false;
    let overflow = 0;
    let dealtTotal = 0;
    if (to.kind === "lord") {
      const dealt = dealDamage(
        state,
        cards,
        lordRef(foe),
        dmg,
        events,
        me.name,
        0,
        { side, row: from.row, col: from.col },
        me
      );
      dealtTotal += dealt;
      if (dealt > 0 && hasCap(me, "water_convert")) {
        runWaterDamageSynergies(state, cards, side, me, rng, events);
      }
      killed = state.sides[foe].lord.hp <= 0;
      if (hasYinXue) healTarget(state, unitRef(side, from.row, from.col), dealt, events);
    } else {
      const tRow = to.row;
      const tCol = to.col;
      const targetUnit = getUnit(state, foe, tRow, tCol);
      const hpBefore = targetUnit ? targetUnit.hp : 0;
      const retaliate = effectiveAttack(state, foe, tRow, tCol);
      if (targetUnit && targetUnit.hp > 0) runUnitTrigger(state, cards, targetUnit, "on_defend", rng, events);
      const reducedDmg = targetUnit && me.type === "troop" ? Math.max(0, dmg - capStacks(targetUnit.statuses, "reduce_troop_damage")) : dmg;
      const dealt = dealDamage(
        state,
        cards,
        unitRef(foe, tRow, tCol),
        reducedDmg,
        events,
        me.name,
        0,
        { side, row: from.row, col: from.col },
        me
      );
      dealtTotal += dealt;
      if (dealt > 0 && hasCap(me, "water_convert")) {
        runWaterDamageSynergies(state, cards, side, me, rng, events);
      }
      const hit = getUnit(state, foe, tRow, tCol);
      if (hit && dealt > 0 && hit.hp > 0) runUnitTrigger(state, cards, hit, "on_damaged", rng, events);
      if (retaliate > 0) {
        const reflected = dealDamage(
          state,
          cards,
          unitRef(side, from.row, from.col),
          retaliate,
          events,
          targetUnit?.name ?? "\u53CD\u51FB",
          0,
          void 0,
          targetUnit ?? void 0,
          "physical",
          false,
          { side: foe, row: tRow, col: tCol }
        );
        if (reflected > 0 && targetUnit && hasCap(targetUnit, "water_convert")) {
          runWaterDamageSynergies(state, cards, foe, targetUnit, rng, events);
        }
        const back = getUnit(state, side, from.row, from.col);
        if (back && reflected > 0 && back.hp > 0) runUnitTrigger(state, cards, back, "on_damaged", rng, events);
      }
      if (hasYinXue) healTarget(state, unitRef(side, from.row, from.col), dealt, events);
      const hitAfter = getUnit(state, foe, tRow, tCol);
      killed = !hitAfter || hitAfter.hp <= 0;
      if (killed) overflow = Math.max(0, reducedDmg - hpBefore);
    }
    const after = getUnit(state, side, from.row, from.col);
    if (after) {
      if (opts.consumeAttack !== false) after.attackedThisTurn += 1;
      after.actedThisTurn = true;
      if (dealtTotal > 0) after.dealtDamageThisTurn = true;
      if (hasTrait(after, "qi_xi")) {
        after.kw = after.kw.filter((k) => k !== "qi_xi");
        delete after.statuses.qi_xi_status;
        events.push({ type: "STATUS_EXPIRED", side, row: from.row, col: from.col, status: "qi_xi" });
      }
      if (after.hp <= 0) {
        killUnit(state, cards, { side, row: from.row, col: from.col, unit: after }, events);
        recomputeAuras(state, cards, rng, events);
      }
    }
    const survivor = getUnit(state, side, from.row, from.col);
    if (survivor && survivor.hp > 0) {
      runAllyAttackTriggers(state, cards, side, survivor, from.row, from.col, rng, events);
      runOnAttackPhase(state, cards, survivor, "after", killed, rng, events, overflow, attackTarget, victimType);
      for (const sk of (survivor.skills ?? []).filter((sk2) => sk2.trigger === TIMING.AFTER_ATTACK)) {
        if (!freqAllows(survivor, sk, TIMING.AFTER_ATTACK)) continue;
        const ctx = { side, source: survivor, flags: dealtTotal > 0 ? ["damaged"] : [] };
        if (!(sk.effects ?? []).some((e) => checkCondition(state, e.condition, ctx, rng))) continue;
        emitSkillTriggered(state, side, survivor, sk, "trigger", events);
        runEffects(state, cards, effectsOf(sk), ctx, rng, events);
        freqMarkUsed(survivor, sk, TIMING.AFTER_ATTACK);
      }
    }
    return true;
  }
  function firstEmptySlot(state, side) {
    for (const r of BOARD.ROWS) {
      for (let c = 0; c < BOARD.COLS; c++) {
        if (!state.sides[side].rows[r][c]) return { row: r, col: c };
      }
    }
    return null;
  }
  function effectsOf(sk, modeIndex) {
    const effects = sk.modes?.length ? (() => {
      const i = typeof modeIndex === "number" && Number.isInteger(modeIndex) && modeIndex >= 0 && modeIndex < sk.modes.length ? modeIndex : 0;
      return sk.modes[i].effects ?? [];
    })() : sk.effects ?? [];
    if (!sk.target) return effects;
    return effects.map((eff) => {
      if (!eff.target) return { ...eff, target: sk.target };
      if (eff.target.pick !== void 0 && !eff.target.source && !eff.target.lord && !eff.target.event && !eff.target.attack_target) {
        return { ...eff, target: { ...sk.target, ...eff.target } };
      }
      return eff;
    });
  }
  var LORD_DEFAULT_ACTIONS = /* @__PURE__ */ new Set(["damage"]);
  function withDefaultLordTarget(eff) {
    const t = eff.target;
    if (!t) return eff;
    if (t.filter?.include_lord !== void 0) return eff;
    if (!LORD_DEFAULT_ACTIONS.has(eff.action)) return eff;
    if (t.count !== "all" && t.mode !== "random") return eff;
    const side = t.side ?? "enemy";
    if (side === "self" || side === "ally") return eff;
    return { ...eff, target: { ...t, filter: { ...t.filter ?? {}, include_lord: true } } };
  }
  function runEffects(state, cards, effects, ctx, rng, events) {
    if (!effects?.length) return;
    ctx.cards ??= cards;
    ctx.lordFullHpAtStart ??= {
      own: state.sides[ctx.side].lord.hp === state.sides[ctx.side].lord.maxHp,
      enemy: state.sides[other(ctx.side)].lord.hp === state.sides[other(ctx.side)].lord.maxHp
    };
    if (ctx.chosenDamagedAtStart === void 0 && ctx.chosen) {
      ctx.chosenDamagedAtStart = chosenDamagedNow(state, ctx.chosen) ?? false;
    }
    const chosenFor = (sel) => {
      if (sel) return [];
      const p = pickOf(ctx, sel);
      return p ? [p] : [];
    };
    for (const [effectIndex, rawEff] of effects.entries()) {
      const eff = withDefaultLordTarget(rawEff);
      const chance = capOverride(ctx.source ?? null, "proc_chance");
      const roll = chance ?? eff.chance;
      if (typeof roll === "number" && rng.next() >= roll) continue;
      if (!checkCondition(state, eff.condition, ctx, rng)) continue;
      const dyn = (sel) => sel ? resolveTargets(state, { ...sel, count: "all" }, ctx, rng).length : void 0;
      const dynAtk = dyn(eff.attack_from), dynHp = dyn(eff.health_from);
      const dynVal = dyn(eff.value_from);
      const isCommandRepeat = (v) => !!v && typeof v === "object" && v.resource === "command";
      const dynCount = isCommandRepeat(eff.count_from) ? void 0 : dyn(eff.count_from);
      const discardVal = (() => {
        if (!eff.value_from_discarded) return void 0;
        const last = ctx.lastDiscarded;
        if (!last) return void 0;
        return eff.value_from_discarded === "cost" ? last.cost : last.health ?? 0;
      })();
      const flagVal = eff.value_from_flag ? Number((ctx.flags ?? []).find((f) => f.startsWith(`${eff.value_from_flag}:`))?.split(":")[1]) : void 0;
      const sourceVal = eff.value_from_source === "attack" ? ctx.source?.atk : eff.value_from_source === "health" ? ctx.source?.hp : void 0;
      const statusVal = eff.value_from_status ? ctx.source?.statuses[eff.value_from_status]?.stacks ?? 0 : void 0;
      const playedVal = eff.value_from_played === "cost" ? ctx.playedCard?.cost ?? 0 : void 0;
      const clashTargetVal = eff.value_from_clash_target === "attack" ? ctx.clashTargetAttack : void 0;
      const chosenVal = eff.value_from_chosen === "attack" && ctx.chosen?.kind === "unit" ? effectiveAttack(state, ctx.chosen.side, ctx.chosen.row, ctx.chosen.col) : void 0;
      const val = playedVal ?? flagVal ?? discardVal ?? dynVal ?? chosenVal ?? clashTargetVal ?? statusVal ?? sourceVal ?? eff.value ?? 0;
      const repeat = isCommandRepeat(eff.count_from) ? Math.min(
        eff.count_from.max,
        Math.floor(state.sides[ctx.side].command.cur / eff.count_from.divisor)
      ) : eff.count ?? 1;
      const targets = eff.target ? resolveTargets(state, eff.target, ctx, rng) : [];
      const pendingHandBefore = state.pendingHandChoice;
      switch (eff.action) {
        case "chain_damage": {
          const origin = targets[0] ?? pickOf(ctx, eff.target);
          if (origin?.kind !== "unit") break;
          const queue = [{ row: origin.row, col: origin.col }];
          const seen = /* @__PURE__ */ new Set([`${origin.row}:${origin.col}`]);
          const affected = [];
          while (queue.length) {
            const current = queue.shift();
            for (const col of [current.col - 1, current.col + 1]) {
              if (col < 0 || col >= BOARD.COLS) continue;
              const key = `${current.row}:${col}`;
              if (seen.has(key)) continue;
              const unit = getUnit(state, origin.side, current.row, col);
              if (!unit || unit.hp <= 0) continue;
              seen.add(key);
              queue.push({ row: current.row, col });
              affected.push(unitRef(origin.side, current.row, col));
            }
          }
          for (const target of affected) {
            runEffects(state, cards, [{
              ...eff,
              action: "damage",
              target: { pick: 1, mode: "choose" },
              count: void 0
            }], { ...ctx, chosen: target, chosen2: void 0 }, rng, events);
          }
          break;
        }
        case "damage": {
          const times = repeat;
          for (let i = 0; i < times; i++) {
            const list = i === 0 ? targets.length ? targets : chosenFor(eff.target) : eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target);
            for (const t of list) {
              const before = hpOf(state, t);
              const victim = t.kind === "unit" ? getUnit(state, t.side, t.row, t.col) : null;
              ctx.lastDamageTargetType = victim?.type ?? (t.kind === "lord" ? "lord" : void 0);
              const convertsToWater = (eff.damage_type ?? "physical") === "physical" && (ctx.source ? hasCap(ctx.source, "water_convert") : allUnits(state, ctx.side).some((ref) => hasCap(ref.unit, "water_convert")));
              const resolvedDamageType = convertsToWater ? "water" : eff.damage_type ?? "physical";
              const waterBonus = resolvedDamageType === "water" ? allUnits(state, ctx.side).reduce((sum, ref) => sum + capStacks(ref.unit.statuses, "water_damage"), 0) : 0;
              const fireBonus = resolvedDamageType === "fire" ? allUnits(state, ctx.side).reduce((sum, ref) => sum + capStacks(ref.unit.statuses, "fire_damage"), 0) : 0;
              const keywordBonus = victim && eff.bonus_vs_keyword && hasTrait(victim, eff.bonus_vs_keyword.keyword) ? eff.bonus_vs_keyword.value : 0;
              const troopBonus = victim && eff.bonus_vs_troop_kind && victim.troopKind === eff.bonus_vs_troop_kind.troopKind ? eff.bonus_vs_troop_kind.value : 0;
              let readyFireBonus = 0;
              if (resolvedDamageType === "fire" && eff.damage_origin !== "reflected") {
                for (const ref of allUnits(state, ctx.side)) {
                  const stacks = ref.unit.statuses.fire_gong_ready?.stacks ?? 0;
                  if (stacks <= 0) continue;
                  readyFireBonus += stacks;
                  removeStatus(state, unitRef(ctx.side, ref.row, ref.col), "fire_gong_ready", events);
                }
              }
              const troopReduction = victim && ctx.source?.type === "troop" ? capStacks(victim.statuses, "reduce_troop_damage") : 0;
              const waterImmune = victim && resolvedDamageType === "water" && hasCap(victim, "immune_water_damage");
              const requested = Math.max(0, val + waterBonus + fireBonus + readyFireBonus + keywordBonus + troopBonus - troopReduction);
              const protectedHp = typeof eff.minimum_hp === "number" && t.kind === "unit" ? Math.max(0, (getUnit(state, t.side, t.row, t.col)?.hp ?? 0) - eff.minimum_hp) : requested;
              const actual = waterImmune ? 0 : dealDamage(
                state,
                cards,
                t,
                Math.min(requested, protectedHp),
                events,
                ctx.source?.name ?? "\u6548\u679C",
                0,
                void 0,
                ctx.source,
                resolvedDamageType,
                eff.damage_origin === "reflected",
                ctx.source && findPos(state, ctx.side, ctx.source.uid) ? { side: ctx.side, ...findPos(state, ctx.side, ctx.source.uid) } : void 0
              );
              const sourcePos = ctx.source ? findPos(state, ctx.side, ctx.source.uid) : void 0;
              if (victim && actual > 0 && ctx.source?.type === "machine" && sourcePos && capStacks(victim.statuses, "thorns_machine") > 0) {
                dealDamage(
                  state,
                  cards,
                  unitRef(ctx.side, sourcePos.row, sourcePos.col),
                  capStacks(victim.statuses, "thorns_machine"),
                  events,
                  victim.name
                );
              }
              if (resolvedDamageType === "water" && actual > 0 && t.side !== ctx.side && !ctx.skipWaterSynergy) {
                runWaterDamageSynergies(state, cards, ctx.side, ctx.source, rng, events);
              }
              const dot = eff.damage_type ? ELEMENTAL_DOT[eff.damage_type] : void 0;
              if (dot && t.kind === "unit" && t.side !== ctx.side) {
                applyStatus(state, t, dot, 1, events);
              }
              if (before > 0 && hpOf(state, t) <= 0) {
                ctx.flags = ctx.flags ?? [];
                if (!ctx.flags.includes("killed")) ctx.flags.push("killed");
                ctx.eventCounts = ctx.eventCounts ?? {};
                ctx.eventCounts.killed = (ctx.eventCounts.killed ?? 0) + 1;
              }
              if (victim && actual > 0 && victim.hp > 0) runUnitTrigger(state, cards, victim, "on_damaged", rng, events);
            }
          }
          break;
        }
        case "roll": {
          const id = eff.roll_id ?? "default";
          ctx.flags = ctx.flags ?? [];
          if (rng.next() < (eff.chance ?? 0.5)) ctx.flags.push(`roll:${id}`);
          break;
        }
        case "heal": {
          for (let i = 0; i < repeat; i++) {
            const list = i === 0 ? targets.length ? targets : chosenFor(eff.target) : eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target);
            for (const t of list) healTarget(state, t, val, events);
          }
          break;
        }
        case "draw": {
          const who = eff.target?.side === "enemy" ? other(ctx.side) : ctx.side;
          for (let i = 0; i < (dynVal ?? eff.value ?? 1) * repeat; i++) drawCard(state, cards, who, events);
          break;
        }
        case "discover": {
          const filter = eff.target?.filter;
          const source = eff.pool || eff.discover_from === "pool" ? "pool" : "deck";
          const candidates = (eff.pool?.cards ? eff.pool.cards.filter((id) => cards.has(id)) : source === "pool" ? [...cards.values()].filter((c) => (!eff.pool?.type || c.type === eff.pool.type) && (!eff.pool?.factions || eff.pool.factions.includes(c.faction))).map((c) => c.id) : state.sides[ctx.side].deck).filter((id) => {
            const card = cards.get(id);
            if (!card) return false;
            if (filter?.faction && card.faction !== filter.faction) return false;
            if (filter?.factions && !filter.factions.includes(card.faction)) return false;
            if (filter?.type && filter.type !== "character" && card.type !== filter.type) return false;
            if (filter?.type === "character" && !isCharacterType(card.type)) return false;
            if (filter?.types && !filter.types.includes(card.type)) return false;
            if (filter?.tag && !(card.tags ?? []).includes(filter.tag)) return false;
            if (filter?.any_of && !filter.any_of.some((alt) => {
              if (alt.type && (alt.type === "character" ? !isCharacterType(card.type) : card.type !== alt.type)) return false;
              if (alt.tag && !(card.tags ?? []).includes(alt.tag)) return false;
              if (alt.faction && card.faction !== alt.faction) return false;
              return true;
            })) return false;
            if (filter?.card_id && id !== filter.card_id) return false;
            if (filter?.damage_type && !cardHasDamageType(card, filter.damage_type)) return false;
            return true;
          });
          const pool = [...candidates];
          const shown = [];
          const count = Math.min(eff.count ?? 3, pool.length);
          if (eff.discover_distinct_costs) {
            const byCost = /* @__PURE__ */ new Map();
            for (const id of pool) {
              const card = cards.get(id);
              if (!card) continue;
              const list = byCost.get(card.cost) ?? [];
              list.push(id);
              byCost.set(card.cost, list);
            }
            const costs = [...byCost.keys()];
            while (shown.length < count && costs.length) {
              const ci = rng.int(costs.length);
              const cost = costs.splice(ci, 1)[0];
              const list = byCost.get(cost);
              shown.push(list[rng.int(list.length)]);
            }
          } else {
            for (let i = 0; i < count; i++) shown.push(pool.splice(rng.int(pool.length), 1)[0]);
          }
          if (!shown.length) break;
          state.pendingDiscover = {
            side: ctx.side,
            candidates: shown,
            costModifier: eff.value,
            choiceModifiers: eff.discover_modifiers,
            choiceTagModifiers: eff.discover_tag_modifiers,
            destination: eff.discover_to ?? "hand",
            // ADR-178：多选（`picks`）＋池来源（`fromPool`）＋剩余候选去向（`rest`）
            picks: eff.picks ?? 1,
            fromPool: source === "pool",
            rest: eff.rest,
            source,
            unselectedCandidates: eff.discover_unselected_to ? candidates.filter((id) => !shown.includes(id)) : void 0,
            unselectedTo: eff.discover_unselected_to,
            banChoice: eff.ban_choice,
            unplayedPenalty: eff.unplayed_penalty
          };
          events.push({
            type: "DISCOVER_OPTIONS",
            side: ctx.side,
            cards: shown.map((id) => cards.get(id)).filter(Boolean)
          });
          break;
        }
        case "draw_random": {
          const filter = eff.target?.filter;
          const deck = state.sides[ctx.side].deck;
          const candidates = deck.map((id, index) => ({ id, index, card: cards.get(id) })).filter(({ card }) => !!card && (!filter?.type || (filter.type === "character" ? isCharacterType(card.type) : card.type === filter.type)) && (!filter?.faction || card.faction === filter.faction) && (!filter?.factions || filter.factions.includes(card.faction)) && (!filter?.tag || (card.tags ?? []).includes(filter.tag)));
          const picked = candidates.length ? candidates[rng.int(candidates.length)] : void 0;
          if (!picked?.card) break;
          deck.splice(picked.index, 1);
          state.sides[ctx.side].hand.push({ card: picked.card, mods: [] });
          events.push({ type: "CARD_DRAWN", side: ctx.side, card: picked.card, deckLeft: deck.length });
          break;
        }
        case "discover_tactic_pair": {
          const hand = state.sides[ctx.side].hand;
          const pick = ctx.handIndex;
          const filter = eff.target?.filter;
          if (typeof pick !== "number") {
            const indices = hand.flatMap((hc, index) => hc.card.type === "tactic" && matchesHandFilter(hc, filter, ctx.source?.cardId) ? [index] : []);
            if (!indices.length) return;
            state.pendingHandChoice = {
              side: ctx.side,
              kind: "tactic_pair",
              indices,
              choiceEffect: eff
            };
            events.push({ type: "HAND_CHOICE_OPTIONS", side: ctx.side, kind: "tactic_pair", indices });
            break;
          }
          if (!Number.isInteger(pick) || pick < 0 || pick >= hand.length || hand[pick].card.type !== "tactic" || !matchesHandFilter(hand[pick], filter, ctx.source?.cardId)) throw new Error("\u8BF7\u9009\u62E9\u4E00\u5F20\u624B\u724C\u6218\u6CD5");
          const discarded = hand[pick];
          const cost = effectiveCost(discarded);
          const pool = [...cards.values()].filter((card) => card.type === "tactic" && isPlayableBy(card, eff.pool_faction ?? ctx.source?.faction ?? state.sides[ctx.side].lord.faction));
          const pairs = [];
          for (let i = 0; i < pool.length; i++) {
            for (let j = i; j < pool.length; j++) pairs.push([pool[i], pool[j]]);
          }
          const exact = pairs.filter(([a, b]) => a.cost + b.cost === cost);
          const fallback = pairs.filter(([a, b]) => Math.abs(a.cost + b.cost - cost) === 1);
          const candidates = exact.length ? exact : fallback;
          hand.splice(pick, 1);
          state.sides[ctx.side].discard.push(discarded.card);
          ctx.lastDiscarded = discarded.card;
          events.push({ type: "CARD_DISCARDED", side: ctx.side, card: discarded.card });
          if (!candidates.length) break;
          const chosenPair = candidates[rng.int(candidates.length)];
          for (const card of chosenPair) {
            state.sides[ctx.side].hand.push({ card, mods: [] });
            events.push({ type: "DECK_ADDED", side: ctx.side, card, count: 1, to: "hand" });
          }
          break;
        }
        case "deploy_from_deck": {
          const sel = eff.target;
          const deck = state.sides[ctx.side].deck;
          const n = eff.count ?? 1;
          let deployed = 0;
          for (let i = 0; i < deck.length && deployed < n; ) {
            const c = cards.get(deck[i]);
            if (!c || !matchesHandFilter({ card: c, mods: [] }, sel?.filter, ctx.source?.cardId)) {
              i++;
              continue;
            }
            const slot = firstEmptySlot(state, ctx.side);
            if (!slot) break;
            const u = summonUnit(state, cards, ctx.side, slot.row, slot.col, c.id, events);
            if (!u) {
              i++;
              continue;
            }
            deck.splice(i, 1);
            if (eff.grant_keyword) {
              applyStatus(state, unitRef(ctx.side, slot.row, slot.col), `${eff.grant_keyword}_status`, 1, events);
            }
            deployed++;
          }
          break;
        }
        case "deploy_from_hand": {
          const sel = eff.target;
          const hand = state.sides[ctx.side].hand;
          const picks = [];
          const want = sel?.mode === "choose" && typeof ctx.handIndex === "number" ? ctx.handIndex : void 0;
          if (want !== void 0 && hand[want] && matchesHandFilter(hand[want], sel?.filter, ctx.source?.cardId)) {
            picks.push(want);
          } else {
            const n = eff.count ?? 1;
            for (let i = 0; i < hand.length && picks.length < n; i++) {
              if (matchesHandFilter(hand[i], sel?.filter, ctx.source?.cardId)) picks.push(i);
            }
          }
          for (const i of [...picks].sort((a, b) => b - a)) {
            const slot = firstEmptySlot(state, ctx.side);
            if (!slot) break;
            const hc = hand[i];
            if (!hc) continue;
            const u = summonUnit(state, cards, ctx.side, slot.row, slot.col, hc.card.id, events);
            if (!u) continue;
            hand.splice(i, 1);
            const handAtk = hc.mods.filter((m) => m.kind === "attack" && m.auraId === void 0).reduce((sum, m) => sum + (m.value ?? 0), 0);
            const handHp = hc.mods.filter((m) => m.kind === "health" && m.auraId === void 0).reduce((sum, m) => sum + (m.value ?? 0), 0);
            if (handAtk) u.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: "permanent", attack: handAtk });
            if (handHp) u.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: "permanent", health: handHp });
            for (const m of hc.mods) {
              if (m.kind !== "rule" || !m.rule || m.auraId !== void 0) continue;
              u.mods.push({ id: `handrule#${nextUidSeq(state)}`, kind: "rule", rule: { ...m.rule } });
            }
            applyMods(u);
            for (const sk of (u.skills ?? []).filter((x) => x.trigger === "on_play")) {
              emitSkillTriggered(state, ctx.side, u, sk, "on_play", events);
              runEffects(state, cards, effectsOf(sk), { side: ctx.side, source: u }, rng, events);
            }
          }
          break;
        }
        case "summon": {
          const empties = [];
          for (const r of BOARD.ROWS) {
            for (let c = 0; c < BOARD.COLS; c++) {
              if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
            }
          }
          const eventCount = eff.condition?.event ? ctx.eventCounts?.[eff.condition.event] : void 0;
          const n = eventCount ?? dynCount ?? eff.count ?? 1;
          for (let i = 0; i < n && empties.length; i++) {
            const idx = eff.position === "random" ? rng.int(empties.length) : 0;
            const slot = empties.splice(idx, 1)[0];
            if (eff.unit) {
              const u = summonUnit(state, cards, ctx.side, slot.row, slot.col, eff.unit, events);
              if (u && eff.status) {
                applyStatus(state, unitRef(ctx.side, slot.row, slot.col), eff.status, eff.stacks ?? 1, events);
              }
              if (u && eff.copy_source_stats && ctx.source) {
                u.atk = u.baseAtk = ctx.source.atk;
                u.hp = u.maxHp = u.baseMaxHp = ctx.source.hp;
              }
              if (u) {
                for (const sk of (u.skills ?? []).filter((s) => s.trigger === "on_play")) {
                  emitSkillTriggered(state, ctx.side, u, sk, "on_play", events);
                  runEffects(state, cards, effectsOf(sk), { side: ctx.side, source: u }, rng, events);
                }
              }
            }
          }
          break;
        }
        case "summon_random": {
          const choices = (eff.units ?? []).filter((id) => cards.has(id));
          if (!choices.length) break;
          const chosen = choices[rng.int(choices.length)];
          if (!chosen) break;
          runEffects(state, cards, [{ ...eff, action: "summon", unit: chosen, units: void 0 }], ctx, rng, events);
          break;
        }
        case "reveal_hand": {
          const targetSide = other(ctx.side);
          const targetCost = Math.min(10, state.sides[ctx.side].command.max + 1);
          const cardsToReveal = state.sides[targetSide].hand.filter((hc) => hc.card.cost === targetCost).map((hc) => hc.card);
          if (cardsToReveal.length) {
            events.push({ type: "HAND_REVEALED", side: ctx.side, cards: [cardsToReveal[rng.int(cardsToReveal.length)]] });
          }
          break;
        }
        case "discard_status_count": {
          const need = ctx.source?.statuses[eff.status ?? ""]?.stacks ?? 0;
          let discarded = 0;
          for (let i = 0; i < need; i++) {
            const hand = state.sides[ctx.side].hand;
            if (!hand.length) break;
            const idx = rng.int(hand.length);
            const [hc] = hand.splice(idx, 1);
            if (!hc) continue;
            state.sides[ctx.side].discard.push(hc.card);
            ctx.lastDiscarded = hc.card;
            state.lastDiscarded = { card: hc.card, side: ctx.side };
            discarded += 1;
            events.push({ type: "CARD_DISCARDED", side: ctx.side, card: hc.card });
          }
          for (let i = discarded; i < need && state.sides[ctx.side].deck.length; i++) {
            const id = state.sides[ctx.side].deck.pop();
            const card = cards.get(id);
            if (card) state.sides[ctx.side].discard.push(card);
            events.push({ type: "CARD_MILLED", side: ctx.side, cardId: id, from: "top" });
          }
          if (discarded > 0) {
            ctx.flags = ctx.flags ?? [];
            if (!ctx.flags.includes("discarded")) ctx.flags.push("discarded");
          } else {
            ctx.lastDiscarded = void 0;
            state.lastDiscarded = void 0;
          }
          break;
        }
        case "discard": {
          const n = eff.count ?? 1;
          let discardedAny = false;
          const sel = eff.target?.side ?? "enemy";
          const sides = sel === "both" ? ["own", "enemy"] : sel === "self" || sel === "ally" ? [ctx.side] : [other(ctx.side)];
          for (const side of sides) {
            for (let i = 0; i < n; i++) {
              const filter = eff.target?.filter;
              const candidates = state.sides[side].hand.map((hc2, index) => ({ hc: hc2, index })).filter(({ hc: hc2 }) => matchesHandFilter(hc2, filter));
              if (!candidates.length) break;
              const want = eff.mode === "choose" && side === ctx.side ? ctx.handIndex : void 0;
              const picked = typeof want === "number" ? candidates.find((c) => c.index === want) : void 0;
              const idx = picked?.index ?? candidates[rng.int(candidates.length)].index;
              const [hc] = state.sides[side].hand.splice(idx, 1);
              if (!hc) continue;
              state.sides[side].discard.push(hc.card);
              state.lastDiscarded = { card: hc.card, side };
              discardedAny = true;
              ctx.lastDiscarded = hc.card;
              events.push({ type: "CARD_DISCARDED", side, card: hc.card });
            }
          }
          if (!discardedAny) {
            ctx.lastDiscarded = void 0;
            state.lastDiscarded = void 0;
          }
          break;
        }
        case "add_to_deck": {
          const who = eff.target?.side === "enemy" ? other(ctx.side) : ctx.side;
          const def = cards.get(String(eff.unit ?? ""));
          if (!def) {
            events.push({ type: "REJECTED", reason: `add_to_deck \u7684\u5361\u4E0D\u5B58\u5728\uFF1A${eff.unit}` });
            break;
          }
          const n = eff.value_from ? resolveTargets(state, eff.value_from, ctx, rng).length : eff.count ?? 1;
          if (eff.to === "hand") {
            for (let i = 0; i < n; i++) {
              state.sides[who].hand.push({ card: def, mods: [] });
            }
          } else {
            for (let i = 0; i < n; i++) {
              const deck = state.sides[who].deck;
              deck.splice(rng.int(deck.length + 1), 0, def.id);
            }
          }
          events.push({ type: "DECK_ADDED", side: who, card: def, count: n, to: eff.to === "hand" ? "hand" : "deck" });
          break;
        }
        case "send_to_deck": {
          const to = eff.target?.side === "enemy" ? other(ctx.side) : ctx.side;
          const cid = String(eff.unit ?? "");
          const from = state.sides[ctx.side].deck;
          const moved = [];
          for (let i = from.length - 1; i >= 0; i--) {
            if (from[i] === cid) {
              from.splice(i, 1);
              moved.push(cid);
            }
          }
          for (const id of moved) {
            const deck = state.sides[to].deck;
            deck.splice(rng.int(deck.length + 1), 0, id);
          }
          events.push({ type: "DECK_SENT", side: to, cardId: cid, count: moved.length });
          break;
        }
        case "cycle_to_deck": {
          const h = state.sides[ctx.side].hand;
          const idx = typeof ctx.handIndex === "number" && ctx.handIndex >= 0 && ctx.handIndex < h.length ? ctx.handIndex : h.length ? rng.int(h.length) : -1;
          if (idx < 0) break;
          const [hc] = h.splice(idx, 1);
          if (!hc) break;
          const deck = state.sides[ctx.side].deck;
          deck.splice(rng.int(deck.length + 1), 0, hc.card.id);
          events.push({ type: "CARD_RETURNED_TO_DECK", side: ctx.side, card: hc.card });
          drawCard(state, cards, ctx.side, events, rng);
          break;
        }
        case "send_hand_to_deck": {
          const hand = state.sides[ctx.side].hand;
          if (!hand.length) return;
          const handFilter = eff.target?.filter;
          const where = eff.to === "deck_top" ? "deck_top" : eff.to === "deck_bottom" || eff.to === void 0 ? "deck_bottom" : "random";
          const move = (pick) => {
            if (!hand[pick] || !matchesHandFilter(hand[pick], handFilter, ctx.source?.cardId)) return;
            const [chosen] = state.sides[ctx.side].hand.splice(pick, 1);
            if (!chosen) return;
            const toDeck = state.sides[ctx.side].deck;
            if (where === "deck_top") toDeck.push(chosen.card.id);
            else if (where === "deck_bottom") toDeck.unshift(chosen.card.id);
            else toDeck.splice(rng.int(toDeck.length + 1), 0, chosen.card.id);
            events.push({ type: "CARD_RETURNED_TO_DECK", side: ctx.side, card: chosen.card, to: where });
          };
          if (eff.mode === "choose") {
            const given = ctx.handIndex;
            if (typeof given === "number" && given >= 0 && given < hand.length && matchesHandFilter(hand[given], handFilter, ctx.source?.cardId)) {
              move(given);
              break;
            }
            const take = eff.from_drawn ?? 0;
            const candidates = take > 0 ? hand.length - Math.min(take, hand.length) : 0;
            const indices = [];
            for (let i = candidates; i < hand.length; i++) {
              if (matchesHandFilter(hand[i], handFilter, ctx.source?.cardId)) indices.push(i);
            }
            if (!indices.length) return;
            state.pendingHandChoice = { side: ctx.side, kind: where, indices };
            events.push({ type: "HAND_CHOICE_OPTIONS", side: ctx.side, kind: where, indices });
            break;
          }
          move(typeof ctx.handIndex === "number" && ctx.handIndex >= 0 && ctx.handIndex < hand.length ? ctx.handIndex : rng.int(hand.length));
          break;
        }
        case "steal_attack": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const v = effectiveAttack(state, t.side, t.row, t.col);
            if (v <= 0) continue;
            u.baseAtk = 0;
            u.atk = 0;
            if (ctx.source) {
              ctx.source.baseAtk += v;
              ctx.source.atk += v;
            }
          }
          break;
        }
        case "return_to_hand": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const def = cards.get(u.cardId);
            state.sides[t.side].rows[t.row][t.col] = null;
            if (def) {
              const mods = [];
              const turns = typeof eff.duration === "number" ? eff.duration : eff.duration === "this_turn" ? 1 : void 0;
              if (eff.value) mods.push({ id: `retcost#${nextUidSeq(state)}`, kind: "cost", value: eff.value, turns });
              state.sides[t.side].hand.push({ card: def, mods });
              if (mods.length) {
                events.push({
                  type: "HAND_MODIFIED",
                  side: t.side,
                  index: state.sides[t.side].hand.length - 1,
                  kind: "cost",
                  value: eff.value,
                  turns
                });
              }
            }
            events.push({ type: "UNIT_RETURNED", side: t.side, row: t.row, col: t.col, unit: u });
          }
          break;
        }
        case "override_status":
        case "override_rule": {
          const statusId = eff.status;
          const caps = eff.caps;
          if (!caps) break;
          const list = targets.length ? targets : chosenFor(eff.target);
          for (const t of list) {
            if (t.kind !== "unit" && t.kind !== "hand") continue;
            for (const [cap, value] of Object.entries(caps)) {
              if (typeof value !== "number") continue;
              const rule = { ...statusId ? { statusId } : {}, cap, value };
              const isSame = (m) => m.kind === "rule" && m.rule?.statusId === statusId && m.rule?.cap === cap;
              if (t.kind === "unit") {
                const u = getUnit(state, t.side, t.row, t.col);
                if (!u) continue;
                u.mods = u.mods.filter((m) => !isSame(m));
                u.mods.push({ id: `rule#${statusId ?? "always"}#${cap}#${nextUidSeq(state)}`, kind: "rule", rule });
                events.push({
                  type: "STATUS_OVERRIDDEN",
                  side: t.side,
                  target: { kind: "unit", row: t.row, col: t.col },
                  ...statusId ? { statusId } : {},
                  cap: rule.cap,
                  value
                });
              } else {
                const hc = state.sides[t.side].hand[t.index];
                if (!hc) continue;
                hc.mods = hc.mods.filter((m) => !isSame(m));
                hc.mods.push({ id: `rule#${statusId ?? "always"}#${cap}#${nextUidSeq(state)}`, kind: "rule", rule });
                events.push({
                  type: "STATUS_OVERRIDDEN",
                  side: t.side,
                  target: { kind: "hand", index: t.index },
                  ...statusId ? { statusId } : {},
                  cap: rule.cap,
                  value
                });
              }
            }
          }
          break;
        }
        case "self_to_hand": {
          const dead = ctx.source;
          const def = dead ? cards.get(dead.cardId) : void 0;
          if (!def) break;
          const maxTimes = eff.count ?? 6;
          const n = (state.recalls?.[def.id] ?? 0) + 1;
          state.recalls = state.recalls ?? {};
          state.recalls[def.id] = n;
          const exceeded = n > maxTimes;
          const overflow = eff.overflow ?? "enemy";
          if (exceeded && overflow === "none") break;
          const toSide = exceeded ? other(ctx.side) : eff.target?.side === "enemy" ? other(ctx.side) : ctx.side;
          const costDelta = (eff.value ?? -1) * n;
          const healthDelta = (eff.health ?? -1) * n;
          const mods = [];
          if (costDelta) mods.push({ id: `recallcost#${def.id}#${n}`, kind: "cost", value: costDelta });
          if (healthDelta) mods.push({ id: `recallhp#${def.id}#${n}`, kind: "health", value: healthDelta });
          state.sides[toSide].hand.push({ card: def, mods });
          events.push({
            type: "CARD_REBUILT_IN_HAND",
            side: toSide,
            card: def,
            times: n,
            exceeded,
            costDelta,
            healthDelta
          });
          break;
        }
        case "defect_to_deck": {
          const dead = ctx.source;
          if (!dead) break;
          const toId = eff.unit ?? dead.cardId;
          const def = cards.get(toId);
          if (!def) break;
          const foe = other(ctx.side);
          const deck = state.sides[foe].deck;
          const at = eff.position === "top" ? deck.length : rng.int(deck.length + 1);
          deck.splice(at, 0, toId);
          events.push({ type: "CARD_DEFECTED", from: ctx.side, to: foe, card: def });
          break;
        }
        case "clash": {
          const clashTarget = eff.target ? resolveTargets(state, eff.target, ctx, rng)[0] : ctx.chosen;
          const foe = eff.target?.side === "self" || eff.target?.side === "ally" || eff.target === void 0 && clashTarget?.side === ctx.side ? ctx.side : other(ctx.side);
          const mine = ctx.source?.cost ?? 0;
          const chosen = clashTarget;
          const chosenUnit = chosen?.kind === "unit" ? getUnit(state, chosen.side, chosen.row, chosen.col) : null;
          const his = chosenUnit ? chosenUnit.cost : topCost(state, foe);
          const mode = eff.clashMode ?? "roll";
          const a = mode === "cost" ? mine : rng.int(6) + 1;
          const b = mode === "cost" ? his : rng.int(6) + 1;
          const tie = a === b;
          const win = tie && !eff.tie_is_neutral ? true : a > b;
          ctx.flags = ctx.flags ?? [];
          if (tie && eff.tie_is_neutral) ctx.flags.push("clash_tie");
          else ctx.flags.push(win ? "clash_won" : "clash_lost");
          if (chosen?.kind === "unit" && chosenUnit) {
            ctx.clashTargetAttack = effectiveAttack(state, chosen.side, chosen.row, chosen.col);
          } else {
            ctx.clashTargetAttack = void 0;
          }
          events.push({ type: "CLASH", side: ctx.side, mine: a, theirs: b, won: win });
          break;
        }
        case "cost_modifier": {
          const value = eff.value ?? 0;
          const turns = typeof eff.duration === "number" ? eff.duration : eff.duration === "this_turn" ? 1 : void 0;
          for (const t of targets) {
            if (t.kind !== "hand") continue;
            const hc = state.sides[t.side].hand[t.index];
            if (!hc) continue;
            hc.mods.push({ id: `cost#${nextUidSeq(state)}`, kind: "cost", value, turns, auraId: ctx.auraId });
            events.push({ type: "HAND_MODIFIED", side: t.side, index: t.index, kind: "cost", value, turns });
          }
          break;
        }
        case "add_to_hand": {
          const n = eff.count ?? 1;
          const def = eff.unit ? cards.get(eff.unit) : void 0;
          if (!def) break;
          for (let i = 0; i < n; i++) {
            state.sides[ctx.side].hand.push({ card: def, mods: [] });
            events.push({ type: "CARD_DRAWN", side: ctx.side, card: def, deckLeft: state.sides[ctx.side].deck.length });
          }
          break;
        }
        case "grant_hand": {
          const list = targets.length ? targets : chosenFor(eff.target);
          for (const t of list) {
            if (t.kind !== "hand") continue;
            const hc = state.sides[t.side].hand[t.index];
            if (!hc) continue;
            hc.card = {
              ...hc.card,
              ...eff.hand_attack !== void 0 ? { attack: (hc.card.attack ?? 0) + eff.hand_attack } : {},
              ...eff.hand_health !== void 0 ? { health: (hc.card.health ?? 0) + eff.hand_health } : {},
              ...eff.hand_skill ? { skills: [...hc.card.skills ?? [], structuredClone(eff.hand_skill)] } : {}
            };
            if (eff.value) hc.mods.push({ id: `cost#${nextUidSeq(state)}`, kind: "cost", value: eff.value });
            events.push({ type: "HAND_MODIFIED", side: t.side, index: t.index, kind: "cost", value: eff.value });
          }
          break;
        }
        case "ban_play": {
          const turns = typeof eff.duration === "number" ? eff.duration : eff.duration === "this_turn" ? 1 : void 0;
          for (const t of targets) {
            if (t.kind !== "hand") continue;
            const hc = state.sides[t.side].hand[t.index];
            if (!hc) continue;
            hc.mods.push({ id: `ban#${nextUidSeq(state)}`, kind: "ban", turns, auraId: ctx.auraId });
            events.push({ type: "HAND_MODIFIED", side: t.side, index: t.index, kind: "ban", turns });
          }
          break;
        }
        case "steal_card": {
          if (eff.from_deck === "top") {
            const from2 = other(ctx.side);
            for (let i = 0; i < (eff.count ?? 1); i++) {
              const id = state.sides[from2].deck.pop();
              if (!id) break;
              const card = cards.get(id);
              if (!card) continue;
              state.sides[ctx.side].hand.push({ card, mods: [] });
              events.push({ type: "CARD_STOLEN", from: from2, to: ctx.side, card });
            }
            break;
          }
          const from = eff.target?.side === "self" || eff.target?.side === "ally" ? ctx.side : other(ctx.side);
          const n = eff.count ?? 1;
          for (let i = 0; i < n && state.sides[from].hand.length; i++) {
            const idx = rng.int(state.sides[from].hand.length);
            const [hc] = state.sides[from].hand.splice(idx, 1);
            if (!hc) continue;
            const def = hc.card;
            const isChar = ["troop", "general", "strategist", "machine"].includes(def.type);
            if (eff.to === "board" && isChar) {
              const empties = [];
              for (const r of BOARD.ROWS) {
                for (let c = 0; c < BOARD.COLS; c++) {
                  if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
                }
              }
              if (empties.length) {
                const slot = empties[rng.int(empties.length)];
                const u = makeUnit(def, state.turn, nextUidSeq(state));
                setUnit(state, ctx.side, slot.row, slot.col, u);
                events.push({ type: "UNIT_SUMMONED", side: ctx.side, row: slot.row, col: slot.col, unit: u });
                continue;
              }
            }
            state.sides[ctx.side].hand.push({ card: def, mods: [] });
            events.push({ type: "CARD_STOLEN", from, to: ctx.side, card: def });
          }
          break;
        }
        case "transform": {
          const toId = String(eff.to ?? "");
          const toCard = cards.get(toId);
          if (!toCard) {
            events.push({ type: "REJECTED", reason: `\u8FDB\u5316\u76EE\u6807\u5361\u4E0D\u5B58\u5728\uFF1A${toId}` });
            break;
          }
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const fromId = u.cardId;
            const taken = u.maxHp - u.hp;
            u.cardId = toCard.id;
            u.name = toCard.name;
            u.baseAtk = toCard.attack ?? 0;
            u.baseMaxHp = toCard.health ?? 1;
            u.kw = [...toCard.keywords ?? []];
            u.skills = toCard.skills ? structuredClone(toCard.skills) : void 0;
            u.troopKind = toCard.troopKind;
            applyMods(u);
            u.hp = Math.max(1, u.maxHp - taken);
            events.push({
              type: "UNIT_TRANSFORMED",
              side: t.side,
              row: t.row,
              col: t.col,
              from: fromId,
              to: toCard.id,
              unit: u
            });
          }
          break;
        }
        case "grant_card_keyword": {
          const cardId = String(eff.unit ?? "");
          const kw = eff.keyword;
          if (!cardId || !kw) break;
          const book = state.sides[ctx.side].cardKeywords ??= {};
          const list = book[cardId] ??= [];
          if (!list.includes(kw)) list.push(kw);
          break;
        }
        case "random_transform": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const fromCard = cards.get(u.cardId);
            const cost = fromCard?.cost ?? 0;
            const pool = [...cards.values()].filter((c) => c.id !== u.cardId && (c.cost ?? 0) === cost && (c.type === "general" || c.type === "strategist"));
            if (!pool.length) continue;
            const toCard = pool[rng.int(pool.length)];
            const fromId = u.cardId;
            u.cardId = toCard.id;
            u.name = toCard.name;
            u.baseAtk = toCard.attack ?? 0;
            u.baseMaxHp = toCard.health ?? 1;
            u.kw = [...toCard.keywords ?? []];
            u.skills = toCard.skills ? structuredClone(toCard.skills) : void 0;
            u.troopKind = toCard.troopKind;
            u.statuses = {};
            u.mods = [];
            applyMods(u);
            u.hp = u.maxHp;
            events.push({
              type: "UNIT_TRANSFORMED",
              side: t.side,
              row: t.row,
              col: t.col,
              from: fromId,
              to: toCard.id,
              unit: u
            });
          }
          break;
        }
        case "survive": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            u.hp = 1;
            events.push({ type: "UNIT_SURVIVED", side: t.side, row: t.row, col: t.col, unit: u });
          }
          break;
        }
        case "extra_attack": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            u.attackedThisTurn -= 1;
            events.push({ type: "EXTRA_ATTACK", side: t.side, row: t.row, col: t.col });
          }
          break;
        }
        case "take_control": {
          const backSide = eff.target?.side === "self" || eff.target?.side === "ally" ? ctx.side : other(ctx.side);
          let moved = false;
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const empties = [];
            for (const r of BOARD.ROWS) {
              for (let c = 0; c < BOARD.COLS; c++) if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
            }
            if (!empties.length) continue;
            state.sides[t.side].rows[t.row][t.col] = null;
            const slot = empties[0];
            setUnit(state, ctx.side, slot.row, slot.col, u);
            u.enteredTurn = state.turn;
            u.attackedThisTurn = 0;
            u.actedThisTurn = false;
            u.skillUsesThisTurn = {};
            u.dealtDamageThisTurn = false;
            events.push({ type: "CONTROL_TAKEN", from: backSide, to: ctx.side, unit: u });
            moved = true;
          }
          if (moved) recomputeAuras(state, cards, rng, events);
          break;
        }
        case "cast_random": {
          const pool = [...cards.values()].filter((c) => inCastPool(c, eff.pool));
          if (!pool.length) break;
          const n = eff.count ?? 1;
          for (let i = 0; i < n; i++) {
            const card = pool[rng.int(pool.length)];
            if (!card) continue;
            events.push({ type: "CARD_AUTO_CAST", side: ctx.side, card });
            const effs = forceRandomTargets(cardCastEffects(card, rng));
            runEffects(state, cards, effs, { side: ctx.side, source: ctx.source }, rng, events);
          }
          break;
        }
        case "copy_skill": {
          const src = ctx.source;
          if (!src) break;
          for (const t of targets) {
            const unit = t.kind === "unit" ? getUnit(state, t.side, t.row, t.col) : null;
            const hc = t.kind === "hand" ? state.sides[t.side].hand[t.index] : null;
            const skills = unit?.skills ?? hc?.card.skills;
            const ownerName = unit?.name ?? hc?.card.name;
            if (!skills?.length || !ownerName) continue;
            const sk = skills.find((x) => x.kind === "active") ?? skills[0];
            if (!sk) continue;
            src.skills = src.skills ?? [];
            if (!src.skills.some((x) => x.id === sk.id)) {
              src.skills.push(structuredClone(sk));
              events.push({ type: "SKILL_COPIED", side: ctx.side, from: ownerName, skill: sk.name });
            }
          }
          break;
        }
        case "force_attack": {
          const toFoe = eff.attack_side === "foe";
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u || u.hp <= 0) continue;
            const targetSide = toFoe ? other(t.side) : t.side;
            const pool = allUnits(state, targetSide).filter((x) => x.unit.hp > 0 && x.unit.uid !== u.uid);
            if (!pool.length) continue;
            const victim = eff.victim_mode === "highest_health" ? pool.reduce((a, b) => b.unit.hp > a.unit.hp ? b : a) : pool[rng.int(pool.length)];
            events.push({ type: "FORCED_ATTACK", side: t.side, row: t.row, col: t.col });
            resolveAttack(
              state,
              cards,
              t.side,
              { row: t.row, col: t.col },
              { kind: "unit", row: victim.row, col: victim.col },
              events,
              rng,
              { consumeAttack: false, toSide: targetSide }
            );
          }
          break;
        }
        case "duel": {
          const source = ctx.source;
          if (!source) break;
          const sourcePos = findPos(state, ctx.side, source.uid);
          if (!sourcePos) break;
          for (const t of targets.length ? targets : chosenFor(eff.target)) {
            if (t.kind !== "unit" || t.side === ctx.side) continue;
            const foe = getUnit(state, t.side, t.row, t.col);
            if (!foe || foe.hp <= 0) continue;
            events.push({ type: "FORCED_ATTACK", side: ctx.side, row: sourcePos.row, col: sourcePos.col });
            resolveAttack(
              state,
              cards,
              ctx.side,
              sourcePos,
              { kind: "unit", row: t.row, col: t.col },
              events,
              rng,
              { consumeAttack: false, toSide: t.side }
            );
            const sourceAfter = getUnit(state, ctx.side, sourcePos.row, sourcePos.col);
            const foeAfter = getUnit(state, t.side, t.row, t.col);
            if (!sourceAfter || sourceAfter.hp <= 0 || !foeAfter || foeAfter.hp <= 0) continue;
            events.push({ type: "FORCED_ATTACK", side: t.side, row: t.row, col: t.col });
            resolveAttack(
              state,
              cards,
              t.side,
              { row: t.row, col: t.col },
              { kind: "unit", row: sourcePos.row, col: sourcePos.col },
              events,
              rng,
              { consumeAttack: false, toSide: ctx.side }
            );
          }
          break;
        }
        case "move": {
          const sourceTargets = targets.length ? targets : chosenFor(eff.target);
          const destination = eff.target2 ? pickOf(ctx, eff.target2) : void 0;
          for (const from of sourceTargets) {
            if (from.kind !== "unit") continue;
            const moving = getUnit(state, from.side, from.row, from.col);
            if (!moving || moving.hp <= 0) continue;
            const to = destination?.kind === "unit" ? destination : (() => {
              for (const r of BOARD.ROWS) for (let c = 0; c < BOARD.COLS; c++) {
                if (!state.sides[from.side].rows[r][c]) return unitRef(from.side, r, c);
              }
              return void 0;
            })();
            if (!to || to.kind !== "unit" || to.side !== from.side || state.sides[to.side].rows[to.row][to.col] !== null) continue;
            state.sides[from.side].rows[from.row][from.col] = null;
            state.sides[to.side].rows[to.row][to.col] = moving;
            if (eff.move_bonus === "facing_type") {
              const facing = state.sides[other(from.side)].rows[to.row][to.col];
              const bonus = facing?.type === "general" ? { health: 2 } : facing?.type === "strategist" ? { attack: 2 } : { attack: 1, health: 1 };
              moving.mods.push({ id: `mod#${nextUidSeq(state)}`, kind: "permanent", ...bonus });
            }
            applyMods(moving);
            events.push({
              type: "UNIT_MOVED",
              side: from.side,
              from: { row: from.row, col: from.col },
              to: { row: to.row, col: to.col },
              unit: moving
            });
          }
          break;
        }
        case "scheme_duel": {
          const pair = ctx.chosen && ctx.chosen2 ? [ctx.chosen, ctx.chosen2] : targets.length >= 2 ? targets.slice(0, 2) : [ctx.chosen, ctx.chosen2].filter((x) => x !== void 0);
          if (pair.length < 2) break;
          const [t1, t2] = pair;
          if (t1.kind !== "unit" || t2.kind !== "unit") break;
          if (sameTarget(t1, t2)) break;
          if (t1.side === ctx.side || t2.side === ctx.side || t1.side !== t2.side) break;
          const u1 = getUnit(state, t1.side, t1.row, t1.col);
          const u2 = getUnit(state, t2.side, t2.row, t2.col);
          if (!u1 || !u2 || u1.hp <= 0 || u2.hp <= 0) break;
          events.push({ type: "FORCED_ATTACK", side: t1.side, row: t1.row, col: t1.col });
          resolveAttack(
            state,
            cards,
            t1.side,
            { row: t1.row, col: t1.col },
            { kind: "unit", row: t2.row, col: t2.col },
            events,
            rng,
            { consumeAttack: false, toSide: t2.side }
          );
          const s1 = getUnit(state, t1.side, t1.row, t1.col);
          const s2 = getUnit(state, t2.side, t2.row, t2.col);
          const alive1 = !!s1 && s1.hp > 0;
          const alive2 = !!s2 && s2.hp > 0;
          const trigger = eff.survivor_condition === "both" ? alive1 && alive2 : alive1 || alive2;
          if (!trigger) break;
          if (eff.self_destruct !== false && ctx.source) {
            const pos = findPos(state, ctx.side, ctx.source.uid);
            if (pos) {
              const self = getUnit(state, ctx.side, pos.row, pos.col);
              if (self) killUnit(state, cards, { side: ctx.side, row: pos.row, col: pos.col, unit: self }, events);
            }
          }
          const lordDmg = eff.lord_damage === void 0 || eff.lord_damage === "max_attack" ? Math.max(0, alive1 ? s1.atk : 0, alive2 ? s2.atk : 0) : eff.lord_damage;
          if (lordDmg > 0) {
            dealDamage(state, cards, { kind: "lord", side: ctx.side }, lordDmg, events, "\u5BC6\u8C0B\u8BDB\u6076");
          }
          break;
        }
        case "flip": {
          for (const t of targets) {
            if (t.kind !== "unit") continue;
            applyStatus(state, t, "fan_mian", 1, events);
            const u = getUnit(state, t.side, t.row, t.col);
            if (u) events.push({ type: "UNIT_FLIPPED", side: t.side, row: t.row, col: t.col, to: "back", unit: u });
          }
          break;
        }
        case "scry": {
          const who = eff.target?.side === "self" || eff.target?.side === "ally" ? ctx.side : other(ctx.side);
          const deck = state.sides[who].deck;
          const n = eff.count ?? 1;
          const fromTop = (eff.from ?? "top") === "top";
          for (let i = 0; i < n && deck.length; i++) {
            const id = fromTop ? deck.shift() : deck.pop();
            if (eff.to === "deck_bottom") deck.push(id);
            else if (eff.to === "deck_top") deck.unshift(id);
            else {
              const def = cards.get(id);
              if (def) state.sides[who].hand.push({ card: def, mods: [] });
            }
            events.push({ type: "CARD_SCRYED", side: who, cardId: id, from: fromTop ? "top" : "bottom" });
          }
          break;
        }
        case "apply_status": {
          const times = eff.count ?? 1;
          const untilNext = eff.duration === "until_next_turn";
          const untilFullHealth = eff.duration === "until_full_health";
          const turns = typeof eff.duration === "number" ? eff.duration : eff.duration === "this_turn" || untilNext ? 1 : void 0;
          const srcUid = eff.status_source === "self" ? ctx.source?.uid : void 0;
          for (let i = 0; i < times; i++) {
            const list = i === 0 ? targets.length ? targets : chosenFor(eff.target) : eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target);
            for (const t of list) {
              applyStatus(state, t, eff.status, eff.stacks ?? 1, events, turns, srcUid, ctx.auraId, untilNext, untilFullHealth);
              if (t.kind === "unit" && (eff.status === "si_zhan" || eff.status === "yi_dao_qian_zhi") && ctx.chosen?.kind === "unit") {
                const applied = getUnit(state, t.side, t.row, t.col)?.statuses[eff.status];
                const chosen = getUnit(state, ctx.chosen.side, ctx.chosen.row, ctx.chosen.col);
                const owner = getUnit(state, t.side, t.row, t.col);
                if (applied && chosen && owner) {
                  if (eff.status === "yi_dao_qian_zhi") {
                    const sourceUid = ctx.source?.uid;
                    applied.linkedUid = owner.uid === sourceUid ? chosen.uid : sourceUid;
                  } else if (chosen.uid !== owner.uid) {
                    applied.linkedUid = chosen.uid;
                  }
                }
              }
              if (eff.on_death?.length) {
                const bags = t.kind === "unit" ? getUnit(state, t.side, t.row, t.col)?.statuses : t.kind === "lord" ? state.sides[t.side].lord.statuses : void 0;
                const inst = bags?.[eff.status];
                if (inst) {
                  inst.payoff = structuredClone(eff.on_death);
                  inst.srcSide = ctx.side;
                }
              }
            }
          }
          break;
        }
        case "remove_status": {
          const times = eff.count ?? 1;
          for (let i = 0; i < times; i++) {
            const list = i === 0 ? targets.length ? targets : chosenFor(eff.target) : eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target);
            for (const t of list) {
              if (eff.remove_kind) {
                for (const id of statusIdsOfKind(state, t, eff.remove_kind)) {
                  removeStatus(state, t, id, events, eff.stacks ?? eff.value ?? void 0);
                }
                continue;
              }
              removeStatus(state, t, eff.status, events, eff.stacks ?? eff.value ?? void 0);
            }
          }
          break;
        }
        case "sacrifice": {
          for (const t of targets.length ? targets : chosenFor(eff.target)) {
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            ctx.flags = ctx.flags ?? [];
            ctx.flags.push(`sacrificed_max_hp:${u.maxHp}`, `sacrificed_hp:${u.hp}`);
            killUnit(state, cards, { side: t.side, row: t.row, col: t.col, unit: u }, events);
            ctx.flags.push("sacrificed");
            recomputeAuras(state, cards, rng, events);
          }
          break;
        }
        case "attack_each": {
          const src = ctx.source;
          if (!src) break;
          const pos = findPos(state, ctx.side, src.uid);
          if (!pos) break;
          const queue = targets.filter((t) => t.kind === "unit");
          for (const t of queue) {
            if (state.winner) break;
            const cur = getUnit(state, ctx.side, pos.row, pos.col);
            if (!cur || cur.hp <= 0) break;
            if (!getUnit(state, t.side, t.row, t.col)) continue;
            resolveAttack(
              state,
              cards,
              ctx.side,
              pos,
              { kind: "unit", row: t.row, col: t.col },
              events,
              rng,
              { consumeAttack: false }
            );
          }
          break;
        }
        case "mill": {
          const who = eff.target?.side === "self" || eff.target?.side === "ally" ? ctx.side : other(ctx.side);
          const deck = state.sides[who].deck;
          const n = dynVal ?? eff.count ?? 1;
          const fromDeck = eff.from_deck ?? "random";
          for (let i = 0; i < n && deck.length; i++) {
            const at = fromDeck === "top" ? deck.length - 1 : rng.int(deck.length);
            const [id] = deck.splice(at, 1);
            const def = id ? cards.get(id) : void 0;
            if (def) state.sides[who].discard.push(def);
            events.push({ type: "CARD_MILLED", side: who, cardId: id ?? "", from: fromDeck });
          }
          break;
        }
        case "draw_until": {
          const stopType = eff.until_not_type ?? "tactic";
          for (let guard = 0; guard < 60; guard++) {
            if (state.winner) break;
            const mark = events.length;
            drawCard(state, cards, ctx.side, events, rng);
            const drawn = events.slice(mark).reverse().find((e) => e.type === "CARD_DRAWN");
            if (!drawn) break;
            if (!matchesCardType(drawn.card.type, stopType)) break;
          }
          break;
        }
        case "gain_armor":
          gainArmor(state, ctx.side, val || 1, events);
          if (eff.duration === "this_turn") {
            const lord = state.sides[ctx.side].lord;
            lord.temporaryArmor = (lord.temporaryArmor ?? 0) + (val || 1);
          }
          break;
        case "gain_command": {
          const cmd = state.sides[ctx.side].command;
          const delta = eff.value ?? 1;
          if (eff.permanent) {
            const before = cmd.max;
            cmd.max = Math.max(0, Math.min(COMMAND.MAX, cmd.max + delta));
            cmd.cur = Math.max(0, Math.min(cmd.max, cmd.cur + (cmd.max - before)));
            events.push({ type: "COMMAND_MAX_CHANGED", side: ctx.side, max: cmd.max, delta: cmd.max - before });
          } else {
            cmd.cur = Math.min(cmd.max, cmd.cur + delta);
          }
          break;
        }
        case "destroy": {
          const list = targets.length ? targets : chosenFor(eff.target);
          for (const t of list) {
            if (t.kind === "unit") {
              dealDamage(state, cards, t, 9999, events, "\u6467\u6BC1");
            }
          }
          break;
        }
        case "replace_lord": {
          const side = ctx.side;
          const old = state.sides[side].lord;
          const purgeTag = eff.purge_tag;
          if (purgeTag) {
            for (const r of BOARD.ROWS) {
              for (let c = 0; c < BOARD.COLS; c++) {
                const u = state.sides[side].rows[r][c];
                if (u && u.tags.includes(purgeTag)) {
                  state.sides[side].rows[r][c] = null;
                  events.push({ type: "UNIT_REMOVED", side, row: r, col: c, unit: u, reason: "replace_lord" });
                }
              }
            }
            state.sides[side].hand = state.sides[side].hand.filter((hc) => !(hc.card.tags ?? []).includes(purgeTag));
            state.sides[side].deck = state.sides[side].deck.filter((id) => !(cards.get(id)?.tags ?? []).includes(purgeTag));
          }
          if (ctx.source) {
            for (const r of BOARD.ROWS) {
              const c = state.sides[side].rows[r].findIndex((u) => u?.uid === ctx.source.uid);
              if (c >= 0) {
                state.sides[side].rows[r][c] = null;
                events.push({ type: "UNIT_REMOVED", side, row: r, col: c, unit: ctx.source, reason: "replace_lord" });
              }
            }
          }
          const nextSkill = eff.lord_skill_def ? structuredClone(eff.lord_skill_def) : void 0;
          state.sides[side].lord = {
            id: eff.lord_id ?? ctx.source?.cardId ?? old.id,
            name: eff.lord_name ?? ctx.source?.name ?? old.name,
            faction: eff.lord_faction ?? old.faction,
            hp: old.hp,
            maxHp: old.maxHp,
            armor: 0,
            skill: nextSkill?.name ?? old.skill,
            skillDef: nextSkill,
            skillUsedThisTurn: false,
            statuses: {}
          };
          events.push({ type: "LORD_REPLACED", side, from: old.id, to: state.sides[side].lord.id, name: state.sides[side].lord.name });
          break;
        }
        case "modify": {
          const list = targets.length ? targets : chosenFor(eff.target);
          for (const t of list) {
            if (t.kind === "lord" && eff.duration === "this_turn") {
              const lord = state.sides[t.side].lord;
              lord.attackThisTurn = Math.max(0, (lord.attackThisTurn ?? 0) + (eff.attack ?? 0));
              events.push({ type: "LORD_ATTACK_GAINED", side: t.side, attack: lord.attackThisTurn });
              continue;
            }
            if (t.kind === "hand") {
              const hc2 = state.sides[t.side].hand[t.index];
              if (!hc2) continue;
              const dAtk2 = dynAtk ?? eff.attack ?? 0;
              const dHp2 = dynHp ?? eff.health ?? 0;
              if (dAtk2) {
                hc2.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: "attack", value: dAtk2, auraId: ctx.auraId });
              }
              if (dHp2) {
                hc2.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: "health", value: dHp2, auraId: ctx.auraId });
              }
              if (ctx.auraId === void 0 && (dAtk2 || dHp2)) {
                events.push({ type: "HAND_MODIFIED", side: t.side, index: t.index, kind: dAtk2 ? "attack" : "health", value: dAtk2 || dHp2 });
              }
              continue;
            }
            if (t.kind !== "unit") continue;
            const u = getUnit(state, t.side, t.row, t.col);
            if (!u) continue;
            const dAtk = dynAtk ?? (eff.value_from_discarded ? discardVal : void 0) ?? eff.attack ?? (eff.health === void 0 ? eff.value : 0) ?? 0;
            const dHp = dynHp ?? eff.health ?? (eff.attack === void 0 ? eff.value : 0) ?? 0;
            if (!dAtk && !dHp) continue;
            if (ctx.auraId) {
              u.mods.push({
                id: ctx.auraId,
                kind: "aura",
                attack: dAtk || void 0,
                health: dHp || void 0
              });
              continue;
            }
            const turns = typeof eff.duration === "number" ? eff.duration : eff.duration === "this_turn" ? 1 : void 0;
            const expiresAtHalfTurn = eff.duration === "until_enemy_turn_end" ? state.halfTurn + 1 : void 0;
            u.mods.push({
              id: `mod#${nextUidSeq(state)}`,
              kind: turns === void 0 && expiresAtHalfTurn === void 0 ? "permanent" : "temp",
              attack: dAtk || void 0,
              health: dHp || void 0,
              turns,
              expiresAtHalfTurn
            });
            applyMods(u);
            events.push({
              type: "STAT_MODIFIED",
              side: t.side,
              row: t.row,
              col: t.col,
              attack: dAtk || void 0,
              health: dHp || void 0,
              duration: eff.duration
            });
          }
          break;
        }
        default:
          break;
      }
      if (state.pendingHandChoice && state.pendingHandChoice !== pendingHandBefore) {
        state.pendingHandChoice.continuation = {
          effects: effects.slice(effectIndex + 1),
          sourceUid: ctx.source?.uid
        };
        return;
      }
    }
  }

  // src/engine.ts
  function useLordSkill(state, ctx, action, events, rng) {
    const side = state.active;
    const lord = state.sides[side].lord;
    const gate = canUseLordSkill(state, side);
    if (!gate.ok || !gate.skill) return false;
    const skill = gate.skill;
    const cost = skill.cost ?? LORD_SKILL_COST;
    const target = action.target ? action.target.row !== void 0 ? unitRef(action.target.side, action.target.row, action.target.col) : lordRef(action.target.side) : void 0;
    state.sides[side].command.cur -= cost;
    if (capStacks(lord.statuses, "extra_lord_skill") > 0 && lord.skillUsedThisTurn) {
      const bonus = Object.entries(lord.statuses ?? {}).find(([id, st]) => st.stacks > 0 && STATUSES[id]?.caps?.includes("extra_lord_skill"));
      if (bonus) bonus[1].stacks -= 1;
    } else {
      lord.skillUsedThisTurn = true;
    }
    events.push({ type: "LORD_SKILL_USED", side, skill: lord.skill });
    emitSkillTriggered(state, side, null, skill, "lord_skill", events);
    runEffects(
      state,
      ctx.cards,
      effectsOf(skill, action.modeIndex),
      { side, chosen: target, handIndex: action.handIndex, modeIndex: action.modeIndex },
      rng,
      events
    );
    runTriggerSkills(state, ctx.cards, side, "on_lord_skill_used", rng, events);
    return true;
  }
  function startMatch(state, ctx) {
    const events = [];
    const next = cloneState(state);
    const rng = createRng(next.rngState);
    startTurn(next, ctx, events, rng);
    next.rngState = rng.getState();
    return { ok: true, state: next, events };
  }
  function applyAction(state, ctx, action) {
    if (state.winner) {
      return { ok: false, state, events: [{ type: "REJECTED", reason: "\u5BF9\u5C40\u5DF2\u7ED3\u675F", action }], error: "\u5BF9\u5C40\u5DF2\u7ED3\u675F" };
    }
    const events = [];
    const next = cloneState(state);
    const rng = createRng(next.rngState);
    let ok = true;
    let error;
    try {
      if (next.pendingDiscover && action.type !== "CHOOSE_DISCOVER") {
        throw new Error("\u8BF7\u5148\u9009\u62E9\u53D1\u73B0\u7684\u724C");
      }
      if (next.pendingHandChoice && action.type !== "CHOOSE_HAND") {
        throw new Error("\u8BF7\u5148\u9009\u62E9\u4E00\u5F20\u624B\u724C");
      }
      switch (action.type) {
        case "PLAY_CARD":
          ok = playCard(next, ctx, action, events, rng);
          break;
        case "CHOOSE_DISCOVER":
          ok = chooseDiscover(next, ctx, action, events, rng);
          break;
        case "CHOOSE_HAND":
          ok = chooseHand(next, ctx, action, events, rng);
          break;
        case "UPGRADE_UNIT":
          ok = upgradeUnit(next, ctx, action, events, rng);
          break;
        case "ATTACK":
          ok = attack(next, ctx, action, events, rng);
          break;
        case "LORD_ATTACK": {
          const side = next.active;
          const to = action.to;
          if (!lordAttackTargets(next, side).targets.some((t) => t.kind === to.kind && (to.kind === "lord" || t.row === to.row && t.col === to.col))) {
            ok = false;
            break;
          }
          const lord = next.sides[side].lord;
          lord.attackedThisTurn = true;
          const foe = other(side);
          const damage = lord.attackThisTurn ?? 0;
          const defender = to.kind === "unit" ? getUnit(next, foe, to.row, to.col) : null;
          const retaliation = to.kind === "unit" ? effectiveAttack(next, foe, to.row, to.col) : 0;
          events.push({ type: "LORD_ATTACK_DECLARED", side, to });
          dealDamage(
            next,
            ctx.cards,
            to.kind === "lord" ? lordRef(foe) : unitRef(foe, to.row, to.col),
            damage,
            events,
            lord.name,
            0,
            void 0,
            void 0,
            "physical",
            false,
            { side }
          );
          if (defender && defender.hp > 0) {
            runUnitTrigger(next, ctx.cards, defender, "on_damaged", rng, events);
          }
          if (retaliation > 0) dealDamage(
            next,
            ctx.cards,
            lordRef(side),
            retaliation,
            events,
            "\u53CD\u51FB",
            0,
            void 0,
            defender ?? void 0,
            "physical",
            false,
            to.kind === "unit" ? { side: foe, row: to.row, col: to.col } : void 0
          );
          break;
        }
        case "USE_LORD_SKILL":
          ok = useLordSkill(next, ctx, action, events, rng);
          break;
        case "USE_SKILL":
          ok = useUnitSkill(next, ctx, action, events, rng);
          break;
        case "END_TURN":
          endTurn(next, ctx, events, rng);
          break;
        default:
          ok = false;
      }
    } catch (e) {
      ok = false;
      error = e.message;
    }
    if (!ok) {
      error = error ?? "\u52A8\u4F5C\u4E0D\u5408\u6CD5";
      events.push({ type: "REJECTED", reason: error, action });
      return { ok: false, state, events, error };
    }
    next.rngState = rng.getState();
    return { ok: true, state: next, events };
  }
  function chooseHand(state, ctx, action, events, rng) {
    const pending = state.pendingHandChoice;
    if (!pending || state.active !== pending.side) return false;
    const hand = state.sides[pending.side].hand;
    const i = action.handIndex;
    if (!(Number.isInteger(i) && i >= 0 && i < hand.length)) return false;
    if (pending.indices && !pending.indices.includes(i)) return false;
    const source = pending.continuation?.sourceUid ? allUnits(state, pending.side).find((ref) => ref.unit.uid === pending.continuation.sourceUid)?.unit : void 0;
    if (pending.kind === "tactic_pair") {
      delete state.pendingHandChoice;
      runEffects(
        state,
        ctx.cards,
        pending.choiceEffect ? [pending.choiceEffect] : [],
        { side: pending.side, source, handIndex: i },
        rng,
        events
      );
    } else {
      const [chosen] = hand.splice(i, 1);
      if (!chosen) return false;
      delete state.pendingHandChoice;
      const s = state.sides[pending.side];
      if (pending.kind === "deck_top") s.deck.push(chosen.card.id);
      else if (pending.kind === "deck_bottom") s.deck.unshift(chosen.card.id);
      else if (pending.kind === "random") s.deck.splice(rng.int(s.deck.length + 1), 0, chosen.card.id);
      else s.discard.push(chosen.card);
      events.push({ type: "HAND_CHOSEN", side: pending.side, card: chosen.card, kind: pending.kind });
    }
    runEffects(
      state,
      ctx.cards,
      pending.continuation?.effects,
      { side: pending.side, source },
      rng,
      events
    );
    return true;
  }
  function chooseDiscover(state, ctx, action, events, rng) {
    const pending = state.pendingDiscover;
    if (!pending || !pending.candidates.includes(action.cardId)) return false;
    let id = action.cardId;
    const fromPool = pending.fromPool || pending.source === "pool";
    if (!fromPool) {
      const index = state.sides[pending.side].deck.indexOf(action.cardId);
      if (index < 0) return false;
      [id] = state.sides[pending.side].deck.splice(index, 1);
    }
    const card = ctx.cards.get(id);
    if (!card) return false;
    const choiceMods = pending.choiceModifiers?.[card.type];
    const tagMods = Object.entries(pending.choiceTagModifiers ?? {}).filter(([tag]) => (card.tags ?? []).includes(tag)).map(([, mods]) => mods);
    const tagCost = tagMods.reduce((sum, mods) => sum + (mods.cost ?? 0), 0);
    const tagAttack = tagMods.reduce((sum, mods) => sum + (mods.attack ?? 0), 0);
    const tagHealth = tagMods.reduce((sum, mods) => sum + (mods.health ?? 0), 0);
    const totalCost = (pending.costModifier ?? 0) + (choiceMods?.cost ?? 0) + tagCost;
    events.push({
      type: "CARD_DISCOVERED",
      side: pending.side,
      card,
      costModifier: totalCost || void 0,
      destination: pending.destination ?? "hand"
    });
    const markUnplayed = (hc) => {
      if (!pending.unplayedPenalty || (pending.destination ?? "hand") !== "hand") return;
      const markId = `unplayed#${nextUidSeq(state)}`;
      hc.mods.push({ id: markId, kind: "cost", value: 0 });
      state.pendingUnplayed = { side: pending.side, cardId: hc.card.id, markId, damage: pending.unplayedPenalty.damage };
    };
    const picks = pending.picks ?? 1;
    const morePicks = picks > 1 && pending.candidates.length > 1;
    if (morePicks) {
      pending.picks = picks - 1;
      pending.candidates = pending.candidates.filter((x) => x !== id);
    } else {
      delete state.pendingDiscover;
      if (pending.rest === "deck" && fromPool) {
        for (const rest of pending.candidates) if (rest !== id) state.sides[pending.side].deck.push(rest);
      }
    }
    const beforeUnits = new Set(allUnits(state, pending.side).map((ref) => ref.unit.uid));
    const auto = resolveDrawTrigger(state, ctx.cards, pending.side, card, events, rng);
    if (auto) {
      const summoned = allUnits(state, pending.side).find((ref) => !beforeUnits.has(ref.unit.uid) && ref.unit.cardId === card.id);
      if (summoned && (choiceMods?.attack || choiceMods?.health || tagAttack || tagHealth)) {
        runEffects(
          state,
          ctx.cards,
          [{
            action: "modify",
            target: { source: true },
            attack: (choiceMods?.attack ?? 0) + tagAttack,
            health: (choiceMods?.health ?? 0) + tagHealth
          }],
          { side: pending.side, source: summoned.unit },
          rng,
          events
        );
        recomputeAuras(state, ctx.cards, rng, events);
      }
      if (auto.discard) state.sides[pending.side].discard.push(card);
      events.push({ type: "CARD_AUTO_CAST", side: pending.side, card });
      if (morePicks) return true;
      const continuation2 = state.pendingTriggerSkills;
      if (continuation2) {
        runTriggerSkills(state, ctx.cards, continuation2.side, continuation2.trigger, rng, events);
      }
      return true;
    }
    if (pending.destination === "deck_top") {
      state.sides[pending.side].deck.push(card.id);
    } else {
      const typeMods = choiceMods;
      const mods = [];
      if (pending.costModifier) mods.push({ id: "discover", kind: "cost", value: pending.costModifier });
      if (typeMods?.cost) mods.push({ id: "discover-type-cost", kind: "cost", value: typeMods.cost });
      if (typeMods?.attack) mods.push({ id: "discover-type-attack", kind: "attack", value: typeMods.attack });
      if (typeMods?.health) mods.push({ id: "discover-type-health", kind: "health", value: typeMods.health });
      if (tagCost) mods.push({ id: "discover-tag-cost", kind: "cost", value: tagCost });
      if (tagAttack) mods.push({ id: "discover-tag-attack", kind: "attack", value: tagAttack });
      if (tagHealth) mods.push({ id: "discover-tag-health", kind: "health", value: tagHealth });
      const hc = { card, mods };
      state.sides[pending.side].hand.push(hc);
      markUnplayed(hc);
      if (pending.banChoice) {
        const handIndex = state.sides[pending.side].hand.length - 1;
        state.sides[pending.side].hand[handIndex].mods.push({
          id: `ban#discover-${card.id}-${state.uidSeq}`,
          kind: "ban",
          turns: 1
        });
      }
      recomputeAuras(state, ctx.cards, rng, events);
    }
    if (!morePicks && pending.unselectedCandidates?.length && pending.unselectedTo === "deck_top") {
      const ids = [...pending.unselectedCandidates].sort((a, b) => (ctx.cards.get(a)?.cost ?? 0) - (ctx.cards.get(b)?.cost ?? 0));
      for (const candidate of ids) {
        const at = state.sides[pending.side].deck.indexOf(candidate);
        if (at >= 0) state.sides[pending.side].deck.splice(at, 1);
        state.sides[pending.side].deck.push(candidate);
      }
    }
    if (morePicks) {
      return true;
    }
    const continuation = state.pendingTriggerSkills;
    if (continuation) {
      runTriggerSkills(state, ctx.cards, continuation.side, continuation.trigger, rng, events);
    }
    return true;
  }
  function upgradeUnit(state, ctx, action, events, rng) {
    const side = state.active;
    const u = getUnit(state, side, action.row, action.col);
    const toCard = ctx.cards.get(action.toCardId);
    const status = upgradeStatus(state, ctx.cards, side, action.row, action.col);
    const option = status?.options.find((o) => o.card.id === toCard?.id);
    if (!u || !toCard || !status || !status.ready || !option) return false;
    const commandCost = option.commandCost;
    const commandCur = state.sides[side].command.cur;
    if (commandCur < commandCost) {
      throw new Error(`\u7EDF\u7387\u503C\u4E0D\u8DB3\uFF08\u5347\u53D8\u9700\u8981 ${commandCost}\uFF0C\u5F53\u524D ${commandCur}\uFF09`);
    }
    state.sides[side].command.cur -= commandCost;
    const from = u.cardId;
    u.cardId = toCard.id;
    u.name = toCard.name;
    u.type = toCard.type;
    u.faction = toCard.faction;
    u.cost = toCard.cost;
    u.baseAtk = toCard.attack ?? 0;
    u.baseMaxHp = toCard.health ?? 1;
    u.kw = [...toCard.keywords ?? []];
    u.tags = [...toCard.tags ?? []];
    u.skills = toCard.skills ? structuredClone(toCard.skills) : void 0;
    u.troopKind = toCard.troopKind;
    u.gender = toCard.gender;
    applyMods(u);
    u.hp = u.maxHp;
    recomputeAuras(state, ctx.cards, rng, events);
    delete u.upgradeProgress;
    const onPlay = (toCard.skills ?? []).filter((sk) => sk.trigger === "on_play");
    const upgradeChosen = action.target ? action.target.row !== void 0 ? unitRef(action.target.side, action.target.row, action.target.col) : lordRef(action.target.side) : void 0;
    for (const sk of onPlay) {
      emitSkillTriggered(state, side, u, sk, "on_play", events);
      runEffects(
        state,
        ctx.cards,
        effectsOf(sk, action.modeIndex),
        { side, source: u, chosen: upgradeChosen, chosenRow: action.row, chosenCol: action.col },
        rng,
        events
      );
    }
    recomputeAuras(state, ctx.cards, rng, events);
    if (hasTrait(u, "xian_gong") && u.attackedThisTurn > 0) {
      u.attackedThisTurn -= 1;
    }
    runAllyUpgradeTriggers(state, ctx.cards, side, { row: action.row, col: action.col }, rng, events);
    events.push({ type: "UNIT_UPGRADED", side, row: action.row, col: action.col, from, to: toCard.id, unit: u });
    return true;
  }
  function upgradeCommandCost(from, to) {
    return Math.max(0, (to.cost ?? 0) - (from?.cost ?? 0) - 1);
  }
  function upgradeCost(from, to) {
    return Math.max(0, to.cost - from.cost - 1);
  }
  function upgradeStatus(state, cards, side, row, col) {
    const u = getUnit(state, side, row, col);
    if (!u || !isBasicTroop(u)) return null;
    const p = u.upgradeProgress ?? { damage: 0, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
    let label = "", progress = "", ready = false;
    switch (u.troopKind) {
      case "infantry":
        label = "\u7D2F\u8BA1\u9020\u6210\u4F24\u5BB3";
        progress = `${p.damage}/2`;
        ready = p.damage >= 2;
        break;
      case "shield":
        label = "\u654C\u65B9\u56DE\u5408\u7ED3\u675F\u65F6\u5B58\u6D3B";
        progress = `${p.shieldSurvival}/2`;
        ready = p.shieldSurvival >= 2;
        break;
      case "cavalry":
        label = "\u51FB\u6740\u57FA\u7840\u5175\u6216\u4EBA\u7269";
        progress = `${p.basicKills}/2 \xB7 ${p.characterKills}/1`;
        ready = p.basicKills >= 2 || p.characterKills >= 1;
        break;
      case "archer":
        label = "\u547D\u4E2D\u6B66\u5C06\u3001\u8C0B\u81E3\u6216\u4E3B\u516C";
        progress = `${p.heroHits}/1`;
        ready = p.heroHits >= 1;
        break;
      default:
        return null;
    }
    const faction = state.sides[side].lord.faction;
    const commandCur = state.sides[side].command.cur;
    const fromCard = cards.get(u.cardId);
    const options = ready ? [...cards.values()].filter((c) => c.type === "troop" && c.upgradeFrom === u.troopKind && c.troopKind === u.troopKind && c.id !== "elite_xianzhen_dun" && (c.faction === faction || c.faction === "qun" || c.faction === "neutral")).map((card) => {
      const commandCost = upgradeCommandCost(fromCard, card);
      return { id: card.id, card, commandCost, affordable: commandCost <= commandCur };
    }) : [];
    const costs = Object.fromEntries(options.map((o) => [o.id, o.commandCost]));
    return { label, progress, ready, options, costs };
  }
  var TYPE_CN = {
    troop: "\u5175\u79CD",
    general: "\u6B66\u5C06",
    strategist: "\u8C0B\u81E3",
    character: "\u4EBA\u7269",
    event: "\u4E8B\u4EF6",
    tactic: "\u7B56\u7565",
    elite: "\u7CBE\u82F1",
    token: "\u884D\u751F\u7269"
  };
  function choiceLabel(t) {
    const who = t.lord ? "\u4E3B\u5E05" : t.side === "ally" || t.side === "self" ? "\u5DF1\u65B9" : t.side === "enemy" ? "\u654C\u65B9" : "\u4EFB\u610F";
    const what = TYPE_CN[t.filter?.type ?? "character"] ?? "\u4EBA\u7269";
    const gender = t.filter?.gender === "male" ? "\u7537\u6027" : t.filter?.gender === "female" ? "\u5973\u6027" : "";
    return who + gender + what;
  }
  function playTargetPlan(state, side, card, modeIndex) {
    const plan = { modes: [], choices: [] };
    const onPlay = (card.skills ?? []).filter((sk) => sk.trigger === "on_play");
    for (const sk of onPlay) {
      if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `\u9009\u9879 ${i + 1}`);
      for (const eff of effectsOf(sk, modeIndex)) {
        collect(eff);
        if (eff.target2) collect(eff, eff.target2, 2);
      }
    }
    if (!["troop", "general", "strategist", "machine"].includes(card.type)) {
      for (const eff of card.effects ?? []) {
        collect(eff);
        if (eff.target2) collect(eff, eff.target2, 2);
      }
    }
    return plan;
    function collect(eff, selector = eff.target, forcedPick) {
      const c = choiceOf(state, side, eff, { cost: card.cost, atk: card.attack ?? 0 }, selector, forcedPick);
      if (c && !plan.choices.some((x) => x.pick === c.pick)) plan.choices.push(c);
    }
  }
  function choiceOf(state, side, eff, preview, selector = eff.target, forcedPick) {
    const t = selector;
    if (!t) return null;
    if (t.mode !== "choose" && eff.mode !== "choose") return null;
    if (t.count === "all" || (t.count ?? 1) !== 1) return null;
    const pick = forcedPick ?? (t.pick === 2 ? 2 : 1);
    if (t.require_empty) {
      const sideSel = t.side ?? "enemy";
      const sides2 = sideSel === "both" ? ["own", "enemy"] : sideSel === "self" || sideSel === "ally" ? [side] : [other(side)];
      const targets2 = [];
      for (const targetSide of sides2) {
        for (const r of BOARD.ROWS) {
          for (let c = 0; c < BOARD.COLS; c++) {
            if (!state.sides[targetSide].rows[r][c]) targets2.push({ kind: "slot", side: targetSide, row: r, col: c });
          }
        }
      }
      return {
        pick,
        action: eff.action,
        label: "\u5DF1\u65B9\u7A7A\u4F4D",
        sides: [...new Set(targets2.map((x) => x.side))],
        targets: targets2,
        includesHand: false
      };
    }
    const src = { uid: "#preview", cost: preview.cost, atk: preview.atk };
    const pool = resolveTargets(
      state,
      { ...t, count: "all", mode: "first" },
      { side, source: src },
      createRng(state.seed)
    );
    const targets = [];
    for (const r of pool) {
      if (r.kind === "lord") targets.push({ kind: "lord", side: r.side });
      else if (r.kind === "unit") targets.push({ kind: "unit", side: r.side, row: r.row, col: r.col });
    }
    const sides = [...new Set(pool.map((r) => r.side))];
    const byHand = t.zone === "hand";
    return {
      pick,
      action: eff.action,
      sides,
      targets,
      ...t.filter?.damaged_or_controlled ? { strict: true } : {},
      label: choiceLabel(t),
      includesHand: byHand || pool.some((r) => r.kind === "hand"),
      ...byHand ? { zone: "hand" } : {},
      ...byHand ? { handIndices: pool.flatMap((r) => r.kind === "hand" ? [r.index] : []) } : {}
    };
  }
  var LORD_PREVIEW = { cost: 0, atk: 0 };
  function unitSkillTargetPlan(state, side, row, col, modeIndex = 0, skillId) {
    const plan = { modes: [], choices: [] };
    const u = getUnit(state, side, row, col);
    if (!u) return plan;
    const sk = (u.skills ?? []).find((x) => x.kind === "active" && (!skillId || x.id === skillId));
    if (!sk) return plan;
    if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `\u9009\u9879 ${i + 1}`);
    for (const eff of effectsOf(sk, modeIndex)) {
      const c = choiceOf(state, side, eff, { cost: u.cost, atk: u.atk });
      if (c && !plan.choices.some((x) => x.pick === c.pick && x.zone === c.zone)) plan.choices.push(c);
      if (eff.target2) {
        const c2 = choiceOf(state, side, eff, { cost: u.cost, atk: u.atk }, eff.target2, 2);
        if (c2 && !plan.choices.some((x) => x.pick === c2.pick && x.zone === c2.zone)) plan.choices.push(c2);
      }
    }
    return plan;
  }
  function lordSkillTargetPlan(state, side, modeIndex = 0) {
    const plan = { modes: [], choices: [] };
    const sk = state.sides[side].lord.skillDef;
    if (!sk) return plan;
    if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `\u9009\u9879 ${i + 1}`);
    for (const eff of effectsOf(sk, modeIndex)) {
      const c = choiceOf(state, side, eff, LORD_PREVIEW);
      if (c && !plan.choices.some((x) => x.pick === c.pick)) plan.choices.push(c);
    }
    return plan;
  }
  function startTurn(state, ctx, events, rng) {
    const side = state.active;
    resolveTurnStartDamage(state, ctx.cards, side, events);
    state.halfTurn += 1;
    const s = state.sides[side];
    if (state.halfTurn % 2 === 1 && state.halfTurn > 1) {
      state.turn += 1;
      for (const sd of ["own", "enemy"]) {
        state.sides[sd].command.max = Math.min(COMMAND.MAX, state.sides[sd].command.max + 1);
      }
    }
    const duan = lordStatusStacks(s.lord, "duan_liang");
    s.command.cur = Math.max(0, s.command.max - duan);
    s.lord.skillUsedThisTurn = false;
    for (const ref of allUnits(state, side)) {
      ref.unit.attackedThisTurn = 0;
      ref.unit.actedThisTurn = false;
      ref.unit.dealtDamageThisTurn = false;
      ref.unit.skillUsesThisTurn = {};
    }
    for (const ref of allUnits(state, other(side))) ref.unit.skillUsesThisTurn = {};
    events.push({ type: "TURN_START", side, turn: state.turn, halfTurn: state.halfTurn, command: { ...s.command } });
    drawCard(state, ctx.cards, side, events);
    if (state.secondCompensation === "extra_draw" && state.halfTurn === 2) {
      drawCard(state, ctx.cards, side, events);
    }
    for (const ref of allUnits(state, side)) {
      if (ref.unit.statuses.fan_mian) {
        delete ref.unit.statuses.fan_mian;
        events.push({ type: "UNIT_FLIPPED", side, row: ref.row, col: ref.col, to: "front", unit: ref.unit });
      }
    }
    resolveTurnStartStatuses(state, ctx.cards, side, events);
    recomputeAuras(state, ctx.cards, rng, events);
    runTriggerSkills(state, ctx.cards, side, TIMING.TURN_START, rng, events);
    runTriggerSkills(state, ctx.cards, other(side), TIMING.ENEMY_TURN_START, rng, events);
  }
  function resolvePendingUnplayed(state, ctx, events) {
    const p = state.pendingUnplayed;
    if (!p) return;
    delete state.pendingUnplayed;
    const hand = state.sides[p.side].hand;
    const idx = hand.findIndex((hc2) => hc2.mods.some((m) => m.id === p.markId));
    if (idx < 0) return;
    const [hc] = hand.splice(idx, 1);
    if (!hc) return;
    state.sides[p.side].discard.push(hc.card);
    events.push({ type: "CARD_DISCARDED", side: p.side, card: hc.card });
    for (const ref of allUnits(state, other(p.side))) {
      if (ref.unit.hp <= 0) continue;
      dealDamage(state, ctx.cards, unitRef(ref.side, ref.row, ref.col), p.damage, events, "\u4E3E\u6756\u51FB\u5730");
    }
  }
  function finishTurn(state, ctx, events, rng) {
    const side = state.active;
    resolveTurnEndStatuses(state, ctx.cards, side, events);
    runTriggerSkills(state, ctx.cards, side, TIMING.TURN_END, rng, events);
    runTriggerSkills(state, ctx.cards, other(side), TIMING.ENEMY_TURN_END, rng, events);
    for (const ref of [...allUnits(state, side)]) {
      if (ref.unit.hp > 0 && Object.entries(ref.unit.statuses).some(([id, inst]) => inst.stacks > 0 && STATUSES[id]?.caps?.includes("die_at_turn_end"))) {
        killUnit(state, ctx.cards, ref, events, null);
      }
    }
    resolvePendingUnplayed(state, ctx, events);
    for (const ref of allUnits(state, other(side))) {
      if (ref.unit.troopKind === "shield" && isBasicTroop(ref.unit) && ref.unit.hp > 0) {
        upgradeProgress(ref.unit).shieldSurvival += 1;
      }
    }
    expireStatuses(state, side, events);
    expireMods(state, side);
    for (const sd of ["own", "enemy"]) {
      const lord = state.sides[sd].lord;
      lord.armor = Math.max(0, lord.armor - (lord.temporaryArmor ?? 0));
      delete lord.temporaryArmor;
      delete lord.attackThisTurn;
      delete lord.attackedThisTurn;
    }
    expireHandMods(state, side);
    recomputeAuras(state, ctx.cards, rng, events);
    const dropped = discardOverflow(state, side);
    dropped.forEach((c) => events.push({ type: "CARD_PLAYED", side, card: c }));
    events.push({ type: "TURN_END", side, turn: state.turn, halfTurn: state.halfTurn });
  }
  function consumeSkipTurn(state, events) {
    const lord = state.sides[state.active].lord;
    const hit = Object.entries(lord.statuses ?? {}).find(([id, inst]) => inst.stacks > 0 && STATUSES[id]?.caps?.includes("skip_turn"));
    if (!hit) return false;
    delete lord.statuses[hit[0]];
    events.push({ type: "LORD_STATUS_EXPIRED", side: state.active, status: hit[0] });
    events.push({ type: "TURN_SKIPPED", side: state.active, reason: STATUSES[hit[0]]?.name ?? hit[0] });
    return true;
  }
  function endTurn(state, ctx, events, rng) {
    finishTurn(state, ctx, events, rng);
    state.active = other(state.active);
    startTurn(state, ctx, events, rng);
    for (let guard = 0; guard < 4; guard++) {
      if (!consumeSkipTurn(state, events)) break;
      finishTurn(state, ctx, events, rng);
      state.active = other(state.active);
      startTurn(state, ctx, events, rng);
    }
  }
  function playCard(state, ctx, action, events, rng) {
    const side = state.active;
    const s = state.sides[side];
    const hc = s.hand[action.cardIndex];
    if (!hc) return false;
    const playedRightmost = action.cardIndex === s.hand.length - 1;
    if (isBanned(hc)) return false;
    const card = hc.card;
    const cost = effectiveCost(hc, costRuleDelta(state, card, side, rng));
    const isCharacter = ["troop", "general", "strategist", "machine"].includes(card.type);
    const slot = isCharacter ? { row: action.row, col: action.col } : void 0;
    const check = canPlayCard(state, side, card, slot, cost);
    if (!check.ok) return false;
    const plan = playTargetPlan(state, side, card, action.modeIndex);
    const matches = (choice, target) => choice.targets.some((candidate) => candidate.kind === (target.row === void 0 ? "lord" : "unit") && candidate.side === target.side && (target.row === void 0 || candidate.row === target.row && candidate.col === target.col));
    for (const choice of plan.choices) {
      const selected = choice.pick === 2 ? action.target2 : action.target;
      if (!selected || choice.zone === "hand" || !choice.strict) continue;
      if (!matches(choice, selected)) return false;
    }
    s.command.cur -= cost;
    s.hand.splice(action.cardIndex, 1);
    events.push({ type: "CARD_PLAYED", side, card, row: slot?.row, col: slot?.col, handIndex: action.cardIndex });
    if (isCharacter && slot) {
      const u = makeUnit(card, state.turn, nextUidSeq(state));
      for (const kw of state.sides[side].cardKeywords?.[card.id] ?? []) {
        if (!u.kw.includes(kw)) u.kw.push(kw);
      }
      const handAtk = hc.mods.filter((m) => m.kind === "attack" && m.auraId === void 0).reduce((sum, m) => sum + (m.value ?? 0), 0);
      const handHp = hc.mods.filter((m) => m.kind === "health" && m.auraId === void 0).reduce((sum, m) => sum + (m.value ?? 0), 0);
      if (handAtk) u.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: "permanent", attack: handAtk });
      if (handHp) u.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: "permanent", health: handHp });
      for (const m of hc.mods) {
        if (m.kind !== "rule" || !m.rule || m.auraId !== void 0) continue;
        u.mods.push({ id: `rule#${nextUidSeq(state)}`, kind: "rule", rule: m.rule });
      }
      if (handAtk || handHp) applyMods(u);
      setUnit(state, side, slot.row, slot.col, u);
      events.push({ type: "UNIT_SUMMONED", side, row: slot.row, col: slot.col, unit: u });
      const onPlay = (card.skills ?? []).filter((sk) => sk.trigger === "on_play");
      const chosen = action.target ? action.target.row !== void 0 ? unitRef(action.target.side, action.target.row, action.target.col) : lordRef(action.target.side) : void 0;
      const chosen2 = action.target2 ? action.target2.row !== void 0 ? unitRef(action.target2.side, action.target2.row, action.target2.col) : lordRef(action.target2.side) : void 0;
      for (const sk of onPlay) {
        emitSkillTriggered(state, side, u, sk, "on_play", events);
        runEffects(
          state,
          ctx.cards,
          effectsOf(sk, action.modeIndex),
          { side, source: u, chosen, chosen2, chosenRow: slot.row, chosenCol: slot.col, handIndex: action.handIndex },
          rng,
          events
        );
      }
      if (card.effects?.length) {
        runEffects(state, ctx.cards, card.effects, { side, source: u }, rng, events);
      }
      recomputeAuras(state, ctx.cards, rng, events);
      runCardPlayedTriggers(
        state,
        ctx.cards,
        card,
        rng,
        events,
        side,
        playedRightmost,
        unitRef(side, slot.row, slot.col)
      );
      recomputeAuras(state, ctx.cards, rng, events);
    } else {
      const chosen = action.target ? action.target.row !== void 0 ? unitRef(action.target.side, action.target.row, action.target.col) : lordRef(action.target.side) : void 0;
      const onPlay = (card.skills ?? []).filter((sk) => sk.trigger === "on_play");
      for (const sk of onPlay) {
        emitSkillTriggered(state, side, null, sk, "on_play", events);
        runEffects(
          state,
          ctx.cards,
          effectsOf(sk, action.modeIndex),
          { side, chosen, handIndex: action.handIndex, modeIndex: action.modeIndex },
          rng,
          events
        );
      }
      runEffects(state, ctx.cards, card.effects, { side, chosen }, rng, events);
      s.discard.push(card);
      runCardPlayedTriggers(state, ctx.cards, card, rng, events, side, playedRightmost);
      recomputeAuras(state, ctx.cards, rng, events);
    }
    return true;
  }
  function chargeWaterTax(state, ctx, side, row, col, events) {
    const u = getUnit(state, side, row, col);
    if (!u || u.hp <= 0) return;
    for (const [id, inst] of Object.entries(u.statuses)) {
      if (inst.stacks <= 0) continue;
      const def = STATUSES[id];
      if (!def?.caps?.includes("damage_on_action")) continue;
      const amount = 2 ** (inst.stacks - 1);
      dealDamage(
        state,
        ctx.cards,
        unitRef(side, row, col),
        amount,
        events,
        def.name,
        0,
        void 0,
        void 0,
        "water"
      );
    }
  }
  function attack(state, ctx, action, events, rng) {
    const side = state.active;
    const { from, to } = action;
    const attacker = getUnit(state, side, from.row, from.col);
    if (!attacker) return false;
    const legal = legalTargets(state, side, from.row, from.col);
    if (!legal.targets.length) return false;
    let target = legal.targets.find(
      (t) => t.kind === to.kind && (t.kind === "lord" || t.row === to.row && t.col === to.col)
    );
    if (statusStacks(attacker, "hun_luan") > 0) {
      target = legal.targets[rng.int(legal.targets.length)];
    }
    if (!target) return false;
    resolveAttack(
      state,
      ctx.cards,
      side,
      from,
      target,
      events,
      rng,
      { consumeAttack: true }
    );
    chargeWaterTax(state, ctx, side, from.row, from.col, events);
    return true;
  }
  function useUnitSkill(state, ctx, action, events, rng) {
    const side = state.active;
    const u = getUnit(state, side, action.row, action.col);
    if (!u) return false;
    const check = canUseUnitSkill(state, side, action.row, action.col, action.skillId, ctx.cards);
    if (!check.ok) return false;
    const skill = check.skill;
    const steps = unitSkillTargetPlan(state, side, action.row, action.col, action.modeIndex, action.skillId).choices;
    const handSteps = steps.filter((c) => c.zone === "hand");
    if (handSteps.some((c) => !c.handIndices?.length)) return false;
    if (action.handIndex !== void 0 && handSteps.some((c) => !c.handIndices?.includes(action.handIndex))) return false;
    const boardSteps = steps.filter((c) => c.targets.length);
    const hit = boardSteps.filter((c) => c.pick === 1).some((c) => c.targets.some((t) => t.side === action.target?.side && (t.kind === "lord" ? action.target?.row === void 0 : t.row === action.target?.row && t.col === action.target?.col)));
    if (action.target && boardSteps.length && !hit) return false;
    const hasPick2 = boardSteps.some((c) => c.pick === 2);
    const hit2 = boardSteps.filter((c) => c.pick === 2).some((c) => c.targets.some((t) => t.side === action.target2?.side && (t.kind === "lord" ? action.target2?.row === void 0 : t.row === action.target2?.row && t.col === action.target2?.col)));
    if (hasPick2 && (!action.target2 || !hit2)) return false;
    const key = skill.id || skill.name || "0";
    u.skillUsesThisTurn[key] = (u.skillUsesThisTurn[key] ?? 0) + 1;
    u.actedThisTurn = true;
    emitSkillTriggered(state, side, u, skill, "active", events);
    if ((skill.frequency ?? "once_per_turn") === "once") u.skillsUsedOnce.push(key);
    state.sides[side].command.cur -= skill.cost ?? 0;
    const target = action.target ? action.target.row !== void 0 ? unitRef(action.target.side, action.target.row, action.target.col) : lordRef(action.target.side) : void 0;
    const target2 = action.target2 ? action.target2.row !== void 0 ? unitRef(action.target2.side, action.target2.row, action.target2.col) : lordRef(action.target2.side) : void 0;
    runEffects(
      state,
      ctx.cards,
      effectsOf(skill, action.modeIndex),
      { side, source: u, chosen: target, chosen2: target2, handIndex: action.handIndex, modeIndex: action.modeIndex },
      rng,
      events
    );
    chargeWaterTax(state, ctx, side, action.row, action.col, events);
    return true;
  }

  // src/result.ts
  function summarize(state, side) {
    const s = state.sides[side];
    const units = allUnits(state, side);
    return {
      side,
      lordName: s.lord.name,
      lordHp: s.lord.hp,
      lordMaxHp: s.lord.maxHp,
      lordArmor: s.lord.armor,
      units: units.length,
      totalAttack: units.reduce((a, r) => a + r.unit.atk, 0),
      deckLeft: s.deck.length,
      handLeft: s.hand.length,
      discard: s.discard.length,
      damageTaken: s.lord.maxHp - s.lord.hp
    };
  }
  function summarizeMatch(state) {
    const sides = { own: summarize(state, "own"), enemy: summarize(state, "enemy") };
    const result = state.winner ?? "draw";
    let reason = "\u672A\u7ED3\u675F";
    if (state.winner) {
      const lordDead = state.sides.own.lord.hp <= 0 || state.sides.enemy.lord.hp <= 0;
      reason = lordDead ? "\u4E3B\u5C06\u9635\u4EA1" : state.turn >= MATCH.TURN_LIMIT ? "\u56DE\u5408\u4E0A\u9650" : "\u4E3B\u5C06\u9635\u4EA1";
    }
    const winnerName = !state.winner ? "\u2014" : state.winner === "draw" ? "\u5E73\u5C40" : state.sides[state.winner].lord.name;
    return { result, reason, turns: state.turn, sides, winnerName };
  }
  function formatSummary(sum) {
    const { own, enemy } = sum.sides;
    return [
      `\u7ED3\u679C\uFF1A${sum.winnerName === "\u5E73\u5C40" ? "\u5E73\u5C40" : `${sum.winnerName} \u80DC`}\uFF08${sum.reason}\uFF0C\u7B2C ${sum.turns} \u56DE\u5408\uFF09`,
      `  \u5DF1\u65B9 ${own.lordName} ${own.lordHp}/${own.lordMaxHp}${own.lordArmor ? `+${own.lordArmor}\u7532` : ""} | \u573A\u4E0A ${own.units} \u4EBA \u5171 ${own.totalAttack} \u653B | \u724C\u5E93 ${own.deckLeft} \u624B ${own.handLeft} \u5F03 ${own.discard}`,
      `  \u654C\u65B9 ${enemy.lordName} ${enemy.lordHp}/${enemy.lordMaxHp}${enemy.lordArmor ? `+${enemy.lordArmor}\u7532` : ""} | \u573A\u4E0A ${enemy.units} \u4EBA \u5171 ${enemy.totalAttack} \u653B | \u724C\u5E93 ${enemy.deckLeft} \u624B ${enemy.handLeft} \u5F03 ${enemy.discard}`
    ].join("\n");
  }

  // src/setup.ts
  function mulligan(state, side, indices, cards) {
    const s = state.sides[side];
    if (s.mulliganDone) {
      return { ok: false, state, reason: "\u672C\u5C40\u5DF2\u6362\u8FC7\u724C\uFF08\u6BCF\u5F20\u4EC5\u4E00\u6B21\u673A\u4F1A\uFF09", replaced: [], drawn: [] };
    }
    const uniq = [...new Set(indices)].sort((a, b) => a - b);
    for (const i of uniq) {
      if (i < 0 || i >= s.hand.length) {
        return { ok: false, state, reason: `\u624B\u724C\u4E0B\u6807\u8D8A\u754C\uFF1A${i}`, replaced: [], drawn: [] };
      }
    }
    const next = cloneState(state);
    const ns = next.sides[side];
    const rng = createRng(next.rngState);
    const replaced = [];
    const drawn = [];
    for (const i of [...uniq].sort((a, b) => b - a)) {
      const hc = ns.hand.splice(i, 1)[0];
      if (hc) {
        replaced.push(hc.card);
        ns.deck.push(hc.card.id);
      }
    }
    rng.shuffle(ns.deck);
    for (let k = 0; k < replaced.length; k++) {
      const id = ns.deck.pop();
      if (!id) break;
      const c = cards.get(id);
      if (!c) continue;
      drawn.push(c);
      ns.hand.push({ card: c, mods: [] });
    }
    ns.mulliganDone = true;
    next.rngState = rng.getState();
    return { ok: true, state: next, replaced, drawn };
  }
  var startHandSize = (side, firstSide) => side === firstSide ? DECK.HAND_START_FIRST : DECK.HAND_START_SECOND;
  var handLimit = () => DECK.HAND_LIMIT;
  function setupMatch(opts) {
    const log = [];
    let state = createMatch({
      seed: opts.seed,
      lords: opts.lords,
      decks: opts.decks,
      cards: opts.cards,
      firstSide: opts.firstSide,
      rollFirst: opts.firstSide === void 0,
      // 未指定 → 按 GDD 掷点
      secondCompensation: opts.secondCompensation
    });
    log.push(`\u4E3B\u516C\uFF1A\u5DF1\u65B9 ${state.sides.own.lord.name} / \u654C\u65B9 ${state.sides.enemy.lord.name}`);
    log.push(`\u5148\u624B\uFF1A${state.active === "own" ? "\u5DF1\u65B9" : "\u654C\u65B9"}`);
    for (const side of ["own", "enemy"]) {
      const idx = opts.mulliganIndices?.[side];
      if (idx === void 0) {
        log.push(`${side} \u672A\u6362\u724C`);
        continue;
      }
      const r = mulligan(state, side, idx, opts.cards);
      if (!r.ok) {
        log.push(`${side} \u6362\u724C\u5931\u8D25\uFF1A${r.reason ?? ""}`);
        continue;
      }
      state = r.state;
      log.push(`${side} \u6362\u724C ${r.replaced.length} \u5F20\uFF1A${r.replaced.map((c) => c.name).join("\u3001") || "\u4E0D\u6362"}`);
    }
    return { state, log };
  }

  // src/loader.ts
  function loadData(bundle, lordIds) {
    const cards = /* @__PURE__ */ new Map();
    const byFaction = /* @__PURE__ */ new Map();
    for (const c of bundle.cards) {
      cards.set(c.id, c);
      const list = byFaction.get(c.faction) ?? [];
      list.push(c);
      byFaction.set(c.faction, list);
    }
    for (const h of bundle.heroes) cards.set(h.id, h);
    const findLord = (id) => {
      const raw = bundle.heroes.find((h) => h.id === id);
      if (!raw) throw new Error(`\u627E\u4E0D\u5230\u4E3B\u516C\uFF1A${id}`);
      const sk = raw.skills?.[0];
      if (!sk) throw new Error(`\u4E3B\u516C ${id} \u6CA1\u6709\u4E3B\u516C\u6280\uFF08heroes.yaml \u7684 skills[0]\uFF09`);
      return { ...raw, skill: sk.name, skillDef: sk };
    };
    return {
      cards,
      lords: { own: findLord(lordIds.own), enemy: findLord(lordIds.enemy) },
      byFaction
    };
  }

  // src/ai/cards.ts
  var CHARACTER_TYPES2 = ["troop", "general", "strategist", "machine"];
  var isCharacterCard = (c) => CHARACTER_TYPES2.includes(c.type);
  function skillEffects(sk) {
    if (sk.modes?.length) return sk.modes.flatMap((m) => m.effects ?? []);
    return sk.effects ?? [];
  }
  function allEffects(card) {
    const out = [...card.effects ?? []];
    for (const sk of card.skills ?? []) out.push(...skillEffects(sk));
    return out;
  }
  var cardBudget = (cost) => 2 * cost + 1;
  var KEYWORD_VALUE = {
    jia_dun: 1.2,
    // 架盾：逼对手先打它，等于给全队挡刀
    lian_ji: 1,
    // 连击：每回合两次普攻
    xian_gong: 0.9,
    // 先攻：入场即可攻击
    yi_ji: 0.7,
    // 遗计：亡语
    yin_xue: 0.6
    // 饮血：伤害转治疗
  };
  function keywordValueOf(has) {
    let v = 0;
    for (const [kw, w] of Object.entries(KEYWORD_VALUE)) if (has(kw)) v += w;
    return v;
  }
  function unitValueOf(u, has, skillWeight = 0.6) {
    const body = u.atk + Math.max(0, u.hp);
    const kw = keywordValueOf(has);
    const residual = Math.max(0, cardBudget(u.cost) - (u.baseAtk + u.baseMaxHp) - kw);
    return body + kw + residual * skillWeight + cardEquityOf(u);
  }
  var CARD_EQUITY = 2;
  function cardEquityOf(u) {
    return NON_DECK_TYPES.includes(u.type) ? 0 : CARD_EQUITY;
  }
  var handCardValue = (hc, ratio = 0.5) => cardBudget(hc.card.cost ?? 0) * ratio;
  var OFFENSIVE = /* @__PURE__ */ new Set([
    "damage",
    "destroy",
    "sacrifice",
    "ban_play",
    "steal_card",
    "take_control",
    "return_to_hand",
    "flip",
    "force_attack",
    "mill",
    "clash"
  ]);
  function picksEnemySide(action, sides) {
    if (OFFENSIVE.has(action)) return "enemy";
    if (action === "heal" || action === "survive" || action === "copy_skill") return "ally";
    if (action === "modify") return "ally";
    if (action === "remove_status") return "ally";
    if (action === "apply_status") return "enemy";
    const has = (s) => sides.includes(s);
    if (has("ally") && !has("enemy")) return "ally";
    if (has("enemy") && !has("ally")) return "enemy";
    return "either";
  }
  function cardReachesLord(card) {
    return allEffects(card).some((e) => OFFENSIVE.has(e.action) && (e.target?.lord === true || e.target?.side === "enemy" || e.target?.filter?.include_lord === true || e.action === "damage" && e.target === void 0));
  }

  // src/ai/eval.ts
  var WIN = 1e6;
  var finisherScale = (foeEff) => 1 + Math.max(0, 20 - foeEff) / 20;
  function evaluate(state, side, w) {
    if (state.winner === side) return WIN;
    if (state.winner) return -WIN;
    const foe = other(side);
    const me = state.sides[side];
    const them = state.sides[foe];
    let score = 0;
    const myEff = me.lord.hp + me.lord.armor;
    const foeEff = them.lord.hp + them.lord.armor;
    score += (myEff - foeEff) * w.face * finisherScale(foeEff);
    const mine = allUnits(state, side);
    const theirs = allUnits(state, foe);
    let myBoard = 0;
    let foeBoard = 0;
    let incoming = 0;
    for (const r of mine) myBoard += unitValueOf(r.unit, (k) => hasTrait(r.unit, k));
    for (const r of theirs) {
      foeBoard += unitValueOf(r.unit, (k) => hasTrait(r.unit, k));
      incoming += effectiveAttack(state, foe, r.row, r.col);
    }
    score += (myBoard - foeBoard) * w.board;
    score += (mine.length - theirs.length) * w.width;
    let handVal = 0;
    for (const hc of me.hand) handVal += handCardValue(hc);
    score += handVal * w.hand;
    score += me.command.cur * w.mana;
    let ready = 0;
    for (const r of mine) {
      if (canAttack(state, side, r.row, r.col).ok) ready += effectiveAttack(state, side, r.row, r.col);
    }
    score += ready * w.ready;
    const overkill = incoming - myEff;
    if (overkill >= 0 && incoming > 0) score -= (overkill + 4) * w.threat;
    else if (overkill > -6) score -= (6 + overkill) * 0.25 * w.threat;
    if (me.deck.length === 0) score -= (me.fatigue + 1) * 1.5 * w.fatigue;
    if (them.deck.length === 0) score += (them.fatigue + 1) * 1.5 * w.fatigue;
    return score;
  }

  // src/ai/options.ts
  var CAP = { attack: 32, play: 28, skill: 24, lord: 6 };
  var PICK1_CAP = 4;
  var PICK2_CAP = 3;
  var toActionTarget = (t) => t.kind === "lord" ? { side: t.side } : { side: t.side, row: t.row, col: t.col };
  function attackOptions(state, w) {
    const side = state.active;
    const foe = other(side);
    const out = [];
    const lordEff = state.sides[foe].lord.hp + state.sides[foe].lord.armor;
    for (const t of lordAttackTargets(state, side).targets) {
      out.push({
        kind: "attack",
        action: { type: "LORD_ATTACK", to: t.kind === "lord" ? { kind: "lord" } : { kind: "unit", row: t.row, col: t.col } },
        label: "\u4E3B\u516C\u666E\u653B",
        quick: (state.sides[side].lord.attackThisTurn ?? 0) * 1.1
      });
    }
    for (const ref of allUnits(state, side)) {
      if (!canAttack(state, side, ref.row, ref.col).ok) continue;
      const dmg = effectiveAttack(state, side, ref.row, ref.col);
      const me = ref.unit;
      const myValue = unitValueOf(me, (k) => hasTrait(me, k));
      for (const t of legalTargets(state, side, ref.row, ref.col).targets) {
        if (t.kind === "lord") {
          const lethal = dmg >= lordEff;
          out.push({
            kind: "attack",
            action: { type: "ATTACK", from: { row: ref.row, col: ref.col }, to: { kind: "lord" } },
            label: `${me.name} \u2192 \u4E3B\u5C06 ${dmg}`,
            quick: lethal ? 1e6 : dmg * w.face * 2
          });
          continue;
        }
        const target = getUnit(state, foe, t.row, t.col);
        if (!target) continue;
        const tv = unitValueOf(target, (k) => hasTrait(target, k));
        const kills = dmg >= target.hp;
        const retaliate = effectiveAttack(state, foe, t.row, t.col);
        const iDie = retaliate >= me.hp;
        let quick = kills ? iDie ? tv * 0.35 : tv * 1.5 : dmg * 1.1 - Math.min(dmg, target.hp) * 0.1;
        if (!kills && iDie) quick -= myValue * 0.5;
        if (kills && !iDie) quick += 3;
        out.push({
          kind: "attack",
          action: {
            type: "ATTACK",
            from: { row: ref.row, col: ref.col },
            to: { kind: "unit", row: t.row, col: t.col }
          },
          label: `${me.name} \u2192 ${target.name}${kills ? "\uFF08\u51FB\u6740\uFF09" : ""}`,
          quick
        });
      }
    }
    return out.sort((a, b) => b.quick - a.quick).slice(0, CAP.attack);
  }
  function slotsFor(state, side, card) {
    const spots = legalPlacements(state, side);
    if (!spots.length) return [];
    const adjacencySensitive = (card.skills ?? []).some((sk) => effectsOfSkill(sk).some((e) => e.target?.filter?.adjacent_to === "self"));
    return adjacencySensitive ? spots : [spots[0]];
  }
  var effectsOfSkill = (sk) => sk.modes?.length ? sk.modes.flatMap((m) => m.effects ?? []) : sk.effects ?? [];
  function rankTarget(state, side, choice, w, t) {
    if (t.kind === "slot") return 0;
    const dir = picksEnemySide(choice.action, choice.sides);
    if (choice.action === "heal" || choice.action === "survive") {
      if (t.kind === "lord") return 1;
      const u2 = getUnit(state, t.side, t.row, t.col);
      if (!u2) return 0;
      return (u2.maxHp - u2.hp) * 3 + unitValueOf(u2, (k) => hasTrait(u2, k)) * 0.2;
    }
    if (t.kind === "lord") {
      const lord = state.sides[t.side].lord;
      const eff = lord.hp + lord.armor;
      if (dir === "ally") return 0;
      return t.side === side ? -eff : (40 - eff) * 0.5 * w.face;
    }
    const u = getUnit(state, t.side, t.row, t.col);
    if (!u) return 0;
    const v = unitValueOf(u, (k) => hasTrait(u, k));
    if (dir === "ally") return v;
    if (dir === "enemy") return t.side === side ? -v : v;
    return v;
  }
  function brief(t, self) {
    const who = t.side === self ? "\u6211" : "\u654C";
    return t.col === void 0 ? `${who}\xB7\u4E3B\u5C06` : `${who}\xB7\u7B2C${t.col + 1}\u683C`;
  }
  function combosOf(state, side, planFor, w, modeCount) {
    const modeIndexes = modeCount > 1 ? Array.from({ length: modeCount }, (_, i) => i) : [void 0];
    const out = [];
    const rankAndCap = (c, cap) => {
      const ranked = [...c.targets].map((t) => ({ t, s: rankTarget(state, side, c, w, t) })).sort((a, b) => b.s - a.s).slice(0, cap).map((x) => toActionTarget(x.t));
      if (!ranked.length && c.includesHand) return [void 0];
      return ranked;
    };
    for (const mi of modeIndexes) {
      const plan = planFor(mi);
      const c1 = plan.choices.find((c) => c.pick === 1);
      const c2 = plan.choices.find((c) => c.pick === 2);
      const picks1 = c1 ? rankAndCap(c1, PICK1_CAP) : [void 0];
      const picks2 = c2 ? rankAndCap(c2, PICK2_CAP) : [void 0];
      for (const p1 of picks1) {
        for (const p2 of picks2) {
          const parts = [];
          if (mi !== void 0) parts.push(plan.modes[mi] ?? `#${mi}`);
          if (p1) parts.push(`${c1?.action ?? "?"}\u2192${brief(p1, side)}`);
          if (p2) parts.push(`${c2?.action ?? "?"}\u2192${brief(p2, side)}`);
          out.push({ modeIndex: mi, target: p1, target2: p2, label: parts.join(" ") });
        }
      }
    }
    return out;
  }
  function playOptions(state, w) {
    const side = state.active;
    const s = state.sides[side];
    const out = [];
    const rng = createRng(state.rngState);
    s.hand.forEach((hc, i) => {
      if (isBanned(hc)) return;
      const card = hc.card;
      const cost = effectiveCost(hc, costRuleDelta(state, card, side, rng));
      const isChar = isCharacterCard(card);
      const slots = isChar ? slotsFor(state, side, card) : [void 0];
      if (isChar && !slots.length) return;
      const base = -cost * w.mana + cardBudget(cost) * 0.35;
      for (const slot of slots) {
        const check = canPlayCard(state, side, card, slot, cost);
        if (!check.ok) continue;
        const p0 = playTargetPlan(state, side, card, 0);
        const modeCount = p0.modes.length || 1;
        const combos = combosOf(state, side, (mi) => playTargetPlan(state, side, card, mi), w, modeCount);
        const handStep = p0.choices.find((c) => c.zone === "hand");
        const stepHandPicks = handStep?.handIndices?.length ? handStep.handIndices.filter((index) => index !== i) : needsHandIndexInPlay(card) ? handPickCandidates(state, side) : [void 0];
        for (const hp of stepHandPicks) {
          const handIndex = hp === void 0 ? void 0 : hp === i ? void 0 : hp - (hp > i ? 1 : 0);
          for (const cb of combos) {
            out.push({
              kind: "play",
              action: {
                type: "PLAY_CARD",
                cardIndex: i,
                ...slot ? { row: slot.row, col: slot.col } : {},
                ...cb.target ? { target: cb.target } : {},
                ...cb.target2 ? { target2: cb.target2 } : {},
                ...cb.modeIndex !== void 0 ? { modeIndex: cb.modeIndex } : {},
                ...handIndex !== void 0 ? { handIndex } : {}
              },
              label: `\u51FA ${card.name}${slot ? ` \u2192 \u7B2C${slot.col + 1}\u683C` : ""}${cb.label ? ` [${cb.label}]` : ""}` + (handIndex !== void 0 ? ` [\u5F03\u7B2C${handIndex + 1}\u5F20]` : ""),
              quick: base + (isChar ? 2 : 0)
            });
          }
        }
      }
    });
    return out.sort((a, b) => b.quick - a.quick).slice(0, CAP.play);
  }
  function needsHandIndexInPlay(card) {
    const scan = (effs) => (effs ?? []).some((e) => e.action === "discard" && e.mode === "choose" || e.action === "cycle_to_deck" || e.action === "deploy_from_hand");
    if (scan(card.effects)) return true;
    return (card.skills ?? []).some((sk) => sk.trigger === "on_play" && scan(sk.effects));
  }
  function skillOptions(state, w, cards) {
    const side = state.active;
    const out = [];
    for (const ref of allUnits(state, side)) {
      const gate = canUseUnitSkill(state, side, ref.row, ref.col, void 0, cards);
      if (!gate.ok || !gate.skill) continue;
      const sk = gate.skill;
      const p0 = unitSkillTargetPlan(state, side, ref.row, ref.col, 0);
      const modeCount = p0.modes.length || 1;
      const combos = combosOf(
        state,
        side,
        (mi) => unitSkillTargetPlan(state, side, ref.row, ref.col, mi ?? 0),
        w,
        modeCount
      );
      const handStep = p0.choices.find((c) => c.zone === "hand");
      if (handStep && !handStep.handIndices?.length) continue;
      const handPicks = handStep?.handIndices ?? (needsHandIndex(sk) ? handPickCandidates(state, side) : [void 0]);
      for (const cb of combos) {
        for (const hi of handPicks) {
          out.push({
            kind: "skill",
            action: {
              type: "USE_SKILL",
              row: ref.row,
              col: ref.col,
              ...cb.target ? { target: cb.target } : {},
              ...cb.modeIndex !== void 0 ? { modeIndex: cb.modeIndex } : {},
              ...hi !== void 0 ? { handIndex: hi } : {}
            },
            label: `${ref.unit.name}\xB7${sk.name || "\u4E3B\u52A8\u6280"}${cb.label ? ` [${cb.label}]` : ""}` + (hi !== void 0 ? ` [\u5F03\u7B2C${hi + 1}\u5F20]` : ""),
            quick: 2 + (sk.cost ?? 0) * 0.1
          });
        }
      }
    }
    return out.sort((a, b) => b.quick - a.quick).slice(0, CAP.skill);
  }
  function lordOptions(state, w) {
    const side = state.active;
    const gate = canUseLordSkill(state, side);
    if (!gate.ok || !gate.skill) return [];
    const sk = gate.skill;
    const out = [];
    const p0 = lordSkillTargetPlan(state, side, 0);
    const modeCount = p0.modes.length || 1;
    const handPicks = needsHandIndex(sk) ? handPickCandidates(state, side) : [void 0];
    for (const cb of combosOf(state, side, (mi) => lordSkillTargetPlan(state, side, mi ?? 0), w, modeCount)) {
      for (const hi of handPicks) {
        out.push({
          kind: "lord",
          action: {
            type: "USE_LORD_SKILL",
            ...cb.target ? { target: cb.target } : {},
            ...cb.modeIndex !== void 0 ? { modeIndex: cb.modeIndex } : {},
            ...hi !== void 0 ? { handIndex: hi } : {}
          },
          label: `\u4E3B\u516C\u6280 ${sk.name || ""}${cb.label ? ` [${cb.label}]` : ""}` + (hi !== void 0 ? ` [\u5F03\u7B2C${hi + 1}\u5F20]` : ""),
          quick: 1
        });
      }
    }
    return out.slice(0, CAP.lord);
  }
  function needsHandIndex(sk) {
    return effectsOfSkill(sk).some((e) => e.action === "discard" && e.mode === "choose" || e.action === "cycle_to_deck");
  }
  function handPickCandidates(state, side) {
    const hand = state.sides[side].hand;
    if (!hand.length) return [void 0];
    const byCost = hand.map((hc, i) => ({ i, cost: hc.card.cost ?? 0 })).sort((a, b) => a.cost - b.cost || a.i - b.i);
    const picks = /* @__PURE__ */ new Set();
    picks.add(byCost[0].i);
    picks.add(byCost[byCost.length - 1].i);
    picks.add(byCost[Math.floor(byCost.length / 2)].i);
    return [...picks].sort((a, b) => a - b);
  }
  function generateOptions(state, w, cards) {
    if (state.winner) return [];
    if (state.pendingDiscover) {
      return state.pendingDiscover.candidates.map((cardId) => ({
        action: { type: "CHOOSE_DISCOVER", cardId },
        kind: "play",
        label: `\u53D1\u73B0\uFF1A${cardId}`,
        quick: 0
        // 预排序不表态，交给模拟层按"这张牌值多少"取舍
      }));
    }
    if (state.pendingHandChoice) {
      const pending = state.pendingHandChoice;
      const hand = state.sides[pending.side].hand;
      const idx = pending.indices ?? hand.map((_, i) => i);
      return idx.filter((i) => i >= 0 && i < hand.length).sort((a, b) => hand[a].card.cost - hand[b].card.cost || a - b).map((i) => ({
        action: { type: "CHOOSE_HAND", handIndex: i },
        kind: "play",
        label: `\u9009\u624B\u724C\uFF1A${hand[i].card.name}`,
        quick: 0
      }));
    }
    const attacks = attackOptions(state, w);
    const plays = playOptions(state, w);
    const skills = skillOptions(state, w, cards);
    const lords = lordOptions(state, w);
    return [...attacks, ...plays, ...skills, ...lords].sort((a, b) => b.quick - a.quick);
  }

  // src/ai/profile.ts
  var STYLE_WEIGHTS = {
    // 速攻：打脸优先，场面价值打折，手牌不值钱（抢的是回合数，不是卡差）
    aggro: { face: 0.7, board: 0.85, ready: 0.35, width: 0.3, hand: 0.4, mana: 0.06, threat: 0.5, fatigue: 0.8 },
    // 中速：换牌与打脸并重，略微偏向解场
    midrange: { face: 0.45, board: 1, ready: 0.22, width: 0.5, hand: 0.55, mana: 0.06, threat: 0.9, fatigue: 1 },
    // 后期：站场与卡差优先，打脸只在不亏的前提下做
    control: { face: 0.32, board: 1.15, ready: 0.16, width: 0.7, hand: 0.75, mana: 0.06, threat: 1.2, fatigue: 1 }
  };
  function fullDeckOf(state, side, ctx) {
    const s = state.sides[side];
    const out = [];
    const push = (id) => {
      const c = ctx.cards.get(id);
      if (c) out.push(c);
    };
    for (const id of s.deck) push(id);
    for (const hc of s.hand) out.push(hc.card);
    for (const c of s.discard) out.push(c);
    for (const row of Object.keys(s.rows)) {
      for (const u of s.rows[row]) if (u) out.push(ctx.cards.get(u.cardId) ?? { id: u.cardId });
    }
    return out;
  }
  function profileCards(cards) {
    const n = Math.max(1, cards.length);
    const cost = cards.reduce((a, c) => a + (c.cost ?? 0), 0) / n;
    const cheap = cards.filter((c) => (c.cost ?? 0) <= 2).length / n;
    const heavy = cards.filter((c) => (c.cost ?? 0) >= 5).length / n;
    const reach = cards.filter(cardReachesLord).length;
    const removal = cards.filter((c) => !isCharacterCard(c) && allEffects(c).some((e) => e.action === "destroy" || e.action === "damage" && e.target?.side !== "ally" && e.target?.side !== "self")).length;
    const units = cards.filter(isCharacterCard).length;
    let style = "midrange";
    if (cost <= 2.5 || cheap >= 0.5) style = "aggro";
    else if (cost >= 3.6 || heavy >= 0.32) style = "control";
    return {
      style,
      avgCost: cost,
      cheapRatio: cheap,
      heavyRatio: heavy,
      reach,
      removal,
      units,
      weights: { ...STYLE_WEIGHTS[style] }
    };
  }
  function profileFor(state, side, ctx) {
    return profileCards(fullDeckOf(state, side, ctx));
  }

  // src/ai/index.ts
  var SIM_BUDGET = 160;
  var PASS_EPS = 0.01;
  function decide(state, ctx) {
    const side = state.active;
    const profile = profileFor(state, side, ctx);
    const w = profile.weights;
    const baseline = evaluate(state, side, w);
    const empty = { action: null, profile, sims: 0, score: null, candidates: 0 };
    if (state.winner) return empty;
    if (state.pendingDiscover) {
      const cardId = state.pendingDiscover.candidates[0];
      return cardId ? { ...empty, action: { type: "CHOOSE_DISCOVER", cardId }, candidates: state.pendingDiscover.candidates.length } : empty;
    }
    if (state.pendingHandChoice) {
      const pending = state.pendingHandChoice;
      const hand = state.sides[pending.side].hand;
      const idx = (pending.indices ?? hand.map((_, i) => i)).filter((i) => i >= 0 && i < hand.length).sort((a, b) => hand[a].card.cost - hand[b].card.cost || a - b);
      return idx.length ? { ...empty, action: { type: "CHOOSE_HAND", handIndex: idx[0] }, candidates: idx.length } : empty;
    }
    let options;
    try {
      options = generateOptions(state, w, ctx.cards);
    } catch {
      return { ...empty, action: fallbackAction(state, ctx) };
    }
    let best = null;
    let bestScore = -Infinity;
    let sims = 0;
    for (const opt of options) {
      if (sims >= SIM_BUDGET) break;
      let after;
      try {
        const res = applyAction(state, ctx, opt.action);
        if (!res.ok) continue;
        after = res.state;
      } catch {
        continue;
      }
      sims += 1;
      if (after.winner === side) {
        return { action: opt.action, profile, sims, score: Infinity, candidates: options.length, label: opt.label };
      }
      const score = evaluate(after, side, w);
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    if (!best || bestScore <= baseline + PASS_EPS) return { ...empty, sims, candidates: options.length };
    return {
      action: best.action,
      profile,
      sims,
      score: bestScore,
      candidates: options.length,
      label: best.label
    };
  }
  function chooseAction(state, ctx) {
    return decide(state, ctx).action;
  }
  function fallbackAction(state, ctx) {
    const side = state.active;
    for (const ref of allUnits(state, side)) {
      if (!canAttack(state, side, ref.row, ref.col).ok) continue;
      const targets = legalTargets(state, side, ref.row, ref.col).targets;
      if (targets.length) {
        return { type: "ATTACK", from: { row: ref.row, col: ref.col }, to: { kind: "lord" } };
      }
    }
    const spots = legalPlacements(state, side);
    const hand = state.sides[side].hand;
    for (let i = 0; i < hand.length; i++) {
      const hc = hand[i];
      if (!hc || isBanned(hc)) continue;
      if (isCharacterCard(hc.card)) {
        const slot = spots[0];
        if (slot && canPlayCard(state, side, hc.card, slot).ok) {
          return { type: "PLAY_CARD", cardIndex: i, row: slot.row, col: slot.col };
        }
      } else if (canPlayCard(state, side, hc.card).ok) {
        return { type: "PLAY_CARD", cardIndex: i };
      }
    }
    return null;
  }
  function takeTurn(state, ctx, apply, maxActions = 40) {
    let cur = state;
    const actions = [];
    for (let i = 0; i < maxActions; i++) {
      if (cur.winner) break;
      const action = chooseAction(cur, ctx);
      if (!action) break;
      const res = apply(cur, ctx, action);
      if (!res.ok) break;
      cur = res.state;
      actions.push(action);
    }
    const end = apply(cur, ctx, { type: "END_TURN" });
    return { state: end.ok ? end.state : cur, actions };
  }
  function aiMulligan(state, side, ctx) {
    const hand = state.sides[side].hand;
    if (!hand.length) return [];
    const profile = profileFor(state, side, ctx);
    const tooExpensive = profile.style === "aggro" ? 4 : 5;
    const keep = hand.map((hc) => (hc.card.cost ?? 0) <= 3);
    let out = hand.map((hc, i) => ({ i, cost: hc.card.cost ?? 0, keep: keep[i] })).filter((x) => !x.keep && x.cost >= tooExpensive).map((x) => x.i);
    if (!out.length && keep.every((k) => !k)) {
      out = hand.map((hc, i) => ({ i, cost: hc.card.cost ?? 0 })).sort((a, b) => b.cost - a.cost).slice(0, 2).map((x) => x.i);
    }
    return out;
  }

  // src/index.ts
  function newMatch(opts) {
    const state = createMatch(opts);
    const ctx = { cards: opts.cards, lords: opts.lords };
    const started = startMatch(state, ctx);
    return { state: started.state, ctx, events: started.events };
  }
  return __toCommonJS(index_exports);
})();
