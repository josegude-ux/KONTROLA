import unittest

from scripts.visura_github_action_summary import render_readonly_audit_summary

SHA = "a" * 40


def policy(branch, classic="retrieved", applied="retrieved", count=1):
    return {
        "branch": branch,
        "classic_protection": {"lookup": classic},
        "rulesets": {"lookup": "retrieved"},
        "effective_ruleset_rules": {
            "lookup": applied,
            "observed_rule_count": count,
        },
        "repository_policy_verified": False,
        "reviewer_permissions_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


def bundle(target="chore/visura-auto-dev-guardrails", default="main"):
    repo = "josegude-ux/KONTROLA"
    audit = {
        "head_sha": SHA,
        "observed_review_count": 2,
        "observed_latest_approval_records": [{"review_id": 1}],
        "observed_current_commit_changes_requested": [],
        "observed_stale_review_ids": [2],
        "observed_self_review_ids": [],
        "reviewer_permissions_verified": False,
        "repository_policy_verified": False,
        "effective_approval_verification": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }
    return {
        "repository": repo,
        "pr_number": 37,
        "review_snapshot": {
            "repository": repo, "pr_number": 37,
            "base_branch": target, "head_sha": SHA,
            "review_audit": audit, "repository_policy_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        },
        "head_check_runs": {
            "repository": repo, "head_sha": SHA, "lookup": "retrieved",
            "observed_total": 2, "status_counts": {"completed": 2},
            "conclusion_counts": {"success": 1, "failure": 1},
            "required_checks_verified": False, "branch_policy_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        },
        "required_check_observations": {
            "lookup": "candidate_match_only",
            "required_context_count": 2,
            "candidate_name_match_count": 1,
            "candidate_success_count": 1,
            "without_named_check_run_count": 1,
            "ambiguous_app_provenance_count": 0,
            "legacy_commit_statuses_compared": False,
            "app_origin_authenticated": False,
            "required_checks_verified": False,
            "execution_authorized": False,
            "merge_authorized": False,
            "deployment_authorized": False,
        },
        "legacy_commit_statuses": {
            "repository": repo, "head_sha": SHA, "lookup": "retrieved",
            "observed_status_records": 3, "observed_latest_contexts": 2,
            "latest_context_states": [
                {"context": "CI / test", "state": "failure"},
                {"context": "lint", "state": "success"},
            ],
            "latest_state_counts": {
                "success": 1, "failure": 1, "error": 0, "pending": 0,
            },
            "required_checks_verified": False,
            "branch_policy_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        },
        "legacy_status_observations": {
            "lookup": "candidate_contexts_only",
            "required_context_count": 2,
            "candidate_context_match_count": 1,
            "candidate_latest_success_count": 1,
            "contexts_not_observed_count": 0,
            "app_pinned_unverifiable_count": 1,
            "legacy_context_origin_authenticated": False,
            "required_checks_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        },
        "target_branch_policy": policy(target),
        "default_branch": default,
        "default_branch_policy": policy(default),
        "target_differs_from_default": target != default,
        "same_pr_metadata_after_policy_lookup": True,
        "report_is_atomic": False,
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


class GitHubActionSummaryTests(unittest.TestCase):
    def test_renders_distinct_target_and_default_policy(self):
        result = render_readonly_audit_summary(bundle())
        self.assertIn("Destino `chore/visura-auto-dev-guardrails`", result)
        self.assertIn("Predeterminada `main`", result)
        self.assertIn("Revisiones registradas (no autorizaciones)", result)
        self.assertIn("Aprobaciones observadas: **1**", result)
        self.assertIn("Revisiones antiguas: **1**", result)
        self.assertIn("NO autorización", result)
        self.assertIn("Snapshot atómico | No", result)

    def test_same_target_as_default_has_only_one_policy_row(self):
        result = render_readonly_audit_summary(bundle(target="main"))
        self.assertEqual(result.count("| Destino `main` |"), 1)
        self.assertNotIn("| Predeterminada", result)

    def test_unknown_classic_or_applied_rules_are_not_reported_as_unprotected(self):
        data = bundle()
        data["target_branch_policy"] = policy(
            data["review_snapshot"]["base_branch"],
            classic="not_found_or_inaccessible", applied="inaccessible", count=None,
        )
        result = render_readonly_audit_summary(data)
        self.assertIn("desconocido", result)
        self.assertIn("not_found_or_inaccessible", result)
        self.assertIn("nunca demuestra una rama sin protección", result)

    def test_injected_reviewer_login_and_body_never_appear(self):
        data = bundle()
        data["review_snapshot"]["review_audit"]["observed_latest_approval_records"] = [
            {"review_id": 1, "reviewer_login": "<script>alert(1)</script>"}
        ]
        result = render_readonly_audit_summary(data)
        self.assertNotIn("<script>", result)
        self.assertNotIn("alert(1)", result)

    def test_forged_execution_authorization_is_rejected(self):
        data = bundle()
        data["execution_authorized"] = True
        with self.assertRaisesRegex(ValueError, "non-authorizing"):
            render_readonly_audit_summary(data)

    def test_forged_approval_verification_is_rejected(self):
        data = bundle()
        data["review_snapshot"]["review_audit"]["effective_approval_verification"] = True
        with self.assertRaisesRegex(ValueError, "Review audit must not grant"):
            render_readonly_audit_summary(data)

    def test_wrong_target_branch_policy_is_rejected(self):
        data = bundle()
        data["target_branch_policy"]["branch"] = "main"
        with self.assertRaisesRegex(ValueError, "Branch policy context mismatch"):
            render_readonly_audit_summary(data)

    def test_mismatched_pr_identity_is_rejected(self):
        data = bundle()
        data["review_snapshot"]["pr_number"] = 99
        with self.assertRaisesRegex(ValueError, "PR context mismatch"):
            render_readonly_audit_summary(data)

    def test_non_atomic_claim_must_be_explicitly_false(self):
        data = bundle()
        data["report_is_atomic"] = True
        with self.assertRaisesRegex(ValueError, "non-authorizing and non-atomic"):
            render_readonly_audit_summary(data)

    def test_ci_check_counts_are_visible_without_approval(self):
        result = render_readonly_audit_summary(bundle())
        self.assertIn("Comprobaciones de CI observadas para el commit", result)
        self.assertIn("| Conclusión success | 1 |", result)
        self.assertIn("| Conclusiones negativas | 1 |", result)
        self.assertIn("NO prueban", result)

    def test_unavailable_checks_stay_unknown(self):
        data = bundle()
        data["head_check_runs"].update({
            "lookup": "inaccessible_or_not_found",
            "observed_total": None,
            "status_counts": None,
            "conclusion_counts": None,
        })
        result = render_readonly_audit_summary(data)
        self.assertIn("Checks encontrados | desconocido", result)
        self.assertNotIn("Checks encontrados | 0", result)

    def test_checks_of_other_sha_are_rejected(self):
        data = bundle()
        data["head_check_runs"]["head_sha"] = "b" * 40
        with self.assertRaisesRegex(ValueError, "Commit check SHA"):
            render_readonly_audit_summary(data)

    def test_forged_required_checks_permission_is_rejected(self):
        data = bundle()
        data["head_check_runs"]["required_checks_verified"] = True
        with self.assertRaisesRegex(ValueError, "Commit checks must not grant"):
            render_readonly_audit_summary(data)

    def test_inconsistent_check_counts_rejected(self):
        data = bundle()
        data["head_check_runs"]["status_counts"] = {"completed": 1}
        with self.assertRaisesRegex(ValueError, "Inconsistent total check count"):
            render_readonly_audit_summary(data)

    def test_unknown_check_status_rejected(self):
        data = bundle()
        data["head_check_runs"]["status_counts"] = {"all-authorized": 2}
        with self.assertRaisesRegex(ValueError, "Invalid check outcome"):
            render_readonly_audit_summary(data)

    def test_required_check_candidate_counts_are_visible_without_authority(self):
        result = render_readonly_audit_summary(bundle())
        self.assertIn("Cruce orientativo con checks exigidos", result)
        self.assertIn("Contextos exigidos observados | 2", result)
        self.assertIn("Coincidencias candidatas de nombre y aplicación | 1", result)
        self.assertIn("NO confirma", result)

    def test_unknown_required_checks_are_reported_unknown(self):
        data = bundle()
        data["required_check_observations"].update({
            "lookup": "unknown_policy_requirements",
            "required_context_count": None,
            "candidate_name_match_count": None,
            "candidate_success_count": None,
            "without_named_check_run_count": None,
            "ambiguous_app_provenance_count": None,
        })
        result = render_readonly_audit_summary(data)
        self.assertIn("Contextos exigidos observados | desconocido", result)
        self.assertNotIn("Contextos exigidos observados | 0", result)

    def test_required_check_comparison_cannot_supply_merge_authority(self):
        data = bundle()
        data["required_check_observations"]["merge_authorized"] = True
        with self.assertRaisesRegex(ValueError, "cannot grant authority"):
            render_readonly_audit_summary(data)

    def test_inconsistent_candidate_totals_are_rejected(self):
        data = bundle()
        data["required_check_observations"]["candidate_name_match_count"] = 3
        with self.assertRaisesRegex(ValueError, "Inconsistent required-check"):
            render_readonly_audit_summary(data)

    def test_unknown_comparison_with_forged_count_is_rejected(self):
        data = bundle()
        data["required_check_observations"]["lookup"] = "unknown_check_run_names"
        with self.assertRaisesRegex(ValueError, "Unknown required checks"):
            render_readonly_audit_summary(data)

    def test_legacy_status_table_is_separate_and_non_authorizing(self):
        rendered = render_readonly_audit_summary(bundle())
        self.assertIn("Estados heredados de commit (API separada)", rendered)
        self.assertIn("Registros históricos observados | 3", rendered)
        self.assertIn("Últimos estados success | 1", rendered)
        self.assertIn("Últimos estados coincidentes success | 1", rendered)
        self.assertIn("aplicación no verificable | 1", rendered)
        self.assertIn("NO acreditan", rendered)
        self.assertIn("NO autorización", rendered)

    def test_legacy_access_denied_is_unknown_not_zero(self):
        data = bundle()
        data["legacy_commit_statuses"].update({
            "lookup": "inaccessible_or_not_found",
            "observed_status_records": None,
            "observed_latest_contexts": None,
            "latest_context_states": None,
            "latest_state_counts": None,
        })
        data["legacy_status_observations"].update({
            "lookup": "unknown_legacy_statuses",
            "required_context_count": None,
            "candidate_context_match_count": None,
            "candidate_latest_success_count": None,
            "contexts_not_observed_count": None,
            "app_pinned_unverifiable_count": None,
        })
        rendered = render_readonly_audit_summary(data)
        self.assertIn("Registros históricos observados | desconocido", rendered)
        self.assertIn("Últimos estados coincidentes success | desconocido", rendered)

    def test_legacy_other_commit_rejected(self):
        data = bundle()
        data["legacy_commit_statuses"]["head_sha"] = "b" * 40
        with self.assertRaisesRegex(ValueError, "Legacy status SHA"):
            render_readonly_audit_summary(data)

    def test_legacy_forged_required_permission_rejected(self):
        data = bundle()
        data["legacy_commit_statuses"]["required_checks_verified"] = True
        with self.assertRaisesRegex(ValueError, "must not grant authority"):
            render_readonly_audit_summary(data)

    def test_legacy_inconsistent_status_counts_rejected(self):
        data = bundle()
        data["legacy_commit_statuses"]["latest_state_counts"]["success"] = 2
        with self.assertRaisesRegex(ValueError, "Inconsistent legacy status counts"):
            render_readonly_audit_summary(data)

    def test_legacy_app_pinned_requirement_cannot_grant_authority(self):
        data = bundle()
        data["legacy_status_observations"]["merge_authorized"] = True
        with self.assertRaisesRegex(ValueError, "Legacy comparison cannot grant"):
            render_readonly_audit_summary(data)

    def test_legacy_impossible_candidate_counts_rejected(self):
        data = bundle()
        data["legacy_status_observations"]["candidate_context_match_count"] = 2
        with self.assertRaisesRegex(ValueError, "Inconsistent legacy candidate"):
            render_readonly_audit_summary(data)

    def test_inaccessible_branch_rule_count_cannot_be_forged(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"] = {
            "lookup": "inaccessible", "observed_rule_count": 10,
        }
        with self.assertRaisesRegex(ValueError, "Invalid inaccessible rule count"):
            render_readonly_audit_summary(data)

    def test_disallow_branch_markdown_table_injection(self):
        data = bundle()
        data["review_snapshot"]["base_branch"] = "main|injected"
        data["target_branch_policy"]["branch"] = "main|injected"
        data["target_differs_from_default"] = True
        with self.assertRaisesRegex(ValueError, "Invalid PR target branch"):
            render_readonly_audit_summary(data)

    def test_disallow_repository_markdown_injection(self):
        data = bundle()
        data["repository"] = "owner/`evil`"
        data["review_snapshot"]["repository"] = data["repository"]
        with self.assertRaisesRegex(ValueError, "Invalid repository"):
            render_readonly_audit_summary(data)


class ReviewerPermissionSummaryTests(unittest.TestCase):
    def evidence(self):
        from scripts.visura_github_reviewer_permissions import observe_reviewer_permissions
        import io, json
        result = observe_reviewer_permissions('josegude-ux/KONTROLA', 'reviewer', 123, 'token',
            lambda *a, **k: io.BytesIO(json.dumps({'permission': 'admin',
                'user': {'id': 123, 'login': 'reviewer'}}).encode()))
        return {'lookup': 'observed', 'observations': [result],
                'reviewer_eligibility_verified': False, 'execution_authorized': False,
                'merge_authorized': False, 'deployment_authorized': False}

    def render(self, evidence):
        data = bundle()
        data['reviewer_repository_permissions'] = evidence
        return render_readonly_audit_summary(data)

    def test_counts_render_without_identity_or_token(self):
        evidence = self.evidence()
        evidence['observations'][0]['reviewer_login'] = '<script>SECRET</script>'
        text = self.render(evidence)
        self.assertIn('Acceso write/admin observado: **1**', text)
        self.assertIn('NO acreditan elegibilidad', text)
        self.assertNotIn('SECRET', text)
        self.assertNotIn('token', text)

    def test_missing_component_remains_unknown(self):
        self.assertIn('informe anterior sin este componente', self.render(None))

    def test_unknown_data_and_limit_have_no_zero_success(self):
        for lookup in ['missing_review_data', 'reviewer_limit_exceeded']:
            data = self.evidence(); data.update(lookup=lookup, observations=[])
            self.assertIn('permisos desconocidos', self.render(data))

    def test_authorizing_flags_are_rejected(self):
        for at_row in [False, True]:
            for flag in ['reviewer_eligibility_verified', 'execution_authorized',
                         'merge_authorized', 'deployment_authorized']:
                data = self.evidence()
                (data['observations'][0] if at_row else data)[flag] = True
                with self.subTest(flag=flag, at_row=at_row), self.assertRaises(ValueError):
                    self.render(data)

    def test_forged_identity_and_counts_fail_closed(self):
        for key, value in [('repository', 'other/repo'), ('reviewer_numeric_id', True),
                           ('identity_matches', False), ('write_or_admin_observed', False),
                           ('lookup', 'inaccessible')]:
            data = self.evidence(); data['observations'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.render(data)

    def test_unknown_and_mismatched_identities_are_counted(self):
        data = self.evidence(); row = data['observations'][0]
        data['lookup'] = 'incomplete'
        row.update(lookup='identity_mismatch', identity_matches=False,
                   observed_base_permission=None, write_or_admin_observed=None)
        text = self.render(data)
        self.assertIn('Identidades no coincidentes: **1**', text)
        self.assertIn('Resultado desconocido: **1**', text)

    def test_duplicate_identity_rejected(self):
        data = self.evidence(); data['observations'] *= 2
        with self.assertRaises(ValueError):
            self.render(data)


class ReviewControlSummaryTests(unittest.TestCase):
    def test_reports_known_false_true_and_unknown_without_granting_authority(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"].update({
            "review_requirements_available": True,
            "pull_request_approval_requirements": [{
                "ruleset_id": 123,
                "required_approving_review_count": 0,
                "require_code_owner_review": False,
                "dismiss_stale_reviews_on_push": True,
                "required_review_thread_resolution": None,
            }],
        })
        text = render_readonly_audit_summary(data)
        self.assertIn("Controles de revisión observados", text)
        self.assertIn("Revisión de CODEOWNERS", text)
        self.assertIn("| Destino | 123 | 0 | sí | no | desconocido | desconocido | desconocido |", text)
        self.assertIn("NO acreditan elegibilidad ni autorizan acciones", text)

    def test_unavailable_rules_show_unknown_not_zero(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"] = {
            "lookup": "inaccessible",
            "observed_rule_count": None,
            "pull_request_approval_requirements": None,
            "review_requirements_available": False,
        }
        text = render_readonly_audit_summary(data)
        self.assertIn("| Destino | desconocido | desconocido |", text)
        self.assertNotIn("| Destino | 0 |", text)

    def test_no_observed_pr_rules_does_not_imply_no_review_policy(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"].update({
            "review_requirements_available": True,
            "pull_request_approval_requirements": [],
        })
        text = render_readonly_audit_summary(data)
        self.assertIn("sin regla PR observada", text)
        self.assertIn("NO acreditan elegibilidad", text)

    def test_rejects_inconsistent_known_rule_for_inaccessible_endpoint(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"].update({
            "lookup": "inaccessible",
            "observed_rule_count": None,
            "review_requirements_available": True,
            "pull_request_approval_requirements": [{
                "ruleset_id": 123, "required_approving_review_count": 2,
            }],
        })
        with self.assertRaisesRegex(ValueError, "Inaccessible review controls"):
            render_readonly_audit_summary(data)

    def test_invalid_control_value_or_count_fails_closed(self):
        for key, invalid in (
            ("require_code_owner_review", "yes"),
            ("required_review_thread_resolution", 0),
            ("required_approving_review_count", True),
            ("ruleset_id", "<table>"),
        ):
            with self.subTest(key=key):
                data = bundle()
                row = {"ruleset_id": 12, "required_approving_review_count": 1,
                       key: invalid}
                data["target_branch_policy"]["effective_ruleset_rules"].update({
                    "review_requirements_available": True,
                    "pull_request_approval_requirements": [row],
                })
                with self.assertRaises(ValueError):
                    render_readonly_audit_summary(data)

    def test_untrusted_rule_extra_fields_are_not_rendered(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"].update({
            "review_requirements_available": True,
            "pull_request_approval_requirements": [{
                "ruleset_id": 15, "required_approving_review_count": 2,
                "source_name": "<script>SECRET_MARKER</script>",
            }],
        })
        text = render_readonly_audit_summary(data)
        self.assertNotIn("SECRET_MARKER", text)
        self.assertNotIn("<script>", text)


if __name__ == "__main__":
    unittest.main()
