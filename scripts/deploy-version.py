#!/usr/bin/env python3
import getpass, json, subprocess, sys, secrets, base64, re, warnings, os, argparse
import urllib.request
import uuid

warnings.filterwarnings('error', category=getpass.GetPassWarning)

REQUIRED_BINDINGS = {
    "ADMIN_ACCESS_ISSUER", "ADMIN_ACCESS_AUD", "ADMIN_ACCESS_OWNER_EMAIL",
    "ADMIN_ACCESS_HOSTS",
    "PREVIEW_SECRET", "PREVIEW_SIGNING_KEY",
    "PREVIEW_SESSION_DO", "ADMIN_RATE_LIMIT_DO",
    "ASSETS",
}

RUNTIME_BINDINGS = {
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SANITY_PROJECT_ID",
    "SANITY_API_READ_TOKEN", "ADMIN_USER_ID",
}

REQUIRED_BINDINGS |= RUNTIME_BINDINGS
REQUIRED_BINDINGS |= {"NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SANITY_DATASET"}
ALL_BINDINGS = REQUIRED_BINDINGS

VERSION_ID_PATTERN = re.compile(r'\b([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b', re.IGNORECASE)

SIM_BASE_VERSION = "11111111-2222-4333-8444-555555555555"
SIM_FINAL_VERSION = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"

class SimulatedInputs:
    def __init__(self, confirm: str = 's'):
        self.issuer = "https://test.cloudflareaccess.com"
        self.audience = "test-audience"
        self.preview_secret = base64.b64encode(secrets.token_bytes(32)).decode()
        self.preview_signing_key = base64.b64encode(secrets.token_bytes(32)).decode()
        self.extras = {
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": "simulated-anon-key",
            "SANITY_PROJECT_ID": "simulated-project",
            "SANITY_API_READ_TOKEN": "simulated-token",
            "ADMIN_USER_ID": "00000000-0000-0000-0000-000000000001",
        }
        self.confirm = confirm
    
    def get_secret(self, prompt: str, allow_empty: bool = False) -> str:
        if "ISSUER" in prompt:
            return self.issuer
        if "AUDIENCE" in prompt:
            return self.audience
        for key, val in self.extras.items():
            if key in prompt:
                return val
        return "" if allow_empty else "simulated-value"

    def get_confirm(self, prompt: str) -> str:
        return self.confirm


class RealInputs:
    def get_secret(self, prompt: str, allow_empty: bool = False) -> str:
        try:
            val = getpass.getpass(prompt).strip()
            if not val and not allow_empty:
                sys.exit(f"{prompt.strip(':')} vazio")
            return val
        except getpass.GetPassWarning:
            sys.exit("Entrada visível — abortado")
        except Exception:
            sys.exit("Leitura falhou")

    def get_confirm(self, prompt: str) -> str:
        try:
            return input(prompt).strip().lower()
        except getpass.GetPassWarning:
            sys.exit("Entrada visível — abortado")


def run(cmd: list[str], input_data: bytes | None = None) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, input=input_data, capture_output=True, timeout=300)
    except Exception:
        raise VerificationError("Comando indisponível ou excedeu prazo") from None


def extract_version_id(output: str, context: str) -> str:
    candidates = set(VERSION_ID_PATTERN.findall(output.lower()))
    if len(candidates) != 1:
        raise VerificationError("Version ID ausente ou ambíguo")
    return candidates.pop()


class VerificationError(Exception):
    """Erro seguro: não contém resposta bruta ou credenciais."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise VerificationError("Redirecionamento da API recusado")


class VersionAPI:
    def __init__(self, account, worker, token):
        if not re.fullmatch(r"[0-9a-f]{32}", account):
            raise VerificationError("Account ID inválido")
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", worker):
            raise VerificationError("Nome do Worker inválido")
        self.account, self.worker, self.token = account, worker, token

    def get(self, version):
        try:
            uuid.UUID(version)
            url = ("https://api.cloudflare.com/client/v4/accounts/" + self.account
                   + "/workers/scripts/" + self.worker + "/versions/" + version)
            req = urllib.request.Request(url, headers={"Authorization": "Bearer " + self.token})
            with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as response:
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    raise VerificationError("Resposta da API excede limite")
                data = json.loads(raw)
            if data.get("success") is not True or not isinstance(data.get("result"), dict):
                raise VerificationError("Resposta da API inválida")
            result = data["result"]
            if result.get("id") != version:
                raise VerificationError("ID da resposta diverge")
            return result
        except Exception:
            raise VerificationError("Consulta de versão indisponível ou inválida") from None


def version_fingerprint(record):
    try:
        resources = record["resources"]
        script = resources["script"]
        etag = script["etag"]
        if not isinstance(etag, str) or not etag.strip():
            raise ValueError()
        # O etag documentado compara conteúdo; runtime e exports também são preservados.
        runtime = resources["script_runtime"]
        if not isinstance(runtime, dict) or not runtime.get("compatibility_date"):
            raise ValueError()
        if not isinstance(script.get("handlers"), list) or not isinstance(script.get("named_handlers"), list):
            raise ValueError()

        # Normaliza apenas os padrões documentados de assets se ausentes:
        # html_handling padrão: 'auto-trailing-slash', not_found_handling padrão: 'none'.
        # Preserva comparação estrita de qualquer valor explícito divergente.
        norm_runtime = json.loads(json.dumps(runtime))
        if isinstance(norm_runtime.get("assets"), dict):
            assets = norm_runtime["assets"]
            assets.setdefault("html_handling", "auto-trailing-slash")
            assets.setdefault("not_found_handling", "none")

        return (etag, json.dumps(norm_runtime, sort_keys=True),
                json.dumps(script["handlers"], sort_keys=True),
                json.dumps(script["named_handlers"], sort_keys=True))
    except Exception:
        raise VerificationError("Prova de código/runtime ausente ou inválida") from None


def verify_versions(base, final):
    if version_fingerprint(base) != version_fingerprint(final):
        raise VerificationError("Código ou runtime da versão final diverge da base")
    bindings = final.get("resources", {}).get("bindings")
    if not isinstance(bindings, list):
        raise VerificationError("Formato estruturado de bindings não reconhecido")
    names = set()
    types = {}
    for binding in bindings:
        if not isinstance(binding, dict) or not isinstance(binding.get("name"), str):
            raise VerificationError("Binding inválido")
        name = binding["name"]
        if name in names:
            raise VerificationError("Binding duplicado")
        names.add(name)
        types[name] = binding.get("type")
    if REQUIRED_BINDINGS - names:
        raise VerificationError("Bindings obrigatórios ausentes")
    for name, expected in {"ASSETS": "assets", "PREVIEW_SESSION_DO": "durable_object_namespace",
                           "ADMIN_RATE_LIMIT_DO": "durable_object_namespace"}.items():
        if types.get(name) != expected:
            raise VerificationError("Tipo de binding de infraestrutura inválido")
    for name in {"ADMIN_ACCESS_ISSUER", "ADMIN_ACCESS_AUD", "ADMIN_ACCESS_OWNER_EMAIL",
                 "ADMIN_ACCESS_HOSTS", "PREVIEW_SECRET", "PREVIEW_SIGNING_KEY", "SANITY_API_READ_TOKEN"}:
        if types.get(name) != "secret_text":
            raise VerificationError("Binding sensível não é secret_text")
    return names


def simulated_record(version):
    bindings = [{"name": name, "type": "secret_text"} for name in sorted(REQUIRED_BINDINGS)]
    for b in bindings:
        if b["name"] == "ASSETS": b["type"] = "assets"
        if b["name"] in {"PREVIEW_SESSION_DO", "ADMIN_RATE_LIMIT_DO"}: b["type"] = "durable_object_namespace"
    return {"id": version, "resources": {"bindings": bindings,
        "script": {"etag": "synthetic-code-hash", "handlers": ["fetch"], "named_handlers": []},
        "script_runtime": {"compatibility_date": "2026-01-01", "compatibility_flags": ["nodejs_compat"]}}}


def simulate_wrangler_output(command: str, scenario: str = "happy") -> str:
    if command == "upload":
        if scenario == "ambiguous_uuid":
            return f"Upload successful\nVersion ID: {SIM_BASE_VERSION}\nAlso found: aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee\nCreated version {SIM_BASE_VERSION}"
        return f"Upload successful\nVersion ID: {SIM_BASE_VERSION}\nCreated version {SIM_BASE_VERSION}"
    elif command == "bulk":
        if scenario == "ambiguous_uuid":
            return f"Secrets applied\nVersion ID: {SIM_FINAL_VERSION}\nAlso: 11111111-2222-4333-8444-555555555555\nCreated version {SIM_FINAL_VERSION}"
        return f"Secrets applied\nVersion ID: {SIM_FINAL_VERSION}\nCreated version {SIM_FINAL_VERSION}"
    elif command == "view":
        if scenario == "missing_bindings":
            lines = ["Bindings:"]
            for name in sorted(ALL_BINDINGS - {"PREVIEW_SECRET", "ASSETS"}):
                lines.append(f"  {name}: [REDACTED]")
            return "\n".join(lines)
        lines = ["Bindings:"]
        for name in sorted(ALL_BINDINGS):
            lines.append(f"  {name}: [REDACTED]")
        return "\n".join(lines)
    return ""


class DeployOrchestrator:
    def __init__(self, dry_run: bool = False, simulate_errors: str | None = None):
        self.dry_run = dry_run
        self.simulate_errors = simulate_errors
        self.inputs = SimulatedInputs(confirm='n' if simulate_errors == "confirm" else 's') if dry_run else RealInputs()
        self.base_version = None
        self.final_version = None
        self.deploy_called = False
        self.code_verified = False
        self.api = None
        self.base_record = None

    def step_upload(self) -> bool:
        print("=== Upload do código ===")
        if not self.dry_run:
            account = input("Account ID Cloudflare: ").strip()
            worker = input("Nome do Worker: ").strip()
            token = self.inputs.get_secret("API token Cloudflare (leitura de versões): ")
            self.api = VersionAPI(account, worker, token)
        if self.simulate_errors == "upload":
            print("Erro simulado no upload")
            return False
        if self.simulate_errors == "ambiguous-uuid":
            print("=== Upload do código (ambiguous UUID) ===")
            out = simulate_wrangler_output("upload", "ambiguous_uuid")
            self.base_version = extract_version_id(out, "upload")
            print(f"Versão base: {self.base_version}")
            return False
        if self.dry_run:
            out = simulate_wrangler_output("upload")
            self.base_version = extract_version_id(out, "upload")
            print(f"Versão base (simulada): {self.base_version}")
        else:
            upload = run(["pnpm", "exec", "wrangler", "versions", "upload", "--config", "wrangler.jsonc"])
            if upload.returncode != 0:
                sys.exit(f"Upload falhou (código {upload.returncode})")
            self.base_version = extract_version_id(upload.stdout.decode(), "upload")
            print(f"Versão base (código): {self.base_version}")
            self.base_record = self.api.get(self.base_version)
            version_fingerprint(self.base_record)
        return True

    def step_secrets(self) -> bool:
        print("\n=== Cloudflare Access ===")
        issuer = self.inputs.get_secret("ADMIN_ACCESS_ISSUER (Issuer): ")
        audience = self.inputs.get_secret("ADMIN_ACCESS_AUD (Audience): ")
        owner_email = "a3qua96@gmail.com"
        hosts = "gradualinfo.com.br,www.gradualinfo.com.br"

        print("\n=== Preview (geração automática) ===")
        preview_secret = base64.b64encode(secrets.token_bytes(32)).decode()
        preview_signing_key = base64.b64encode(secrets.token_bytes(32)).decode()

        print("\n=== Variáveis runtime (Enter=pular) ===")
        extras = {}
        for var in ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SANITY_PROJECT_ID", "SANITY_API_READ_TOKEN", "ADMIN_USER_ID"]:
            val = self.inputs.get_secret(f"{var}: ", allow_empty=True)
            if val:
                extras[var] = val

        payload = {
            "ADMIN_ACCESS_ISSUER": issuer,
            "ADMIN_ACCESS_AUD": audience,
            "ADMIN_ACCESS_OWNER_EMAIL": owner_email,
            "ADMIN_ACCESS_HOSTS": hosts,
            "PREVIEW_SECRET": preview_secret,
            "PREVIEW_SIGNING_KEY": preview_signing_key,
            **extras,
        }

        print(f"\n=== Aplicando secrets ===")
        if self.simulate_errors == "bulk":
            print("Erro simulado no bulk")
            return False
        if self.simulate_errors == "ambiguous-uuid":
            print("=== Aplicando secrets (ambiguous UUID) ===")
            out = simulate_wrangler_output("bulk", "ambiguous_uuid")
            self.final_version = extract_version_id(out, "secrets bulk")
            print(f"Versão final: {self.final_version}")
            return False
        if self.dry_run:
            out = simulate_wrangler_output("bulk")
            self.final_version = extract_version_id(out, "secrets bulk")
            print(f"Versão final (simulada): {self.final_version}")
        else:
            secrets_result = run(
                ["pnpm", "exec", "wrangler", "versions", "secret", "bulk"],
                input_data=json.dumps(payload).encode(),
            )
            if secrets_result.returncode != 0:
                sys.exit(f"Secrets falharam (código {secrets_result.returncode})")
            self.final_version = extract_version_id(secrets_result.stdout.decode(), "secrets bulk")
            print(f"Versão final (código + secrets): {self.final_version}")
        return True

    def step_view(self) -> bool:
        if self.simulate_errors == "view":
            return False
        if self.dry_run:
            base = simulated_record(self.base_version)
            final = simulated_record(self.final_version)
            if self.simulate_errors == "missing-bindings": final["resources"]["bindings"] = []
            if self.simulate_errors == "code-mismatch": final["resources"]["script"]["etag"] = "different"
            if self.simulate_errors == "code-unavailable": final["resources"]["script"].pop("etag")
            if self.simulate_errors == "runtime-mismatch": final["resources"]["script_runtime"]["compatibility_date"] = "2025-01-01"
            if self.simulate_errors == "api-error": raise VerificationError("Consulta de versão indisponível")
        else:
            base = self.base_record
            final = self.api.get(self.final_version)
        found = verify_versions(base, final)
        self.code_verified = True
        print("Código, runtime e bindings: verificação aprovada")
        for name in sorted(found):
            if name in REQUIRED_BINDINGS: print("  " + name)
        return True

    def step_confirm(self) -> bool:
        try:
            confirm = self.inputs.get_confirm(f"\nAtivar versão {self.final_version} com 100% do tráfego? [s/N]: ")
        except getpass.GetPassWarning:
            sys.exit("Entrada visível — abortado")
        if confirm != 's':
            print("Ativação cancelada pelo usuário.")
            return False
        return True

    def step_deploy(self):
        if not self.code_verified:
            raise VerificationError("Ativação bloqueada: código não verificado")
        self.deploy_called = True
        if self.dry_run:
            print(f"[DRY RUN] Ativaria versão {self.final_version}@100%")
            return
        deploy = run(["pnpm", "exec", "wrangler", "versions", "deploy", f"{self.final_version}@100%", "--yes"])
        if deploy.returncode != 0:
            sys.exit(f"Deploy falhou (código {deploy.returncode})")
        print(f"Versão {self.final_version} ativada com 100% do tráfego.")

    def run(self) -> int:
        if not self.step_upload():
            return 1
        if not self.step_secrets():
            return 1
        if not self.step_view():
            return 1
        if not self.step_confirm():
            return 0
        self.step_deploy()
        return 0


def main():
    parser = argparse.ArgumentParser(description="Deploy versionado Cloudflare Workers")
    parser.add_argument("--dry-run", action="store_true", help="Simulação sem credenciais nem rede")
    parser.add_argument("--simulate-error", choices=["upload", "bulk", "view", "confirm", "ambiguous-uuid", "missing-bindings", "code-mismatch", "code-unavailable", "runtime-mismatch", "api-error"],
                        help="Simula erro em etapa específica (só com --dry-run)")
    args = parser.parse_args()

    if args.simulate_error and not args.dry_run:
        sys.exit("--simulate-error requer --dry-run")

    orchestrator = DeployOrchestrator(dry_run=args.dry_run, simulate_errors=args.simulate_error)
    try:
        exit_code = orchestrator.run()
    except VerificationError as error:
        print(str(error), file=sys.stderr)
        exit_code = 1
    except (EOFError, KeyboardInterrupt):
        print("Operação interrompida", file=sys.stderr)
        exit_code = 1
    except Exception:
        print("Falha interna; ativação interrompida", file=sys.stderr)
        exit_code = 1
    
    if args.dry_run and args.simulate_error and orchestrator.deploy_called:
        sys.exit("FALHA DE SEGURANÇA: deploy chamado após erro simulado")
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()