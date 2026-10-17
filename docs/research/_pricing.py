"""卡牌粗略定价器（用于给新卡定数值）

口径来自 docs/gdd/13-balance-data-model.md：
  · 白板属性点 ≈ 2 × 统率 + 1
  · 关键词价值表（架盾 −1、先攻 −1、奇袭 −1、连击 −1.5、遗计 −2）
  · 等效效果价值：伤害 N×0.5、治疗 N×0.4、抽 1 张＝3、召唤 1/1＝3、召唤 2/2＝5、
    震慑 1 回合＝4~6、全体 +1 攻光环＝受益数×1、护甲 1 点＝1

⚠️ ADR-092：这套是**从未实机校准的启发式**，只用来做「同一批卡之间的横向比较」，
   不作为超模闸门（当年就是因为它会拦住有意为之的数值而被整个删除）。
"""
from dataclasses import dataclass, field


def body(atk: int, hp: int) -> int:
    return atk + hp


def baseline(cost: int) -> int:
    return 2 * cost + 1


KEYWORD = {"jia_dun": -1, "xian_gong": -1, "qi_xi": -1, "lian_ji": -1.5, "yi_ji": -2, "ju_du": -1.5}


@dataclass
class Card:
    name: str
    cost: int
    atk: int
    hp: int
    keywords: list = field(default_factory=list)
    #: 等效效果价值：damage/heal/… 数值 → 价值
    effects: list = field(default_factory=list)
    #: 触发概率折扣（战吼/触发技 × 0.6~1.0；光环 × 1.0；亡语 × 0.7）
    trigger: float = 1.0

    @property
    def stat_pts(self) -> int:
        return body(self.atk, self.hp)

    @property
    def kw_pts(self) -> float:
        v = sum(KEYWORD.get(k, 0) for k in self.keywords)
        if len(self.keywords) > 1:
            v *= 0.9  # 多关键词组合折扣
        return v

    @property
    def total(self) -> float:
        return self.stat_pts + self.kw_pts + sum(self.effects) * self.trigger

    @property
    def budget(self) -> int:
        return baseline(self.cost)

    @property
    def diff(self) -> float:
        return round(self.total - self.budget, 1)

    def line(self) -> str:
        kw = ("、" + "/".join(self.keywords)) if self.keywords else ""
        return (f"{self.name:<12} {self.cost}费 {self.atk}/{self.hp}{kw}"
                f"  属性{self.stat_pts:+d} 技能{sum(self.effects):.1f} 关键词{self.kw_pts:+.1f}"
                f" = {self.total:.1f} vs 基准{self.budget}  → {self.diff:+.1f}")