from types import MappingProxyType


def _freeze_table(rows):
    return tuple(MappingProxyType(dict(row)) for row in rows)


SUBSTAT_TYPES = [
    "crit_rate",
    "crit_damage",
    "basic_attack_damage",
    "skill_damage",
    "heavy_attack_damage",
    "liberation_damage",
    "atk_percent",
    "hp_percent",
    "def_percent",
    "flat_atk",
    "flat_hp",
    "energy_regen",
    "flat_def",
]

SUBSTAT_LABELS = {
    "crit_rate": "暴击率",
    "crit_damage": "暴击伤害",
    "basic_attack_damage": "普攻伤害加成",
    "skill_damage": "共鸣技能伤害加成",
    "heavy_attack_damage": "重击伤害加成",
    "liberation_damage": "共鸣解放伤害加成",
    "atk_percent": "攻击百分比",
    "hp_percent": "生命百分比",
    "def_percent": "防御百分比",
    "flat_atk": "攻击固定值",
    "flat_hp": "生命固定值",
    "energy_regen": "共鸣效率",
    "flat_def": "防御固定值",
}

MAIN_STATS_BY_COST = {
    1: ["atk_percent", "def_percent", "hp_percent"],
    3: ["attribute_damage", "atk_percent", "def_percent", "hp_percent", "energy_regen"],
    4: ["crit_rate", "crit_damage", "atk_percent", "hp_percent", "def_percent", "healing_bonus"],
}

MODEL_LABELS = {
    "rule": "规则均衡",
    "bayes": "周期规律",
    "markov": "近期序列",
    "cycle": "词条窗口",
    "context": "上下文监测",
}

MODEL_WEIGHT_SCHEDULE = [
    {"min": 0, "max": 500, "weights": {"rule": 0.70, "bayes": 0.10, "markov": 0.10, "cycle": 0.10, "context": 0.00}},
    {"min": 500, "max": 3000, "weights": {"rule": 0.48, "bayes": 0.26, "markov": 0.12, "cycle": 0.14, "context": 0.00}},
    {"min": 3000, "max": 10000, "weights": {"rule": 0.36, "bayes": 0.30, "markov": 0.12, "cycle": 0.16, "context": 0.06}},
    {"min": 10000, "max": 50000, "weights": {"rule": 0.28, "bayes": 0.34, "markov": 0.10, "cycle": 0.18, "context": 0.10}},
    {"min": 50000, "max": None, "weights": {"rule": 0.25, "bayes": 0.35, "markov": 0.10, "cycle": 0.20, "context": 0.10}},
]

SAMPLE_STAGES = [
    {"min": 0, "max": 500, "key": "recording", "label": "0-500 条：规则基线主导"},
    {"min": 500, "max": 3000, "key": "bayes", "label": "500-3000 条：周期规律检测"},
    {"min": 3000, "max": 10000, "key": "context", "label": "3000-10000 条：上下文变量检测"},
    {"min": 10000, "max": 50000, "key": "markov", "label": "10000-50000 条：顺序依赖检测"},
    {"min": 50000, "max": None, "key": "optimized", "label": "50000+ 条：融合权重优化"},
]

# Probabilities preserve manual rounded source values; some tables will not sum
# exactly to 1, so runtime distribution code should normalize a copy and never
# mutate these constants in place.
AEZR_SHARED_TABLE = _freeze_table([
    {"value": 6.4, "probability": 0.066},
    {"value": 7.1, "probability": 0.076},
    {"value": 7.9, "probability": 0.202},
    {"value": 8.6, "probability": 0.245},
    {"value": 9.4, "probability": 0.173},
    {"value": 10.1, "probability": 0.149},
    {"value": 10.9, "probability": 0.058},
    {"value": 11.6, "probability": 0.031},
])

TIER_TABLES = {
    "crit_rate": _freeze_table([
        {"value": 6.3, "probability": 0.241},
        {"value": 6.9, "probability": 0.225},
        {"value": 7.5, "probability": 0.243},
        {"value": 8.1, "probability": 0.083},
        {"value": 8.7, "probability": 0.074},
        {"value": 9.3, "probability": 0.077},
        {"value": 9.9, "probability": 0.031},
        {"value": 10.5, "probability": 0.026},
    ]),
    "crit_damage": _freeze_table([
        {"value": 12.6, "probability": 0.225},
        {"value": 13.8, "probability": 0.227},
        {"value": 15.0, "probability": 0.247},
        {"value": 16.2, "probability": 0.076},
        {"value": 17.4, "probability": 0.082},
        {"value": 18.6, "probability": 0.087},
        {"value": 19.6, "probability": 0.029},
        {"value": 21.0, "probability": 0.027},
    ]),
    "basic_attack_damage": AEZR_SHARED_TABLE,
    "skill_damage": AEZR_SHARED_TABLE,
    "heavy_attack_damage": AEZR_SHARED_TABLE,
    "liberation_damage": AEZR_SHARED_TABLE,
    "atk_percent": AEZR_SHARED_TABLE,
    "hp_percent": AEZR_SHARED_TABLE,
    "def_percent": _freeze_table([
        {"value": 8.1, "probability": 0.064},
        {"value": 9.0, "probability": 0.081},
        {"value": 10.0, "probability": 0.197},
        {"value": 10.9, "probability": 0.252},
        {"value": 11.8, "probability": 0.173},
        {"value": 12.8, "probability": 0.143},
        {"value": 13.8, "probability": 0.059},
        {"value": 14.7, "probability": 0.031},
    ]),
    "flat_atk": _freeze_table([
        {"value": 30, "probability": 0.068},
        {"value": 40, "probability": 0.522},
        {"value": 50, "probability": 0.385},
        {"value": 60, "probability": 0.025},
    ]),
    "flat_hp": _freeze_table([
        {"value": 320, "probability": 0.061},
        {"value": 360, "probability": 0.087},
        {"value": 390, "probability": 0.200},
        {"value": 430, "probability": 0.246},
        {"value": 470, "probability": 0.179},
        {"value": 510, "probability": 0.139},
        {"value": 540, "probability": 0.054},
        {"value": 580, "probability": 0.036},
    ]),
    "energy_regen": _freeze_table([
        {"value": 6.8, "probability": 0.063},
        {"value": 7.6, "probability": 0.079},
        {"value": 8.4, "probability": 0.204},
        {"value": 9.2, "probability": 0.253},
        {"value": 10.0, "probability": 0.182},
        {"value": 10.8, "probability": 0.135},
        {"value": 11.6, "probability": 0.058},
        {"value": 12.4, "probability": 0.027},
    ]),
    "flat_def": _freeze_table([
        {"value": 40, "probability": 0.144},
        {"value": 50, "probability": 0.443},
        {"value": 60, "probability": 0.383},
        {"value": 70, "probability": 0.030},
    ]),
}
