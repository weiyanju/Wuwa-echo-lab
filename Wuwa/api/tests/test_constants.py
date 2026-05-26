from django.test import SimpleTestCase

from api import constants


class ConstantsTests(SimpleTestCase):
    def test_substat_pool_has_13_independent_types(self):
        self.assertEqual(len(constants.SUBSTAT_TYPES), 13)
        self.assertIn("basic_attack_damage", constants.SUBSTAT_TYPES)
        self.assertIn("skill_damage", constants.SUBSTAT_TYPES)
        self.assertIn("heavy_attack_damage", constants.SUBSTAT_TYPES)
        self.assertIn("liberation_damage", constants.SUBSTAT_TYPES)
        self.assertIn("atk_percent", constants.SUBSTAT_TYPES)
        self.assertIn("hp_percent", constants.SUBSTAT_TYPES)

    def test_substat_keys_are_consistent_across_rule_tables(self):
        self.assertEqual(
            set(constants.SUBSTAT_TYPES),
            set(constants.SUBSTAT_LABELS),
        )
        self.assertEqual(
            set(constants.SUBSTAT_TYPES),
            set(constants.TIER_TABLES),
        )

    def test_aezr_atk_hp_share_same_tier_distribution(self):
        shared_keys = [
            "basic_attack_damage",
            "skill_damage",
            "heavy_attack_damage",
            "liberation_damage",
            "atk_percent",
            "hp_percent",
        ]
        first = constants.TIER_TABLES[shared_keys[0]]
        for key in shared_keys[1:]:
            self.assertEqual(constants.TIER_TABLES[key], first)

        self.assertEqual(first[0], {"value": 6.4, "probability": 0.066})
        self.assertEqual(first[-1], {"value": 11.6, "probability": 0.031})

    def test_each_tier_table_probability_sums_to_one(self):
        for substat_type, table in constants.TIER_TABLES.items():
            total = sum(row["probability"] for row in table)
            self.assertLessEqual(abs(total - 1.0), 0.003, msg=substat_type)

    def test_manual_rounded_probability_tiers_are_preserved(self):
        self.assertEqual(
            constants.TIER_TABLES["flat_hp"][-1],
            {"value": 580, "probability": 0.036},
        )
        self.assertEqual(
            constants.TIER_TABLES["energy_regen"][-1],
            {"value": 12.4, "probability": 0.027},
        )

    def test_tier_tables_and_rows_are_immutable(self):
        with self.assertRaises(AttributeError):
            constants.TIER_TABLES["crit_rate"].append({"value": 0, "probability": 0})

        with self.assertRaises(TypeError):
            constants.TIER_TABLES["crit_rate"][0]["probability"] = 0

    def test_model_labels_name_bayes_as_cycle_model(self):
        self.assertEqual(constants.MODEL_LABELS["bayes"], "周期规律")
        self.assertEqual(constants.MODEL_LABELS["rule"], "规则均衡")

    def test_weight_schedule_matches_sample_stages(self):
        self.assertEqual(
            constants.MODEL_WEIGHT_SCHEDULE[0]["weights"],
            {"rule": 0.70, "bayes": 0.10, "markov": 0.10, "cycle": 0.10, "context": 0.00},
        )
        self.assertEqual(
            constants.MODEL_WEIGHT_SCHEDULE[1]["weights"],
            {"rule": 0.48, "bayes": 0.26, "markov": 0.12, "cycle": 0.14, "context": 0.00},
        )
        self.assertEqual(
            constants.MODEL_WEIGHT_SCHEDULE[2]["weights"],
            {"rule": 0.36, "bayes": 0.30, "markov": 0.12, "cycle": 0.16, "context": 0.06},
        )
        self.assertEqual(
            constants.MODEL_WEIGHT_SCHEDULE[3]["weights"],
            {"rule": 0.28, "bayes": 0.34, "markov": 0.10, "cycle": 0.18, "context": 0.10},
        )
        self.assertEqual(
            constants.MODEL_WEIGHT_SCHEDULE[4]["weights"],
            {"rule": 0.25, "bayes": 0.35, "markov": 0.10, "cycle": 0.20, "context": 0.10},
        )
