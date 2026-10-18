#!/usr/bin/env python3
"""
@fileoverview Compara etag, runtime e handlers de duas versões Cloudflare Workers em modo leitura.
@module scripts/compare-versions
@description Prova que a versão com secrets preservou exatamente o mesmo código da versão base.
@dependencies getpass, json, deploy-version.py (VersionAPI)
"""
import getpass
import importlib.util
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("error", category=getpass.GetPassWarning)

def main():
    try:
        source = Path(__file__).with_name("deploy-version.py")
        spec = importlib.util.spec_from_file_location("deploy_version", source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        account = input("Account ID [6d12589dbce2c464692f763c7f1b5827]: ").strip() or "6d12589dbce2c464692f763c7f1b5827"
        worker = input("Worker [gradualinfo]: ").strip() or "gradualinfo"
        base_id = input("Versão base (UUID) [3b513952-3bff-458d-8b2d-5e88887606af]: ").strip() or "3b513952-3bff-458d-8b2d-5e88887606af"
        final_id = input("Versão final (UUID) [573eeb98-1e22-439e-be66-c2755760b915]: ").strip() or "573eeb98-1e22-439e-be66-c2755760b915"
        token = getpass.getpass("Token Cloudflare de leitura (oculto): ").strip()

        if not base_id or not final_id or not token:
            print("Erro: IDs e token são obrigatórios.", file=sys.stderr)
            sys.exit(1)

        api = module.VersionAPI(account, worker, token)
        base_rec = api.get(base_id)
        final_rec = api.get(final_id)

        base_fp = module.version_fingerprint(base_rec)
        final_fp = module.version_fingerprint(final_rec)

        etag_base = base_rec.get("resources", {}).get("script", {}).get("etag")
        etag_final = final_rec.get("resources", {}).get("script", {}).get("etag")

        match = (base_fp == final_fp)

        diffs = []
        labels = ["etag", "runtime", "handlers", "named_handlers"]
        for idx, label in enumerate(labels):
            if base_fp[idx] != final_fp[idx]:
                diffs.append({
                    "campo": label,
                    "base": base_fp[idx],
                    "final": final_fp[idx]
                })

        print(json.dumps({
            "versao_base": base_id,
            "versao_final": final_id,
            "etag_base": etag_base,
            "etag_final": etag_final,
            "etags_identicos": (etag_base == etag_final and bool(etag_base)),
            "fingerprint_identico": match,
            "codigo_preservado": (etag_base == etag_final and bool(etag_base)),
            "divergencias": diffs
        }, indent=2))

        sys.exit(0 if match else 1)

    except module.VerificationError as e:
        print(f"Erro de verificação: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("Falha na consulta; detalhes sensíveis preservados.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

