import getpass
import importlib.util
import json
import warnings
from pathlib import Path

warnings.filterwarnings("error", category=getpass.GetPassWarning)

try:
    source = Path(__file__).with_name("deploy-version.py")
    spec = importlib.util.spec_from_file_location("deploy_version", source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    account = input("Account ID [6d12589dbce2c464692f763c7f1b5827]: ").strip() or "6d12589dbce2c464692f763c7f1b5827"
    worker = input("Worker [gradualinfo]: ").strip() or "gradualinfo"
    version = input("Version ID completo: ").strip()
    token = getpass.getpass("Token Cloudflare de leitura (oculto): ")
    if not token or not version:
        raise ValueError("Token e Version ID são obrigatórios")

    record = module.VersionAPI(account, worker, token).get(version)
    resources = record.get("resources", {})
    bindings = resources.get("bindings")

    script = resources.get("script", {})
    handlers = script.get("handlers", [])
    named_handlers = script.get("named_handlers", [])

    print(json.dumps({
        "version_id": record.get("id"),
        "etag_presente": bool(script.get("etag")),
        "runtime_tipo": type(resources.get("script_runtime")).__name__,
        "handlers": handlers,
        "named_handlers": named_handlers,
        "bindings_tipo": type(bindings).__name__,
        "bindings": [
            {"name": item.get("name"), "type": item.get("type")}
            for item in bindings if isinstance(item, dict)
        ] if isinstance(bindings, list) else []
    }, indent=2))
except module.VerificationError as err:
    print(f"Erro de verificação: {err}")
    raise SystemExit(1)
except Exception as err:
    print(f"Consulta falhou: {type(err).__name__} ({err if not any(s in str(err).lower() for s in ['token', 'bearer', 'key', 'auth']) else 'erro de rede/autenticação'})")
    raise SystemExit(1)
