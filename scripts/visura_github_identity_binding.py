"""Read-only identity binding for GitHub review payloads.

GitHub numeric account IDs are more stable than login names. Values in this
module are still untrusted claims, not authenticated API evidence.
"""


def inspect_github_identity_binding(author, reviewer):
    required = {"id", "login"}
    for identity in (author, reviewer):
        if not isinstance(identity, dict) or set(identity) != required:
            raise ValueError("Invalid identity fields")
        if type(identity["id"]) is not int or identity["id"] <= 0:
            raise ValueError("Invalid GitHub numeric user ID")
        login = identity["login"]
        if not isinstance(login, str) or not login or len(login) > 39:
            raise ValueError("Invalid GitHub login")
    return {
        "same_numeric_account": author["id"] == reviewer["id"],
        "reviewer_distinct_from_author_claim": author["id"] != reviewer["id"],
        "identities_authenticated": False,
        "execution_authorized": False,
        "merge_authorized": False,
    }
