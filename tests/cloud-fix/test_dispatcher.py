import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest import mock
import os
import subprocess

spec = importlib.util.spec_from_file_location('dispatcher', Path(__file__).parents[2] / 'scripts/cloud-fix/dispatcher.py')
dispatcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dispatcher)

class DispatcherTests(unittest.TestCase):
    def test_tags_are_used_instead_of_standard_labels(self):
        issue = {'key': 'WEBUI-2366', 'fields': {'project': {'key': 'WEBUI'},
            'status': {'statusCategory': {'key': 'indeterminate'}},
            'labels': [], 'customfield_13956': ['cloud-fix', 'nxui']}}
        dispatcher.validate_issue(issue, 'WEBUI-2366')
        issue['fields']['labels'] = ['cloud-fix']
        for tags in ([], None, ['cloud-fix-long']):
            issue['fields']['customfield_13956'] = tags
            with self.assertRaises(ValueError):
                dispatcher.validate_issue(issue, 'WEBUI-2366')

    def test_push_request_uses_configured_issue_not_commit_text(self):
        with mock.patch.dict(os.environ, {'GITHUB_EVENT_NAME': 'push',
                'CLOUD_FIX_PILOT_ISSUE_KEY': 'WEBUI-2366', 'GITHUB_SHA': 'abc123'}):
            payload = dispatcher.request_from_event({'head_commit': {'message': 'OTHER-1'}})
        self.assertEqual(dispatcher.validate_request(payload), ('WEBUI-2366', 'push-abc123'))

    def test_supported_request(self):
        self.assertEqual(dispatcher.validate_request({'issueKey': 'ELEMENTS-2095',
            'requestId': 'ELEMENTS-2095:100', 'requestedAction': 'cloud-fix'}),
            ('ELEMENTS-2095', 'ELEMENTS-2095:100'))

    def test_untrusted_keys_and_ids_rejected(self):
        for key, request in [('OTHER-1', 'r1'), ('WEBUI-1;echo hi', 'r1'),
                             ('WEBUI-1', '$(echo hi)'), ('WEBUI-1', '')]:
            with self.subTest(key=key, request=request), self.assertRaises(ValueError):
                dispatcher.validate_request({'issueKey': key, 'requestId': request,
                                             'requestedAction': 'cloud-fix'})

    def test_claim_survives_restart_and_changed_delivery_id(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'state.sqlite'
            with sqlite3.connect(path) as db:
                self.assertTrue(dispatcher.claim(db, 'WEBUI-1', 'delivery1'))
            with sqlite3.connect(path) as db:
                self.assertFalse(dispatcher.claim(db, 'WEBUI-1', 'delivery1'))
                self.assertFalse(dispatcher.claim(db, 'WEBUI-1', 'delivery2'))
                self.assertTrue(dispatcher.claim(db, 'WEBUI-2', 'delivery3'))

    def test_ambiguous_submission_remains_claimed(self):
        with sqlite3.connect(':memory:') as db:
            self.assertTrue(dispatcher.claim(db, 'WEBUI-1', 'delivery1'))
            db.execute("UPDATE claims SET state='uncertain' WHERE issue='WEBUI-1'")
            db.commit()
            self.assertFalse(dispatcher.claim(db, 'WEBUI-1', 'delivery1'))

    def test_submission_receipt_and_duplicate_protection(self):
        for timeout in (False, True):
            with self.subTest(timeout=timeout), tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / 'output'
                payload = {'issueKey': 'WEBUI-123', 'requestId': 'r1', 'requestedAction': 'cloud-fix'}
                issue = {'fields': {'summary': 'Pilot', 'description': {'type': 'doc'}}}
                with mock.patch.object(dispatcher, 'fetch_issue', return_value=issue):
                    dispatcher.prepare(payload, output)
                environment = {'CLOUD_FIX_SUBMISSION_ENABLED': 'true',
                    'CODEX_WEBUI_ENV_ID': 'env-test', 'CODEX_CLI_EXPECTED_VERSION': 'codex-cli test',
                    'CLOUD_FIX_STATE_DB': str(Path(folder) / 'claims.sqlite')}
                calls = []
                def run(args, **kwargs):
                    calls.append(args)
                    if args[1] == '--version':
                        return subprocess.CompletedProcess(args, 0, stdout='codex-cli test\n')
                    if args[2] == 'list':
                        return subprocess.CompletedProcess(args, 0, stdout='{}')
                    if timeout:
                        raise subprocess.TimeoutExpired(args, 180)
                    return subprocess.CompletedProcess(args, 0, stdout='Task receipt', stderr='')
                with mock.patch.dict(os.environ, environment), mock.patch.object(dispatcher, 'fetch_issue', return_value=issue), mock.patch.object(dispatcher.subprocess, 'run', side_effect=run):
                    if timeout:
                        with self.assertRaises(RuntimeError):
                            dispatcher.submit(output)
                    else:
                        dispatcher.submit(output)
                    dispatcher.submit(output)
                exec_calls = [c for c in calls if c[1:3] == ['cloud', 'exec']]
                self.assertEqual(len(exec_calls), 1)
                with sqlite3.connect(environment['CLOUD_FIX_STATE_DB']) as db:
                    state = db.execute('SELECT state FROM claims').fetchone()[0]
                    self.assertEqual(state, 'uncertain' if timeout else 'submitted')

if __name__ == '__main__':
    unittest.main()
