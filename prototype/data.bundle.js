// 自动生成，勿手改：python3 tools/build-data-bundle.py
window.GameData = {
  "cards": [
    {
      "id": "shu_dongjue",
      "name": "董厥",
      "faction": "shu",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 2,
      "keywords": [
        "jia_dun"
      ],
      "memo": "2 费带架盾的矮墙，替后排挡刀",
      "gender": "male",
      "skills": [
        {
          "id": "",
          "name": "守势"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_liufeng",
      "name": "刘封",
      "faction": "shu",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 4,
      "memo": "一半概率整回合发呆 —— 便宜但会掉链子",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "you_yu_bu_jue",
          "name": "犹豫不决",
          "kind": "trigger",
          "trigger": "turn_start",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "chance": 0.5,
              "target": {
                "source": true
              }
            }
          ],
          "text": "每回合有一半概率无法行动."
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_chendao",
      "name": "陈到",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 2,
      "memo": "3 费 2/2 的白板武将（技能名「白毦兵」等效果设计好再加）",
      "gender": "male",
      "keywords": [],
      "flavor": ""
    },
    {
      "id": "shu_guanping",
      "name": "关平",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "memo": "关羽在场才 +1/+1；阵亡把「披坚」交给关羽",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "yong_wu",
          "name": "勇武",
          "kind": "aura",
          "text": "关羽在场时，自身 +1 攻 / +1 血。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "both",
                  "filter": {
                    "card_id": "shu_guanyu"
                  }
                }
              }
            }
          ]
        },
        {
          "id": "yi_ji_sheng_dun",
          "name": "遗计·免疫",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：使关羽获得「披坚」（免疫一次伤害）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "target": {
                "side": "both",
                "filter": {
                  "card_id": "shu_guanyu"
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_madai",
      "name": "马岱",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "keywords": [
        "xian_gong"
      ],
      "tags": [
        "xi_liang"
      ],
      "memo": "先攻；西凉全家的 +1/+1 旗手",
      "gender": "male",
      "skills": [
        {
          "id": "xi_liang_zi_di",
          "name": "西凉子弟",
          "kind": "aura",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "both",
                "filter": {
                  "type": "character",
                  "tag": "xi_liang"
                },
                "count": "all"
              },
              "condition": {
                "exists": {
                  "side": "both",
                  "filter": {
                    "type": "character",
                    "tag": "xi_liang"
                  }
                }
              }
            }
          ],
          "text": "获得先攻；有西凉人物时，所有西凉人物攻击 +1、血量 +1。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_zhoucang",
      "name": "周仓",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 4,
      "keywords": [
        "jia_dun"
      ],
      "tags": [
        "huang_jin"
      ],
      "memo": "身板够厚的架盾，跟着关羽扛线",
      "gender": "male",
      "skills": [
        {
          "id": "",
          "name": "架盾"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_guanxing",
      "name": "关兴",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "memo": "敌方有低费人时可先攻；斩杀低费者半数概率再动一次",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jiang_men_hu_zi",
          "name": "将门虎子",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "xian_gong_status",
              "duration": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "enemy",
                  "filter": {
                    "type": "character",
                    "cost_max": 3
                  }
                }
              }
            }
          ],
          "text": "当场上有低于3统帅的人则可上场时先攻，击败低于3统帅的人物时有50%获得一次额外行动.(只有触发一次)"
        },
        {
          "id": "e_wai_xing_dong",
          "name": "额外行动",
          "kind": "trigger",
          "trigger": "on_attack",
          "effects": [
            {
              "action": "extra_attack",
              "chance": 0.5,
              "condition": {
                "event": "killed"
              },
              "target": {
                "source": true
              }
            }
          ],
          "text": "当场上有低于3统帅的人则可上场时先攻，击败低于3统帅的人物时有50%获得一次额外行动.(只有触发一次)"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_shamoke",
      "name": "沙摩柯",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 4,
      "tags": [
        "man_zu"
      ],
      "memo": "蛮族越多自己越大",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "hu_wang",
          "name": "胡王",
          "kind": "aura",
          "effects": [
            {
              "action": "modify",
              "attack_from": {
                "side": "both",
                "filter": {
                  "tag": "man_zu"
                }
              },
              "health_from": {
                "side": "both",
                "filter": {
                  "tag": "man_zu"
                }
              },
              "target": {
                "source": true
              }
            }
          ],
          "text": "场上每有 1 名蛮族人物，自身获得 +1 攻 +1 血量。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_weiyan",
      "name": "魏延",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "memo": "攻击或挨打都有一半概率 +1 攻",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jie_ao_bu_xun",
          "name": "桀骜不驯",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击时有一半概率攻击力 +1（本回合）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "duration": "this_turn",
              "chance": 0.5,
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "jie_ao_bu_xun_hurt",
          "name": "桀骜不驯（受创）",
          "kind": "trigger",
          "trigger": "on_damaged",
          "text": "受到伤害时有一半概率攻击力 +1（本回合）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "duration": "this_turn",
              "chance": 0.5,
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_zhangbao",
      "name": "张苞",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 3,
      "memo": "战吼连打所有攻低于自己的敌人，直到自己倒下",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "fu_zi_jiang_feng",
          "name": "父子将风",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：挨个对攻击力低于自己的敌方人物发动普通攻击（含正常反击），直到自己阵亡。",
          "effects": [
            {
              "action": "attack_each",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "attack_below_source": true
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_huangzhong",
      "name": "黄忠",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 4,
      "memo": "每回合免费点名 2 点，专治高价值目标",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "bai_bu_chuan_yang",
          "name": "百步穿杨",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "自己每回合行动时对指定敌方人物造成 2 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_machao",
      "name": "马超",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 5,
      "keywords": [
        "xian_gong"
      ],
      "tags": [
        "xi_liang"
      ],
      "memo": "先攻；首回合斩武将可封住敌方主公技",
      "gender": "male",
      "skills": [
        {
          "id": "tie_qi_tu_xi",
          "name": "铁骑突袭",
          "kind": "trigger",
          "trigger": "on_kill",
          "text": "先攻；首回合击杀敌方武将后，敌主帅下回合无法发动主公技。",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_yong",
              "duration": 1,
              "target": {
                "side": "enemy",
                "lord": true
              },
              "condition": {
                "turn_max": 1,
                "victim_type": "general"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_zhangfei",
      "name": "张飞",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 5,
      "memo": "在场就压制攻低于自己的敌人；入场再烫伤敌方全体",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "pao_xiao",
          "name": "咆哮",
          "kind": "aura",
          "text": "光环：攻击力低于张飞的敌军攻击力 −1（不含主公）。张飞阵亡后失效。",
          "effects": [
            {
              "action": "modify",
              "attack": -1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "attack_below_source": true
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "id": "pao_xiao_hou",
          "name": "咆哮（入场）",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对敌方所有人物造成 1 点伤害（不含主公），与对方攻击力无关。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": false
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_zhaoyun",
      "name": "赵云",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 5,
      "memo": "第一个回合免疫一切伤害，敢直接冲脸",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "yi_shen_shi_dan",
          "name": "一身是胆",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "mian_yi",
              "duration": 1,
              "target": {
                "source": true
              }
            }
          ],
          "text": "在自己行动结束的第一回合前,自己免疫一切伤害."
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_guanyu",
      "name": "关羽",
      "faction": "shu",
      "type": "general",
      "cost": 6,
      "attack": 6,
      "health": 5,
      "memo": "全体禁技外加全体 1 伤，一锤定音的精英",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "shui_yan_qi_jun",
          "name": "水淹七军",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_yong",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            },
            {
              "action": "apply_status",
              "status": "shui_kun",
              "stacks": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            },
            {
              "action": "damage",
              "value": 1,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ],
          "text": "使对方所有场上人物技能禁用一回合，并对其造成 1 点水攻伤害、施加「水困」（永久，阶段 1 起步；层数＝阶段，行动时受 2^(阶段-1) 点水伤）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_jiangwei",
      "name": "姜维",
      "faction": "shu",
      "type": "general",
      "cost": 6,
      "attack": 4,
      "health": 5,
      "memo": "普攻 +1；打出策略牌就一路抽到非策略牌",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wen_wu_shuang_quan",
          "name": "文武双全",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "普通攻击时攻击力 +1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "duration": "this_turn",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "wen_wu_shuang_quan_draw",
          "name": "文武双全（策略）",
          "kind": "trigger",
          "trigger": "on_card_played",
          "text": "使用策略牌时，抽牌直到抽到非策略牌为止。",
          "target": {
            "filter": {
              "type": "tactic"
            }
          },
          "effects": [
            {
              "action": "draw_until",
              "until_not_type": "tactic"
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_huanghao",
      "name": "黄皓",
      "faction": "shu",
      "type": "strategist",
      "cost": 2,
      "attack": 1,
      "health": 2,
      "memo": "自削己方一点统率，换对手随机一张手牌被封锁",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "zen_yan",
          "name": "谮言",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方主公本回合统率 −1，并随机封锁敌方手中一张卡（被封的牌无法打出）。",
          "effects": [
            {
              "action": "gain_command",
              "value": -1
            },
            {
              "action": "ban_play",
              "target": {
                "side": "enemy",
                "zone": "hand",
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_xiangchong",
      "name": "向宠",
      "faction": "shu",
      "type": "strategist",
      "cost": 2,
      "attack": 1,
      "health": 4,
      "keywords": [
        "jia_dun"
      ],
      "memo": "2 费最厚的架盾",
      "gender": "male",
      "flavor": ""
    },
    {
      "id": "shu_huangquan",
      "name": "黄权",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "受创时对敌方全体造成 1 点火攻伤害（各挂 1 层永久灼烧）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "duan_hou",
          "name": "断后",
          "kind": "trigger",
          "trigger": "on_damaged",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "fire",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ],
          "text": "受到伤害时，对敌方全体造成 1 点火攻伤害，并各挂 1 层永久灼烧（ADR-134）。"
        }
      ],
      "flavor": "猇亭之战，陆逊火烧连营，黄权率部断后，护刘备全军退入白帝城。"
    },
    {
      "id": "shu_jianyang",
      "name": "简雍",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 2,
      "memo": "劝降同统率的敌将，半数概率收回自己手里",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "劝降",
          "text": "上场时,可对指定等于自己统帅的卡牌进行劝降.有50%概率收回自己手中"
        }
      ],
      "effects": [
        {
          "action": "return_to_hand",
          "chance": 0.5,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character",
              "cost_max": 3
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_masu",
      "name": "马谡",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "抽 2 再随机弃 2，纯换手牌质量",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "搞意",
          "text": "上场时,随机抽取两张牌为自己所用到手牌中,然后再随机抽取两张牌丢弃."
        }
      ],
      "effects": [
        {
          "action": "draw",
          "value": 2
        },
        {
          "action": "discard",
          "count": 2,
          "target": {
            "side": "self"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_fazheng",
      "name": "法正",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "标记一名仇敌，仇敌挨打就给指定友军回血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "en_yuan_fen_ming",
          "name": "恩怨分明",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "chou_di",
              "status_source": "self",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "标记一个敌方人物为仇敌(放在对应敌方卡牌位).我仇敌受到伤害时,为指定友方恢复等量的血;当自己受到恢复血量,则抽一张卡牌."
        },
        {
          "id": "chou_di_hui_xue",
          "name": "仇敌回血",
          "kind": "trigger",
          "trigger": "on_mark_damaged",
          "effects": [
            {
              "action": "heal",
              "value_from_flag": "mark_amount",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "标记一个敌方人物为仇敌(放在对应敌方卡牌位).我仇敌受到伤害时,为指定友方恢复等量的血;当自己受到恢复血量,则抽一张卡牌."
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_mifang",
      "name": "糜芳",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "战吼二选一：回 3 血或抽 2 张",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "shu_cai_zhang_yi",
          "name": "疏财仗义",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "heal",
              "value": 3,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场时恢复指定友方人物3点滴血量,或者抽取两张卡牌."
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_huangyueying",
      "name": "黄月英",
      "faction": "shu",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 3,
      "memo": "一次召唤两个机械兵，一个架盾一个不能打主将",
      "gender": "female",
      "keywords": [],
      "skills": [
        {
          "id": "ji_qiao_chu_zhen",
          "name": "机巧出阵",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "summon",
              "unit": "token_jixie_shaobing",
              "count": 1,
              "position": "random"
            },
            {
              "action": "summon",
              "unit": "token_jixie_shouwei",
              "count": 1,
              "position": "random"
            }
          ],
          "text": "上场时制造一个机械哨兵 1 攻 1 血，不能攻击敌方主将；制造一个 1 攻 1 血机械哨兵并带架盾效果。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_pangtong",
      "name": "庞统",
      "faction": "shu",
      "type": "strategist",
      "cost": 6,
      "attack": 1,
      "health": 4,
      "memo": "在场时己方非人物牌统率 −2；阵亡送己方 2 张牌",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "feng_chu_zhi_zhi_aura",
          "name": "凤雏之智",
          "kind": "aura",
          "effects": [
            {
              "action": "cost_modifier",
              "value": -2,
              "target": {
                "side": "self",
                "zone": "hand",
                "count": "all"
              }
            }
          ],
          "text": "在场时己方所有非人物卡牌统率-2；庞统阵亡时己方抽 2 张卡。"
        },
        {
          "id": "feng_chu_zhi_zhi",
          "name": "凤雏之智（阵亡）",
          "kind": "trigger",
          "trigger": "on_death",
          "effects": [
            {
              "action": "draw",
              "value": 2
            }
          ],
          "text": "在场时己方所有非人物卡牌统率-2；庞统阵亡时己方抽 2 张卡。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "shu_zhugeliang",
      "name": "诸葛亮",
      "faction": "shu",
      "type": "strategist",
      "cost": 7,
      "attack": 1,
      "health": 6,
      "memo": "调牌库顶三张再抽 1；空手时免疫伤害",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "yun_chou_wei_wo",
          "name": "运筹帷幄",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "一回合一次：查看牌库最上面三张牌，并按指定顺序放回。己方抽一张牌。",
          "effects": [
            {
              "action": "scry",
              "count": 3,
              "from": "top",
              "to": "deck_top",
              "target": {
                "side": "ally"
              }
            },
            {
              "action": "draw",
              "value": 1
            }
          ]
        },
        {
          "id": "kong_cheng_ji",
          "name": "空城之计",
          "kind": "aura",
          "text": "己方手牌为 0 时，诸葛亮获得「披坚」（免疫一次伤害）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "zone": "hand"
                  },
                  "op": "==",
                  "value": 0
                }
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "neutral_archer",
      "name": "弓兵",
      "faction": "neutral",
      "type": "troop",
      "cost": 1,
      "attack": 0,
      "health": 2,
      "troopKind": "archer",
      "memo": "无法普通攻击；战技「放箭」随机对敌方单位造成 1 点伤害",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "neutral_fangjian",
          "name": "放箭",
          "kind": "active",
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "neutral_infantry",
      "name": "步兵",
      "faction": "neutral",
      "type": "troop",
      "cost": 1,
      "attack": 1,
      "health": 2,
      "troopKind": "infantry",
      "memo": "1 费 1/2 的基础步兵",
      "gender": "male",
      "keywords": [],
      "skills": [],
      "flavor": ""
    },
    {
      "id": "neutral_cavalry",
      "name": "骑兵",
      "faction": "neutral",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "troopKind": "cavalry",
      "memo": "先攻骑兵，击杀后可积累升变进度",
      "gender": "male",
      "keywords": [
        "xian_gong"
      ],
      "skills": [],
      "flavor": ""
    },
    {
      "id": "wei_caogang",
      "name": "曹昂",
      "faction": "wei",
      "type": "general",
      "cost": 2,
      "attack": 1,
      "health": 3,
      "keywords": [
        "jia_dun"
      ],
      "tags": [
        "cao_clan"
      ],
      "memo": "1 攻 3 血还带架盾，纯肉盾",
      "gender": "male",
      "type_explicit": true,
      "skills": [
        {
          "id": "",
          "name": "舍身",
          "text": "架盾"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caozhang",
      "name": "曹彰",
      "faction": "wei",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "tags": [
        "cao_clan"
      ],
      "memo": "战吼二选一：抽 1 张，或本回合 +1 攻",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "meng_xi",
          "name": "猛袭",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：选择一项 —— ① 抽 1 张牌；② 本回合攻击力 +1。",
          "modes": [
            {
              "name": "蓄势（抽 1 张牌）",
              "effects": [
                {
                  "action": "draw",
                  "value": 1
                }
              ]
            },
            {
              "name": "奋击（本回合攻击 +1）",
              "effects": [
                {
                  "action": "modify",
                  "attack": 1,
                  "duration": "this_turn",
                  "target": {
                    "source": true
                  }
                }
              ]
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xiahouen",
      "name": "夏侯恩",
      "faction": "wei",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "memo": "阵亡时给己方补 1 张牌",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jian_shi",
          "name": "剑侍",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "阵亡时，己方抽一张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 1
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_zhangyan",
      "name": "张燕",
      "faction": "wei",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "keywords": [
        "xian_gong"
      ],
      "tags": [
        "huang_jin"
      ],
      "memo": "上场即可攻击的快攻件",
      "gender": "male",
      "skills": [
        {
          "id": "",
          "name": "急行",
          "text": "上场时获得先攻"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caoren",
      "name": "曹仁",
      "faction": "wei",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 5,
      "tags": [
        "cao_clan"
      ],
      "memo": "第一回合免一次伤害，第二回合转为架盾",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tie_bi_tong_qiang",
          "name": "铁壁铜墙",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "jia_dun_status",
              "target": {
                "source": true
              }
            },
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "stacks": 1,
              "target": {
                "source": true
              }
            }
          ],
          "text": "上场第二回合架盾并在上场第一回合获得「披坚」（免疫一次伤害）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caoxiu",
      "name": "曹休",
      "faction": "wei",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 3,
      "tags": [
        "cao_clan"
      ],
      "memo": "抽到时立刻召唤上场",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "qian_li_zhi_ju",
          "name": "千里之驹",
          "kind": "trigger",
          "trigger": "on_draw",
          "text": "被抽到时，立刻召唤曹休上场。",
          "effects": [
            {
              "action": "summon",
              "unit": "wei_caoxiu",
              "count": 1,
              "position": "random"
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_guohuai",
      "name": "郭淮",
      "faction": "wei",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 4,
      "memo": "战吼让相邻友军 +2 上限并架盾，逼你摆位",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ju_shou",
          "name": "据守",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：为与郭淮相邻的己方人物 +2 生命上限，并使其获得架盾。",
          "effects": [
            {
              "action": "modify",
              "health": 2,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "adjacent_to": "self"
                },
                "count": "all"
              }
            },
            {
              "action": "apply_status",
              "status": "jia_dun_status",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "adjacent_to": "self"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xiahoushang",
      "name": "夏侯尚",
      "faction": "wei",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 2,
      "memo": "战吼发现一张战法牌",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "fu_zheng",
          "name": "辅政",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "discover",
              "count": 3,
              "target": {
                "side": "self",
                "filter": {
                  "type": "tactic"
                }
              }
            }
          ],
          "text": "战吼：从牌库发现三张战法，选择一张加入手牌。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caohong",
      "name": "曹洪",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 5,
      "keywords": [
        "jia_dun"
      ],
      "tags": [
        "cao_clan"
      ],
      "memo": "架盾并使主公恢复 5 点生命",
      "gender": "male",
      "skills": [
        {
          "id": "jiu_ji",
          "name": "救急",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：使己方主公恢复 5 点生命。",
          "effects": [
            {
              "action": "heal",
              "value": 5,
              "target": {
                "side": "self",
                "lord": true
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caozhen",
      "name": "曹真",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 5,
      "keywords": [
        "jia_dun"
      ],
      "tags": [
        "cao_clan"
      ],
      "memo": "架盾并使场上所有角色获得 +1/+1",
      "gender": "male",
      "skills": [
        {
          "id": "zhen_guo",
          "name": "镇国",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：使场上所有角色攻击力和生命值 +1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "both",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_dengai",
      "name": "邓艾",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 5,
      "memo": "不攻击就屯田抽牌",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tun_tian",
          "name": "屯田",
          "kind": "trigger",
          "trigger": "turn_end",
          "effects": [
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "acted_this_turn": false
              }
            }
          ],
          "text": "回合结束时，若本回合没有攻击，抽 1 张牌。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_lejin",
      "name": "乐进",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 4,
      "memo": "无其他己方武将时获得先攻",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "xian_deng",
          "name": "先登",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "xian_gong_status",
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "general",
                      "exclude_source": true
                    }
                  },
                  "op": "==",
                  "value": 0
                }
              }
            }
          ],
          "text": "自己场上没有其他武将时，获得先攻。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xiahoudun",
      "name": "夏侯惇",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 6,
      "memo": "非满血挨打就 +1 攻；满血被击杀半数概率留 1 血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ba_jian_dan_jing",
          "name": "拔箭啖睛",
          "kind": "trigger",
          "trigger": "on_damaged",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "source": true
              }
            }
          ],
          "text": "夏侯惇受到伤害(非满血)时，攻击力+1；满血被击杀时，有一半的机率以 1 血存活。"
        },
        {
          "id": "man_xue_bu_si",
          "name": "血战",
          "kind": "trigger",
          "trigger": "on_lethal",
          "chance": 0.5,
          "frequency": "once",
          "effects": [
            {
              "action": "survive",
              "target": {
                "source": true
              }
            }
          ],
          "text": "夏侯惇受到伤害(非满血)时，攻击力+1；满血被击杀时，有一半的机率以 1 血存活。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xiahouyuan",
      "name": "夏侯渊",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 4,
      "memo": "第一回合先攻，行动后隐身一回合",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "xun_ji_tu_xi",
          "name": "迅疾突袭",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "第一回合获得先攻，行动结束后获得一回合隐身（无法被选中攻击），下回合失效。",
          "effects": [
            {
              "action": "apply_status",
              "status": "xian_gong_status",
              "target": {
                "source": true
              }
            },
            {
              "action": "apply_status",
              "status": "qi_xi_status",
              "duration": 1,
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xuhuang",
      "name": "徐晃",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 5,
      "memo": "打低统率 +1 攻，打高统率 +1 血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ya_fu_zhi_feng",
          "name": "亚夫之风",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "enemy",
                  "filter": {
                    "type": "character",
                    "cost_below_source": true
                  }
                }
              }
            },
            {
              "action": "modify",
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "enemy",
                    "filter": {
                      "type": "character",
                      "cost_below_source": true
                    }
                  },
                  "op": "==",
                  "value": 0
                }
              }
            }
          ],
          "text": "对低于自己统帅的敌军时攻击+1；对不低于自己统帅的敌军时血量+1。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_yujin",
      "name": "于禁",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 3,
      "memo": "光环强化所有 5 费角色",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "chi_jun_yan_zheng",
          "name": "持军严整",
          "kind": "aura",
          "effects": [
            {
              "action": "modify",
              "attack": 2,
              "health": 2,
              "target": {
                "side": "both",
                "filter": {
                  "type": "character",
                  "cost_min": 5,
                  "cost_max": 5
                },
                "count": "all"
              }
            }
          ],
          "text": "所有统率为 5 的角色获得 +2 攻击力和 +2 生命值。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_zhanghe",
      "name": "张郃",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 4,
      "memo": "上场让一名人物 −2 攻或 −2 血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "liao_zhan_ru_ji",
          "name": "料战如计",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "modify",
              "attack": -2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场时使指定一人物，选择攻击-2 或血量-2。最少血量为 1，攻击为 0。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_zhangliao",
      "name": "张辽",
      "faction": "wei",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 4,
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；斩杀后溢出伤害转打敌方主将",
      "gender": "male",
      "skills": [
        {
          "id": "chong_feng_xian_zhen",
          "name": "冲锋陷阵",
          "kind": "trigger",
          "trigger": "on_attack",
          "effects": [
            {
              "action": "damage",
              "value_from_flag": "overflow",
              "condition": {
                "event": "killed"
              },
              "target": {
                "side": "enemy",
                "lord": true
              }
            }
          ],
          "text": "获得先攻。上场可立即开始行动，如若斩杀敌人人物卡牌，溢出伤害由对方主将承受。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_dianwei",
      "name": "典韦",
      "faction": "wei",
      "type": "general",
      "cost": 6,
      "attack": 5,
      "health": 6,
      "memo": "己方只剩他一人时 +1/+2 并架盾",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "yi_fu_dang_guan",
          "name": "一夫当关",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 2,
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "op": "==",
                  "value": 1
                }
              }
            },
            {
              "action": "apply_status",
              "status": "jia_dun_status",
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "op": "==",
                  "value": 1
                }
              }
            }
          ],
          "text": "如果场上只有典韦一名己方人物时，其攻击 +1、血量 +2，并获得架盾。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xuchu",
      "name": "许褚",
      "faction": "wei",
      "type": "general",
      "cost": 6,
      "attack": 5,
      "health": 6,
      "memo": "指定一名敌将单挑，分出胜负前谁也碰不到他们（一局一次）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "hu_chi",
          "name": "虎痴",
          "kind": "active",
          "cost": 0,
          "frequency": "once",
          "effects": [
            {
              "action": "apply_status",
              "status": "jue_dou",
              "duration": 2,
              "target": {
                "source": true
              }
            },
            {
              "action": "apply_status",
              "status": "jue_dou",
              "duration": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "general"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "指定敌方一名武将(非主公)与自己对决;分出胜负前,其他人无法对两人进行攻击.(只能使用一次)"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_zhonghui",
      "name": "钟会",
      "faction": "wei",
      "type": "general",
      "cost": 6,
      "attack": 4,
      "health": 5,
      "memo": "战吼混乱一个敌方人物",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "luan_ju",
          "name": "乱局",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "hun_luan",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "战吼：使一个敌方人物混乱 1 回合。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caopi",
      "name": "曹丕",
      "faction": "wei",
      "type": "general",
      "cost": 8,
      "attack": 4,
      "health": 8,
      "tags": [
        "cao_clan"
      ],
      "memo": "随机展示三张曹氏宗亲，选择一张并减 1 统帅",
      "flavor": "魏文帝整顿宗室与朝局，令曹氏人才为魏所用。",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "yan_ge_gai_ge",
          "name": "宗室擢用",
          "kind": "active",
          "cost": 0,
          "frequency": "once_per_turn",
          "text": "一回合一次：从牌库随机展示 3 张曹氏宗亲，由你选择 1 张加入手牌；该牌统帅消耗减少 1 点。",
          "effects": [
            {
              "action": "discover",
              "count": 3,
              "value": -1,
              "target": {
                "side": "self",
                "filter": {
                  "tag": "cao_clan",
                  "faction": "wei",
                  "type": "character"
                }
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_liuye",
      "name": "刘晔",
      "faction": "wei",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 4,
      "memo": "战吼：手牌不超过一张时抽一张",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "kong_shi_na_xian",
          "name": "空室纳贤",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：手牌少于等于 1 张时，抽一张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "count": {
                  "selector": {
                    "side": "self",
                    "zone": "hand"
                  },
                  "op": "<=",
                  "value": 1
                }
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_caozhi",
      "name": "曹植",
      "faction": "wei",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "tags": [
        "cao_clan"
      ],
      "memo": "战法连抽，阵亡抽两张",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "cai_gao_ba_dou",
          "name": "才高八斗",
          "kind": "trigger",
          "trigger": "on_card_played",
          "duration": "this_turn",
          "target": {
            "filter": {
              "type": "tactic"
            }
          },
          "text": "本回合每释放一个战法，抽一张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 1
            }
          ]
        },
        {
          "id": "luo_shen_fu",
          "name": "洛神赋",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：抽两张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 2
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_jiangji",
      "name": "蒋济",
      "faction": "wei",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "战吼限制敌方武将和普通兵种下回合攻击",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "zha_di",
          "name": "诈敌",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gong",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "general"
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "apply_status",
              "status": "jin_gong",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "troop"
                },
                "count": "all"
              }
            }
          ],
          "text": "战吼：选择一个敌方武将，使其和所有敌方普通兵种下个回合无法攻击。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xunyou",
      "name": "荀攸",
      "faction": "wei",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "战吼：对随机 2 名已受伤单位各造成 2 点火伤（各挂 1 层永久灼烧）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wu_chao_xi_liang",
          "name": "乌巢袭粮",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "damage_type": "fire",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "damaged": true
                },
                "count": 2,
                "mode": "random"
              }
            }
          ],
          "text": "战吼：对敌方随机 2 名已受伤的单位各造成 2 点火攻伤害；每段火攻各挂 1 层永久灼烧（其回合开始时失去等于层数的生命，ADR-134）。"
        }
      ],
      "flavor": "建安十年，荀攸力主许攸之谋，夜袭乌巢，尽焚袁绍军粮。"
    },
    {
      "id": "wei_chengyu",
      "name": "程昱",
      "faction": "wei",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 5,
      "memo": "牺牲己方一名人物，按它的血量回血又造伤",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "shen_shi_duo_shi",
          "name": "审时度势",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：牺牲一名己方人物（由你指定），将其**血量最大值**恢复给指定人物（第二个指定目标），并对随机一名敌人造成牺牲者**当前血量**的伤害。",
          "effects": [
            {
              "action": "sacrifice",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "heal",
              "value_from_flag": "sacrificed_max_hp",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose",
                "pick": 2
              }
            },
            {
              "action": "damage",
              "value_from_flag": "sacrificed_hp",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_guojia",
      "name": "郭嘉",
      "faction": "wei",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 4,
      "memo": "己方策略牌 −1 费；每打一张策略牌抽 1",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tian_ji_yan_suan",
          "name": "天机演算",
          "kind": "aura",
          "effects": [
            {
              "action": "cost_modifier",
              "value": -1,
              "target": {
                "side": "self",
                "zone": "hand",
                "filter": {
                  "type": "tactic"
                },
                "count": "all"
              }
            }
          ],
          "text": "郭嘉上场时,我方策略牌需要统帅-1,如果每打出一张策略牌,既可抽一张卡牌."
        },
        {
          "id": "yan_suan_chou_pai",
          "name": "演算抽牌",
          "kind": "trigger",
          "trigger": "on_card_played",
          "effects": [
            {
              "action": "draw",
              "value": 1
            }
          ],
          "target": {
            "filter": {
              "type": "tactic"
            }
          },
          "text": "郭嘉上场时,我方策略牌需要统帅-1,如果每打出一张策略牌,既可抽一张卡牌."
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_simayi",
      "name": "司马懿",
      "faction": "wei",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 6,
      "memo": "不动就全场 1 伤；动过手就拆对手牌库一张",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "mou_ding_hou_dong",
          "name": "谋定后动",
          "kind": "trigger",
          "trigger": "turn_end",
          "text": "回合结束时，若司马懿本回合没有任何行动，对所有敌方人物造成 1 点伤害；若行动且造成过伤害，则弃掉对方牌库一张；场上只剩司马懿时后者同时生效。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              },
              "condition": {
                "acted_this_turn": false
              }
            },
            {
              "action": "mill",
              "count": 1,
              "target": {
                "side": "enemy"
              },
              "condition": {
                "any_of": [
                  {
                    "acted_this_turn": true,
                    "dealt_damage_this_turn": true
                  },
                  {
                    "count": {
                      "selector": {
                        "side": "ally",
                        "filter": {
                          "type": "character"
                        }
                      },
                      "op": "==",
                      "value": 1
                    }
                  }
                ]
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_xunyu",
      "name": "荀彧",
      "faction": "wei",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 5,
      "memo": "主帅统率上限永久 +2，本回合人物牌再 −1 费",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wang_zuo_zhi_ce",
          "name": "王佐之策",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "gain_command",
              "value": 2
            },
            {
              "action": "cost_modifier",
              "value": -1,
              "target": {
                "side": "self"
              }
            }
          ],
          "text": "永久增加主帅两点统帅，且当前回合所有手牌里的人物卡牌减少一个统帅消耗。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wei_jiaxu",
      "name": "贾诩",
      "faction": "wei",
      "type": "strategist",
      "cost": 7,
      "attack": 1,
      "health": 5,
      "memo": "把 3 费以下的敌将拐过来用一回合",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "li_jian_du_ji",
          "name": "离间毒计",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "take_control",
              "count": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "cost_max": 3
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "apply_status",
              "status": "hun_luan",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              },
              "condition": {
                "exists": {
                  "side": "enemy",
                  "filter": {
                    "type": "character",
                    "cost_max": 3
                  }
                }
              }
            }
          ],
          "text": "指定一个不大于 3 统率的敌方将来临时变为己方将领 1 回合；大于 3 统率的敌方将领每次行动有一半的机率随机选择任意一名人物单位进行攻击（敌我不限）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_liyi",
      "name": "李异",
      "faction": "wu",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 2,
      "memo": "2 费 2/2 普通卡，低费填充",
      "gender": "male",
      "keywords": [],
      "flavor": ""
    },
    {
      "id": "wu_songqian",
      "name": "宋谦",
      "faction": "wu",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 3,
      "memo": "2 费 2/3 扎实身材，无技能纯站场",
      "gender": "male",
      "keywords": [],
      "flavor": ""
    },
    {
      "id": "wu_zhuran",
      "name": "朱然",
      "faction": "wu",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 2,
      "keywords": [
        "jia_dun"
      ],
      "memo": "2 费前排嘲讽，敌方必须先打掉它",
      "gender": "male",
      "flavor": ""
    },
    {
      "id": "wu_zumao",
      "name": "祖茂",
      "faction": "wu",
      "type": "general",
      "cost": 2,
      "attack": 1,
      "health": 3,
      "memo": "主帅的肉盾 —— 伤害全由祖茂扛，他倒下保护就没了",
      "gender": "male",
      "type_explicit": true,
      "keywords": [],
      "skills": [
        {
          "id": "ti_zhu",
          "name": "替主",
          "kind": "aura",
          "text": "己方主帅受到伤害时，改由祖茂承受。",
          "effects": [
            {
              "action": "apply_status",
              "status": "hu_zhu",
              "status_source": "self",
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "lord": true,
                    "filter": {
                      "has_status": "hu_zhu"
                    }
                  },
                  "op": "==",
                  "value": 0
                }
              },
              "target": {
                "side": "ally",
                "lord": true
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_mazhong",
      "name": "马忠",
      "faction": "wu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "memo": "入场给敌方一个人物下套，50% 让它动不了",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "she_fu",
          "name": "设伏",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "chance": 0.5,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_quancong",
      "name": "全琮",
      "faction": "wu",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 2,
      "memo": "决水造成 3 点水攻伤害",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jue_shui",
          "name": "决水",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：造成 3 点水攻伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_dingfeng",
      "name": "丁奉",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "memo": "己方有 1 血残兵时自己少 1 费",
      "cost_rule": {
        "condition": {
          "exists": {
            "side": "ally",
            "filter": {
              "type": "character",
              "health_max": 1
            }
          }
        },
        "value": -1
      },
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "奋勇",
          "text": "如果己方场上有受伤而且为1血人物，就降低一点统帅消耗。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_handang",
      "name": "韩当",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "memo": "上场那回合点名 2 点伤害",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jian_wu_xu_fa",
          "name": "箭无虚发",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场第一回合时，对指定敌人造成2点伤害。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_huanggai",
      "name": "黄盖",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 4,
      "memo": "自掉 1 血换敌人半数概率混乱，混乱成功再抽 1",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "ku_rou_ji",
          "name": "苦肉计",
          "kind": "active",
          "cost": 0,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "source": true
              }
            },
            {
              "action": "apply_status",
              "status": "hun_luan",
              "duration": 1,
              "chance": 0.5,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "event": "none"
              }
            }
          ],
          "text": "每回合可一次机会自己掉一血指定一名敌人混乱（50%概率），如果混乱成功，则抽一张卡牌."
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_lukang",
      "name": "陆抗",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 4,
      "memo": "复制手里或场上友方将领的一个技能",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "qian_chong_ru_chang",
          "name": "谦冲如常",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "copy_skill",
              "target": {
                "side": "ally",
                "zone": "both",
                "filter": {
                  "type": "character",
                  "exclude_source": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "自上场时，可选择手里或场上友方将领的技能一次。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_sunjian",
      "name": "孙坚",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 3,
      "memo": "阵亡拼点，赢了让一张手牌免费下场",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jiang_dong_meng_hu",
          "name": "江东猛虎",
          "kind": "trigger",
          "trigger": "on_death",
          "effects": [
            {
              "action": "clash",
              "clashMode": "roll",
              "target": {
                "side": "enemy"
              }
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "event": "clash_won"
              }
            }
          ],
          "text": "阵亡时与敌方拼点。如果拼点获胜，则随机让己方手牌中一名人物不消耗统率上场（但不能触发这张牌的上场效果）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_zhoutai",
      "name": "周泰",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 5,
      "memo": "替友将挨打；被击败时半数概率留 1 血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tie_xue_shou_hu",
          "name": "铁血守护",
          "kind": "trigger",
          "trigger": "turn_start",
          "effects": [
            {
              "action": "apply_status",
              "status": "shou_hu",
              "status_source": "self",
              "duration": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "每回合，若有己方将领被击破时，可选择是否援护一次，该将领受到的伤害由周泰承受。周泰被击败时，有一次机会50%概率存活。"
        },
        {
          "id": "bu_qu",
          "name": "不屈",
          "kind": "trigger",
          "trigger": "on_lethal",
          "chance": 0.5,
          "frequency": "once",
          "effects": [
            {
              "action": "survive",
              "target": {
                "source": true
              }
            }
          ],
          "text": "每回合，若有己方将领被击破时，可选择是否援护一次，该将领受到的伤害由周泰承受。周泰被击败时，有一次机会50%概率存活。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_zhuhuan",
      "name": "朱桓",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 5,
      "memo": "受伤后每回合自回 1 血，越拖越难死",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "yi_yi_dai_lao",
          "name": "以逸待劳",
          "kind": "trigger",
          "trigger": "turn_start",
          "effects": [
            {
              "action": "heal",
              "value": 1,
              "target": {
                "source": true
              }
            }
          ],
          "text": "自己在场时，如果受伤，每回合恢复自己一点血量。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_ganning",
      "name": "甘宁",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 5,
      "keywords": [
        "xian_gong"
      ],
      "memo": "第一回合先攻，并让全场敌人 −1 攻一回合",
      "gender": "male",
      "skills": [
        {
          "id": "bai_qi_jie_ying",
          "name": "百骑劫营",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "modify",
              "attack": -1,
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ],
          "text": "第一回合上场时获得先攻，且所有场上敌方人物 -1 攻一回合。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_lingtong",
      "name": "凌统",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 5,
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；攻击时半数概率震慑目标",
      "gender": "male",
      "skills": [
        {
          "id": "guo_shi_zhi_feng",
          "name": "国士之风",
          "kind": "trigger",
          "trigger": "on_attack",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "chance": 0.5,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            }
          ],
          "text": "获得先攻，并且对攻击的敌人有 50% 概率造成震慑。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_lvmeng",
      "name": "吕蒙",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 5,
      "memo": "把自己和一名友军翻面，之后回合再翻回来行动",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "bai_yi_du_jiang",
          "name": "白衣渡江",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "flip",
              "target": {
                "source": true
              }
            },
            {
              "action": "flip",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场时可选择一名友方卡牌进行\"白衣渡江\"：本回合内将自己和选择的卡牌翻面，可在之后的回合开始行动。翻面卡牌无法被攻击以及被计策选中。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_sunce",
      "name": "孙策",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 5,
      "health": 5,
      "memo": "按己方人物数对指定敌人造成等量伤害",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jiang_dong_ba_wang",
          "name": "江东霸王",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "damage",
              "value_from": {
                "side": "ally",
                "filter": {
                  "type": "character"
                }
              },
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场时，根据场上友军人物卡数对敌方指定敌人造成人物数伤害。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_chengpu",
      "name": "程普",
      "faction": "wu",
      "type": "general",
      "cost": 6,
      "attack": 4,
      "health": 5,
      "memo": "上场震慑一名敌人；攻击时给随机友军回 1 血",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "hao_yong",
          "name": "豪勇",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "上场时选择一名敌方人物震慑一回合（无法行动）；攻击时，恢复随机友军 1 点血量。"
        },
        {
          "id": "chi_zhong",
          "name": "持重",
          "kind": "trigger",
          "trigger": "on_attack",
          "effects": [
            {
              "action": "heal",
              "value": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            }
          ],
          "text": "上场时选择一名敌方人物震慑一回合（无法行动）；攻击时，恢复随机友军 1 点血量。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_taishici",
      "name": "太史慈",
      "faction": "wu",
      "type": "general",
      "cost": 6,
      "attack": 5,
      "health": 6,
      "memo": "−2 攻换一回合打两次",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "shen_she_hao",
          "name": "神射豪",
          "kind": "active",
          "cost": 0,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "modify",
              "attack": -2,
              "target": {
                "source": true
              }
            }
          ],
          "text": "可选择-2攻击力，但一回合可攻击2次."
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_zhugeke",
      "name": "诸葛恪",
      "faction": "wu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "偷看对手牌库顶一张；再牺牲一人还能看其手牌",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "shi_cai",
          "name": "恃才",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "scry",
              "from": "top",
              "count": 1,
              "to": "hand",
              "target": {
                "side": "enemy"
              }
            }
          ],
          "text": "上场时，可查看对手卡池顶部一张牌。如果牺牲一名人物, 可同时查看对手手中一张卡牌。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_lusu",
      "name": "鲁肃",
      "faction": "wu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "每回合送对手 1 张手牌，自己抽 2 张",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "zhang_yi_shu_cai",
          "name": "仗义疏财",
          "kind": "active",
          "cost": 0,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "discard",
              "count": 1,
              "target": {
                "side": "self"
              }
            },
            {
              "action": "draw",
              "value": 2
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_luxun",
      "name": "陆逊",
      "faction": "wu",
      "type": "strategist",
      "cost": 6,
      "attack": 1,
      "health": 5,
      "memo": "每回合对敌方全体 1 点火伤，各挂 1 层永久灼烧（会累积）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ce_huo_liu_yun",
          "name": "策火流云",
          "kind": "trigger",
          "trigger": "turn_end",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "fire",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ],
          "text": "陆逊每回合对敌方全体造成 1 点火攻伤害；每段火攻各挂 1 层永久灼烧，层数会逐回合累积（其回合开始时失去等于层数的生命，ADR-134）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_zhouyu",
      "name": "周瑜",
      "faction": "wu",
      "type": "strategist",
      "cost": 7,
      "attack": 1,
      "health": 5,
      "memo": "拼点赢就弃对手手牌，并按该牌统率打其主将",
      "rarity": "elite",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "li_jian",
          "name": "离间",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "拼点：大于对方则使其丢弃一张牌，并对其主公造成等同于该牌统帅值的伤害；小于对方则使场上随机一名敌方人物回到对方手牌。",
          "effects": [
            {
              "action": "clash",
              "clashMode": "roll",
              "target": {
                "side": "enemy"
              }
            },
            {
              "action": "discard",
              "count": 1,
              "target": {
                "side": "enemy"
              },
              "condition": {
                "event": "clash_won"
              }
            },
            {
              "action": "damage",
              "value_from_discarded": "cost",
              "target": {
                "side": "enemy",
                "lord": true
              },
              "condition": {
                "event": "clash_won"
              }
            },
            {
              "action": "return_to_hand",
              "condition": {
                "event": "clash_lost"
              },
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_caimao",
      "name": "蔡瑁",
      "faction": "qun",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 2,
      "memo": "战吼点名 1 点水伤",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "shui_gong",
          "name": "水攻",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对指定一名敌人造成 1 点水伤。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_songxian",
      "name": "宋宪",
      "faction": "qun",
      "type": "general",
      "cost": 2,
      "attack": 2,
      "health": 3,
      "keywords": [
        "qi_xi"
      ],
      "memo": "上场隐身，出手后现形",
      "gender": "male",
      "flavor": ""
    },
    {
      "id": "qun_huangzu",
      "name": "黄祖",
      "faction": "qun",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 4,
      "memo": "挨打没死就回 1 血，极耐消耗",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wan_qiang",
          "name": "顽强",
          "kind": "trigger",
          "trigger": "on_damaged",
          "text": "每次受到攻击没有阵亡时，恢复 1 点生命。",
          "effects": [
            {
              "action": "heal",
              "value": 1,
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_huaxiong",
      "name": "华雄",
      "faction": "qun",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "memo": "每次击杀 +1/+1；亡语把这份成长送给击杀者",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wei_zhen_si_fang",
          "name": "威震四方",
          "kind": "trigger",
          "trigger": "on_kill",
          "text": "每次击杀时获得 +1 攻 / +1 血。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "yi_ji_wei_zhen",
          "name": "遗计·威震四方",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：击杀华雄的角色获得 +1 攻 / +1 血。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "event": "killer"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_zhangbao",
      "name": "张宝",
      "faction": "qun",
      "type": "general",
      "cost": 3,
      "attack": 1,
      "health": 2,
      "tags": [
        "huang_jin",
        "huang_jin_tongling"
      ],
      "memo": "与张梁同场召 2 个黄巾兵，三兄弟齐全翻倍",
      "gender": "male",
      "type_explicit": true,
      "keywords": [],
      "skills": [
        {
          "id": "huang_tian_dang_li",
          "name": "黄天当立",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方所有黄巾众（黄巾兵与黄巾力士）永久 +1/+1；张宝与张梁同时在场时召唤 2 个黄巾兵；张氏三兄弟同时在场时再召唤 2 个（共 4 个）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_zhong"
                },
                "count": "all"
              }
            },
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 2,
              "position": "random",
              "condition": {
                "all_of": [
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangliang"
                      }
                    }
                  }
                ]
              }
            },
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 2,
              "position": "random",
              "condition": {
                "all_of": [
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangliang"
                      }
                    }
                  },
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangjiao"
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_zhangliang",
      "name": "张梁",
      "faction": "qun",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 2,
      "tags": [
        "huang_jin",
        "huang_jin_tongling"
      ],
      "memo": "与张宝同场召 2 个黄巾兵，三兄弟齐全翻倍",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "huang_tian_dang_li",
          "name": "黄天当立",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方所有黄巾众（黄巾兵与黄巾力士）永久 +1/+1；张宝与张梁同时在场时召唤 2 个黄巾兵；张氏三兄弟同时在场时再召唤 2 个（共 4 个）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_zhong"
                },
                "count": "all"
              }
            },
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 2,
              "position": "random",
              "condition": {
                "all_of": [
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangbao"
                      }
                    }
                  }
                ]
              }
            },
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 2,
              "position": "random",
              "condition": {
                "all_of": [
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangbao"
                      }
                    }
                  },
                  {
                    "exists": {
                      "side": "ally",
                      "filter": {
                        "card_id": "qun_zhangjiao"
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_gaoshun",
      "name": "高顺",
      "faction": "qun",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 2,
      "memo": "召唤 2 个盾兵，并把全场盾兵进化成陷阵盾兵",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "xian_zhen_ying",
          "name": "陷阵营",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "summon",
              "unit": "neutral_shieldman",
              "count": 2,
              "position": "random"
            },
            {
              "action": "transform",
              "to": "elite_xianzhen_dun",
              "target": {
                "side": "ally",
                "filter": {
                  "troopKind": "shield"
                },
                "count": "all"
              }
            }
          ],
          "text": "召唤 2 个盾兵，并将场上所有盾兵进化为陷阵盾兵（2 攻 2 血，保留架盾）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_gongsunzan",
      "name": "公孙瓒",
      "faction": "qun",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 2,
      "memo": "召唤 1 个弓兵，并把全场弓兵进化成白马义从",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "bai_ma_yi_cong",
          "name": "白马义从",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "summon",
              "unit": "neutral_archer",
              "count": 1,
              "position": "random",
              "note": "平衡（ADR-047）：白马义从每只 +1/+1 且每回合 2 伤，是三种进化里收益最高的；召唤数 2→1"
            },
            {
              "action": "transform",
              "to": "elite_baima_yicong",
              "target": {
                "side": "ally",
                "filter": {
                  "troopKind": "archer"
                },
                "count": "all"
              }
            }
          ],
          "text": "召唤 1 个弓兵，并将场上所有弓兵进化为白马义从（1 攻 2 血，每回合造成 2 点伤害）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_mateng",
      "name": "马腾",
      "faction": "qun",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 2,
      "tags": [
        "xi_liang"
      ],
      "memo": "召唤 2 个步兵，并把全场步兵进化成西凉铁骑",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "xi_liang_tie_qi",
          "name": "西凉铁骑",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "summon",
              "unit": "neutral_infantry",
              "count": 2,
              "position": "random"
            },
            {
              "action": "transform",
              "to": "elite_xiliang_tieqi",
              "target": {
                "side": "ally",
                "filter": {
                  "troopKind": "infantry"
                },
                "count": "all"
              }
            }
          ],
          "text": "召唤 2 个步兵，并将场上所有步兵进化为西凉铁骑（2 攻 1 血，获得先攻）。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_dongzhuo",
      "name": "董卓",
      "faction": "qun",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 6,
      "memo": "战吼：若有女性在场则自身生命上限 +2，并对敌方全体男性造成 1 点火攻",
      "gender": "male",
      "keywords": [],
      "note": "「暴虐」最终采用**方案（乙）**（设计者定案，ADR-134）：**对敌方全体男性造成 1 点火攻伤害**， 灼烧由全局规则「对敌方释放的火攻各 +1 层」自动挂上 —— **永久**，因此卡面不再写时长。 ⚠️ **方案（甲）已被设计者否决**（留档）：甲＝不造成火攻、保留一条显式 apply_status: zhuo_shao； 否决理由是\"董卓应与其它火卡走同一条路\"，免得规则出现两套口径。 ⚠️ 目标写死 `include_lord: false`：本卡打的是\"敌方全体男性**角色**\"， 与方案（甲）的目标池保持一致（否则 ADR-087 的\"范围伤害默认含主公\"会顺带打主公 1 点）。",
      "skills": [
        {
          "id": "bao_nue",
          "name": "暴虐",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：若己方有女性角色，自身生命上限 +2；对敌方全体男性角色造成 1 点火攻伤害并使其永久灼烧（其回合开始时失去等于层数的生命，不封顶，ADR-134）。",
          "effects": [
            {
              "action": "modify",
              "health": 2,
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "type": "character",
                    "gender": "female"
                  }
                }
              },
              "target": {
                "source": true
              }
            },
            {
              "action": "damage",
              "value": 1,
              "damage_type": "fire",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "gender": "male",
                  "include_lord": false
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "董卓骄横暴戾，焚烧洛阳，废立天子。其孙女董白生而貌美，统兵为将。"
    },
    {
      "id": "qun_yuanshao",
      "name": "袁绍",
      "faction": "qun",
      "type": "general",
      "cost": 6,
      "attack": 3,
      "health": 6,
      "tags": [
        "yuan_shi"
      ],
      "memo": "每回合送弓兵；战吼塞万箭齐发，亡语全塞给对手",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "wei_wang",
          "name": "威望",
          "kind": "trigger",
          "trigger": "turn_start",
          "text": "每回合召唤一个弓兵。",
          "effects": [
            {
              "action": "summon",
              "unit": "neutral_archer",
              "count": 1,
              "position": "random"
            }
          ]
        },
        {
          "id": "jian_xiong_zhi_ming",
          "name": "万箭齐发之令",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：获得一张万箭齐发，并将两张万箭齐发加入牌组。",
          "effects": [
            {
              "action": "add_to_deck",
              "unit": "tactic_wanjianqifa",
              "count": 1,
              "to": "hand"
            },
            {
              "action": "add_to_deck",
              "unit": "tactic_wanjianqifa",
              "count": 2,
              "to": "deck"
            }
          ]
        },
        {
          "id": "yi_ji_wan_jian",
          "name": "遗计·万箭齐发",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "遗计：将未抽到的万箭齐发加入敌方牌库。",
          "effects": [
            {
              "action": "send_to_deck",
              "unit": "tactic_wanjianqifa",
              "target": {
                "side": "enemy"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_caiwenji",
      "name": "蔡文姬",
      "faction": "qun",
      "type": "strategist",
      "cost": 2,
      "attack": 0,
      "health": 2,
      "memo": "让一张武将牌和一个人物各少 1 费",
      "gender": "female",
      "keywords": [],
      "skills": [
        {
          "id": "qu_ming_cai_yi",
          "name": "曲名才艺",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "cost_modifier",
              "value": -1,
              "duration": 1,
              "target": {
                "side": "self",
                "zone": "hand",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            },
            {
              "action": "cost_modifier",
              "value": -1,
              "duration": 1,
              "target": {
                "side": "self",
                "zone": "hand",
                "filter": {
                  "type": "tactic"
                },
                "count": "all"
              }
            }
          ],
          "text": "使当前一回合使 自己一名武将和一张非令牌中武将牌 统帅消耗一."
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_zuoci",
      "name": "左慈",
      "faction": "qun",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "看对手手牌并踢一张进牌库；阵亡回自己牌库底",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "jian_tong_xing_wei",
          "name": "兼通星纬",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "scry",
              "from": "top",
              "count": 1,
              "to": "deck_bottom",
              "target": {
                "side": "enemy"
              }
            }
          ],
          "text": "可查看对方当前手牌一次，并选择一个移到对方卡池里。左慈血量降为 0 时，回到己方牌库最底层。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_chengong",
      "name": "陈宫",
      "faction": "qun",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 5,
      "memo": "指定一人：敌人被禁锢，友军的伤害由陈宫扛",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "zhong_lie",
          "name": "忠烈",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：选择一名武将，使其直到下个自己回合开始时获得——若为敌军，无法攻击和使用技能；若为友军，其受到的伤害由陈宫承担。",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gu",
              "duration": 1,
              "target": {
                "side": "both",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              },
              "condition": {
                "chosen_side": "enemy"
              }
            },
            {
              "action": "apply_status",
              "status": "shou_hu",
              "duration": "until_next_turn",
              "status_source": "self",
              "target": {
                "side": "both",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              },
              "condition": {
                "chosen_side": "ally"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_huatuo",
      "name": "华佗",
      "faction": "qun",
      "type": "strategist",
      "cost": 4,
      "attack": 0,
      "health": 5,
      "memo": "每回合治疗一人 2 血；治主公额外抽一张",
      "note": "4 费 0/5 = 5 点，比基准（9）低 4 点，换每回合一次的稳定治疗（4 费的价格里含\"可反复使用\"）。 ⚠️ ADR-148：原设计是\"弃一张手牌，按其统率回血\"，需要**两步选择**（先点手牌再选目标）， 设计者反馈太重、改为直接治疗 —— 更简单也更贴\"神医\"。 「治主公额外抽一张」用新增条件 `chosen_lord` 表达（与 `chosen_side` 同源，读 `ctx.chosen`）； 候选池用 `include_lord: true` 把主公并进人物池。\n",
      "gender": "male",
      "keywords": [
        "zhan_ji"
      ],
      "skills": [
        {
          "id": "yi_sheng",
          "name": "医圣",
          "kind": "active",
          "cost": 0,
          "frequency": "once_per_turn",
          "text": "战技（每回合一次）：治疗一位人物恢复 2 点生命；若治疗的是主公，额外抽一张牌。",
          "effects": [
            {
              "action": "heal",
              "value": 2,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "remove_status",
              "remove_kind": "debuff",
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "chosen_lord": true
              }
            }
          ]
        }
      ],
      "flavor": "醫者仁心，刮骨療毒。"
    },
    {
      "id": "qun_tianfeng",
      "name": "田丰",
      "faction": "qun",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 3,
      "memo": "封住己方主公技一回合，换 1 张牌（策略牌免费）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "gang_er_zhi_jian",
          "name": "刚而直谏",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_yan",
              "duration": 1,
              "target": {
                "side": "ally",
                "lord": true
              }
            },
            {
              "action": "draw",
              "value": 1
            }
          ],
          "text": "禁用己方主将一回合主公技，可抽取一张卡牌到手种，如果为策略卡，则无需消耗统帅."
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_diaochan",
      "name": "貂蝉",
      "faction": "qun",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 3,
      "memo": "拼点赢就迷住一名敌方男性角色一回合",
      "gender": "female",
      "keywords": [],
      "skills": [
        {
          "id": "huo_guo_qing_cheng",
          "name": "祸国倾城",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：与对手拼点，胜则指定一名敌方**男性**角色，使其直到下个自己回合开始无法行动。",
          "effects": [
            {
              "action": "clash",
              "clashMode": "roll",
              "target": {
                "side": "enemy"
              }
            },
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "condition": {
                "event": "clash_won"
              },
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "gender": "male"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": ""
    },
    {
      "id": "qun_zhangjiao",
      "name": "张角",
      "faction": "qun",
      "type": "strategist",
      "cost": 5,
      "attack": 1,
      "health": 5,
      "tags": [
        "huang_jin",
        "huang_jin_tongling"
      ],
      "memo": "回合结束 5 道雷，半数震慑，雷死敌人就召黄巾兵",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "da_xian_liang_shi",
          "name": "大贤良师",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方所有黄巾众（黄巾兵与黄巾力士）永久 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_zhong"
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "id": "wu_lei_hong_ding",
          "name": "五雷轰顶",
          "kind": "trigger",
          "trigger": "turn_end",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "count": 5,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              }
            },
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "chance": 0.5,
              "count": 5,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "random"
              },
              "note": "DSL 建模范式：与 5 次雷击独立结算，聚合概率等价；不可绑同一次伤害"
            },
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 1,
              "position": "random",
              "condition": {
                "event": "killed"
              }
            }
          ],
          "text": "每回合结束时 5 次随机 1 点雷击；每次 50% 概率震慑；击杀则召唤 1 攻 1 血黄巾兵。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "neutral_shieldman",
      "name": "盾兵",
      "faction": "neutral",
      "type": "troop",
      "cost": 2,
      "attack": 1,
      "health": 3,
      "troopKind": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾：敌方必须先打掉它才能攻击其他人",
      "flavor": "盾如铁壁，寸步不让。",
      "gender": "male"
    },
    {
      "id": "elite_baima_yicong",
      "name": "白马义从",
      "faction": "neutral",
      "type": "troop",
      "cost": 2,
      "note": "原为 0 费不可直出的形态卡；改为可直接打出的特种兵后暂设 2 费，待实机校准。",
      "attack": 1,
      "health": 2,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "memo": "公孙瓒的进化体：每回合点 2 点伤害",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "bai_ma_she",
          "name": "白马义从",
          "kind": "trigger",
          "trigger": "turn_start",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "每回合对指定任意敌方人物造成 2 点伤害。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "elite_xianzhen_dun",
      "name": "陷阵盾兵",
      "faction": "neutral",
      "type": "troop",
      "cost": 2,
      "note": "原为 0 费不可直出的形态卡；改为可直接打出的特种兵后暂设 2 费，待实机校准。",
      "attack": 2,
      "health": 2,
      "troopKind": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "高顺的进化体：2/2 仍带架盾",
      "gender": "male",
      "flavor": ""
    },
    {
      "id": "elite_xiliang_tieqi",
      "name": "西凉铁骑",
      "faction": "neutral",
      "type": "troop",
      "cost": 2,
      "note": "原为 0 费不可直出的形态卡；改为可直接打出的特种兵后暂设 2 费，待实机校准。",
      "attack": 2,
      "health": 1,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "马腾的进化体：2/1 带先攻",
      "gender": "male",
      "flavor": ""
    },
    {
      "id": "token_huangjin_bing",
      "name": "黄巾兵",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 1,
      "health": 1,
      "tags": [
        "huang_jin",
        "huang_jin_zhong"
      ],
      "memo": "黄巾系召唤的 1/1 衍生物，落地按统领数永久成长",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "huangjin_zhong",
          "name": "黄巾众",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "上场时，每有一名己方黄巾统领（张角、张宝、张梁）永久 +1/+1；己方场上有黄巾力士时再永久 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack_from": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_tongling"
                }
              },
              "health_from": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_tongling"
                }
              },
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "tag": "huang_jin_tongling"
                  }
                }
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "card_id": "qun_huangjinlishi"
                  }
                }
              }
            }
          ],
          "note": "口径（ADR-121，设计者定）：**落地时按当时的局面结算一次，之后永久保留** —— 黄巾兵是**召唤**出来的，所以这条 `on_play` 能跑起来靠的是引擎补上的 「召唤也派发战吼」（ADR-121；与 ADR-114 给升变补 on_play 同理）。 **只作用于自身**（`target: { source: true }`）：每个黄巾兵各算各的，不互相增益， 所以不存在「全体光环按同名份数叠加」那类问题；上限被\"统领只有 3 名\"锁死（最高 1＋3＋1＝5/5）。 统领的判定用标签 `huang_jin_tongling`（张角／张宝／张梁），**不含**周仓、张燕等「黄巾旧部」。 ⚠️ 与旧版（ADR-120 的光环）的差别：**统领阵亡不会让黄巾兵缩回去** —— 增长是单向棘轮。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "token_jia_ren",
      "name": "假人",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 0,
      "health": 1,
      "keywords": [
        "jia_dun"
      ],
      "memo": "草船借箭扎的草人 —— 0/1 架盾，纯粹用来替己方挨打",
      "flavor": "草人借箭，箭尽而归。",
      "gender": "male"
    },
    {
      "id": "token_jixie_shaobing",
      "name": "机械哨兵",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 2,
      "health": 1,
      "memo": "黄月英召唤的 2/1，不能打主将",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "不能攻击敌方主帅.",
          "pending": true
        }
      ],
      "flavor": ""
    },
    {
      "id": "token_jixie_shouwei",
      "name": "机械守卫",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 1,
      "health": 2,
      "keywords": [
        "jia_dun"
      ],
      "memo": "黄月英召唤的 1/2 架盾，不能打主将",
      "gender": "male",
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "打开架盾效果. 不能攻击敌方主帅."
        }
      ],
      "flavor": ""
    },
    {
      "id": "token_shizu_bing",
      "name": "士族兵",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 1,
      "health": 1,
      "tags": [
        "yuan_shi"
      ],
      "memo": "袁绍召唤的 1/1 衍生物",
      "gender": "male",
      "keywords": [],
      "flavor": ""
    },
    {
      "id": "tactic_wanjianqifa",
      "name": "万箭齐发",
      "faction": "neutral",
      "type": "tactic",
      "cost": 0,
      "memo": "抽到时自动释放：敌方全体 1 伤（袁绍专属）",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "wan_jian_qi_fa",
          "name": "万箭齐发",
          "kind": "trigger",
          "trigger": "on_draw",
          "text": "抽到时释放：对所有敌方人物造成 1 点伤害。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": "all"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_bishi_ruiqi",
      "name": "避其锐气",
      "faction": "neutral",
      "type": "tactic",
      "cost": 2,
      "memo": "把己方一张人物牌收回手里",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "将战场上己方一张人物卡收回手中。"
        }
      ],
      "effects": [
        {
          "action": "return_to_hand",
          "target": {
            "side": "ally",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_cuoqi_ruiqi",
      "name": "挫其锐气",
      "faction": "neutral",
      "type": "tactic",
      "cost": 2,
      "memo": "指定敌人攻击 −2 一回合（最低 0）",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "指定敌方人物攻击-2一回合，最多降为 0 攻击。"
        }
      ],
      "effects": [
        {
          "action": "modify",
          "attack": -2,
          "duration": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_anduchencang",
      "name": "暗渡陈仓",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "让一张人物牌直接翻面，翻回来时算重新上场",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "出可打出一张人物牌直接翻面，两回合最多（两回合?）翻背面，后面回合翻到正面时视为开始时上场。"
        }
      ],
      "effects": [
        {
          "action": "flip",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        },
        {
          "action": "flip",
          "target": {
            "side": "ally",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_bishijixu",
      "name": "避实击虚",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "打敌方最残血的角色 2 点",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "对敌方场上受伤人物中血量最低的造成2点伤害，如没有受伤的则对，血量最低的目标为"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 2,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "lowest_health"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_gongxinji",
      "name": "攻心计",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "半数概率让一名敌将下回合无法行动",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "选定一个敌方将领，有一半概率下回合行动失效，持续一回合。"
        }
      ],
      "effects": [
        {
          "action": "apply_status",
          "status": "zhen_she",
          "duration": 1,
          "chance": 0.5,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_huogong",
      "name": "火攻",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "点名 1 点火伤并挂灼烧，半数概率再追加 2 点（再挂 1 层）",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "对指定人物造成 1 点火攻伤害，并有 50% 概率再造成 2 点火攻伤害；每段火攻各挂 1 层永久灼烧（ADR-134）。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 1,
          "damage_type": "fire",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        },
        {
          "action": "damage",
          "value": 2,
          "chance": 0.5,
          "damage_type": "fire",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_mantianguohai",
      "name": "瞒天过海",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "手牌两张塞回牌库底，再从顶上抽两张",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "将己方手牌中两张卡选择放入卡池最底层，并从当前卡池顶部抽取两张."
        }
      ],
      "effects": [
        {
          "action": "scry",
          "from": "bottom",
          "count": 2,
          "to": "hand",
          "target": {
            "side": "self"
          }
        },
        {
          "action": "draw",
          "value": 2
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_tuntian",
      "name": "屯田",
      "faction": "neutral",
      "type": "tactic",
      "cost": 3,
      "memo": "简单粗暴抽 2 张",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "抽两张牌。"
        }
      ],
      "effects": [
        {
          "action": "draw",
          "value": 2
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_chuqibuyi",
      "name": "出其不意",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "翻牌库顶一张：非人物牌可立刻用，人物牌直接上场",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "从己方卡池顶部抽一张牌，如果为计非人物牌可需立既使用：如果是人物牌需立既上场。"
        }
      ],
      "effects": [
        {
          "action": "scry",
          "from": "top",
          "count": 1,
          "to": "hand",
          "target": {
            "side": "self"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_fudichouxin",
      "name": "釜底抽薪",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "直接对敌方主帅打 4 点",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "直接对敌方主帅造成4点伤害。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 4,
          "target": {
            "side": "enemy",
            "lord": true
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_jijiang",
      "name": "激将",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "从对手手里抢一张，是人物就强制上场",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "随机抽取敌方手中一张卡牌，如果为人物卡则强制上场。"
        }
      ],
      "effects": [
        {
          "action": "steal_card",
          "count": 1,
          "to": "board",
          "target": {
            "side": "enemy"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_shizhanqunru",
      "name": "舌战群儒",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "封印敌方全场谋臣的技能一回合",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "禁用敌方场上所有谋臣计能一回合。"
        }
      ],
      "effects": [
        {
          "action": "apply_status",
          "status": "jin_yong",
          "duration": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "strategist"
            },
            "count": "all"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_yuqin_guzong",
      "name": "欲擒故纵",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "斩杀敌人后拼点，赢了把那张人物收进手里",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "当击败一个敌方人物，使用此计可与对方拼点数大小，如果胜过对方则可将此人物收归己方手牌。"
        }
      ],
      "effects": [
        {
          "action": "clash",
          "clashMode": "roll",
          "target": {
            "side": "enemy"
          }
        },
        {
          "action": "return_to_hand",
          "condition": {
            "event": "clash_won"
          },
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "lowest_health"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_zhuchengjiliang",
      "name": "筑城积粮",
      "faction": "neutral",
      "type": "tactic",
      "cost": 4,
      "memo": "召唤两个 1/1 盾兵并抽 2 张",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "上场两个1攻1血的盾兵，且同时抽两张牌。"
        }
      ],
      "effects": [
        {
          "action": "summon",
          "unit": "neutral_shieldman",
          "count": 2,
          "position": "random"
        },
        {
          "action": "draw",
          "value": 2
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_chenhuodajie",
      "name": "趁火打劫",
      "faction": "neutral",
      "type": "tactic",
      "cost": 5,
      "memo": "混乱中的敌人会打自己人，顺便抽对手一张牌",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "当敌方场上有人物处于混乱状态，使其随机攻击己方单位；并使你抽取其卡池顶部一张卡。"
        }
      ],
      "effects": [
        {
          "action": "force_attack",
          "attack_side": "own",
          "condition": {
            "exists": {
              "side": "enemy",
              "filter": {
                "has_status": "hun_luan"
              }
            }
          },
          "target": {
            "side": "enemy",
            "filter": {
              "has_status": "hun_luan"
            },
            "count": "all"
          }
        },
        {
          "action": "scry",
          "from": "top",
          "count": 1,
          "to": "hand",
          "target": {
            "side": "enemy"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_kongchengji",
      "name": "空城计",
      "faction": "neutral",
      "type": "tactic",
      "cost": 5,
      "memo": "己方场上无人时，对手一回合打不了主帅",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "当己方场上没有人物在場时，对方一回合无法攻击主帅。"
        }
      ],
      "effects": [
        {
          "action": "apply_status",
          "status": "kong_cheng",
          "duration": 2,
          "target": {
            "side": "ally",
            "lord": true
          },
          "condition": {
            "count": {
              "selector": {
                "side": "ally",
                "filter": {
                  "type": "character"
                }
              },
              "op": "==",
              "value": 0
            }
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_xiushengyangxi",
      "name": "休养生息",
      "faction": "neutral",
      "type": "tactic",
      "cost": 5,
      "memo": "己方全体（含主帅）回 3 血并抽 1 张",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "恢复己方全体（含主帅）3 点生命，并抽 1 张牌。"
        }
      ],
      "effects": [
        {
          "action": "heal",
          "value": 3,
          "target": {
            "side": "ally",
            "filter": {
              "type": "character"
            },
            "count": "all"
          }
        },
        {
          "action": "heal",
          "value": 3,
          "target": {
            "side": "ally",
            "lord": true
          }
        },
        {
          "action": "draw",
          "value": 1
        }
      ],
      "flavor": ""
    },
    {
      "id": "tactic_caochuanjiejian",
      "name": "草船借箭",
      "faction": "neutral",
      "type": "tactic",
      "cost": 6,
      "memo": "敌方场上每有一名人物就抽一张，再扎两个 0/1 架盾假人挡刀",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "敌方场上每有一名人物，己方抽一张卡；随后召唤两个 0/1 架盾假人。"
        }
      ],
      "effects": [
        {
          "action": "draw",
          "value_from": {
            "side": "enemy",
            "count": "all"
          }
        },
        {
          "action": "summon",
          "unit": "token_jia_ren",
          "count": 2,
          "position": "random"
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_fengnian",
      "name": "五谷丰登",
      "faction": "neutral",
      "type": "event",
      "cost": 1,
      "memo": "双方各抽 1 张",
      "note": "原先写的是「双方各抽 2 张」，但引擎的 `draw` 动作**完全忽略 `target`** （永远抽给 `ctx.side`），于是实际效果是**自己抽 4 张** —— 1 费抽 4 张， 远超全库「3 费抽 2」的标准档（ADR-116 已同时修好引擎）。 现按设计者定为 **1 费、双方各抽 1 张**。",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "双方各从自己的卡池中抽取 1 张卡牌。"
        }
      ],
      "effects": [
        {
          "action": "draw",
          "value": 1
        },
        {
          "action": "draw",
          "value": 1,
          "target": {
            "side": "enemy"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_zainian",
      "name": "灾年",
      "faction": "neutral",
      "type": "event",
      "cost": 1,
      "memo": "全体停止抽牌一回合（含技能与计策引发的抽牌）",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "全体可停止一回合抽取卡牌。包括所有计策卡和人物技能引发的抽卡也会失效。"
        }
      ],
      "effects": [
        {
          "action": "apply_status",
          "status": "duan_chou",
          "duration": 1,
          "target": {
            "side": "both",
            "lord": true
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_huangjin",
      "name": "黄巾起义",
      "faction": "neutral",
      "type": "event",
      "cost": 3,
      "memo": "打出者立刻多两个 1/1 黄巾兵",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "打出此牌的人立即场上获得两个1攻一血的黄巾军（步兵）"
        }
      ],
      "effects": [
        {
          "action": "summon",
          "unit": "token_huangjin_bing",
          "count": 2,
          "position": "random"
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_nanmanruqin",
      "name": "南蛮入侵",
      "faction": "neutral",
      "type": "event",
      "cost": 3,
      "memo": "双方全体各吃 1 点，连主公一起",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "双方全体人物（包括刘备）受到一点伤害。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "both",
            "filter": {
              "type": "character"
            },
            "count": "all"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_shichangshi",
      "name": "十常侍",
      "faction": "neutral",
      "type": "event",
      "cost": 3,
      "memo": "指定一方下回合主帅统率上限 −2",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "指定一方一方下回合主帅的最大统帅-2"
        }
      ],
      "effects": [
        {
          "action": "apply_status",
          "status": "duan_liang",
          "stacks": 2,
          "target": {
            "side": "enemy",
            "lord": true
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "event_huoshaoluoyang",
      "name": "火烧洛阳",
      "faction": "neutral",
      "type": "event",
      "cost": 4,
      "memo": "敌方全体 1 点火伤并各挂 1 层永久灼烧，代价是弃 1 张手牌",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "对敌方全体造成 1 点火攻伤害并各挂 1 层永久灼烧（其回合开始时失去等于层数的生命，ADR-134）；代价是弃 1 张手牌，由打出此事件的人选择。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 1,
          "damage_type": "fire",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": "all"
          }
        },
        {
          "action": "discard",
          "count": 1,
          "target": {
            "side": "self"
          }
        }
      ],
      "flavor": ""
    },
    {
      "id": "status_jia_dun",
      "name": "架盾",
      "faction": "neutral",
      "type": "status",
      "cost": 0,
      "memo": "状态卡：装备者只能攻击带此状态的敌人",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "只能攻击装备此状态的敌人。"
        }
      ],
      "flavor": ""
    },
    {
      "id": "wu_panzhang",
      "name": "潘璋",
      "rarity": "elite",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 2,
      "memo": "擒将：对受伤敌方武将造成 3 点火攻伤害（挂 1 层永久灼烧）",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "qin_jiang",
          "name": "擒将",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：选择对方一个受伤的武将，造成 3 点火攻伤害并挂 1 层永久灼烧（ADR-134）。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "general",
              "damaged": true
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "damage_type": "fire",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "general",
                  "damaged": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": "擒获关羽，名震江东。"
    },
    {
      "id": "wu_zhanghong",
      "name": "张纮",
      "faction": "wu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "type_explicit": true,
      "memo": "主公技后发现三张战法并将一张置于牌库顶",
      "gender": "male",
      "keywords": [
        "ji_li"
      ],
      "skills": [
        {
          "id": "guang_ling_du",
          "name": "广陵对",
          "kind": "trigger",
          "trigger": "on_lord_skill_used",
          "text": "每次使用主公技后，从牌库发现三张战法牌，选择一张置于牌库最上方。",
          "effects": [
            {
              "action": "discover",
              "count": 3,
              "discover_to": "deck_top",
              "target": {
                "side": "self",
                "filter": {
                  "type": "tactic"
                }
              }
            }
          ]
        }
      ],
      "flavor": "张纮与张昭并称二张，辅佐孙氏基业。"
    },
    {
      "id": "wu_luji",
      "name": "陆绩",
      "faction": "wu",
      "type": "strategist",
      "cost": 2,
      "attack": 1,
      "health": 3,
      "type_explicit": true,
      "memo": "怀橘：主帅满血时抽牌，否则恢复主帅生命",
      "gender": "male",
      "skills": [
        {
          "id": "huai_ju",
          "name": "怀橘",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方主帅恢复 2 点生命；若主帅已满血，则抽 1 张牌。",
          "effects": [
            {
              "action": "heal",
              "value": 2,
              "target": {
                "side": "self",
                "lord": true
              },
              "condition": {
                "lord_full_hp": {
                  "side": "self",
                  "value": false
                }
              }
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "lord_full_hp": {
                  "side": "self",
                  "value": true
                }
              }
            }
          ]
        }
      ],
      "flavor": "陆绩怀橘遗母，成为孝义典范。"
    },
    {
      "id": "wu_zhugejin",
      "name": "诸葛瑾",
      "rarity": "elite",
      "faction": "wu",
      "type": "strategist",
      "cost": 2,
      "attack": 1,
      "health": 3,
      "type_explicit": true,
      "memo": "通好：限制敌方武将攻击并恢复双方主公生命",
      "gender": "male",
      "skills": [
        {
          "id": "tong_hao",
          "name": "通好",
          "kind": "trigger",
          "trigger": "on_play",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "general"
            },
            "count": 1,
            "mode": "choose"
          },
          "text": "战吼：选择一个敌方武将，下个回合无法攻击；双方主公恢复 3 点生命。",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gong",
              "duration": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "general"
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "heal",
              "value": 3,
              "target": {
                "side": "both",
                "lord": true,
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "诸葛瑾出使蜀汉，努力维系孙刘联盟。"
    },
    {
      "id": "wu_sunshangxiang",
      "name": "孙尚香",
      "faction": "wu",
      "type": "general",
      "cost": 6,
      "attack": 3,
      "health": 6,
      "memo": "联姻抽牌，并按手牌数治疗一名男性角色",
      "gender": "female",
      "skills": [
        {
          "id": "lian_yin",
          "name": "联姻",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "draw",
              "value": 1
            },
            {
              "action": "heal",
              "value_from": {
                "side": "self",
                "zone": "hand"
              },
              "target": {
                "side": "both",
                "filter": {
                  "type": "character",
                  "gender": "male"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "战吼：抽一张牌，指定一名男性角色，恢复其等同于你手牌数量的生命。"
        }
      ],
      "flavor": "孙刘联姻，巾帼不让须眉。"
    },
    {
      "id": "wu_sunyi",
      "name": "孙翊",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 3,
      "memo": "战吼和亡语都按自身攻击力随机伤害敌方角色",
      "gender": "male",
      "skills": [
        {
          "id": "xiao_han_guo_lie_play",
          "name": "骁悍果烈",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "damage",
              "value_from_source": "attack",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "random"
              }
            }
          ],
          "text": "战吼：对敌方随机角色造成等同于孙翊攻击力的伤害。"
        },
        {
          "id": "xiao_han_guo_lie_death",
          "name": "骁悍果烈",
          "kind": "trigger",
          "trigger": "on_death",
          "effects": [
            {
              "action": "damage",
              "value_from_source": "attack",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "random"
              }
            }
          ],
          "text": "亡语：对敌方随机角色造成等同于孙翊攻击力的伤害。"
        }
      ],
      "flavor": "孙翊性格刚烈，勇而少谋。"
    },
    {
      "id": "wu_xusheng",
      "name": "徐盛",
      "faction": "wu",
      "type": "general",
      "cost": 5,
      "attack": 4,
      "health": 6,
      "keywords": [
        "jia_dun"
      ],
      "memo": "嘲讽，己方人数少于敌方时获得额外生命",
      "gender": "male",
      "skills": [
        {
          "id": "yi_cheng",
          "name": "疑城",
          "kind": "trigger",
          "trigger": "on_play",
          "effects": [
            {
              "action": "modify",
              "health": 2,
              "target": {
                "source": true
              },
              "condition": {
                "count_vs": {
                  "left": {
                    "side": "self",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "right": {
                    "side": "enemy",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "op": "<"
                }
              }
            }
          ],
          "text": "嘲讽；战吼：当己方场上角色少于对方时，获得 +2 生命。"
        }
      ],
      "flavor": "徐盛以疑城退敌，守江东如铁壁。"
    },
    {
      "id": "wu_jiangqin",
      "name": "蒋钦",
      "rarity": "elite",
      "faction": "wu",
      "type": "general",
      "cost": 7,
      "attack": 4,
      "health": 7,
      "memo": "水军都督强化己方水攻伤害",
      "gender": "male",
      "skills": [
        {
          "id": "shui_jun_du_du",
          "name": "水军都督",
          "kind": "aura",
          "text": "对敌方造成的水攻伤害 +3。",
          "effects": [
            {
              "action": "apply_status",
              "status": "shui_gong_bonus",
              "stacks": 3,
              "status_source": "self",
              "target": {
                "side": "self",
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": "蒋钦督水军，善于水战。"
    },
    {
      "id": "wu_dongxi",
      "name": "董袭",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 6,
      "memo": "护主：主公受到的伤害由董袭承担",
      "gender": "male",
      "skills": [
        {
          "id": "hu_zhu",
          "name": "护主",
          "kind": "aura",
          "text": "主公受到的伤害由董袭承担。",
          "effects": [
            {
              "action": "apply_status",
              "status": "hu_zhu",
              "status_source": "self",
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "lord": true,
                    "filter": {
                      "has_status": "hu_zhu"
                    }
                  },
                  "op": "==",
                  "value": 0
                }
              },
              "target": {
                "side": "ally",
                "lord": true
              }
            }
          ]
        }
      ],
      "flavor": "董袭勇猛，曾冒死护卫孙权。"
    },
    {
      "id": "wu_chenwu",
      "name": "陈武",
      "faction": "wu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 3,
      "memo": "先攻，主公危急时亡语重创敌方主公",
      "gender": "male",
      "keywords": [
        "xian_gong"
      ],
      "skills": [
        {
          "id": "fen_si",
          "name": "奋死",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：敌方主公生命低于 15 时，对敌方主公造成 3 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "target": {
                "side": "enemy",
                "lord": true
              },
              "condition": {
                "lord_hp": {
                  "side": "enemy",
                  "op": "<",
                  "value": 15
                }
              }
            }
          ]
        }
      ],
      "flavor": "陈武奋勇战死，名震江东。"
    },
    {
      "id": "wu_zhangzhao",
      "name": "张昭",
      "faction": "wu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "type_explicit": true,
      "memo": "辅政：每次使用主公技后抽一张牌",
      "gender": "male",
      "keywords": [
        "ji_li"
      ],
      "skills": [
        {
          "id": "fu_zheng",
          "name": "辅政",
          "kind": "trigger",
          "trigger": "on_lord_skill_used",
          "text": "每次使用主公技后，抽一张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 1
            }
          ]
        }
      ],
      "flavor": "张昭辅佐孙权，善于治国理政。"
    },
    {
      "id": "wei_huweidun",
      "name": "虎卫盾",
      "faction": "wei",
      "type": "troop",
      "cost": 3,
      "attack": 1,
      "health": 5,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；以身护主，亡语使己方主公本回合免疫伤害",
      "skills": [
        {
          "id": "wei_wei",
          "name": "以身护主",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：本回合己方主公免疫所有伤害。",
          "effects": [
            {
              "action": "apply_status",
              "status": "mian_shang",
              "target": {
                "side": "self",
                "lord": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_wuweiying",
      "name": "武卫营",
      "faction": "wei",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 5,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；己方主公受到的伤害由自己承受",
      "note": "「常绕大帐」——典韦以亲兵数百人绕帐护卫曹操；渭南之战后宿卫虎士改建为武卫营，「武卫之号，自此始也」。架盾挡普通攻击（rules.ts 规则①：敌方有架盾单位时普攻只能打它们，主将不在候选里），虎帐挡效果伤害（findLordGuard 在扣血前转接），两者叠加才是完整护主。费用按「特种兵 ≥ 基础兵 +1」下限规则（盾兵 2 费 → 3 费）。",
      "skills": [
        {
          "id": "hu_zhang",
          "name": "虎帐",
          "kind": "aura",
          "text": "己方主公受到伤害时，改由武卫营承受；自身阵亡后保护消失。",
          "effects": [
            {
              "action": "apply_status",
              "status": "hu_zhu",
              "status_source": "self",
              "target": {
                "side": "ally",
                "lord": true
              }
            }
          ]
        }
      ],
      "flavor": "典韦为都尉，引置左右，将亲兵数百人，常绕大帐，每战常先登陷阵；渭南之战后，宿卫虎士改建武卫营。"
    },
    {
      "id": "wei_qingzhou_bing",
      "name": "青州兵",
      "faction": "wei",
      "type": "troop",
      "cost": 2,
      "attack": 3,
      "health": 2,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [],
      "memo": "普攻造成伤害并存活后，50%概率夺取敌方牌库顶部一张牌",
      "skills": [
        {
          "id": "qingzhou_zhan",
          "name": "劫掠",
          "kind": "trigger",
          "trigger": "after_attack",
          "text": "普通攻击造成伤害并存活后，有50%概率将敌方牌库顶部一张牌置入己方手牌。",
          "effects": [
            {
              "action": "steal_card",
              "from_deck": "top",
              "chance": 0.5,
              "condition": {
                "event": "damaged"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_suwei_hushi",
      "name": "宿卫虎士",
      "faction": "wei",
      "type": "troop",
      "cost": 2,
      "attack": 2,
      "health": 2,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [],
      "memo": "上场使自己和己方主公获得披坚",
      "skills": [
        {
          "id": "hu_shi",
          "name": "虎士",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "上场时，使自己和己方主公获得「披坚」（免疫一次伤害）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "stacks": 1,
              "target": {
                "source": true
              }
            },
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "stacks": 1,
              "target": {
                "side": "ally",
                "lord": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_hubaoki_hu",
      "name": "虎骑营",
      "faction": "wei",
      "type": "troop",
      "cost": 4,
      "attack": 2,
      "health": 4,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；攻击满血单位本次攻击+1，击杀敌方单位永久+1/+1",
      "skills": [
        {
          "id": "huqi_weishi",
          "name": "虎骑威势",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击满生命值的敌方单位时，本次攻击力+1。",
          "effects": [
            {
              "action": "attack_bonus",
              "value": 1,
              "condition": {
                "attack_target": {
                  "damaged": false
                }
              }
            }
          ]
        },
        {
          "id": "huqi_zhan_gong",
          "name": "斩功",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "普通攻击击杀敌方单位并存活后，永久获得+1攻击力和+1生命。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "condition": {
                "event": "killed"
              },
              "target": {
                "source": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_hubaoki_bao",
      "name": "豹骑营",
      "faction": "wei",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；攻击受伤单位本次攻击+1，击杀敌方单位可再次攻击",
      "skills": [
        {
          "id": "bao_qi_xiji",
          "name": "豹袭",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击受伤的敌方单位时，本次攻击力+1；攻击并消灭敌方单位后，获得一次额外攻击。",
          "effects": [
            {
              "action": "attack_bonus",
              "value": 1,
              "condition": {
                "attack_target": {
                  "damaged": true
                }
              }
            },
            {
              "action": "extra_attack",
              "condition": {
                "event": "killed"
              },
              "target": {
                "source": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_qiangnuying",
      "name": "冀州强弩",
      "faction": "wei",
      "type": "troop",
      "cost": 2,
      "attack": 1,
      "health": 2,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "无法普通攻击；战技随机造成3点伤害，对骑兵及其升变形态额外1点",
      "skills": [
        {
          "id": "qiangnu_jin_gong",
          "name": "强弩",
          "kind": "aura",
          "text": "无法普通攻击。",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gong",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "qiangnu_she",
          "name": "强弩",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：随机对一个敌方单位（不含主公）造成3点伤害；若目标为骑兵或骑兵的升变兵种，则额外造成1点伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character",
              "include_lord": false
            },
            "count": 1,
            "mode": "random"
          },
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "bonus_vs_troop_kind": {
                "troopKind": "cavalry",
                "value": 1
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wei_piliche",
      "name": "霹雳车",
      "faction": "wei",
      "type": "machine",
      "cost": 3,
      "attack": 0,
      "health": 3,
      "keywords": [
        "zhan_ji"
      ],
      "memo": "无法普通攻击；战技对目标及左右相邻单位各造成2点伤害，架盾额外1点",
      "skills": [
        {
          "id": "pili_jin_gong",
          "name": "车阵",
          "kind": "aura",
          "text": "无法普通攻击。",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gong",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "pili_bao",
          "name": "霹雳",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对目标及左右相邻单位各造成2点伤害；拥有架盾的目标改为单次受到3点伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "bonus_vs_keyword": {
                "keyword": "jia_dun",
                "value": 1
              }
            },
            {
              "action": "damage",
              "value": 2,
              "bonus_vs_keyword": {
                "keyword": "jia_dun",
                "value": 1
              },
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": false,
                  "adjacent_to": "chosen"
                },
                "count": "all"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "shu_bai_erbing",
      "name": "白毦兵",
      "faction": "shu",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 6,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；受到普通攻击后对攻击者额外造成 1 点伤害",
      "note": "费用按「特种兵 ≥ 基础兵 +1」下限规则（盾兵 2 费 → 3 费）。「忠勇」是 ADR-110 释放的 thorns cap 的首个使用者——与自动反击（2 点）分开结算，合计回敬 3；技能伤害不带 killerRef，故不触发。",
      "skills": [
        {
          "id": "zhong_yong",
          "name": "忠勇",
          "kind": "aura",
          "text": "受到普通攻击并实际受伤后，对攻击者额外造成 1 点伤害（与自动反击分开结算；技能伤害不触发）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhong_yong_status",
              "stacks": 1,
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": "陈到自豫州随先主，名位常亚赵云，俱以忠勇称。所领白毦兵为帐下精锐，皆以白毦为饰。"
    },
    {
      "id": "shu_tengjiabing",
      "name": "藤甲兵",
      "faction": "shu",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 4,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；受到物理伤害 −1（最低 0）、火属性伤害 +1",
      "skills": [
        {
          "id": "teng_jia_wei",
          "name": "藤甲",
          "kind": "aura",
          "text": "受到物理或无属性伤害时该伤害 −1（最低 0）；受到火属性伤害时该伤害 +1。",
          "effects": [
            {
              "action": "apply_status",
              "status": "teng_jia",
              "stacks": 1,
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": "賨人板楯蛮以木板为盾，善山地步战；藤甲浸油晒干，刀枪不入、箭矢不透，渡江不沉，遇火即燃。"
    },
    {
      "id": "shu_danyangbing",
      "name": "丹阳兵",
      "faction": "shu",
      "type": "troop",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [],
      "memo": "亡语：己方其他步兵（含特种兵）永久 +1/+1",
      "skills": [
        {
          "id": "pao_ze",
          "name": "袍泽",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "阵亡时，己方其他【步兵】单位永久获得 +1 攻 / +1 生命。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "troop",
                  "troopKind": "infantry",
                  "exclude_source": true
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "丹阳郡山险，民多果劲。陶谦、刘备皆以丹阳兵为家底；刘备典徐州牧，陶谦拨兵四千助之。"
    },
    {
      "id": "shu_hubujun",
      "name": "虎步军",
      "faction": "shu",
      "type": "troop",
      "cost": 2,
      "attack": 3,
      "health": 3,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；战吼对指定敌方人物造成 1 点水攻并施加「水困」（永久，阶段 1 起步）",
      "note": "史实据《水经注》卷十八引《诸葛亮表》「臣遣**虎步监**孟琰据武功水东，司马懿因水长攻琰营，臣作**竹桥**，**越水射之**，桥成驰去」。旧技能「攻击并消灭敌方单位后获得一次额外攻击」**无任何史实依据**，已改为「越水」。水困的完整规则见 GDD 10 §3.2.2（ADR-116；ADR-132 重做为\"阶段成倍行动税 + 永久\"）。",
      "skills": [
        {
          "id": "yue_shui",
          "name": "越水",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对指定**敌方人物或主将**造成 1 点水攻伤害，并使其获得「水困」（永久；层数＝阶段，行动时受 2^(阶段-1) 点水伤，不行动则不受水伤）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "shui_kun",
              "stacks": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "damage",
              "value": 1,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": "所领虎步，据武功水东；越水而射，桥成驰去。"
    },
    {
      "id": "shu_xiliangtieqi",
      "name": "西凉铁骑",
      "faction": "shu",
      "type": "troop",
      "cost": 4,
      "attack": 4,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；攻击主将时攻击力 +2",
      "note": "与群雄版「西凉铁骑」是**同一支凉州铁骑的两个时期**（ADR-116）：马腾「州郡募发民中有勇力者…署为军从事，典领部众」 是**创业期**（打武将/谋臣 +2），马超「领腾部曲」后「将兵径到城下」带兵入蜀是**突击期**（直取主将 +2）。 旧技能「放箭」是**弓兵「神射」**的具体化（见 keywords.yaml 神射条目），放在骑兵身上张冠李戴，且与马超毫无关系，已替换。",
      "skills": [
        {
          "id": "shu_xiliang_tuzhen",
          "name": "突阵",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击主将时，攻击力 +2。",
          "effects": [
            {
              "action": "attack_bonus",
              "value": 2,
              "condition": {
                "attack_target": {
                  "type": "lord"
                }
              }
            }
          ]
        }
      ],
      "flavor": "超负其多力，阴欲突前捉曹公；马儿不死，吾无葬地。"
    },
    {
      "id": "shu_wudangfeijun",
      "name": "无当飞军",
      "faction": "shu",
      "type": "troop",
      "cost": 3,
      "attack": 0,
      "health": 2,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "毒箭弓兵；战技「毒箭」指定一名敌方单位，造成 1 点毒攻并施加中毒",
      "note": "ADR-117 定稿。① **3 费**：弓兵特种兵费用下限 = 基础弓兵 1 费 + 1（ADR-112）。 ② **去掉「剧毒」关键词**：剧毒定义是「该单位造成伤害并实际命中后直接消灭目标」， 而它的伤害来源包含**战技**——于是旧版「放箭」（随机 1 点）实际是 「每回合随机秒掉一个敌方单位」，是全池最强的解场，且全库只此一张在用、零测试。 设计者裁定 **剧毒另立卡牌**，无当飞军只做普通毒。 ③ **毒箭取代放箭**：随机 → **指定目标**（毒要能配合，随机目标无法规划； 且 12-randomness 规则一禁止「单次随机决定胜负」，斩杀类效果更不能随机）。 ④ **毒＝第三条轴，惩罚「拖」**：ADR-132 重做后，中毒在该方**回合结束**时 **永久降低 N 点生命上限**（N = 层数）、**不造成伤害**，层数叠加**不封顶**、**永久**。 它惩罚的是\"拖着不解\"——每过一个回合，这个单位的耐久就少一截，而且是**不可逆**的 （净化只能止住，已削的不恢复）。旧口径（回合末 N 点毒伤、封顶 3、2 回合到期） 已作废；当时推翻设计者原案（二次增长 1/3/6/10/15）的理由仍然成立： 同一次「续毒」不能既加时又加伤（见 GDD 10 §3.2.3）。 ⑤ **毒攻是新伤害属性 `poison`**：不吃藤甲的 `reduce_physical`（藤甲挡箭不挡毒）。 ⑥ **效果顺序刻意「先挂状态、再造成伤害」**（ADR-116 教训）：反过来的话， 若这 1 点伤害打死了目标，第二个效果的目标不在合法池里，`resolveTargets` 会退回兜底把中毒挂到**另一个**敌人身上。 ⑦ **毒不含主公**（`filter` 不写 `include_lord`）：30 血主将 + 递增 DoT 会变成 无需攻击的自动胜利线（GDD 12 规则一）。 ⑧ ⚠️ **「毒箭」零史料依据**：《三国志》《裴注》《华阳国志》中，南中兵、叟兵、 青羌兵**没有一条**用毒（详见 `docs/research/shu-wudang-feijun.md` §1③）。 唯一沾边的原文是《后汉书·南蛮西南夷列传》越巂邛都夷「多釀毒酒，欲先以勞軍， 因襲擊尙」——但那是公元 43 年夷帅长贵诈降刘尚的一次性诡计，不是编制、不是弓箭。 本条属**游戏化设计（D 级）**，不作史料引用。\n",
      "skills": [
        {
          "id": "wudang_jin_gong",
          "name": "飞军",
          "kind": "aura",
          "effects": [
            {
              "action": "apply_status",
              "status": "jin_gong",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "shu_wudang_dujian",
          "name": "毒箭",
          "kind": "active",
          "frequency": "once_per_turn",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          },
          "text": "战技：指定一名敌方单位，施加中毒（永久；该方回合结束时**永久降低 N 点生命上限**，N = 层数，层数不封顶；本身不造成伤害），并造成 1 点毒攻伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "poison"
            }
          ]
        }
      ],
      "flavor": "南中勁卒，號爲飛軍；所當無前。"
    },
    {
      "id": "token_wunan_right",
      "name": "无难右部",
      "faction": "wu",
      "type": "token",
      "cost": 0,
      "attack": 2,
      "health": 3,
      "troopKind": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "无难兵召唤的右部，攻血取召唤者当前数值",
      "note": "ADR-117 衍生物基础数值对应无难兵，实际召唤由copy_source_stats覆盖，不进卡组。"
    },
    {
      "id": "token_jiefan_right",
      "name": "解烦右部",
      "faction": "wu",
      "type": "token",
      "cost": 0,
      "attack": 2,
      "health": 1,
      "troopKind": "infantry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "解烦兵召唤的右部，攻血取召唤者当前数值",
      "note": "ADR-117 衍生物基础数值对应解烦兵，实际召唤由copy_source_stats覆盖，不进卡组。"
    },
    {
      "id": "wu_wunan_bing",
      "name": "无难兵",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；出场召唤同攻血的无难右部",
      "note": "2026-10-05 最终设计修订为3费1/3，召唤同攻血的无难右部。",
      "skills": [
        {
          "id": "fu_nan",
          "name": "赴难",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "出场时，召唤攻击力和生命值与自身相同、拥有架盾的无难右部。",
          "effects": [
            {
              "action": "summon",
              "unit": "token_wunan_right",
              "count": 1,
              "copy_source_stats": true
            }
          ]
        }
      ],
      "flavor": "所向无难，故曰无难。孙琳谋反，帝帅宿卫虎骑、左右无难一时围之。"
    },
    {
      "id": "wu_jiefanbing",
      "name": "解烦兵",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 3,
      "health": 3,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "战技对指定敌方单位造成1点水攻伤害",
      "skills": [
        {
          "id": "jiefan_shui",
          "name": "解烦",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对指定敌方单位造成1点水攻伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "water"
            }
          ]
        }
      ]
    },
    {
      "id": "wu_gansiying",
      "name": "敢死营",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [],
      "memo": "上场获得披坚；亡语随机对敌方角色造成2点水攻",
      "skills": [
        {
          "id": "gansi_pi_jian",
          "name": "披坚",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "上场时获得披坚（免疫一次伤害）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "gansi",
          "name": "敢死",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：随机对一个敌方角色（含主公）造成2点水攻伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_chexiahushi",
      "name": "车下虎士",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 3,
      "health": 4,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；亡语使主公本回合获得2点攻击力和2点护甲",
      "skills": [
        {
          "id": "chexia_huzhu",
          "name": "护主",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：使己方主公本回合获得2点攻击力和2点护甲。",
          "effects": [
            {
              "action": "modify",
              "attack": 2,
              "duration": "this_turn",
              "target": {
                "side": "ally",
                "lord": true
              }
            },
            {
              "action": "gain_armor",
              "value": 2,
              "duration": "this_turn"
            }
          ]
        }
      ]
    },
    {
      "id": "wu_dongwujingqi",
      "name": "东吴精骑",
      "faction": "wu",
      "type": "troop",
      "cost": 5,
      "attack": 4,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong",
        "ji_li"
      ],
      "memo": "激励后获得额外攻击",
      "skills": [
        {
          "id": "dongwu_jili",
          "name": "激励",
          "kind": "trigger",
          "trigger": "on_lord_skill_used",
          "text": "己方使用主公技后，获得一次额外攻击。",
          "effects": [
            {
              "action": "extra_attack",
              "target": {
                "source": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_louchuanjun",
      "name": "楼船军",
      "faction": "wu",
      "type": "machine",
      "cost": 3,
      "attack": 2,
      "health": 4,
      "keywords": [
        "zhan_ji"
      ],
      "memo": "战技对目标和敌方主公各造成2点水攻伤害",
      "skills": [
        {
          "id": "louchuan_shui",
          "name": "楼船",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对一个非主公敌方单位造成2点水攻伤害，再对敌方主公造成2点水攻伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character",
              "include_lord": false
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "damage_type": "water"
            },
            {
              "action": "damage",
              "value": 2,
              "damage_type": "water",
              "target": {
                "side": "enemy",
                "lord": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_mengchongdoujian",
      "name": "蒙冲斗舰",
      "faction": "wu",
      "type": "machine",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "keywords": [
        "zhan_ji"
      ],
      "memo": "战技造成1点水攻；亡语对击杀者造成2点火攻并施加灼烧，对其左右相邻单位各造成1点火攻并施加灼烧",
      "skills": [
        {
          "id": "mengchong_huo",
          "name": "蒙冲",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对指定敌方单位造成1点水攻伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character",
              "include_lord": false
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "water"
            }
          ]
        },
        {
          "id": "mengchong_fen_jian",
          "name": "焚舰",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：对击杀者造成2点火攻伤害并施加灼烧，再对其左右相邻单位各造成1点火攻伤害并施加灼烧。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "damage_type": "fire",
              "target": {
                "event": "killer"
              }
            },
            {
              "action": "damage",
              "value": 1,
              "damage_type": "fire",
              "target": {
                "side": "both",
                "filter": {
                  "type": "character",
                  "adjacent_to": "killer"
                },
                "count": "all"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_jiangdong_nushou",
      "name": "武射吏",
      "faction": "wu",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 4,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "己方有武将时获得+1/+1且战技伤害+1；战技对指定敌方单位造成2点伤害",
      "skills": [
        {
          "id": "wu_she_tongpao",
          "name": "协射",
          "kind": "aura",
          "text": "当己方场上存在武将牌时，获得+1/+1，并且战技额外造成1点伤害。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "type": "general"
                  },
                  "count": "all"
                }
              }
            }
          ]
        },
        {
          "id": "wu_she",
          "name": "武射",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对指定敌方单位造成2点伤害；己方场上存在武将牌时，改为造成3点伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character",
              "include_lord": false
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "general"
                    }
                  },
                  "op": "==",
                  "value": 0
                }
              }
            },
            {
              "action": "damage",
              "value": 3,
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "type": "general"
                  },
                  "count": "all"
                }
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_jinfanjun",
      "name": "锦帆军",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "劫营：随机对敌方单位造成1点伤害，目标非武将时有50%概率夺取敌方牌顶",
      "skills": [
        {
          "id": "jinfan_jieying",
          "name": "劫营",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对随机敌方单位造成1点伤害；若目标为非武将牌，则有50%概率抽取对方卡组最上方的一张牌，加入己方手牌。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": false
                },
                "count": 1,
                "mode": "random"
              }
            },
            {
              "action": "steal_card",
              "from_deck": "top",
              "count": 1,
              "chance": 0.5,
              "condition": {
                "last_damage_target_not_type": "general"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "wu_shuijun_gongshou",
      "name": "水军弓手",
      "faction": "wu",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "水攻伤害+1；战技对指定敌方单位造成2点水攻伤害",
      "skills": [
        {
          "id": "shuijun_jin_gong",
          "name": "水攻强化",
          "kind": "aura",
          "text": "己方水攻伤害+1。",
          "effects": [
            {
              "action": "apply_status",
              "status": "shui_gong_bonus",
              "stacks": 1,
              "status_source": "self",
              "target": {
                "source": true
              }
            }
          ]
        },
        {
          "id": "shuijun_shui_gong",
          "name": "水攻",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技：对指定敌方单位造成2点水攻伤害。",
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "choose"
          },
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "damage_type": "water"
            }
          ]
        }
      ]
    },
    {
      "id": "qun_xianzhenying",
      "name": "陷阵营",
      "faction": "qun",
      "type": "troop",
      "cost": 4,
      "attack": 2,
      "health": 5,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [],
      "memo": "战吼二选一：架盾 2/7，或先攻 4/5；打盾墙 +2",
      "note": "**史实（A/B 级，原文均已回取）**：《英雄记》（裴注引《三国志·魏书七·吕布传》， 《御定駢字類編》卷 166 亦引，三处互见）「順為人**清白有威嚴**，**不飲酒，不受饋遺**。 **所將七百餘兵，號為千人**，**鎧甲鬬具皆精練齊整**，**每所攻擊無不破者**，名為「**陷陣營**」…… 布知其忠，然不能用」；《三国志·魏书七》正文「建安三年……**遣高順攻劉備於沛，破之**。 太祖**遣夏侯惇救備，為順所敗**」。→ 陷阵营是吕布军最精锐的**攻坚**部队。 **技能口径（ADR-127，设计者提案：抉择）**：**4 费 2/5，战吼二选一** —— **① 架盾：获得「架盾」，生命 +2（2/7）**；**② 先攻：获得「先攻」，攻击 +2（4/5）**。 **两个方向都有史料**：① ←「**鎧甲鬬具皆精練齊整**」（甲械精良）；② ←「**每所攻擊無不破者**」「陷陣」（攻坚）。 主题是\"**同一支部队，你选这一局当甲还是当锋**\"。 **数值**：基础 2/5 ＝ 7 点（明显低于 4 费基准 9），**两个分支各补 3 点**回来 —— 2/7 架盾 ＝ 9＋1 ＝ 10，4/5 先攻 ＝ 9＋1 ＝ 10，**两支对称、均为 +1**。 另外**两个分支都保留**「**无不破者**：攻击带「架盾」的单位 +2」（ADR-126 的身份不随部署形态改变 —— 抉择换的是\"怎么用它\"，不是\"它是谁\"）；含此条后两支各 ≈ **+1.5**。 **为什么用 modes 而不是别的手段**：本作已有「抉择」机制（魏·曹彰「猛袭」，ADR-071）， 引擎按 `PLAY_CARD.modeIndex` 选分支、UI 会先弹选择；授予关键词走 `apply_status: jia_dun_status / xian_gong_status`（已有 6 处在用的成熟写法）。 **⚠️ 随本轮修掉的引擎缺口（ADR-127）**：① 升变路径原先把 on_play 跑成 `sk.effects`， **没有走 `effectsOf(sk, modeIndex)`** → 抉择战吼在升变时会**整个不执行**； ② 先攻的\"返还一次普攻\"检查原本在**派发战吼之前**，而本卡的先攻是战吼当场授予的 → 「升变选先攻」拿不到返还（同一个形态，打出来的能再打一次、升变来的不能）。 两处都已修，并写了测试钉死。 **⚠️ 与魏「霹雳车」同轴**：霹雳车战技对架盾 +1（0/3 不能攻击的炮台）；本卡普攻对架盾 +2（能打的 2/5）。 ⚠️ **并不绕过架盾**：嘲讽依然生效，本卡只是\"打盾墙更疼\"（团队开门牌）。",
      "skills": [
        {
          "id": "xian_zhen_ying",
          "name": "陷阵",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：选择一项 —— ① 架盾：获得「架盾」，生命 +2（2/7）；② 先攻：获得「先攻」，攻击 +2（4/5）。",
          "modes": [
            {
              "name": "架盾（生命 +2 → 2/7）",
              "effects": [
                {
                  "action": "apply_status",
                  "status": "jia_dun_status",
                  "target": {
                    "source": true
                  }
                },
                {
                  "action": "modify",
                  "health": 2,
                  "target": {
                    "source": true
                  }
                }
              ]
            },
            {
              "name": "先攻（攻击 +2 → 4/5）",
              "effects": [
                {
                  "action": "apply_status",
                  "status": "xian_gong_status",
                  "target": {
                    "source": true
                  }
                },
                {
                  "action": "modify",
                  "attack": 2,
                  "target": {
                    "source": true
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "wu_bu_po_zhe",
          "name": "无不破者",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击带有「架盾」的单位时，攻击力 +2。",
          "effects": [
            {
              "action": "attack_bonus",
              "value": 2,
              "condition": {
                "attack_target": {
                  "keyword": "jia_dun"
                }
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_fudunshi",
      "name": "伏楯士",
      "faction": "qun",
      "type": "troop",
      "cost": 3,
      "attack": 1,
      "health": 6,
      "troopKind": "shield",
      "upgradeFrom": "shield",
      "keywords": [
        "jia_dun"
      ],
      "memo": "1/6 架盾；每个完整回合 +1 攻，涨到 6 攻停止",
      "note": "**命名（ADR-125，替换「先登盾兵」）**：设计者指出「先登」二字会让玩家**误以为这张卡有先攻**， 故改用「**伏楯士**」—— 直接取自麹义先登军成名动作《英雄记》「義兵皆**伏楯下不動**」（「楯」即盾）， 纯防御向、无先攻联想，且仍在那支部队的故事里（考证见 ADR-124 ①-⑤ 与 `docs/research/qun-xiandengsishi.md` §6）。 ⚠️ **为什么不叫「板楯蠻」**：《太平御览》卷 785 四夷部确有「板楯蠻」条、字面即木盾，但它是**巴郡賨人**， 属蜀或中立阵营 —— 群雄一旦改用它就没有盾兵了（ADR-124 ⑤ 的候选排查）。 ⚠️ **为什么不叫「大戟士」**（袁绍）：底本中**未找到原文**，疑似后世/游戏产物。 **技能「俱起」**：取自同句「乃**同時俱起**揚塵大叫，**直前衝突**」—— 蹲盾（伏楯）蓄势，起身（俱起）破阵。 即**卡名＝姿态，技能＝兑现**；「先登」不再是卡名，而是它长成 6/6 之后的结局。 **数值（ADR-125，设计者定）**：**3 费 1/6 架盾**。1＋6＋架盾≈1 ＝ 8 点，仅比 3 费基准（7）高 1 点 —— 而且 **1/6 是 3 费盾兵线里最小的身材**（同档有 3/5、2/6、1/7），成长就是它换来的东西。 **成长时点＝己方回合结束时**（`turn_end`）—— 设计者给的时序原话： 「当前放下的伏楯士是 1/6 盾兵，然后**他结束时变为 2 攻**，然后敌人行动。敌人行动完成后轮到我来行， **此时还是 2 攻**，但是**结束后变为 3 攻**」。即：**每经过一个完整回合（我只在自己的回合结束涨一次）** +1 攻，所以**敌人上来时面对的已经是涨过的数值**；到 6 攻停住。 ⚠️ 不要写成 `enemy_turn_end`（那会变成\"敌人先挨 1 攻、它才涨\"），与设计者给的时序不符。 上限 6 攻（1/6 → 6/6 对称），用 `attack_max` 过滤器实现（蜀「越骑·蓄锐」同款写法）： `attack_max: 5` ＝\"攻击力 ≤5 时才加\"，加到 6 自然停住。 ⚠️ 与**陷阵营**（3 费 3/5 架盾 ＋ 每敌方回合结束 +1/+1、**无上限**）形状相同，必须分开： 成长机制归本卡（**有封顶**），**陷阵营应改成进攻向**（《英雄记》「順為人清白有威嚴……**每所攻擊無不破者**」， 下一次精修做）。",
      "skills": [
        {
          "id": "ju_qi",
          "name": "俱起",
          "kind": "trigger",
          "trigger": "turn_end",
          "text": "己方回合结束时，攻击力永久 +1（最多 6）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "source": true
              },
              "condition": {
                "all_of": [
                  {
                    "count": {
                      "selector": {
                        "source": true,
                        "filter": {
                          "attack_max": 5
                        }
                      },
                      "op": "==",
                      "value": 1
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_xiandengsishi",
      "name": "先登死士",
      "faction": "qun",
      "type": "troop",
      "cost": 3,
      "attack": 3,
      "health": 2,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；亡语对敌方主公造成2点伤害",
      "note": "「先登」＝率先陷阵。出处：《三国志·魏书八·公孙瓒传》「绍军广川，令将麴义先登与瓒战，生禽纲」； 最详为裴松之注引《英雄记》所记界桥之战：「绍令麹义以八百兵为先登，强弩千张夹承之，绍自以步兵数万结阵于后。 义久在凉州，晓习羌斗，兵皆骁锐。瓒见其兵少，便放骑欲陵蹈之。义兵皆伏楯下不动，未至数十步，乃同时俱起， 扬尘大叫，直前冲突，强弩雷发，所中必倒，临阵斩瓒所署冀州刺史严纲，甲首千馀级。」 —— 八百死士破公孙瓒三万步骑与白马义从，阵斩其冀州刺史严纲，故技能取「冲进去、死了也要换掉主帅」： **先攻 ＋ 亡语打敌方主公**。⚠️「先登死士」四字**不是史书原文**（史书只作「先登」，即率先登城／率先陷阵）， 是「先登」＋「死士」的合成词，与「连弩士」「毒箭」同类处理（ADR-116/117）。 数值口径（ADR-119）：本作「先攻」＝**入场当回合即可攻击**（疾行），不是先发制人的伤害结算顺序； 而「4/3＋先攻」在本项目已被定价为 4 费（蜀西凉铁骑，ADR-118），所以给先攻必须付费 —— 由「2 费 4/3 ＋ 亡语随机对敌方角色 2 点」改为「**3 费 3/2 先攻 ＋ 亡语对敌方主公 2 点**」： 属性 3/2＝5 点（3 费基准 7）＋ 先攻 1 点，再由必定打主公的亡语补回缺口，落在 3 费曲线上。 本卡同名可放 3 张（`type: troop`，ADR-065），故数值必须贴线、不能按\"独一无二的人物卡\"给强度。 ⚠️ 实机要盯的一点：升变进先攻形态会**返还一次普攻**（ADR-100）—— 1 费步兵打满 2 点伤害 → 免费升变（回满血）→ 当回合再打一次 2 点，单回合最多 3 点（步兵 1 ＋ 新形态 2）。",
      "skills": [
        {
          "id": "xiandeng_si",
          "name": "死士",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：对敌方主公造成 2 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "lord": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_huangjinlishi",
      "name": "黄巾力士",
      "faction": "qun",
      "type": "troop",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "troopKind": "infantry",
      "upgradeFrom": "infantry",
      "tags": [
        "huang_jin",
        "huang_jin_zhong"
      ],
      "keywords": [],
      "memo": "亡语召唤两个黄巾兵；自己也随统领永久变大",
      "note": "⚠️ 卡名考证：「黄巾力士」**不是三国兵种，是道教神将**。维基文库全文检索「黃巾力士」共 94 条命中， 全部出自神魔小说与道法场景（《封神演义》9 处、《水浒传》第 53 回、《三宝太监西洋记》《醒世恒言》《东度记》 《八仙得道》《红楼梦补》《西湖二集》《薛丁山征西》等），标准像是《水浒传》第 53 回： 「仿佛有一丈身材，縱橫有千斤氣力……**設在壇前護法，每來世上降魔**」；常见用法为「黃巾力士何在！」 「黃巾力士領法旨」。《三国志》《后汉书》里**没有这支部队**。保留卡名的理由：它是张角太平道体系里 唯一有群众认知度的「黄巾＋力士」形象，与张角（五雷轰顶）、张宝／张梁（黄天当立）同属一套宗教叙事。 效果（ADR-121，设计者定稿）：**3 费 2/3，亡语召唤两个黄巾兵**；自己与黄巾兵都会**按己方统领数永久 +1/+1** （力士靠本条 `on_play` 在落地时快照，黄巾兵靠它们自己的「黄巾众」在召唤时快照； 统领上场时还会给场上所有黄巾众再 +1/+1）。**成长是单向棘轮：统领阵亡不会让任何单位缩回去。** 数值（设计者三轮收敛，最终裁定）：2 费 2/2（8 点 vs 基准 5 = +3）→ 2 费 2/1（7 点 = +2）→ **3 费 2/3** ＝ 5 ＋ 4 ＝ **9 点 vs 3 费基准 7（+2）**。设计者取舍：**要一个能站住、能交换的身体，宁可亡语晚一点**； 备选 3 费 2/2 落在 +1（与张梁同价同量）。⚠️ 因此上限也随之上移：力士自身最高 2/3＋3 ＝ **5/6**。 ⚠️ 另注意：升变是**免费**的（ADR-099），所以改动印费只影响\"从手牌直接打出\"这一条路， 升变路线的收益完全由身体与那两个兵决定。 史实依据：《后汉书·卷七十一·皇甫嵩传》「遂置三十六方……**各立渠帥**」「**旬日之閒，天下向應，京師震動**」 —— 黄巾是有统领的庞大人群，统领越齐声势越大。",
      "skills": [
        {
          "id": "li_shi",
          "name": "力士",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：随机位置召唤两个黄巾兵。",
          "effects": [
            {
              "action": "summon",
              "unit": "token_huangjin_bing",
              "count": 2,
              "position": "random"
            }
          ]
        },
        {
          "id": "huang_tian",
          "name": "黄天",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "上场时，每有一名己方黄巾统领（张角、张宝、张梁）永久 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack_from": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_tongling"
                }
              },
              "health_from": {
                "side": "ally",
                "filter": {
                  "tag": "huang_jin_tongling"
                }
              },
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "tag": "huang_jin_tongling"
                  }
                }
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_baimayicong",
      "name": "白马义从",
      "faction": "qun",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [],
      "memo": "战吼一轮齐射：指定目标 2 点，左右相邻各 1 点",
      "note": "**史料**（原文均已回取）：《英雄记》（裴注引《三国志·魏书八》，互见《太平御览》卷 279、卷 897） 「瓚每與虜戰，常乘白馬，**追不虛發，數獲戎捷**，虜相告云：『**當避白馬**。』因虜所忌， **簡其白馬數千匹，選騎射之士，號為「白馬義從」**」；又「公孫瓚每聞邊警，輒厲色作氣如赴仇。 嘗乘白馬，又白馬數十匹，**選騎射之士，號為「白馬義從」，以為左右翼**，胡甚畏之，相告曰： 『**當避白馬長史**。』」《太平御覽》卷 279：「瓚征烏桓，**常與善騎射之士數十人，皆乘白馬， 以為左右翼，自號「白馬義從」**，烏桓更相告語：『避白馬長史。』乃**畫作瓚形，馳射之**， 中者咸稱萬歲。」《三国志·魏书八》界桥：「瓚步兵三萬餘人為方陳，騎為兩翼，左右各五千餘騎， **白馬義從為中堅**，亦分作兩校，**左射右，右射左**，旌旗鎧甲，光照天地。」 → **结论：白马义从是明确的「骑射」部队**（原文即「選騎射之士」「善騎射之士」）， 且有两个独有特征：**部署为左右两翼**、界桥之战**交叉对射（左射右，右射左）**。 **技能口径（ADR-123）**：**战吼「夹射」——对指定敌方人物 2 点伤害，并对其左右相邻的敌方单位 各造成 1 点伤害**（取「左射右，右射左」之意；引擎内建 `adjacent_to: chosen` 直接表达\"左右相邻\"）。 **⚠️ 不给先攻 —— 设计者裁定**：① 数值上战吼(≈3.5)＋先攻(1)＋3/3 身材(6) ≈ 10.5 点， 已超 4 费基准（9）1.5 点；② 群雄原有**两张 4 费 3/3 先攻骑兵**（白马义从／西凉铁骑）几乎同形， 去掉先攻正好把两张卡拆开：**西凉铁骑＝纯冲锋，白马义从＝到场先放一轮箭**； ③ 主题上\"骑兵里的弓兵、又不完全是骑兵上的弓兵\"正用**没有先攻**表达（把机动性换成那一轮齐射）。 ⚠️ 与魏「霹雳车」的「霹雳」（战技：目标及左右相邻各 2 点，**每回合可重复**）**目标形状相同**， 但角色不同：霹雳车是 0/3 **不能普通攻击**的固定炮台，本卡是 3/3 能打的**一次性齐射＋站场**。 ⚠️ 主目标**不含主公**（\"左右相邻\"是棋盘概念，主公不在 8 列里）。",
      "skills": [
        {
          "id": "baima_jia_she",
          "name": "夹射",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对指定敌方人物造成 2 点伤害，并对其左右相邻的敌方单位各造成 1 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": false
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": false,
                  "adjacent_to": "chosen"
                },
                "count": "all"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_xiliangtieqi",
      "name": "西凉铁骑",
      "faction": "qun",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；打武将或谋臣时 +2 攻（马腾的凉州军团）",
      "note": "**名称出处**：「西凉铁骑」这个名号成名于西晋 —— 洛阳童谣「**凉州大马，横行天下**」说的是 308–309 年 凉州刺史张轨遣北宫纯两次解洛阳之围（《晋书·张轨传》），比三国晚近百年；「西凉铁骑」是该童谣的别名。 但**凉州兵精悍在三国当时就有明确记载**（虞诩「关西出将」「凉州习兵壮勇，实过余州」；曹操「关西兵精悍」）。 本卡对应**马腾**这一支（「典领部众」创立者），蜀版对应**马超**继承后带进蜀汉的同一支军团 （《典略》「以超为偏将军……**领腾部曲**」）—— 两张卡是同一支凉州军团的两个时期（ADR-116）。 **马腾其人**（《典略》裴注引）：「騰字壽成，**馬援後也**……因留隴西，**與羌錯居**。家貧無妻，遂**娶羌女**， 生騰。騰少貧無產業，常從彰山中斫材木，負販詣城市，以自供給。**騰為人長八尺餘，身體洪大，面鼻雄異， 而性賢厚，人多敬之。**」《后汉书·董卓列传》：「馬騰……亦擁兵反叛，又漢陽王國，自號「合眾將軍」， 皆**與韓遂合**。**共推王國為主，悉令領其眾**。」《三国志·蜀书六》：「騰為**征西將軍**，遣屯郿…… **後騰與韓遂不和，求還京畿。於是徵為衛尉**，以超為偏將軍，封都亭侯，**領騰部曲**。」 **技能口径（ADR-122，设计者裁定：保留不改）**：保留「突骑：打武将或谋臣 +2」。 与蜀版「突阵：打主将 +2」构成对称 —— **群雄破敌将（马腾据关中、与诸将合众，先解敌方人物）， 蜀版直取主帅（马超「陰欲突前捉曹公」）**。评估过但未采用的三个方向（留档，见 ADR-122）： ①「合众：每有一名骑兵 +1 攻」；②「羌骑：上场召唤一个羌骑衍生物」；③ 与「西凉」标签联动 （**与马岱「西凉子弟」同轴，已排除**）。⚠️ 本卡同名可放 3 张，故「全体加属性」类光环一律不可用（ADR-120/121）。",
      "skills": [
        {
          "id": "xiliang_tuji",
          "name": "突骑",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击武将或谋臣时，攻击力+2。",
          "effects": [
            {
              "action": "attack_bonus",
              "value": 2,
              "condition": {
                "any_of": [
                  {
                    "attack_target": {
                      "type": "general"
                    }
                  },
                  {
                    "attack_target": {
                      "type": "strategist"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_wuhuantuqi",
      "name": "乌桓突骑",
      "faction": "qun",
      "type": "troop",
      "cost": 4,
      "attack": 4,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；战吼对随机敌人 2 点射击伤害，结算两次",
      "note": "**史实（A/B 级，原文均已回取）**：《后汉书·卷七十三·刘虞公孙瓒陶谦列传》 「後車騎將軍張溫討賊邊章等，**發幽州烏桓三千突騎**，而**牢稟逋懸，皆叛還本國**」—— **「乌桓突骑」是当时对这支劲骑的固定称呼**；且**群雄池里的公孙瓒就是督它的人** （《三国志·魏书八·公孙瓒传》「光和中，涼州賊起，**發幽州突騎三千人**，假瓚都督行事傳，使將之」）。 《后汉书·乌桓传》（《通志·四夷传》引）「**烏桓者本東胡也**。漢初，匈奴冒頓滅其國， 餘類保**烏桓山**，因以為號焉。**俗善騎射**，弋獵禽獸為事」。 → 特点：① **北方游牧民族的精锐骑兵**（东胡余部、「俗善騎射」）；② **「突骑」＝冲击骑兵**（突＝冲）； ③ **为汉/公孙瓒/袁绍/曹操所用的客军**（「牢稟逋懸，皆叛還本國」——粮饷接不上就叛走，本质是为钱而战）。 **技能口径（ADR-128，设计者提案）**：**4 费 4/3 骑兵 ＋ 先攻 ＋ 战吼「突骑」：对随机敌人造成 2 点射击伤害，结算两次** （最多 4 点、随机分配，可命中主公 —— ADR-087「随机伤害默认含主公」）。 **定位：攻高、血少、灵活** —— 它到场就能「齐射＋冲锋」两件事都做（战技与普通攻击本就不互斥）， 是弓马合一的游牧打法；随机分配对应游牧骑射的骚扰性（对比白马义从的**精准**夹射：一巧一野）。 **兵种修正**：原为 `archer`（ADR-118 留下的「弓兵的突骑形态」），但**「突骑」本就是骑兵**， 故改回 `cavalry`（upgradeFrom 同步改骑兵）。⚠️ 副作用：**群雄弓兵线**的升级目标只剩先登弩手一张。 **数值**：4/3 ＝ 7 点（4 费基准 9，**−1**）＋先攻（≈1）＝ 8；战吼（固定 4 点、随机分配，≈2）→ 合计 ≈ **10 ＝ +1** ✓ 贴线。 ⚠️ **与蜀·西凉铁骑同身材**（4 费 4/3 先攻）：区别在「突骑」是**随机齐射**（上限 4、可打主公）、 「突阵」是**打主将 +2**（稳定）；两者一随机一稳定。 ⚠️ ⚠️ 若实机觉得爆发偏高（到场最多 4 ＋ 攻击 4 ＝ 8 点节奏），最小的收敛是战吼改「随机两个各 1 点」或身体收 3/3。",
      "skills": [
        {
          "id": "tu_qi",
          "name": "突骑",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对随机敌人造成 2 点射击伤害，结算两次（可命中主公）。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "count": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "random"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "qun_xiandengnushou",
      "name": "先登弩手",
      "faction": "qun",
      "type": "troop",
      "cost": 2,
      "attack": 1,
      "health": 2,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "每回合指定 2 点（可打主公）的强弩",
      "note": "**史实（B 级，原文已回取）**：《袁绍传》（《太平御览》引）「紹討公孫瓚，**先令麴義領精兵八百，強弩千張， 以為前登**」；《英雄记》界桥「義兵皆伏楯下不動……乃同時俱起揚塵大叫，**直前衝突，強弩雷發，所中必倒**」。 → 先登营 ＝ 精兵八百（先登死士）＋ **强弩千张（本卡）**，而它对面冲过来的正是**白马义从**的骑兵。 **技能口径（ADR-129，设计者两轮定稿）**：**2 费 1/2 弓兵，战技「强弩」：每回合一次， 对指定敌方人物或主将造成 2 点伤害。** **设计者给的基线（本轮的关键判断）**：「基础弓兵是每个自己回合 1 点**随机**乱射，特种兵若只能靠战吼打一次， 反而更弱」—— 故本卡做成**同一门手艺加倍**（1 → 2），且**每回合可持续**。 **与蜀·连弩士的区别（同为 2 费 1/2、同为每回合 2 点）**：连弩士是 **1 点 ×2、指定、不含主公**（精准清场、 可分开打两个目标、遇「披坚」只浪费 1 点）；本卡是 **2 点一次、指定、可打主公**（集中、能收人头）—— **一分散一集中，一场面一脸**。 ⚠️ **若改成\"不含主公\"会被连弩士完全压住**（同费用同身材、它更灵活且遇披坚损失更小），故**保留含主公** （且基础弓兵「放箭」本就 `include_lord: true`，特种不能打脸反而是降级）。 ⚠️ **ADR-112 下限合规**：规则要求\"特种兵 ≥ 对应基础兵 + 1\"；弓兵基础已改为 **1 费** （ADR-131），故本卡下限为 **≥2 费**，本卡 **2 费**天然合规 —— ADR-129 时的\"显式豁免\"已随基础兵降费失效 （先例蜀·连弩士、中立白马义从同样自然合规 —— 它们的豁免也是相对旧 2 费基础弓兵的）。 ⚠️ **旧效果已移除**（原为「战技：消灭一个**随机**的敌方【先攻】部队，再 1 点随机伤害」）： 「**消灭**」是全池仅此一处的秒杀，**随机秒杀**接近 `12-randomness.md` 规则一禁止的\"单次随机决定胜负\"； 而设计者提过的\"5 费、消灭随机先攻**人物**\"变体反而更强 —— 因为**带先攻的人物恰是马超 5/5、甘宁 5/5、 张辽 5/4、凌统 4/5** 这一档大哥。改为**指定 + 纯伤害**后，既保住\"抢先射杀冲锋敌骑\"的意图，也去掉方差。",
      "skills": [
        {
          "id": "qiang_nu",
          "name": "强弩",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "每回合一次：对指定敌方人物或主将造成 2 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "tactic_muniuliuma",
      "name": "木牛流马",
      "faction": "shu",
      "type": "tactic",
      "cost": 3,
      "memo": "抽 2 张牌",
      "note": "原为「蜀国特种兵·骑兵 0/6」——**归类完全错误**，已改为战法卡（ADR-116）。 史料：《三国志·蜀书五·诸葛亮传》「**九年**，亮复出祁山，**以木牛运**…粮尽退军」、 「**十二年春**，亮悉大众由斜谷出，**以流马运**」——它是**运粮的器械**； 陈寿把它定性为诸葛亮的发明：「亮性长于巧思，**损益连弩，木牛流马，皆出其意**」； 裴松之注引《亮集》甚至载有完整的《作木牛流马法》机械尺寸（「方腹曲头，一脚四足… 载一岁粮，日行二十里，而人不大劳」）。与「元戎弩」同属陈寿所谓「工械技巧，物究其极」， **不是兵种**。 效果取「运粮 = 补给资源」：北伐的痛点原文写得很清楚——「亮每患**粮不继**，使己志不申」， 故设计为**抽 2 张牌**。旧描述的「治疗友军」无任何依据（它运的是粮草，不是救人）。 **3 费**：全库「抽 2 张」的标准档就是 3 费（屯田 / 瞒天过海 / 马谡），2 费抽 2 张低于曲线。",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "抽 2 张牌。"
        }
      ],
      "effects": [
        {
          "action": "draw",
          "value": 2
        }
      ],
      "flavor": "木牛之奇，则非般模；载一岁粮，日行二十里，而人不大劳。"
    },
    {
      "id": "shu_yueqi",
      "name": "越骑",
      "faction": "shu",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 3,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；未受伤则每回合 +1 攻（最多 +3）",
      "note": "史实（A 级）：《三国志·蜀书十一·杨洪传》正文「复为蜀郡太守、忠节将军，**后为越骑校尉**，领郡如故」； 杨戏《季汉辅臣赞》赞杨季休「**越骑惟忠，厉志自祗，职于内外，念公忘私**」（《三国志·蜀书十五》）。 「越骑」是**北军五校**之一（屯骑/越骑/步兵/长水/射声），校尉统一个**营** —— 故它既是官名也是**部队名**， 与「车骑」这种纯位号不同（这是选它而非「车骑」的真正理由）。 技能名「**蓄锐**」取成语「养精蓄锐」——保持完好、锐气自增。 （赞辞原词是「厉志**自祗**」，但「祗」字生僻且与「祇/衹」形近易混，故取义不取字。） 设计取舍（ADR-116）：初版是\"不行动攻击就 +1 攻\"，但 3 回合不打 = 少打 9 点伤害， 换 +3 攻要**再打 3 回合才回本**（6 回合内都是亏的），且\"什么都不做\"体验消极、对手无从应对。 改为\"**未受伤**才成长\"后：① 它可以正常攻击，零机会成本；② **对手打它一下就能打断成长**， 从独角戏变成双方博弈；③ 决策从\"打不打\"变成\"**怎么保住它**\"。 上限 +3（最终 6/3）由新增的 `attack_max` 过滤器实现。",
      "gender": "male",
      "skills": [
        {
          "id": "shu_yueqi_xurui",
          "name": "蓄锐",
          "kind": "trigger",
          "trigger": "turn_end",
          "text": "己方回合结束时，若自身未受伤，攻击力永久 +1（最多 +3）。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "source": true
              },
              "condition": {
                "all_of": [
                  {
                    "count": {
                      "selector": {
                        "source": true,
                        "filter": {
                          "damaged": false
                        }
                      },
                      "op": "==",
                      "value": 1
                    }
                  },
                  {
                    "count": {
                      "selector": {
                        "source": true,
                        "filter": {
                          "attack_max": 5
                        }
                      },
                      "op": "==",
                      "value": 1
                    }
                  }
                ]
              }
            }
          ]
        }
      ],
      "flavor": "越骑惟忠，厉志自祗，职于内外，念公忘私。"
    },
    {
      "id": "shu_xiangbing",
      "name": "象兵",
      "faction": "shu",
      "type": "troop",
      "cost": 4,
      "attack": 3,
      "health": 6,
      "troopKind": "cavalry",
      "upgradeFrom": "cavalry",
      "keywords": [],
      "tags": [
        "man_zu"
      ],
      "memo": "南蛮象兵（ADR-150：挂 man_zu，才吃孟获「蛮王」与木鹿「象兵统领」）； 无先攻；攻击时 50% 震慑目标",
      "note": "**阵营（ADR-130，设计者定）**：归**蜀**。理由：① 象的产地与故事都在**南方**（蜀的南中、吴的交州）—— A 级《三国志·魏书·邓哀王冲传》「時**孫權曾致巨象**，太祖欲知其斤重」（曹冲称象）是三国最著名的象， 但它**是南方送来的贡物**；《后汉书·南蛮西南夷列传》记哀牢、掸国等**南方诸夷出犀、象**； ② **池中先例**：同为演义南蛮出处的**藤甲兵**（乌戈国兀突骨）已在蜀； ③ 结构上群雄骑兵线已满（白马义从／西凉铁骑／乌桓突骑三张 4 费骑兵），且群雄题材是北方与中原军阀， **没有一头象的归属**。 ⚠️ **「象兵」作为部队**：⚠️ **未取到原文** —— 三国史料里查不到明确的\"象兵/象阵\"部队记载， 象在史料中多以**出产/贡物**出现；\"象兵\"主要出自演义与后世游戏（与南蛮绑定）。按考证纪律**不编造出处**， 归蜀的依据是**南中题材 ＋ 藤甲兵先例**。 **技能口径（ADR-130，设计者定）**：**4 费 3/6 骑兵（无先攻）＋「象阵」：攻击时，50% 概率使该目标获得「震慑」**。 · **无先攻**：象不是冲过去的，是碾过去的（设计者定）；3/6 ＝ 9 点 ＝ **正好 4 费基准**。 · **震慑**：全池此前只有张角用它（五雷轰顶每次雷击 50% 震慑），**没有任何部队会施加它** → 全新的部队轴，\n  与蜀的越骑（成长）、西凉铁骑（斩首）、藤甲兵（减伤）四轴分开。\n· **50% 概率**：与张角同款写法（`chance: 0.5`），避免\"每回合稳定点控\"过强。 ⚠️ **时点口径**：DSL 的 `on_attack` **非击杀效果在伤害结算前执行**（只有 `condition.event === 'killed'` 的才延到伤害之后，见 `effects.ts:763-766`），所以卡面写「**攻击时**」而不是\"造成伤害后\" —— 效果等价（打谁震慑谁），但文案必须与实现一致。 ⚠️ **本轮为它新增的引擎能力（ADR-130）**：选择器 `attack_target: true` —— 此前 `ctx.attackTarget` **只能被条件读取**（`condition.attack_target`，西凉铁骑「突骑」在用）， **没有\"以攻击目标为作用对象\"的选择器**（选择器原只有 `source`／`event: killer|victim`／`chosen`／`lord` 等； `event: victim` 在攻击语境里只在**目标阵亡**时有效，而死了就不必震慑了）。",
      "skills": [
        {
          "id": "xiang_zhen",
          "name": "象阵",
          "kind": "trigger",
          "trigger": "on_attack",
          "text": "攻击时，50% 概率使该目标获得「震慑」（下回合无法攻击）。",
          "effects": [
            {
              "action": "apply_status",
              "status": "zhen_she",
              "duration": 1,
              "chance": 0.5,
              "target": {
                "attack_target": true
              }
            }
          ]
        }
      ]
    },
    {
      "id": "shu_liannushi",
      "name": "连弩士",
      "faction": "shu",
      "type": "troop",
      "cost": 2,
      "attack": 1,
      "health": 2,
      "troopKind": "archer",
      "upgradeFrom": "archer",
      "keywords": [
        "zhan_ji"
      ],
      "memo": "战技「连弩」：对指定敌方人物造成 1 点伤害，触发两次",
      "note": "兵器**连弩**是史料词：《三国志·蜀书五·诸葛亮传》裴松之注引《魏氏春秋》 「又**损益连弩**，谓之元戎，以铁为矢，矢长八寸，**一弩十矢俱发**」。 「一弩十矢俱发」= 一次发射十支 —— 技能做成**两次 1 点**即取此意（多段而非单次大伤害）。 ✅ **「连弩士」是史料里的真实编制**（此前一版 note 误写为\"零依据\"，那是只查了《三国志》所致）： 《华阳国志·卷一·巴志》**涪陵郡**：「汉时赤甲军常取其民，**蜀丞相亮亦发其劲卒三千人为连弩士**， 遂移家汉中。」——**诸葛亮**把涪陵劲卒三千人编为连弩士，这是蜀汉真实存在的一支弩兵（B 级）。 ⚠️ 但要知道两点：① 他们是**巴郡南鄙涪陵的獽、蜑之民**，与「无当飞军」的南中叟／青羌 **不是同一批人**，史书也没有任何一条把「连弩士」和「无当／飞军」联起来；② 这支部队后随 移家汉中。本卡只取「连弩士」本身，不碰无当飞军。 ⚠️ **不要写成\"以连弩射杀张郃\"**：张郃死于木门道是硬史实（卷17正文「飞矢中郃右膝，薨」； 裴注引《魏略》「蜀军乘高布伏，**弓弩乱发**」），但原文只用通名「飞矢」「弓弩乱发」， **从未出现「元戎」或「连弩」**，射手姓名正史无载。 旧卡「元戎弩兵」已删除 —— 那个名字是 **KOEI《三国志10》的兵种名**，正史零依据； 且其技能「每回合免费对全体敌方 1 点」严重超模（同效果的「万箭齐发」是 0 费一次性）。",
      "skills": [
        {
          "id": "shu_liannu_qifa",
          "name": "连弩",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "每回合一次：对指定敌方人物造成 1 点伤害，触发两次。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            },
            {
              "action": "damage",
              "value": 1,
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ]
        }
      ],
      "flavor": "损益连弩，谓之元戎，以铁为矢，矢长八寸，一弩十矢俱发。"
    },
    {
      "id": "tactic_yuanrongnushe",
      "name": "元戎弩射",
      "faction": "shu",
      "type": "tactic",
      "cost": 1,
      "memo": "3 支箭随机打敌方人物或主将各 1 点；己方场上有连弩士则多 1 支",
      "note": "「元戎」是**弩的名字**，不是兵种 —— 《魏氏春秋》（裴注引）「损益连弩，**谓之元戎**， 以铁为矢，矢长八寸，**一弩十矢俱发**」；《三国志》全书「元戎」仅 3 次，另两次 （卷33「董督元戎」、卷38「整饬元戎」）都是泛指大军。词源为《诗经·小雅·六月》 「**元戎十乘，以先启行**」（本义大兵车），诸葛亮是**用典**命名。 故名正言顺地把它做成**战法卡**（同「木牛流马」的处理），而不是兵种。 与连弩士联动：发射的箭矢数量 +1。 ⚠️ 按 **ADR-087**「范围/随机伤害默认含主公」，本卡的随机箭**会打到敌方主将** （卡面文案据此写明「人物或主将」）。这是有意为之 —— 否则敌方场上只剩主将时箭会全废。",
      "gender": "unknown",
      "keywords": [],
      "skills": [
        {
          "id": "",
          "name": "",
          "text": "发出 3 支箭，随机对敌方**人物或主将**各造成 1 点伤害；若己方场上有连弩士，额外多发射 1 支。"
        }
      ],
      "effects": [
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "random"
          }
        },
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "random"
          }
        },
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "random"
          }
        },
        {
          "action": "damage",
          "value": 1,
          "target": {
            "side": "enemy",
            "filter": {
              "type": "character"
            },
            "count": 1,
            "mode": "random"
          },
          "condition": {
            "exists": {
              "side": "self",
              "filter": {
                "card_id": "shu_liannushi"
              }
            }
          }
        }
      ],
      "flavor": "元戎十乘，以先启行。"
    },
    {
      "id": "shu_wangping",
      "name": "王平",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "战吼增益无当飞军；阵亡再送一个",
      "note": "4 费 3/4 = 7 点，比 4 费基准（9）低 2 点，换两条「无当飞军」联动。 手牌那半边靠 ADR-141 的手牌数值修正（**战吼**而非光环：光环的手牌修正会带 auraId，牌一打出就消失）。\n",
      "skills": [
        {
          "id": "fei_jun_tong_ling",
          "name": "飞军统率",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方场上与手牌里的无当飞军永久 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "card_id": "shu_wudangfeijun"
                },
                "count": "all"
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "type": "character",
                  "card_id": "shu_wudangfeijun"
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "id": "fei_jun_yi_zhi",
          "name": "飞军遗志",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：召唤一个无当飞军。",
          "effects": [
            {
              "action": "summon",
              "unit": "shu_wudangfeijun",
              "count": 1,
              "position": "random"
            }
          ]
        }
      ],
      "flavor": "鳴鼓自守，賊不敢逼。"
    },
    {
      "id": "shu_wutugu",
      "name": "兀突骨",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 6,
      "gender": "male",
      "tags": [
        "man_zu"
      ],
      "keywords": [],
      "memo": "战吼强化藤甲兵：物理 −2 且不再怕火",
      "note": "5 费 3/6 = 9 点，比基准（11）低 2 点，换全队藤甲强化。 「藤甲强化」不是加层数（那会把\"怕火\"一起放大），而是 ADR-142 的**档位覆盖**： reduce_physical 覆盖为 2、vulnerable_fire 覆盖为 0。仅在该单位确实带藤甲时生效。\n",
      "skills": [
        {
          "id": "teng_jia_tong_ling",
          "name": "藤甲统率",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方场上带「藤甲」的角色与手牌里的藤甲兵获得藤甲强化 —— 受到非火属性伤害 −2（原 −1），且不再额外受到火属性伤害。",
          "effects": [
            {
              "action": "override_status",
              "status": "teng_jia",
              "caps": {
                "reduce_physical": 2,
                "vulnerable_fire": 0
              },
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "has_status": "teng_jia"
                },
                "count": "all"
              }
            },
            {
              "action": "override_status",
              "status": "teng_jia",
              "caps": {
                "reduce_physical": 2,
                "vulnerable_fire": 0
              },
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "type": "character",
                  "card_id": "shu_tengjiabing"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "烏戈國主，藤甲三萬，刀箭不入。"
    },
    {
      "id": "shu_menghuo",
      "name": "孟获",
      "faction": "shu",
      "type": "general",
      "cost": 8,
      "attack": 4,
      "health": 7,
      "gender": "male",
      "tags": [
        "man_zu"
      ],
      "keywords": [],
      "memo": "战吼增益南蛮同胞；阵亡后收回手牌，最多 6 次",
      "note": "8 费 4/7 = 11 点，比基准（17）低 6 点 —— 价值全在「七擒」：每次阵亡都能再上场一次， 最多 7 次（第 7 次改由对手获得），累计价值远超一次性的高属性。 ⚠️ 收回惩罚（−1 费 / −1 血上限）是**永久**的，跟着这张手牌走（ADR-141 的 HandMod.health）。 ⚠️ 「蛮王」是**战吼**不是光环：手牌加成必须不带 auraId，否则牌一打出就没了。\n",
      "skills": [
        {
          "id": "man_wang",
          "name": "蛮王",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方场上与手牌里**除孟获以外**的南蛮人物永久 +2/+2。",
          "effects": [
            {
              "action": "modify",
              "attack": 2,
              "health": 2,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character",
                  "tag": "man_zu",
                  "exclude_source": true
                },
                "count": "all"
              }
            },
            {
              "action": "modify",
              "attack": 2,
              "health": 2,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "type": "character",
                  "tag": "man_zu",
                  "exclude_source": true
                },
                "count": "all"
              }
            }
          ]
        },
        {
          "id": "qi_qin",
          "name": "七擒",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：将孟获收回手牌（最多 6 次）；每次收回使其 −1 费、−1 生命上限；第 7 次改由对手获得。",
          "effects": [
            {
              "action": "self_to_hand",
              "count": 6,
              "value": -1,
              "health": -1,
              "overflow": "enemy"
            }
          ]
        }
      ],
      "flavor": "七縱七禽，南人不復反矣。"
    },
    {
      "id": "shu_duosi",
      "name": "朵思大王",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 5,
      "gender": "male",
      "tags": [
        "man_zu"
      ],
      "keywords": [],
      "memo": "战吼：敌方全体中毒",
      "note": "4 费 2/5 = 7 点，比基准（9）低 2 点，换一条全体毒攻。 「中毒」由 ADR-138 的全局规则自动挂上（毒攻伤害 → 中毒 1 层），卡面无需显式 apply_status， 写了反而会变成每次 2 层。\n",
      "skills": [
        {
          "id": "du_quan",
          "name": "毒泉",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：对所有敌方人物造成 1 点毒攻伤害，并使其中毒（该方回合结束时永久降低 1 点生命上限，可叠加）。",
          "effects": [
            {
              "action": "damage",
              "value": 1,
              "damage_type": "poison",
              "target": {
                "side": "enemy",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "禿龍洞四眼毒泉，飲之立斃。"
    },
    {
      "id": "shu_luoxian",
      "name": "罗宪",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 6,
      "gender": "male",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；单独在场时 +2/+2",
      "note": "4 费 2/6 = 8 点，架盾记 −1 → 7 点，比基准（9）低 2 点，换「孤城」的 +2/+2。 架盾**只能**写成卡面基础关键词（引擎没有授予关键词的动作，全池 20 张都这么写）。 「孤城」用光环 + count 条件：己方场上人物数 == 1（只有他自己）。\n",
      "skills": [
        {
          "id": "gu_cheng",
          "name": "孤城",
          "kind": "aura",
          "text": "己方场上只有罗宪自己时，他获得 +2/+2。",
          "effects": [
            {
              "action": "modify",
              "attack": 2,
              "health": 2,
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "op": "==",
                  "value": 1
                }
              }
            }
          ]
        }
      ],
      "flavor": "畢命於此矣。"
    },
    {
      "id": "shu_fuqian",
      "name": "傅佥",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "亡语：消灭击杀者",
      "note": "4 费 4/4 = 8 点，比基准（9）低 1 点，换一条\"同归于尽\"的亡语（对高攻单位是硬解）。",
      "skills": [
        {
          "id": "si_jie",
          "name": "死节",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：消灭击杀者。",
          "effects": [
            {
              "action": "destroy",
              "target": {
                "event": "killer"
              }
            }
          ]
        }
      ],
      "flavor": "奕世忠義。"
    },
    {
      "id": "shu_jiangwan",
      "name": "蒋琬",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "每己方回合开始，主公统率上限 +1",
      "note": "4 费 1/4 = 5 点，比基准（9）低 4 点 —— 谋臣属性低是常态，价值在长期的统率 ramp。 ⚠️ 必须用 `permanent: true`（ADR-139）：回合开始会把 cur 回满，只加 cur 的写法收益恒为 0。\n",
      "skills": [
        {
          "id": "zu_shi",
          "name": "足食",
          "kind": "trigger",
          "trigger": "turn_start",
          "text": "己方回合开始时，主公统率上限 +1（本局永久，封顶 10）。",
          "effects": [
            {
              "action": "gain_command",
              "value": 1,
              "permanent": true
            }
          ]
        }
      ],
      "flavor": "足食足兵，以相供給。"
    },
    {
      "id": "shu_feiyi",
      "name": "费祎",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "回合结束己方全体回 1 血",
      "note": "4 费 1/4 = 5 点，比基准（9）低 4 点，换每回合一次的群体回复（拖延与续航）。只回**场上人物**，不含主公。",
      "skills": [
        {
          "id": "xi_bing",
          "name": "息兵",
          "kind": "trigger",
          "trigger": "turn_end",
          "text": "己方回合结束时，己方全体人物恢复 1 点生命。",
          "effects": [
            {
              "action": "heal",
              "value": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "休養生息，與民更始。"
    },
    {
      "id": "shu_dongyun",
      "name": "董允",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "主公技每回合可多用一次",
      "note": "3 费 1/4 = 5 点，比基准（7）低 2 点，换主公技次数 +1（「参谋」状态）。 `can_mou` 是引擎既有能力（caps: extra_lord_skill，作用域主公、永久），全池此前无人使用； 必须指定 `target: { side: self, lord: true }` —— 引擎读的是**主公**身上的状态。\n",
      "skills": [
        {
          "id": "zhi_jian",
          "name": "直谏",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方主公获得「参谋」—— 本局每回合主公技可多使用 1 次。",
          "effects": [
            {
              "action": "apply_status",
              "status": "can_mou",
              "stacks": 1,
              "target": {
                "side": "self",
                "lord": true
              }
            }
          ]
        }
      ],
      "flavor": "終允之世，皓位不過黃門丞。"
    },
    {
      "id": "shu_yanyan",
      "name": "严颜",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 6,
      "gender": "male",
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；亡语反噬击杀者 3 点",
      "note": "3 费 2/6 = 8 点，架盾记 −1 → 7 点，**正好等于 3 费基准（7）**，再送一条亡语。 亡语只在被**单位**击杀时有目标（取不到 killer 时空转），有天然折扣； 若实机偏强，先降反噬 3 → 2，不要动费用。\n",
      "skills": [
        {
          "id": "si_zhan",
          "name": "死战",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语「断头将军」：对击杀者造成 3 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "target": {
                "event": "killer"
              }
            }
          ]
        }
      ],
      "flavor": "但有斷頭將軍，無有降將軍也。"
    },
    {
      "id": "shu_yangyi",
      "name": "杨仪",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "gender": "male",
      "keywords": [],
      "memo": "战技：抽两张，选一张留手、另一张回牌库底",
      "note": "4 费 1/4 = 5 点，比基准（9）低 4 点，换取每回合一次的过牌筛选。 `from_drawn: 2` 把候选锁死在**刚抽到的那两张**（ADR-144）—— 否则等于\"任意弃一张\"，比卡面写的强。选择通过 `pendingHandChoice` 挂起，由玩家点手牌决定。\n",
      "skills": [
        {
          "id": "chou_du_liang_gu",
          "name": "筹度粮谷",
          "kind": "active",
          "frequency": "once_per_turn",
          "text": "战技（每回合一次）：抽两张牌，选一张留在手里，另一张放回牌库底部。",
          "effects": [
            {
              "action": "draw",
              "value": 2
            },
            {
              "action": "send_hand_to_deck",
              "to": "deck_bottom",
              "mode": "choose",
              "from_drawn": 2
            }
          ]
        }
      ],
      "flavor": "籌度糧穀，不稽思慮，斯須便了。"
    },
    {
      "id": "shu_zhugezhan",
      "name": "诸葛瞻",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 2,
      "health": 5,
      "memo": "与子同赴绵竹；父子同场互相 +1/+1",
      "note": "4 费 2/5 = 7 点（基准 9，−2），差额全在技能上。 「同赴」（ADR-149 新动作 deploy_from_hand）：打出时若**诸葛尚在手牌**则他免费一同上场， 否则从牌库把诸葛尚**置入你的手牌** —— 两张卡因此**必然凑齐**，不靠运气； 两张同手时等于「4 费打出 3/6 ＋ 4/5」（同心光环互相 +1/+1，总 18 点属性），这是有意的爆发点， 代价是必须抽到两张（约 30% 的对局中期能凑齐）。 两张都不在牌库/手牌时两个效果各自空转，不会卡流程。 若实机偏强：先把「同心」从 +1/+1 降到 +1/+0，再考虑压本体，不要动费用。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tong_fu",
          "name": "同赴",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：若诸葛尚在你手牌中，他同时上场；否则从牌库中将诸葛尚置入你的手牌。",
          "effects": [
            {
              "action": "deploy_from_hand",
              "count": 1,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "card_id": "shu_zhugeshang"
                }
              }
            },
            {
              "action": "discover",
              "count": 3,
              "target": {
                "filter": {
                  "card_id": "shu_zhugeshang"
                }
              }
            }
          ]
        },
        {
          "id": "tong_xin",
          "name": "同心",
          "kind": "aura",
          "text": "光环：诸葛尚在场上时，诸葛瞻 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "card_id": "shu_zhugeshang"
                  }
                }
              }
            }
          ]
        },
        {
          "id": "mian_zhu",
          "name": "绵竹",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：己方场上与手牌里的人物永久 +1 攻。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "type": "character"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "吾父子荷国重恩，不早斩黄皓，使败国殄民，用生何为！"
    },
    {
      "id": "shu_zhugeshang",
      "name": "诸葛尚",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 3,
      "health": 4,
      "memo": "与父同赴；父子同场互相 +1/+1",
      "note": "4 费 3/4 = 7 点（基准 9，−2），与诸葛瞻同一套「同赴」+「同心」。 父子两卡互为对照：瞻是 2/5 偏守（亡语给全场与手牌 +1 攻），尚是 3/4 偏攻（亡语反噬击杀者 3 点）—— 两张单出都是\"合格的 4 费但偏弱\"，凑齐才形成真正的威胁。 史实：与父同日同地殉于绵竹（《华阳国志·卷七》），遗言「父子荷国重恩……用生何为」。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tong_fu",
          "name": "同赴",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：若诸葛瞻在你手牌中，他同时上场；否则从牌库中将诸葛瞻置入你的手牌。",
          "effects": [
            {
              "action": "deploy_from_hand",
              "count": 1,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "card_id": "shu_zhugezhan"
                }
              }
            },
            {
              "action": "discover",
              "count": 3,
              "target": {
                "filter": {
                  "card_id": "shu_zhugezhan"
                }
              }
            }
          ]
        },
        {
          "id": "tong_xin",
          "name": "同心",
          "kind": "aura",
          "text": "光环：诸葛瞻在场上时，诸葛尚 +1/+1。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "card_id": "shu_zhugezhan"
                  }
                }
              }
            }
          ]
        },
        {
          "id": "si_jie",
          "name": "死节",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：对击杀者造成 3 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 3,
              "target": {
                "event": "killer"
              }
            }
          ]
        }
      ],
      "flavor": "乃驱马赴魏军而死。"
    },
    {
      "id": "shu_liaohua",
      "name": "廖化",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 4,
      "memo": "先攻；落单时化身真正的先锋",
      "note": "3 费 2/4 = 6 点（基准 7，−1）+ 先攻（≈1），差额换「落单时 4/5」。 与罗宪「孤城」**同触发器、相反 payoff**：罗宪 4 费 2/6 架盾是\"自守\"，廖化是\"抢节奏\"—— 同一触发器撑起一个「孤军」小主题。 先攻必须是**卡面关键词**（不要用光环临时授予，否则条件不满足时会忽有忽无，玩家读不出来）。 ⚠️ 卡面与 note **不得**把「蜀中无大将，廖化作先锋」标成正史或演义：2026-10-10 维基文库 insource 全站复核，「蜀中無大將」只命中《掃迷帚/24》《如此京華/08》（均为清末小说）， 演义 0 命中（演义仅 120 回）。可引的正史：右车骑将军、假节、领并州刺史（遥领）、 景耀五年谏姜维出狄道「兵不戢，必自焚」。\n",
      "gender": "male",
      "keywords": [
        "xian_gong"
      ],
      "skills": [
        {
          "id": "du_xian_feng",
          "name": "独先锋",
          "kind": "aura",
          "text": "光环：己方场上没有其他人物时，廖化 +2 攻 +1 生命。",
          "effects": [
            {
              "action": "modify",
              "attack": 2,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "count": {
                  "selector": {
                    "side": "ally",
                    "filter": {
                      "type": "character"
                    }
                  },
                  "op": "==",
                  "value": 1
                }
              }
            }
          ]
        }
      ],
      "flavor": "兵不戢，必自焚。"
    },
    {
      "id": "shu_muludawang",
      "name": "木鹿大王",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 5,
      "tags": [
        "man_zu"
      ],
      "memo": "象兵统领：把他的象兵养成必中",
      "note": "5 费 3/5 = 8 点（基准 11，−3），差额是\"体系核心\"的价钱（对照兀突骨 5 费 3/6）。 「象兵统领」加强的是**象兵**（不是木鹿自己）：场上与手牌的象兵 +1/+1， 且其〈象阵〉的震慑概率由 50% 抬到 **100%**。 概率用 **ADR-150 的无状态规则覆盖**（`override_rule` + `proc_chance`）—— 与兀突骨 「藤甲统率」同一套规则覆盖层，只是这次覆盖的档位不挂在任何状态上。 配套：`shu_xiangbing` 已补 `man_zu` 标签（否则它既不算南蛮、也吃不到孟获「蛮王」）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "xiang_bing_tong_ling",
          "name": "象兵统领",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方场上与手牌里的象兵 +1/+1，且「象阵」的震慑概率从 50% 提升到 100%。",
          "effects": [
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "card_id": "shu_xiangbing"
                },
                "count": "all"
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "card_id": "shu_xiangbing"
                },
                "count": "all"
              }
            },
            {
              "action": "override_rule",
              "caps": {
                "proc_chance": 1
              },
              "target": {
                "side": "ally",
                "filter": {
                  "card_id": "shu_xiangbing"
                },
                "count": "all"
              }
            },
            {
              "action": "override_rule",
              "caps": {
                "proc_chance": 1
              },
              "target": {
                "side": "ally",
                "zone": "hand",
                "filter": {
                  "card_id": "shu_xiangbing"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "驱兽呼风，象阵踏营。"
    },
    {
      "id": "shu_dailaidongzhu",
      "name": "带来洞主",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 2,
      "health": 3,
      "tags": [
        "man_zu"
      ],
      "memo": "引援：落地带两个蛮族步兵",
      "note": "3 费 2/3 = 5 点（基准 7，−2）+ 召唤 2 个 1/1（2 点）＝合计 7 点，正好贴线。 （原案 2 个 1/2 会到 9 点，超 2 点，故衍生物取 1/1；要 1/2 就把本体提到 4 费。） 召唤走现成的 `summon` + `count`（实测：自带 1 + 召唤 2 = 场上 3）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "yin_yuan",
          "name": "引援",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：召唤两个 1/1「蛮族步兵」。",
          "effects": [
            {
              "action": "summon",
              "unit": "token_manzu_bubing",
              "count": 2
            }
          ]
        }
      ],
      "flavor": "引木鹿、兀突骨来助。"
    },
    {
      "id": "shu_jinhuansanjie",
      "name": "金环三结",
      "faction": "shu",
      "type": "general",
      "cost": 3,
      "attack": 3,
      "health": 2,
      "tags": [
        "man_zu"
      ],
      "keywords": [
        "xian_gong"
      ],
      "memo": "先攻；亡语反噬击杀者 2 点",
      "note": "3 费 3/2 = 5 点（基准 7，−2）+ 先攻（≈1）+ 亡语（≈1.5）≈ 7.5 点，贴线。 ⚠️ 不用 4/2：那会到 8.5 点，超 1.5；而且先攻 3 攻已能白吃 3 血以下的 2–3 费件。 史实：演义人物（孟获手下第一洞元帅，被赵云一枪刺死）—— 卡面**不要**写赵云。\n",
      "gender": "male",
      "skills": [
        {
          "id": "fen_tu",
          "name": "奋突",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：对击杀者造成 2 点伤害。",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "event": "killer"
              }
            }
          ]
        }
      ],
      "flavor": "第一洞元帅。"
    },
    {
      "id": "shu_wuyi",
      "name": "吴懿",
      "faction": "shu",
      "type": "general",
      "cost": 4,
      "attack": 4,
      "health": 4,
      "memo": "主公披坚；与魏延同场一起成长",
      "note": "4 费 4/4 = 8 点（基准 9，−1），差额换\"主公一次性免伤 + 魏延联动\"。 披坚（`sheng_dun_status`）给**主公**是合法的：`mutate.ts` 的主公受伤路径会专门查 `immune_damage` 护盾（实测：主公拿到状态且真能挡一次伤害）。 ⚠️ 指向自己要用 `{source: true}`；写 `{side: 'self'}` 是\"整方\"的意思，实测会把魏延加两次。 史实：正史作「吴壹」，东州系，刘备定蜀后\"处之显任\"；建兴八年与魏延西入羌中， 大破魏将郭淮、费瑶于阳溪；官至车骑将军、汉中都督（《三国志·卷45》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "he_zhong",
          "name": "合众",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方主公获得「披坚」；若场上有魏延，魏延与吴懿各 +1/+1。",
          "effects": [
            {
              "action": "apply_status",
              "status": "sheng_dun_status",
              "target": {
                "side": "ally",
                "lord": true
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "side": "ally",
                "filter": {
                  "card_id": "shu_weiyan"
                },
                "count": "all"
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "card_id": "shu_weiyan"
                  }
                }
              }
            },
            {
              "action": "modify",
              "attack": 1,
              "health": 1,
              "target": {
                "source": true
              },
              "condition": {
                "exists": {
                  "side": "ally",
                  "filter": {
                    "card_id": "shu_weiyan"
                  }
                }
              }
            }
          ]
        }
      ],
      "flavor": "与魏延西入羌中，大破郭淮。"
    },
    {
      "id": "shu_qiaozhou",
      "name": "谯周",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "罢兵：双方武将攻击 −1（含己方）",
      "note": "3 费 1/3 = 4 点（基准 7，−3），差额是\"全场武将 −1 攻\"的持续压制。 **双刃是设计的一部分**：它压对手也压自己，与蜀国的铺场武将流天然冲突、与谋臣/效果伤害流契合 —— 这正是《仇国论》\"反对用兵\"的机制表达。 实测：光环遍历**双方**，己方 3 → 2、敌方 3 → 2（只压**武将**，不含谋臣/兵种/主公，谯周自己不吃）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ba_bing",
          "name": "罢兵",
          "kind": "aura",
          "text": "光环：双方所有武将攻击 −1。",
          "effects": [
            {
              "action": "modify",
              "attack": -1,
              "target": {
                "side": "both",
                "filter": {
                  "type": "general"
                },
                "count": "all"
              }
            }
          ]
        }
      ],
      "flavor": "周虽不与政，以儒行见礼。"
    },
    {
      "id": "shu_liuyin",
      "name": "柳隐",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 7,
      "keywords": [
        "jia_dun"
      ],
      "memo": "架盾；两条命的黄金围守将",
      "note": "5 费 3/7 = 10 点，架盾记 −1 → 9 点（基准 11，−2），换\"两条命\"。 与孟获「七擒」/严颜同轴但更硬：**架盾 + 免死**两道墙叠在一起，是蜀国最肉的一张； 代价是 3 攻打不动人，纯粹拖时间。 史实：字休然（189–268），蜀郡成都人；汉中诸围守将，**黄金围**之守魏军攻之不克； 「临阵勇决」；蜀亡后司马昭\"深喜柳隐之忠心\"；《华阳国志》赞\"西河烈烈，秉义居贞\"； **演义完全未登场**（纯正史人物）。\n",
      "gender": "male",
      "skills": [
        {
          "id": "jian_bi",
          "name": "坚壁",
          "kind": "trigger",
          "trigger": "on_lethal",
          "frequency": "once",
          "text": "第一次受到致命伤害时，以 1 点生命存活。",
          "effects": [
            {
              "action": "survive",
              "target": {
                "source": true
              }
            }
          ]
        }
      ],
      "flavor": "西河烈烈，秉义居贞。"
    },
    {
      "id": "shu_mizhu",
      "name": "糜竺",
      "faction": "shu",
      "type": "strategist",
      "cost": 2,
      "attack": 0,
      "health": 3,
      "memo": "助军：本回合统率 +2；亡语抽一张",
      "note": "2 费 0/3 = 3 点（基准 5，−2），换\"+2 统率 + 亡语抽牌\"。 0 攻是**故意的** —— 它不该参与战斗，只把你的回合买大一点。 史实：徐州富商\"祖世货殖，僮客万人，赀产钜亿\"；刘备落难时\"进妹于先主\"并送奴客二千、 金银货币以助军资；弟糜芳叛降后自缚请罪，刘备\"兄弟罪不相及\"（《三国志·卷38》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "zhu_jun",
          "name": "助军",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：己方本回合统率 +2。",
          "effects": [
            {
              "action": "gain_command",
              "value": 2
            }
          ]
        },
        {
          "id": "qing_jia",
          "name": "倾家",
          "kind": "trigger",
          "trigger": "on_death",
          "text": "亡语：己方抽 1 张牌。",
          "effects": [
            {
              "action": "draw",
              "value": 1
            }
          ]
        }
      ],
      "flavor": "奴客二千，金银货币以助军资。"
    },
    {
      "id": "shu_liuba",
      "name": "刘巴",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "直百：弃一张手牌，抽两张",
      "note": "3 费 1/3 = 4 点（基准 7，−3），换\"手牌净 +1 且能筛掉废牌\"。 `discard` 带 `mode: choose` → 玩家自己点要弃的那张（ADR-146 的手牌步骤机制）， 所以是\"铸钱生利\"而不是\"随机烧牌\"。 史实：铸\"直百钱\"，\"数月之间府库充实\"；与诸葛亮、法正、李严、伊籍共造《蜀科》 （《三国志·卷39》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "zhi_bai",
          "name": "直百",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：弃一张手牌，然后抽 2 张牌。",
          "effects": [
            {
              "action": "discard",
              "count": 1,
              "mode": "choose",
              "target": {
                "side": "self",
                "zone": "hand"
              }
            },
            {
              "action": "draw",
              "value": 2
            }
          ]
        }
      ],
      "flavor": "数月之间，府库充实。"
    },
    {
      "id": "shu_dengzhi",
      "name": "邓芝",
      "faction": "shu",
      "type": "strategist",
      "cost": 4,
      "attack": 1,
      "health": 4,
      "memo": "唇齿：落后时抽两张",
      "note": "4 费 1/4 = 5 点（基准 9，−4），换\"稳定抽 1，主公落后时抽 2\"—— 越危险盟友越有用， 天然的抗雪崩设计。 刻意不走\"双方各抽\"：池中鲁肃「仗义疏财」已经占了\"互惠抽牌\"这个位置。 史实：出使东吴重修盟好，\"蜀有重险之固，吴有三江之阻，合此二长，共为唇齿\"； 孙权答\"和合二国，唯有邓芝\"（《三国志·卷45》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "chun_chi",
          "name": "唇齿",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：抽 1 张牌；若己方主公生命低于敌方主公，改为抽 2 张。",
          "effects": [
            {
              "action": "draw",
              "value": 1
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "lord_hp_vs_enemy": "<"
              }
            }
          ]
        }
      ],
      "flavor": "合此二长，共为唇齿。"
    },
    {
      "id": "shu_yiji",
      "name": "伊籍",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "机辩：拼点让对手两张手牌变贵",
      "note": "3 费 1/3 = 4 点（基准 7，−3），换\"五成概率干扰对手手牌 / 保底抽一张\"。 拼点＝掷骰，但不直接造成伤害或击杀，不构成\"单次随机决定胜负\"。 史实：两次出使东吴；孙权讥\"劳事无道之君\"，伊籍当即回\"一拜一起，未足为劳\"； 与诸葛亮、法正、刘巴、李严共造《蜀科》（《三国志·卷38》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "ji_bian",
          "name": "机辩",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：与敌方拼点；胜则敌方随机两张手牌统率 +1，败则己方抽 1 张牌。",
          "effects": [
            {
              "action": "clash",
              "clashMode": "roll",
              "target": {
                "side": "enemy"
              }
            },
            {
              "action": "cost_modifier",
              "value": 1,
              "target": {
                "side": "enemy",
                "zone": "hand",
                "count": 2,
                "mode": "random"
              },
              "condition": {
                "event": "clash_won"
              }
            },
            {
              "action": "draw",
              "value": 1,
              "condition": {
                "event": "clash_lost"
              }
            }
          ]
        }
      ],
      "flavor": "一拜一起，未足为劳。"
    },
    {
      "id": "shu_sunqian",
      "name": "孙乾",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 3,
      "memo": "通使：从牌库发现一张群雄牌",
      "note": "3 费 1/3 = 4 点（基准 7，−3），换\"从牌库三选一\"。**它有构筑前提**：卡组里得有群雄牌， 否则这是一张 3 费白板（`discover` 找不到候选时会安静跳过）。 这是**卡组构筑的钩子**，与\"外交家\"人设一致 —— 群雄卡本来就能进任何阵营卡组 （`deck.ts` 的 `PUBLIC_POOL = ['neutral','qun']`）。 实测：`discover {filter: {faction: 'qun'}}` 只返回群雄牌。 史实：刘备领徐州时辟为从事，此后与简雍、糜竺同为从事中郎，专职往来外交（《三国志·卷38》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "tong_shi",
          "name": "通使",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：从牌库中发现一张群雄牌。",
          "effects": [
            {
              "action": "discover",
              "count": 3,
              "target": {
                "filter": {
                  "faction": "qun"
                }
              }
            }
          ]
        }
      ],
      "flavor": "往来袁绍、刘表之间的外交通道。"
    },
    {
      "id": "shu_xianglang",
      "name": "向朗",
      "faction": "shu",
      "type": "strategist",
      "cost": 3,
      "attack": 1,
      "health": 4,
      "memo": "藏书：从牌库三选一",
      "note": "3 费 1/4 = 5 点（基准 7，−2），换\"任意牌三选一\"—— 文臣里最通用的一张。 与孙乾的区别：向朗**不挑阵营、更稳**；孙乾专挑群雄、更有主题。 史实：师从司马徽，与徐庶、庞统同门；蜀汉最大藏书家\"积聚篇卷，于时最多\"； 马谡败后因知情不举被免官，后\"开门接宾，诱纳后进\"（《三国志·卷41》裴注）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "cang_shu",
          "name": "藏书",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：从牌库中发现一张牌。",
          "effects": [
            {
              "action": "discover",
              "count": 3
            }
          ]
        }
      ],
      "flavor": "积聚篇卷，于时最多。"
    },
    {
      "id": "shu_liyan",
      "name": "李严",
      "faction": "shu",
      "type": "general",
      "cost": 5,
      "attack": 3,
      "health": 5,
      "memo": "督运：拼点赢了大把统率，输了自废",
      "note": "5 费 3/5 = 8 点（基准 11，−3），换\"五成概率 +6 统率 / 五成概率自废 −2/−2\"。 +6 统率约等于多打两张 3 费牌，是爆发回合的开关；而输的代价**落在自己身上**， 所以是\"赌徒武将\"而不是坑队友的陷阱卡。`gain_command` 不加 `permanent`（仅本回合，否则滚雪球）。 史实：与诸葛亮同受遗诏辅政；督运军粮\"运粮不继\"又\"军伪退\"谎报、反诬诸葛亮，被废为平民 （《三国志·卷40》）。\n",
      "gender": "male",
      "keywords": [],
      "skills": [
        {
          "id": "du_yun",
          "name": "督运",
          "kind": "trigger",
          "trigger": "on_play",
          "text": "战吼：与敌方拼点；胜则己方本回合统率 +6，败则李严永久 −2/−2。",
          "effects": [
            {
              "action": "clash",
              "clashMode": "roll",
              "target": {
                "side": "enemy"
              }
            },
            {
              "action": "gain_command",
              "value": 6,
              "condition": {
                "event": "clash_won"
              }
            },
            {
              "action": "modify",
              "attack": -2,
              "health": -2,
              "target": {
                "source": true
              },
              "condition": {
                "event": "clash_lost"
              }
            }
          ]
        }
      ],
      "flavor": "运粮不继，军伪退。"
    },
    {
      "id": "token_manzu_bubing",
      "name": "蛮族步兵",
      "faction": "neutral",
      "type": "token",
      "cost": 0,
      "attack": 1,
      "health": 1,
      "tags": [
        "man_zu"
      ],
      "memo": "南蛮系召唤的 1/1 衍生物",
      "gender": "male",
      "keywords": [],
      "skills": []
    }
  ],
  "heroes": [
    {
      "id": "shu_liubei",
      "name": "刘备",
      "faction": "shu",
      "type": "lord",
      "cost": 0,
      "hp": 30,
      "skills": [
        {
          "id": "ren_de",
          "name": "仁德",
          "kind": "active",
          "cost": 2,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "heal",
              "value": 2,
              "target": {
                "side": "both",
                "filter": {
                  "type": "character",
                  "include_lord": true
                },
                "count": 1,
                "mode": "choose"
              }
            }
          ],
          "text": "指定任意一名场上人物（**含双方主帅**）恢复 2 点生命，不超过其最大生命；敌我皆可。",
          "note": "设计者裁定（2026-09）：可指定**任何**人物，不局限于自己/己方——与手写稿 「每回合能对自己或任意将领恢复█点血量」的「任意」一致。仁者无敌，连敌人也救。"
        }
      ],
      "memo": "主公技：为任意一名场上人物恢复 2 点生命（敌我皆可）",
      "flavor": "惟贤惟德，能服于人。"
    },
    {
      "id": "wei_caocao",
      "name": "曹操",
      "faction": "wei",
      "type": "lord",
      "cost": 0,
      "hp": 30,
      "skills": [
        {
          "id": "jian_xiong",
          "name": "奸雄",
          "kind": "active",
          "cost": 2,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "damage",
              "value": 2,
              "target": {
                "side": "self",
                "lord": true
              }
            },
            {
              "action": "draw",
              "value": 1
            }
          ],
          "text": "对自己主将造成 2 点伤害，抽 1 张牌。",
          "note": "设计者裁定（2026-09）：自伤 2 点换 1 张牌，且**只能作用于曹操自身**。 与手写稿一致——原稿「选择指定敌方一人物」整行已被划掉； 技能名手写即为〈奸雄〉（早期翻译误记为「护驾」，护驾只是第一个模式的名字）。"
        }
      ],
      "memo": "主公技：自伤 2 换 1 张牌",
      "flavor": "宁教我负天下人，休教天下人负我。"
    },
    {
      "id": "wu_sunquan",
      "name": "孙权",
      "faction": "wu",
      "type": "lord",
      "cost": 0,
      "hp": 30,
      "skills": [
        {
          "id": "zuo_duan_dong_nan",
          "name": "坐断东南",
          "kind": "active",
          "cost": 2,
          "frequency": "once_per_turn",
          "effects": [
            {
              "action": "cycle_to_deck"
            }
          ],
          "text": "选择 1 张手牌放回牌组（**随机位置**），然后从牌组**随机抽** 1 张。",
          "note": "设计者裁定（2026-09）：置换 = 随机抽一张、手牌回卡组也是随机位置—— 所以它**不是导师牌**（不能定向找关键牌），只是把废牌洗回牌组换一张未知牌。 另一模式「弃 1 张再抽 1 张」与它的差别是：弃掉的牌进弃牌堆（永久失去）， 置换则回到牌组（还能再抽到）。**二选一的选择机制尚未实现**（需模式选择通道，见 Q-08-6）。"
        }
      ],
      "memo": "主公技：1 张手牌洗回牌组随机位置，再随机抽 1 张",
      "flavor": "生子当如孙仲谋。"
    }
  ],
  "statuses": [
    {
      "id": "zhen_fen",
      "name": "振奋",
      "kind": "buff",
      "numeric": true,
      "scope": "character",
      "timing": 13,
      "duration": "permanent",
      "memo": "攻击 +N"
    },
    {
      "id": "ji_jiu",
      "name": "急救",
      "kind": "buff",
      "numeric": true,
      "scope": "character",
      "timing": 3,
      "duration": "permanent",
      "memo": "回合开始恢复 N 点生命"
    },
    {
      "id": "jia_dun_status",
      "name": "架盾",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "conditional",
      "memo": "敌方必须先攻击它"
    },
    {
      "id": "xian_gong_status",
      "name": "先攻",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 12,
      "duration": "permanent",
      "memo": "先结算伤害"
    },
    {
      "id": "qi_xi_status",
      "name": "奇袭",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "until_consumed",
      "memo": "不能被指定为目标"
    },
    {
      "id": "sheng_dun_status",
      "name": "披坚",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 10,
      "duration": "until_consumed",
      "memo": "披坚：免疫一次伤害（原「圣盾」；ADR-103 起不再是公开关键词，触发后消耗）"
    },
    {
      "id": "hu_jia",
      "name": "护甲",
      "kind": "buff",
      "numeric": true,
      "scope": "lord",
      "timing": 11,
      "duration": "permanent",
      "memo": "吸收伤害，永久保留"
    },
    {
      "id": "zhen_she",
      "name": "震慑",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 8,
      "duration": "turns",
      "memo": "不能普通攻击，也不能使用主动技"
    },
    {
      "id": "hun_luan",
      "name": "混乱",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "turns",
      "memo": "普攻与主动技的目标在合法目标中随机"
    },
    {
      "id": "zhuo_shao",
      "name": "灼烧",
      "kind": "debuff",
      "numeric": true,
      "scope": "character",
      "timing": 0,
      "duration": "permanent",
      "caps": [
        "dot_fire"
      ],
      "memo": "该方回合开始时失去 N 点生命（按火属性结算，N = 层数）；层数叠加、不封顶，状态本身永久（不写 duration 的施加永不自然到期，只能被净化）。**来源：对敌方释放的火攻效果各 +1 层**（ADR-134）——每次火攻效果各算一次、与该次伤害的数值无关（3 点也只 +1 层），火攻伤害被减到 0 也照挂；**打自己人/自身不挂**（蒙冲斗舰对自身的 2 点火伤只掉血、不挂层）；**DoT 跳伤本身不计**（灼烧的跳伤也是火属性，若按属性挂层会每回合自我叠层、无限增长）。只挂**场上单位**：主公照常吃当次火伤，但不吃灼烧层（dot_fire 只在回合开始遍历场上单位结算，见 ADR-134）。三系节奏：回合开始＝灼烧（火）／行动时＝水困（水）／回合结束＝中毒（毒）。ADR-117 由 zhong_du 改名而来——旧 id 名字是「中毒」却被三张火卡当灼烧用，名实不符；ADR-132 把时机从回合末改到回合开始；ADR-134 把「火攻挂灼烧」全局化"
    },
    {
      "id": "zhong_du",
      "name": "中毒",
      "kind": "debuff",
      "numeric": true,
      "scope": "character",
      "timing": 20,
      "duration": "permanent",
      "caps": [
        "shrink_max_hp"
      ],
      "memo": "该方回合结束时**永久降低 N 点生命上限**（N = 层数，ADR-132）；**不造成伤害**；层数叠加不封顶、永久（净化后停止，已削的不恢复）。削完当前生命高于新上限则夹到新上限，上限归零即阵亡。只有场上单位会中毒，主公免疫（ADR-117 仍然有效）"
    },
    {
      "id": "xu_ruo",
      "name": "虚弱",
      "kind": "debuff",
      "numeric": true,
      "scope": "character",
      "timing": 13,
      "duration": "turns",
      "memo": "攻击 −N"
    },
    {
      "id": "duan_liang",
      "name": "断粮",
      "kind": "debuff",
      "numeric": true,
      "scope": "lord",
      "timing": 1,
      "duration": "turns",
      "memo": "统率值上限 −N"
    },
    {
      "id": "jin_yong",
      "name": "禁用",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 8,
      "duration": "turns",
      "caps": [
        "block_skill"
      ],
      "memo": "持续时间内不能使用主动技与触发技（silence）"
    },
    {
      "id": "mian_yi",
      "name": "免疫",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 10,
      "duration": "turns",
      "caps": [
        "immune_debuff",
        "untargetable"
      ],
      "memo": "持续时间内免疫负面状态，且不能被指定为目标"
    },
    {
      "id": "fan_mian",
      "name": "翻面",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "conditional",
      "caps": [
        "block_action",
        "untargetable"
      ],
      "memo": "翻面期间无法行动也不能被选中；翻回正面后下回合才能行动"
    },
    {
      "id": "zhen_wang",
      "name": "阵亡标记",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 20,
      "duration": "permanent",
      "caps": [
        "dead"
      ],
      "memo": "引擎内部：阵亡标记（供亡语与结算判定）"
    },
    {
      "id": "shou_hu",
      "name": "守护",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 10,
      "duration": "turns",
      "caps": [
        "redirect_damage"
      ],
      "guard_scope": "any",
      "memo": "把**被守护单位**受到的伤害转由本单位承担（陈宫「忠烈」）"
    },
    {
      "id": "hu_zhu",
      "name": "护主",
      "kind": "buff",
      "numeric": false,
      "scope": "lord",
      "timing": 10,
      "duration": "turns",
      "caps": [
        "redirect_damage"
      ],
      "guard_scope": "lord",
      "memo": "只把该方**主帅**受到的伤害转由本单位承担（祖茂「替主」，ADR-071）"
    },
    {
      "id": "kong_cheng",
      "name": "空城",
      "kind": "buff",
      "numeric": false,
      "scope": "lord",
      "timing": 9,
      "duration": "turns",
      "caps": [
        "untargetable"
      ],
      "memo": "该方主帅不能被**普通攻击**指定为目标；效果伤害仍可命中（空城计，ADR-074）"
    },
    {
      "id": "xiu_zheng",
      "name": "休整",
      "kind": "debuff",
      "numeric": false,
      "scope": "lord",
      "timing": 1,
      "duration": "until_consumed",
      "caps": [
        "skip_turn"
      ],
      "memo": "该方下一个回合整个被跳过（休养生息「下一回合不进行任何活动」，ADR-074）"
    },
    {
      "id": "duan_chou",
      "name": "断抽",
      "kind": "debuff",
      "numeric": false,
      "scope": "lord",
      "timing": 2,
      "duration": "turns",
      "caps": [
        "block_draw"
      ],
      "memo": "引擎内部：该方本回合不能抽牌"
    },
    {
      "id": "jin_yan",
      "name": "进言",
      "kind": "buff",
      "numeric": false,
      "scope": "lord",
      "timing": 2,
      "duration": "turns",
      "memo": "引擎内部：该方回合开始额外抽牌"
    },
    {
      "id": "can_mou",
      "name": "参谋",
      "kind": "buff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "turns",
      "memo": "引擎内部：本单位可执行谋略类行动"
    },
    {
      "id": "jue_dou",
      "name": "决斗",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "turns",
      "caps": [
        "forced_attack"
      ],
      "memo": "引擎内部：本单位被强制攻击指定目标"
    },
    {
      "id": "chou_di",
      "name": "仇敌",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 9,
      "duration": "turns",
      "memo": "引擎内部：本单位被标记为某人的仇敌"
    },
    {
      "id": "jin_gu",
      "name": "禁锢",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 5,
      "duration": "turns",
      "caps": [
        "block_attack",
        "block_skill"
      ],
      "memo": "不能普通攻击，也不能使用主动技（陈宫「忠烈」对敌军的效果）"
    },
    {
      "id": "jin_gong",
      "name": "无法攻击",
      "kind": "debuff",
      "numeric": false,
      "scope": "character",
      "timing": 5,
      "duration": "turns",
      "caps": [
        "block_attack"
      ],
      "memo": "本回合不能普通攻击"
    },
    {
      "id": "shui_gong_bonus",
      "name": "水攻强化",
      "kind": "buff",
      "numeric": true,
      "scope": "character",
      "timing": 13,
      "duration": "permanent",
      "memo": "水攻伤害 +N"
    },
    {
      "id": "teng_jia",
      "name": "藤甲",
      "kind": "buff",
      "numeric": true,
      "scope": "character",
      "timing": 10,
      "duration": "permanent",
      "caps": [
        "reduce_physical",
        "vulnerable_fire"
      ],
      "memo": "受到普通/无属性伤害 −N（最低 0）；受到火属性伤害 +N（ADR-108 藤甲兵；ADR-110 删反伤层）"
    },
    {
      "id": "mian_shang",
      "name": "免伤",
      "kind": "buff",
      "numeric": false,
      "scope": "lord",
      "timing": 10,
      "duration": "this_turn",
      "caps": [
        "immune_all_damage"
      ],
      "memo": "当前回合免疫所有伤害，回合结束清除，不消耗披坚"
    },
    {
      "id": "zhong_yong_status",
      "name": "忠勇",
      "kind": "buff",
      "numeric": true,
      "scope": "character",
      "timing": 10,
      "duration": "permanent",
      "caps": [
        "thorns"
      ],
      "memo": "受到普通攻击并实际受伤后，对攻击者额外造成 N 点伤害（与自动反击分开结算；技能伤害不触发）"
    },
    {
      "id": "shui_kun",
      "name": "水困",
      "kind": "debuff",
      "numeric": true,
      "scope": "character",
      "timing": 20,
      "duration": "permanent",
      "caps": [
        "damage_on_action",
        "stage_up"
      ],
      "stack_mode": "max",
      "memo": "**层数＝阶段**（卡面徽章上的数字就是阶段）。① 只有**主动行动**（普攻/主动技）才受水伤：2^(阶段-1) → 阶段 1/2/3/4 = 1/2/4/8，**无上限**；**不行动则完全不受伤** ② 阶段在该方回合结束时 +1（施加当回合为阶段 1）③ **永久**，直到被净化 ④ 重复施加取较大者（ADR-132 重做：删去回合末水伤与回合上限）"
    }
  ],
  "keywords": [
    {
      "id": "zhan_ji",
      "name": "战技",
      "type": "active",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": true,
      "definition": "每回合一次的主动技能，通常需要玩家指定目标后释放。",
      "memo": "一回合一次主动技"
    },
    {
      "id": "ji_li",
      "name": "激励",
      "type": "trigger",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": true,
      "definition": "己方主公技完成结算后触发，具体效果由卡牌技能定义。",
      "memo": "主公技后获得收益"
    },
    {
      "id": "ju_du",
      "name": "剧毒",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": true,
      "definition": "该单位造成伤害并实际命中后，直接消灭受伤单位。",
      "memo": "命中即斩杀"
    },
    {
      "id": "jia_dun",
      "name": "架盾",
      "type": "buff",
      "grants": [
        "jia_dun_status"
      ],
      "stackable": false,
      "value": -1,
      "implemented": true,
      "definition": "嘲讽：敌方普通攻击必须先打它。是主将唯一的盾牌（单排后）。",
      "memo": "敌方必须先打它（ADR-051）"
    },
    {
      "id": "xian_gong",
      "name": "先攻",
      "type": "buff",
      "grants": [
        "xian_gong_status"
      ],
      "stackable": false,
      "value": -1,
      "implemented": true,
      "definition": "入场当回合即可行动攻击。（= 疾行，两者是同一个关键词，已合并为「先攻」）",
      "memo": "下了就能打",
      "source": "手写稿四处「获得先攻 / 上场时先攻」均指此意（ADR-055 设计者澄清）"
    },
    {
      "id": "lian_ji",
      "name": "连击",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -1.5,
      "implemented": true,
      "definition": "当前回合普通攻击可执行两次。",
      "memo": "一回合打两下"
    },
    {
      "id": "yi_ji",
      "name": "遗计",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -2,
      "implemented": true,
      "definition": "类亡语：阵亡时触发该卡定义的 on_death 逻辑。",
      "memo": "死了还要拉一个"
    },
    {
      "id": "yin_xue",
      "name": "饮血",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": false,
      "definition": "对敌人造成的伤害，为该单位自身恢复等量生命。",
      "memo": "打多少回多少"
    },
    {
      "id": "shen_she",
      "name": "神射",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": false,
      "definition": "对随机敌人造成远程伤害，且不受对方攻击影响。",
      "memo": "隔空点名",
      "open": "待实现（弓兵「射箭」是它的具体化：回合结束随机打敌方人物或主将 1 点，可绕过架盾）"
    },
    {
      "id": "qi_xi",
      "name": "奇袭",
      "type": "buff",
      "grants": [
        "qi_xi_status"
      ],
      "stackable": false,
      "value": -1,
      "implemented": false,
      "definition": "上场先隐身（不能被选定）；下个回合可选择行动攻击，只要执行过行动，隐身状态就消失。",
      "memo": "先藏一回合再出手",
      "open": "待实现（现引擎只做了\"攻击后失去\"，缺\"上场自动隐身\"）"
    },
    {
      "id": "zhong_yi",
      "name": "忠义",
      "type": "buff",
      "grants": [],
      "stackable": false,
      "value": -1,
      "implemented": false,
      "definition": "免疫混乱、离间等状态。",
      "memo": "不吃控制",
      "open": "待实现。⚠️ 原引擎误把「忠义」做成\"阵亡触发亡语\"，已纠正——亡语是「遗计」"
    }
  ]
};
