import io
import json
import unittest
from urllib.error import HTTPError

from scripts.visura_github_reviewer_permissions import observe_reviewer_permissions


class ReviewerPermissionsTests(unittest.TestCase):
    def call(self, data=None, error=None, **kwargs):
        self.requests = []
        def opener(request, timeout):
            self.requests.append(request)
            if error:
                raise HTTPError(request.full_url, error, 'unavailable', {}, None)
            return io.BytesIO(json.dumps(data).encode())
        return observe_reviewer_permissions(kwargs.get('repository', 'owner/repo'),
            kwargs.get('login', 'reviewer'), kwargs.get('numeric_id', 12),
            kwargs.get('token', 'test-token'), opener)

    def response(self, permission='write', **user):
        return {'permission': permission, 'role_name': 'custom-role',
                'user': {'id': 12, 'login': 'reviewer', **user}}

    def test_roles_never_authorize(self):
        for permission in ['admin', 'write', 'read', 'none']:
            with self.subTest(permission=permission):
                result = self.call(self.response(permission))
                self.assertEqual(result['observed_base_permission'], permission)
                self.assertEqual(result['write_or_admin_observed'], permission in {'admin', 'write'})
                for field in ['execution_authorized', 'merge_authorized', 'deployment_authorized',
                              'reviewer_eligibility_verified', 'repository_policy_verified']:
                    self.assertIs(result[field], False)
                self.assertNotIn('test-token', json.dumps(result))
                self.assertNotIn('custom-role', json.dumps(result))

    def test_fixed_get_transport(self):
        self.call(self.response())
        self.assertEqual(self.requests[0].get_method(), 'GET')
        self.assertEqual(self.requests[0].full_url,
            'https://api.github.com/repos/owner/repo/collaborators/reviewer/permission')

    def test_reassigned_handle_does_not_inherit_rights(self):
        result = self.call(self.response(id=99))
        self.assertEqual(result['lookup'], 'identity_mismatch')
        self.assertIsNone(result['observed_base_permission'])
        self.assertIsNone(result['write_or_admin_observed'])

    def test_wrong_handle_is_rejected_even_if_numeric_id_matches(self):
        self.assertEqual(self.call(self.response(login='other'))['lookup'], 'identity_mismatch')

    def test_case_insensitive_handle(self):
        self.assertIs(self.call(self.response(login='Reviewer'))['identity_matches'], True)

    def test_inaccessible_is_unknown_not_no_permission(self):
        for status in [403, 404]:
            result = self.call(error=status)
            self.assertIsNone(result['observed_base_permission'])
            self.assertIsNone(result['identity_matches'])
            self.assertIsNone(result['write_or_admin_observed'])

    def test_server_and_auth_failures_propagate(self):
        for status in [401, 429, 500]:
            with self.assertRaises(HTTPError):
                self.call(error=status)

    def test_missing_or_malformed_identity_fails_closed(self):
        for data in [None, [], {}, {'permission': 'write'}, self.response(id=True),
                     self.response(id=0), self.response(login=None), self.response('maintain'),
                     self.response('owner')]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                self.call(data)

    def test_input_injection_fails_before_network(self):
        for args in [{'login': '../admin'}, {'login': 'x?admin=1'}, {'login': 'x\n'},
                     {'repository': 'a/../b'}, {'numeric_id': True}, {'numeric_id': -1},
                     {'token': 'secret\nHeader: x'}, {'token': ''}]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                self.call(self.response(), **args)
            self.assertEqual(self.requests, [])

    def test_bot_identity_supported_without_authorizing(self):
        result = self.call(self.response(login='automation[bot]'), login='automation[bot]')
        self.assertTrue(result['identity_matches'])
        self.assertFalse(result['reviewer_eligibility_verified'])

class SnapshotReviewerPermissionsTests(unittest.TestCase):
    def observe(self, reviews):
        from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
        from unittest.mock import patch
        with patch('scripts.visura_github_reviewer_permissions.observe_reviewer_permissions',
                   return_value={'lookup': 'retrieved', 'merge_authorized': False}) as observer:
            result = observe_snapshot_reviewer_permissions('owner/repo', {'repository': 'owner/repo', 'reviews': reviews}, 'token')
            return result, observer

    def test_unbound_or_other_repo_snapshot_is_rejected_before_network(self):
        from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
        from unittest.mock import patch
        reviewer = {'reviewer_numeric_id': 12, 'reviewer_login': 'reviewer'}
        for claimed_repo in (None, 'elsewhere/repo', 'owner/repo ', 42):
            with self.subTest(claimed_repo=claimed_repo):
                snapshot = {'reviews': [reviewer]}
                if claimed_repo is not None:
                    snapshot['repository'] = claimed_repo
                with patch('scripts.visura_github_reviewer_permissions.observe_reviewer_permissions') as observer:
                    with self.assertRaisesRegex(ValueError, 'repository missing or mismatched'):
                        observe_snapshot_reviewer_permissions('owner/repo', snapshot, 'token')
                    observer.assert_not_called()

    def test_unbound_empty_snapshot_does_not_claim_observation(self):
        from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
        with self.assertRaisesRegex(ValueError, 'repository missing or mismatched'):
            observe_snapshot_reviewer_permissions('owner/repo', {'reviews': []}, 'token')

    def test_duplicate_reviews_query_identity_once(self):
        review = {'reviewer_numeric_id': 12, 'reviewer_login': 'reviewer'}
        result, observer = self.observe([review, review])
        self.assertEqual(observer.call_count, 1)
        self.assertEqual(result['lookup'], 'observed')
        self.assertFalse(result['merge_authorized'])
        self.assertEqual(observer.call_args.args[:4], ('owner/repo', 'reviewer', 12, 'token'))

    def test_missing_data_is_not_empty_success(self):
        result, observer = self.observe(None)
        self.assertEqual(result['lookup'], 'missing_review_data')
        observer.assert_not_called()

    def test_empty_collection_does_not_authorize(self):
        result, observer = self.observe([])
        self.assertEqual(result['observations'], [])
        self.assertFalse(result['reviewer_eligibility_verified'])
        observer.assert_not_called()

    def test_limit_prevents_unbounded_api_calls(self):
        reviews = [{'reviewer_numeric_id': n, 'reviewer_login': 'user'+str(n)} for n in range(1, 52)]
        result, observer = self.observe(reviews)
        self.assertEqual(result['lookup'], 'reviewer_limit_exceeded')
        observer.assert_not_called()

    def test_conflicting_handle_for_id_rejected(self):
        with self.assertRaises(ValueError):
            self.observe([{'reviewer_numeric_id': 12, 'reviewer_login': login} for login in ['a', 'b']])

    def test_inaccessible_result_propagates_unknown(self):
        from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
        from unittest.mock import patch
        with patch('scripts.visura_github_reviewer_permissions.observe_reviewer_permissions',
                   return_value={'lookup': 'inaccessible'}):
            result = observe_snapshot_reviewer_permissions('owner/repo', {'repository': 'owner/repo', 'reviews': [
                {'reviewer_numeric_id': 12, 'reviewer_login': 'reviewer'}]}, 'token')
        self.assertEqual(result['lookup'], 'incomplete')
        self.assertFalse(result['execution_authorized'])


class BatchPrevalidationTests(unittest.TestCase):
    def run_batch(self, reviews, token='token'):
        from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
        return observe_snapshot_reviewer_permissions('owner/repo', {'repository': 'owner/repo', 'reviews': reviews},
                                                     token, opener=self.transport)

    def setUp(self):
        self.calls = []
        def transport(request, timeout):
            self.calls.append(request.full_url)
            return io.BytesIO(json.dumps({'permission': 'write',
                'user': {'id': 1, 'login': 'valid'}}).encode())
        self.transport = transport
        self.valid = {'reviewer_numeric_id': 1, 'reviewer_login': 'valid'}

    def test_invalid_last_login_prevents_all_network_calls(self):
        for login in ['../other', 'x?query=1', 'x\n', '', 'x'*40]:
            with self.subTest(login=login), self.assertRaises(ValueError):
                self.run_batch([self.valid, {'reviewer_numeric_id': 2, 'reviewer_login': login}])
            self.assertEqual(self.calls, [])

    def test_reassigned_login_in_same_batch_prevents_all_calls(self):
        with self.assertRaises(ValueError):
            self.run_batch([self.valid, {'reviewer_numeric_id': 2, 'reviewer_login': 'VALID'}])
        self.assertEqual(self.calls, [])

    def test_invalid_token_rejected_even_for_empty_batch(self):
        for token in ['', ' ', 'token\nHeader: bad', None]:
            with self.subTest(token=token), self.assertRaises(ValueError):
                self.run_batch([], token)
        self.assertEqual(self.calls, [])

    def test_case_variations_of_same_identity_cost_one_request(self):
        result = self.run_batch([self.valid, {'reviewer_numeric_id': 1, 'reviewer_login': 'VALID'}])
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(result['lookup'], 'observed')
        self.assertFalse(result['execution_authorized'])

    def test_invalid_final_record_prevents_calls_for_other_fifty_reviewers(self):
        reviews = [{'reviewer_numeric_id': n, 'reviewer_login': 'user'+str(n)} for n in range(1, 51)]
        reviews.append({'reviewer_numeric_id': True, 'reviewer_login': 'bad'})
        with self.assertRaises(ValueError):
            self.run_batch(reviews)
        self.assertEqual(self.calls, [])
