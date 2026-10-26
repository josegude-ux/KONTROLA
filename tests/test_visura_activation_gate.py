import unittest
from scripts.visura_activation_gate import assess_activation_gate

FIELDS = (
    "github_identity_verified_externally",
    "repository_policy_verified_externally",
    "head_sha_verified_externally",
    "ci_verified_externally",
    "human_approval_verified_externally",
    "provider_spending_cap_verified_externally",
)


class ActivationGateTests(unittest.TestCase):
    def test_all_claims_true_still_cannot_execute(self):
        result = assess_activation_gate({key: True for key in FIELDS})
        self.assertTrue(result["all_claims_present"])
        self.assertFalse(result["evidence_authenticated"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertFalse(result["deployment_authorized"])

    def test_missing_requirement_blocks(self):
        evidence = {key: True for key in FIELDS}
        evidence["ci_verified_externally"] = False
        result = assess_activation_gate(evidence)
        self.assertIn("ci_verified_externally", result["missing_requirements"])
        self.assertFalse(result["execution_authorized"])

    def test_unknown_field_is_rejected(self):
        evidence = {key: True for key in FIELDS}
        evidence["force_execute"] = True
        with self.assertRaisesRegex(ValueError, "Missing or unknown"):
            assess_activation_gate(evidence)

    def test_nonboolean_claim_is_rejected(self):
        evidence = {key: True for key in FIELDS}
        evidence["ci_verified_externally"] = "true"
        with self.assertRaisesRegex(ValueError, "must be booleans"):
            assess_activation_gate(evidence)

    def test_non_dictionary_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "must be a dictionary"):
            assess_activation_gate(None)


if __name__ == "__main__":
    unittest.main()
