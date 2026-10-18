#!/usr/bin/env python3
"""
scripts/seed-sanity-drafts.py
Carga segura de rascunhos editoriais em Markdown para o Sanity Content Lake.

Regras e garantias:
- Todos os documentos são criados como rascunhos (prefixo `drafts.<slug>` e status 'rascunho').
- Não publica nenhum artigo em ambiente público.
- Token de escrita é coletado com segurança via getpass (ou variável de ambiente) e nunca exibido.
- Suporta flag --dry-run para auditar o payload JSON antes de enviar à API.
"""

import argparse
import getpass
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

SANITY_PROJECT_ID = "4iipvaar"
SANITY_DATASET = "production"
SANITY_API_VERSION = "v2024-01-01"

def parse_markdown_post(filepath: Path):
    text = filepath.read_text(encoding="utf-8")
    
    # Split frontmatter and body
    frontmatter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
    if not frontmatter_match:
        raise ValueError(f"Frontmatter YAML não encontrado no arquivo {filepath.name}")
    
    raw_yaml, body = frontmatter_match.groups()
    
    data = {}
    current_list_key = None
    current_item = None
    
    for line in raw_yaml.splitlines():
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue
        
        # Check list item start (e.g. "  - titulo: ...")
        list_match = re.match(r"^\s+-\s+([a-zA-Z0-9_]+):\s*(.*)$", line)
        if list_match:
            k, v = list_match.groups()
            v = v.strip().strip('"').strip("'")
            current_item = {k: v}
            if current_list_key in data:
                data[current_list_key].append(current_item)
            continue
            
        # Check list sub-item (e.g. "    url: ...")
        subitem_match = re.match(r"^\s+([a-zA-Z0-9_]+):\s*(.*)$", line)
        if subitem_match and current_item is not None:
            k, v = subitem_match.groups()
            v = v.strip().strip('"').strip("'")
            current_item[k] = v
            continue
            
        # Top-level key
        key_match = re.match(r"^([a-zA-Z0-9_]+):\s*(.*)$", line)
        if key_match:
            current_item = None
            k, v = key_match.groups()
            v = v.strip()
            if not v:
                # Potential list
                current_list_key = k
                data[k] = []
            else:
                current_list_key = None
                v = v.strip('"').strip("'")
                if v == "null":
                    v = None
                data[k] = v

    slug = data.get("slug")
    if not slug:
        raise ValueError(f"Campo 'slug' ausente em {filepath.name}")

    # Monta documento Sanity no formato esperado por SanityPostDocument
    doc = {
        "_id": f"drafts.{slug}",
        "_type": "artigo",
        "title": data.get("title", "Sem título"),
        "slug": {
            "_type": "slug",
            "current": slug,
        },
        "excerpt": data.get("excerpt", ""),
        "content": body.strip(),
        "cover_image_url": data.get("cover_image", ""),
        "editoria": data.get("editoria", "Tecnologia"),
        "author_name": data.get("author", "Redação GradualInfo"),
        "status": "rascunho",
        "published_at": None,
        "fontes_citadas": data.get("fontes_citadas", []),
    }
    return doc

def main():
    parser = argparse.ArgumentParser(description="Ingestão de rascunhos no Sanity")
    parser.add_argument("--dir", default="docs/rascunhos-editoriais", help="Diretório de arquivos markdown")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula a geração do payload sem enviar à API")
    args = parser.parse_args()

    md_dir = Path(args.dir)
    if not md_dir.exists():
        print(f"Diretório não encontrado: {md_dir}", file=sys.stderr)
        sys.exit(1)

    md_files = sorted(list(md_dir.glob("*.md")))
    if not md_files:
        print(f"Nenhum arquivo .md encontrado em {md_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Encontrados {len(md_files)} rascunhos em {md_dir}:")
    mutations = []
    for f in md_files:
        try:
            doc = parse_markdown_post(f)
            mutations.append({"createOrReplace": doc})
            print(f"  ✓ {doc['_id']} ({doc['title'][:50]}...)")
        except Exception as e:
            print(f"  ✗ Erro em {f.name}: {e}", file=sys.stderr)
            sys.exit(1)

    payload = {"mutations": mutations}

    if args.dry_run:
        print("\n[DRY-RUN] Payload preparado com sucesso (nenhuma chamada de rede realizada):")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

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

    confirm = input(f"\nConfirma envio de {len(mutations)} rascunhos para o Sanity ({SANITY_PROJECT_ID}/{SANITY_DATASET})? [s/N]: ").strip().lower()
    if confirm not in ("s", "sim", "y", "yes"):
        print("Envio cancelado pelo operador.")
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
            print("\nSucesso! Resposta da API Sanity:")
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

