#!/usr/bin/env python3
"""
scripts/publish-sanity-drafts.py
Publica rascunhos editoriais do Sanity (remove prefixo `drafts.` e define status 'publicado').

Regras e garantias:
- Lê documentos com prefixo `drafts.*` do dataset `production`.
- Cria novos documentos publicados (sem prefixo, status 'publicado', `published_at` = now).
- Token de escrita via getpass ou env var, nunca exibido.
- Suporta --dry-run para auditar payload antes de enviar.
- Suporta --slug para publicar apenas um artigo específico.
"""

import argparse
import getpass
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional

SANITY_PROJECT_ID = "4iipvaar"
SANITY_DATASET = "production"
SANITY_API_VERSION = "v2024-01-01"


def fetch_drafts(token: str, target_slug: Optional[str] = None) -> list:
    """Busca todos os documentos drafts.* do dataset."""
    filter_query = '*[_id in path("drafts.*") && _type == "artigo"]'
    if target_slug:
        filter_query = f'*[_id == "drafts.{target_slug}" && _type == "artigo"]'
    
    encoded = urllib.parse.quote(filter_query)
    url = f"https://{SANITY_PROJECT_ID}.api.sanity.io/{SANITY_API_VERSION}/data/query/{SANITY_DATASET}?query={encoded}"
    
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("result", [])
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"Erro HTTP {e.code} ao buscar rascunhos:\n{err_msg}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Erro inesperado ao buscar rascunhos: {e}", file=sys.stderr)
        sys.exit(1)


def build_publish_mutations(drafts: list) -> list:
    """Constrói mutations para publicar: createOrReplace novo doc + delete draft."""
    mutations = []
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    
    for draft in drafts:
        draft_id = draft.get("_id", "")
        if not draft_id.startswith("drafts."):
            print(f"  ⚠ Ignorando {draft_id}: não tem prefixo drafts.", file=sys.stderr)
            continue
        
        published_id = draft_id[len("drafts."):]  # remove prefixo
        
        # Novo documento publicado
        published_doc = {
            "_id": published_id,
            "_type": "artigo",
            "title": draft.get("title", "Sem título"),
            "slug": draft.get("slug", {"_type": "slug", "current": published_id}),
            "excerpt": draft.get("excerpt", ""),
            "content": draft.get("content", ""),
            "cover_image_url": draft.get("cover_image_url", ""),
            "editoria": draft.get("editoria", "Tecnologia"),
            "author_name": draft.get("author_name", "Redação GradualInfo"),
            "status": "publicado",
            "published_at": now_iso,
            "fontes_citadas": draft.get("fontes_citadas", []),
        }
        
        mutations.append({"createOrReplace": published_doc})
        mutations.append({"delete": {"id": draft_id}})
        
        print(f"  ✓ {draft_id} → {published_id} ({draft.get('title', 'Sem título')[:50]}...)")
    
    return mutations


def main():
    import urllib.parse
    
    parser = argparse.ArgumentParser(description="Publicação de rascunhos no Sanity")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula o payload sem enviar à API")
    parser.add_argument("--slug", help="Publicar apenas um slug específico (ex: seo-nextjs-16-metadata-indexacao)")
    args = parser.parse_args()

    # Obter token de escrita
    token = os.environ.get("SANITY_WRITE_TOKEN") or os.environ.get("SANITY_API_TOKEN")
    if not token:
        try:
            token = getpass.getpass("Informe o Sanity Write Token (entrada oculta): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.", file=sys.stderr)
            sys.exit(1)

    if not token:
        print("Erro: Token não fornecido. Abortando.", file=sys.stderr)
        sys.exit(1)

    # Buscar rascunhos
    print(f"Buscando rascunhos em {SANITY_PROJECT_ID}/{SANITY_DATASET}...")
    drafts = fetch_drafts(token, args.slug)
    
    if not drafts:
        print("Nenhum rascunho encontrado.", file=sys.stderr)
        sys.exit(1)
    
    print(f"\nEncontrados {len(drafts)} rascunho(s):")
    mutations = build_publish_mutations(drafts)
    
    if not mutations:
        print("Nenhuma mutation válida gerada.", file=sys.stderr)
        sys.exit(1)

    payload = {"mutations": mutations, "transactionId": f"publish-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"}

    if args.dry_run:
        print("\n[DRY-RUN] Payload preparado com sucesso (nenhuma chamada de rede realizada):")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    confirm = input(f"\nConfirma PUBLICAÇÃO de {len(drafts)} artigo(s) no Sanity ({SANITY_PROJECT_ID}/{SANITY_DATASET})? [s/N]: ").strip().lower()
    if confirm not in ("s", "sim", "y", "yes"):
        print("Publicação cancelada pelo operador.")
        return

    url = f"https://{SANITY_PROJECT_ID}.api.sanity.io/{SANITY_API_VERSION}/data/mutate/{SANITY_DATASET}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            print("\n✓ Sucesso! Resposta da API Sanity:")
            print(resp_body)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"\nErro HTTP {e.code} da API Sanity:\n{err_msg}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nErro inesperado de rede: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()