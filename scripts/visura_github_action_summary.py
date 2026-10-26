"""Human-readable, non-authorizing GitHub Actions summary for a read-only audit.

Only numbers and strictly validated repository/branch identifiers are rendered.
Reviewer-supplied names and review bodies are never placed in Markdown.
"""


_LOOKUP = {"retrieved", "inaccessible", "not_found_or_inaccessible"}


def _require_str(value, label):
    if not isinstance(value, str) or not value or any(
        c in value for c in "`\n\r<>|"
    ):
        raise ValueError("Invalid " + label)
    return value


def _require_count(value, label):
    if type(value) is not int or value < 0:
        raise ValueError("Invalid " + label)
    return value


def _policy_cells(policy):
    if not isinstance(policy, dict):
        raise ValueError("Invalid branch policy")
    classic = policy.get("classic_protection")
    applied = policy.get("effective_ruleset_rules")
    listed = policy.get("rulesets")
    if not all(isinstance(v, dict) for v in (classic, applied, listed)):
        raise ValueError("Incomplete branch policy")
    cells = []
    for component in (classic, applied, listed):
        lookup = component.get("lookup")
        if lookup not in _LOOKUP:
            raise ValueError("Invalid branch policy lookup")
        cells.append(lookup)
    count = applied.get("observed_rule_count")
    if cells[1] == "retrieved":
        _require_count(count, "applied rule count")
        count_text = str(count)
    elif count is None:
        count_text = "desconocido"
    else:
        raise ValueError("Invalid inaccessible rule count")
    if any(policy.get(key) is not False for key in (
        "repository_policy_verified", "reviewer_permissions_verified",
        "execution_authorized", "merge_authorized", "deployment_authorized"
    )):
        raise ValueError("Policy must not grant authority")
    return cells + [count_text]


def render_readonly_audit_summary(bundle):
    """Build a GitHub step summary with no implied execution authority."""
    if not isinstance(bundle, dict):
        raise ValueError("Invalid audit bundle")
    for key in (
        "repository_policy_verified", "execution_authorized",
        "merge_authorized", "deployment_authorized", "report_is_atomic",
    ):
        if bundle.get(key) is not False:
            raise ValueError("Audit must remain non-authorizing and non-atomic")
    repository = _require_str(bundle.get("repository"), "repository")
    target = bundle.get("review_snapshot")
    if not isinstance(target, dict):
        raise ValueError("Missing PR snapshot")
    number = _require_count(bundle.get("pr_number"), "PR number")
    if number == 0:
        raise ValueError("Invalid PR number")
    if target.get("repository") != repository or target.get("pr_number") != number:
        raise ValueError("PR context mismatch")
    branch = _require_str(target.get("base_branch"), "PR target branch")
    default = _require_str(bundle.get("default_branch"), "default branch")
    head_sha = target.get("head_sha")
    if (
        not isinstance(head_sha, str) or len(head_sha) != 40
        or any(ch not in "0123456789abcdefABCDEF" for ch in head_sha)
    ):
        raise ValueError("Invalid head SHA")
    if bundle.get("target_differs_from_default") is not (branch != default):
        raise ValueError("Incorrect branch distinction")
    if bundle.get("same_pr_metadata_after_policy_lookup") is not True:
        raise ValueError("PR metadata not rechecked")
    if any(target.get(key) is not False for key in (
        "repository_policy_verified", "execution_authorized",
        "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("PR snapshot must not grant authority")
    audit = target.get("review_audit")
    if not isinstance(audit, dict) or audit.get("head_sha") != head_sha:
        raise ValueError("Inconsistent review audit")
    if any(audit.get(key) is not False for key in (
        "reviewer_permissions_verified", "repository_policy_verified",
        "effective_approval_verification", "execution_authorized",
        "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("Review audit must not grant authority")
    counts = {}
    for key, label in (
        ("observed_review_count", "registros"),
        ("observed_latest_approval_records", "aprobaciones observadas"),
        ("observed_current_commit_changes_requested", "solicitudes de cambios"),
        ("observed_stale_review_ids", "revisiones antiguas"),
        ("observed_self_review_ids", "auto-revisiones"),
    ):
        value = audit.get(key)
        counts[label] = (
            _require_count(value, key) if key == "observed_review_count"
            else len(value) if isinstance(value, list) else None
        )
        if counts[label] is None:
            raise ValueError("Invalid review audit list")
    check_snapshot = bundle.get("head_check_runs")
    if not isinstance(check_snapshot, dict):
        raise ValueError("Missing commit checks snapshot")
    if (
        check_snapshot.get("repository") != repository
        or check_snapshot.get("head_sha", "").lower() != head_sha.lower()
    ):
        raise ValueError("Commit check SHA or repository mismatch")
    if any(check_snapshot.get(key) is not False for key in (
        "required_checks_verified", "branch_policy_verified",
        "execution_authorized", "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("Commit checks must not grant authority")
    check_lookup = check_snapshot.get("lookup")
    if check_lookup not in {"retrieved", "inaccessible_or_not_found"}:
        raise ValueError("Invalid commit checks lookup")
    total_checks = check_snapshot.get("observed_total")
    statuses = check_snapshot.get("status_counts")
    conclusions = check_snapshot.get("conclusion_counts")
    if check_lookup == "retrieved":
        _require_count(total_checks, "total checks")
        if not isinstance(statuses, dict) or not isinstance(conclusions, dict):
            raise ValueError("Invalid check counts")
        allowed_statuses = {
            "queued", "in_progress", "completed", "waiting", "pending", "requested"
        }
        allowed_conclusions = {
            "success", "failure", "neutral", "cancelled", "timed_out",
            "action_required", "skipped", "stale", "startup_failure"
        }
        for observed, allowed in (
            (statuses, allowed_statuses), (conclusions, allowed_conclusions)
        ):
            for key, value in observed.items():
                if key not in allowed:
                    raise ValueError("Invalid check outcome")
                _require_count(value, "check outcome count")
        if sum(statuses.values()) != total_checks:
            raise ValueError("Inconsistent total check count")
        if sum(conclusions.values()) > statuses.get("completed", 0):
            raise ValueError("Inconsistent concluded check count")
        total_text = str(total_checks)
        success_text = str(conclusions.get("success", 0))
        failed_text = str(
            sum(conclusions.get(key, 0) for key in (
                "failure", "cancelled", "timed_out", "action_required",
                "startup_failure", "stale"
            ))
        )
        unfinished_text = str(total_checks - statuses.get("completed", 0))
    else:
        if any(v is not None for v in (total_checks, statuses, conclusions)):
            raise ValueError("Unavailable checks cannot report counts")
        total_text = success_text = failed_text = unfinished_text = "desconocido"

    comparison = bundle.get("required_check_observations")
    if not isinstance(comparison, dict):
        raise ValueError("Missing required-check comparison")
    for key in (
        "legacy_commit_statuses_compared", "app_origin_authenticated",
        "required_checks_verified", "execution_authorized",
        "merge_authorized", "deployment_authorized",
    ):
        if comparison.get(key) is not False:
            raise ValueError("Required-check comparison cannot grant authority")
    comparison_status = comparison.get("lookup")
    supported = {
        "unknown_policy_requirements", "unknown_check_run_names",
        "no_requirements_observed", "candidate_match_only",
    }
    if comparison_status not in supported:
        raise ValueError("Invalid required-check comparison status")
    count_keys = (
        "required_context_count", "candidate_name_match_count",
        "candidate_success_count", "without_named_check_run_count",
        "ambiguous_app_provenance_count",
    )
    observed_counts = [comparison.get(key) for key in count_keys]
    if comparison_status.startswith("unknown_"):
        if any(value is not None for value in observed_counts):
            raise ValueError("Unknown required checks cannot have counts")
        compare_counts = ["desconocido"] * len(count_keys)
    else:
        for key, value in zip(count_keys, observed_counts):
            _require_count(value, key)
        required, matches, success, absent, ambiguous = observed_counts
        if (
            matches + absent != required or success > matches
            or ambiguous > required
            or (comparison_status == "no_requirements_observed" and required != 0)
            or (comparison_status == "candidate_match_only" and required == 0)
        ):
            raise ValueError("Inconsistent required-check comparison counts")
        compare_counts = [str(value) for value in observed_counts]

    target_policy = bundle.get("target_branch_policy")
    default_policy = bundle.get("default_branch_policy")
    if not isinstance(target_policy, dict) or not isinstance(default_policy, dict):
        raise ValueError("Missing policy snapshots")
    if target_policy.get("branch") != branch or default_policy.get("branch") != default:
        raise ValueError("Branch policy context mismatch")
    target_cells = _policy_cells(target_policy)
    default_cells = _policy_cells(default_policy)

    lines = [
        "# VISURA AUTO-DEV — Auditoría manual (solo lectura)",
        "",
        "**Resultado: diagnóstico, NO autorización.** No se permite ejecutar, "
        "fusionar ni desplegar.",
        "",
        "| Campo | Observación |",
        "|---|---|",
        "| Repositorio | `" + repository + "` |",
        "| PR | #" + str(number) + " |",
        "| Commit inspeccionado | `" + head_sha[:12] + "` |",
        "| Rama de destino | `" + branch + "` |",
        "| Rama predeterminada | `" + default + "` |",
        "| Snapshot atómico | No |",
        "",
        "## Revisiones registradas (no autorizaciones)",
        "",
    ]
    for label, count in counts.items():
        lines.append("- " + label.capitalize() + ": **" + str(count) + "**")
    lines += [
        "",
        "Las aprobaciones observadas no acreditan permisos efectivos del revisor.",
        "",
        "## Comprobaciones de CI observadas para el commit",
        "",
        "| Comprobación | Observación |",
        "|---|---|",
        "| Consulta de checks | " + check_lookup + " |",
        "| Checks encontrados | " + total_text + " |",
        "| Conclusión success | " + success_text + " |",
        "| Conclusiones negativas | " + failed_text + " |",
        "| Aún no completados | " + unfinished_text + " |",
        "",
        "**Estos recuentos NO prueban que se hayan superado los checks "
        "obligatorios de la rama.**",
        "",
        "## Cruce orientativo con checks exigidos",
        "",
        "| Campo | Observación |",
        "|---|---|",
        "| Estado | " + comparison_status + " |",
        "| Contextos exigidos observados | " + compare_counts[0] + " |",
        "| Coincidencias candidatas de nombre y aplicación | "
        + compare_counts[1] + " |",
        "| Coincidencias candidatas con resultado success | "
        + compare_counts[2] + " |",
        "| Contextos sin check-run del mismo nombre | "
        + compare_counts[3] + " |",
        "| Aplicación de origen ambigua | " + compare_counts[4] + " |",
        "",
        "**Una coincidencia NO confirma que se haya cumplido un requisito.** "
        "Este cruce no verifica los estados antiguos de commit, las reglas "
        "de merge queue ni los permisos de aplicación.",
        "",
        "## Reglas de GitHub observadas",
        "",
        "| Rama | Protección clásica | Rulesets aplicables | Rulesets listados | Reglas aplicables |",
        "|---|---|---|---|---|",
        "| Destino `" + branch + "` | " + " | ".join(target_cells) + " |",
    ]
    if branch != default:
        lines.append(
            "| Predeterminada `" + default + "` | "
            + " | ".join(default_cells) + " |"
        )
    lines += [
        "",
        "**No verificado:** suficiencia de la protección clásica, excepciones, "
        "permisos de revisores y vigencia posterior de los datos.",
        "",
        "Un 403/404 significa consulta inaccesible o no concluyente; "
        "**nunca demuestra una rama sin protección**.",
        "",
        "El workflow no posee permisos para fusionar, desplegar ni escribir datos.",
        "",
    ]
    return "\n".join(lines)
