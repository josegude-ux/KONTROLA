"""Observe repository permissions, bound to a reviewer's numeric GitHub ID.

Read-only; repository access is not branch-review eligibility or authorization.
The caller must obtain the expected identity from a trusted PR review snapshot.
"""
import argparse
import json
import os
import re
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _positive_int, _validate_repo,
)
from scripts.visura_github_policy_probe import _read_status


def _validate_identity(login, numeric_id):
    # Allow bot handles, but never path/query/control-character injection.
    if not isinstance(login, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,39}(?:\[bot\])?", login):
        raise ValueError("Invalid reviewer login")
    if not _positive_int(numeric_id):
        raise ValueError("Invalid reviewer numeric ID")


def _validate_token(token):
    if not isinstance(token, str) or not token.strip() or '\r' in token or '\n' in token:
        raise ValueError("Missing or invalid GitHub token")


def observe_reviewer_permissions(repository, login, numeric_id, token, opener=None):
    _validate_repo(repository)
    _validate_identity(login, numeric_id)
    _validate_token(token)
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    status, data = _read_status(
        '/repos/' + repository + '/collaborators/' + login + '/permission', token, opener
    )
    permission = None
    identity_matches = None
    if status == 'retrieved':
        if not isinstance(data, dict) or not isinstance(data.get('user'), dict):
            raise ValueError('Incomplete permission identity response')
        user = data['user']
        if (not _positive_int(user.get('id')) or not isinstance(user.get('login'), str)
                or not isinstance(data.get('permission'), str)
                or data['permission'] not in {'admin', 'write', 'read', 'none'}):
            raise ValueError('Invalid permission response')
        # A renamed/reassigned handle must not inherit another account's review.
        identity_matches = user['id'] == numeric_id and user['login'].casefold() == login.casefold()
        if identity_matches:
            permission = data['permission']
        else:
            status = 'identity_mismatch'
    return {
        'repository': repository,
        'reviewer_numeric_id': numeric_id,
        'lookup': status,
        'identity_matches': identity_matches,
        'observed_base_permission': permission,
        'write_or_admin_observed': None if permission is None else permission in {'write', 'admin'},
        'reviewer_eligibility_verified': False,
        'repository_policy_verified': False,
        'execution_authorized': False,
        'merge_authorized': False,
        'deployment_authorized': False,
        'warning': 'Point-in-time repository permission only; no branch eligibility, CODEOWNERS, bypass or authorization verdict.',
    }


def observe_snapshot_reviewer_permissions(repository, snapshot, token, opener=None):
    """Bounded, deduplicated reads from a previously fetched review snapshot.

    Missing review data is unknown, never an empty verified review set.
    Validate the entire batch before any request. At most 50 identities are
    queried, with no partial verdict above that cap.
    """
    _validate_repo(repository)
    _validate_token(token)
    reviews = snapshot.get('reviews') if isinstance(snapshot, dict) else None
    result = {
        'lookup': 'missing_review_data', 'observations': [],
        'reviewer_eligibility_verified': False, 'execution_authorized': False,
        'merge_authorized': False, 'deployment_authorized': False,
    }
    if reviews is None:
        return result
    if not isinstance(reviews, list) or len(reviews) > 500:
        raise ValueError('Invalid review collection')
    identities = {}
    logins = {}
    for review in reviews:
        if not isinstance(review, dict):
            raise ValueError('Invalid review record')
        numeric_id, login = review.get('reviewer_numeric_id'), review.get('reviewer_login')
        _validate_identity(login, numeric_id)
        canonical_login = login.casefold()
        if canonical_login in logins and logins[canonical_login] != numeric_id:
            raise ValueError('One reviewer login maps to multiple identities')
        logins[canonical_login] = numeric_id
        if numeric_id in identities and identities[numeric_id].casefold() != login.casefold():
            raise ValueError('Inconsistent reviewer identity')
        identities[numeric_id] = login
    if len(identities) > 50:
        result['lookup'] = 'reviewer_limit_exceeded'
        return result
    result['observations'] = [
        observe_reviewer_permissions(repository, login, numeric_id, token, opener)
        for numeric_id, login in sorted(identities.items())
    ]
    result['lookup'] = ('observed' if all(row['lookup'] == 'retrieved'
                        for row in result['observations']) else 'incomplete')
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description='Observe reviewer repository permissions (read only)')
    parser.add_argument('repository')
    parser.add_argument('login')
    parser.add_argument('numeric_id', type=int)
    args = parser.parse_args(argv)
    result = observe_reviewer_permissions(args.repository, args.login, args.numeric_id,
                                          os.environ.get('GITHUB_TOKEN', ''))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
