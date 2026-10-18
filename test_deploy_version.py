import contextlib
import copy
import importlib.util
import io
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).parent / 'scripts/deploy-version.py'
spec = importlib.util.spec_from_file_location('deploy_version', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class VerificationTests(unittest.TestCase):
    def records(self):
        return m.simulated_record(m.SIM_BASE_VERSION), m.simulated_record(m.SIM_FINAL_VERSION)

    def test_equal_code(self):
        self.assertEqual(m.verify_versions(*self.records()), m.REQUIRED_BINDINGS)

    def test_changed_code(self):
        a,b=self.records(); b['resources']['script']['etag']='changed'
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_missing_hash(self):
        a,b=self.records(); del b['resources']['script']['etag']
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_runtime_changed(self):
        a,b=self.records(); b['resources']['script_runtime']['compatibility_date']='2020-01-01'
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_assets_default_equivalence(self):
        a,b=self.records()
        a['resources']['script_runtime']['assets'] = {"base_path": "/", "raw_run_worker_first": True, "serve_directly": False}
        b['resources']['script_runtime']['assets'] = {"base_path": "/", "html_handling": "auto-trailing-slash", "not_found_handling": "none", "raw_run_worker_first": True, "serve_directly": False}
        self.assertEqual(m.verify_versions(a,b), m.REQUIRED_BINDINGS)

    def test_assets_explicit_mismatch_blocked(self):
        a,b=self.records()
        a['resources']['script_runtime']['assets'] = {"base_path": "/", "html_handling": "auto-trailing-slash"}
        b['resources']['script_runtime']['assets'] = {"base_path": "/", "html_handling": "force-trailing-slash"}
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_missing_runtime_binding(self):
        for name in m.REQUIRED_BINDINGS:
            with self.subTest(name=name):
                a,b=self.records(); b['resources']['bindings']=[x for x in b['resources']['bindings'] if x['name']!=name]
                with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_wrong_binding_type(self):
        a,b=self.records(); next(x for x in b['resources']['bindings'] if x['name']=='ASSETS')['type']='plain_text'
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_duplicate_binding(self):
        a,b=self.records(); b['resources']['bindings'].append(copy.deepcopy(b['resources']['bindings'][0]))
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_unrecognized_schema(self):
        a,b=self.records(); b['resources']['bindings']={}
        with self.assertRaises(m.VerificationError): m.verify_versions(a,b)

    def test_secret_values_not_part_of_comparison(self):
        a,b=self.records()
        for x in b['resources']['bindings']: x['text']='synthetic-sensitive-sentinel'
        self.assertEqual(m.verify_versions(a,b),m.REQUIRED_BINDINGS)

    def test_ambiguous_explicit_ids(self):
        with self.assertRaises(m.VerificationError):
            m.extract_version_id('Version ID: '+m.SIM_BASE_VERSION+'\nVersion ID: '+m.SIM_FINAL_VERSION,'test')

    def test_repeated_id_allowed(self):
        self.assertEqual(m.extract_version_id('Version ID: '+m.SIM_BASE_VERSION+'\nCreated version '+m.SIM_BASE_VERSION,'test'),m.SIM_BASE_VERSION)

    def test_error_never_echoes_output(self):
        with self.assertRaises(m.VerificationError) as ctx: m.extract_version_id('synthetic-sensitive-sentinel','test')
        self.assertNotIn('synthetic-sensitive-sentinel',str(ctx.exception))

    def test_deploy_guard(self):
        o=m.DeployOrchestrator(dry_run=True)
        with self.assertRaises(m.VerificationError): o.step_deploy()
        self.assertFalse(o.deploy_called)

    def test_no_subprocess_in_dry_runs(self):
        for scenario in [None,'upload','bulk','view','confirm','ambiguous-uuid','missing-bindings','code-mismatch','code-unavailable','runtime-mismatch','api-error']:
            with self.subTest(scenario=scenario), patch.object(m,'run',side_effect=AssertionError('No subprocess permitted')):
                o=m.DeployOrchestrator(True,scenario)
                with contextlib.redirect_stdout(io.StringIO()):
                    try: status=o.run()
                    except m.VerificationError: status=1
                self.assertEqual(status,0 if scenario in (None,'confirm') else 1)
                self.assertEqual(o.deploy_called,scenario is None)

    def test_capture_output_sanitized(self):
        o=m.DeployOrchestrator(True)
        a,b=self.records()
        for x in b['resources']['bindings']: x['text']='synthetic-sensitive-sentinel'
        o.dry_run=False; o.base_record=a; o.api=type('FakeAPI',(),{'get':lambda self,v:b})();o.final_version=m.SIM_FINAL_VERSION
        output=io.StringIO()
        with contextlib.redirect_stdout(output): o.step_view()
        self.assertNotIn('synthetic-sensitive-sentinel',output.getvalue())

    def test_cli_exit_codes(self):
        for scenario in [None,'upload','bulk','view','confirm','ambiguous-uuid','missing-bindings','code-mismatch','code-unavailable','runtime-mismatch','api-error']:
            args=['python3',str(SCRIPT),'--dry-run']
            if scenario: args+=['--simulate-error',scenario]
            result=subprocess.run(args,capture_output=True,text=True,timeout=10)
            self.assertEqual(result.returncode,0 if scenario in (None,'confirm') else 1)
            self.assertEqual('Ativaria versão' in result.stdout,scenario is None)

if __name__=='__main__': unittest.main()