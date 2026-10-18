#!/usr/bin/env python3
"""
@fileoverview Diagnóstico seguro de conectividade e permissões do Sanity Content Lake.
@module scripts/check-sanity
@description Executa consulta GROQ autenticada via token Viewer coletado em prompt oculto,
  distinguindo sucesso com dataset vazio (null) de falha de autenticação/rede.
@dependencies urllib.request, json, getpass, warnings
"""
import getpass
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import warnings

warnings.filterwarnings("error", category=getpass.GetPassWarning)

def main() -> int:
    try:
        default_project = os.environ.get("SANITY_PROJECT_ID", "").strip()
        default_dataset = (
            os.environ.get("NEXT_PUBLIC_SANITY_DATASET")
            or os.environ.get("SANITY_DATASET")
            or "production"
        ).strip()

        project_prompt = f"Sanity Project ID [{default_project}]: " if default_project else "Sanity Project ID: "
        project_id = input(project_prompt).strip() or default_project
        if not project_id:
            print("Erro: Sanity Project ID obrigatório.", file=sys.stderr)
            return 1

        dataset_prompt = f"Sanity Dataset [{default_dataset}]: "
        dataset = input(dataset_prompt).strip() or default_dataset
        if not dataset:
            print("Erro: Sanity Dataset obrigatório.", file=sys.stderr)
            return 1

        token = getpass.getpass("Token Sanity Viewer (oculto): ").strip()
        if not token:
            print("Erro: Token obrigatório para validação de permissões.", file=sys.stderr)
            return 1

        # Query de diagnóstico que busca apenas o _id do primeiro post/artigo
        query = '*[_type in ["post", "artigo"]][0]._id'
        encoded_query = urllib.parse.quote(query)
        url = f"https://{project_id}.api.sanity.io/v2024-01-01/data/query/{dataset}?query={encoded_query}"

        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
            },
            method="GET",
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            result = body.get("result")

            print(json.dumps({
                "status_http": status,
                "dataset": dataset,
                "autenticado": True,
                "query": query,
                "resultado_tipo": "id" if isinstance(result, str) else ("null" if result is None else type(result).__name__),
                "conteudo_encontrado": bool(result),
                "primeiro_id": result if isinstance(result, str) else None,
            }, indent=2))
            return 0

    except urllib.error.HTTPError as e:
        print(json.dumps({
            "status_http": e.code,
            "autenticado": False if e.code in (401, 403) else None,
            "erro": f"HTTP {e.code} ({e.reason})",
        }, indent=2), file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(json.dumps({
            "status_http": None,
            "erro": f"Falha de rede/conectividade: {e.reason}",
        }, indent=2), file=sys.stderr)
        return 1
    except Exception as e:
        print("Diagnóstico falhou; credenciais e detalhes sensíveis preservados.", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())

