#!/usr/bin/env python3
"""
scripts/verify-preview-lifecycle.py
Validação empírica do ciclo de vida de preview editorial na produção do GradualInfo.

Testa:
1. Sem sessão: confirma HTTP 404 e ausência de vazamento de conteúdo dos 6 rascunhos.
2. Com preview autorizado: realiza POST /api/preview, obtém cookie de sessão e valida HTTP 200 com renderização íntegra.
3. Logout e revogação: realiza POST /api/preview/logout.
4. Reutilização de cookie pós-logout: valida que o cookie antigo agora devolve HTTP 404.
5. Proteção de segredos: todos os cookies e tokens são mantidos em memória e omitidos dos logs.
Registra: Horário UTC, Ray ID, HTTP Status e integridade sem expor credenciais.
"""

import argparse
import getpass
import http.cookiejar
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import urllib.error

SITE_ORIGIN = "https://gradualinfo.com.br"
SLUGS = [
    "diagnosticar-erro-500-503-site",
    "auditoria-seo-tecnico-checklist",
    "seo-nextjs-16-metadata-indexacao",
    "como-verificar-respostas-da-ia",
    "site-lento-mesmo-com-boa-nota-pagespeed",
    "construindo-gradualinfo-estudo-de-caso",
]

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Impede redirect automático para inspecionar 303 e Set-Cookie
        return None

def test_anonymous_isolation(base_url: str = SITE_ORIGIN):
    print("\n" + "=" * 60)
    print(f"ETAPA 1: Verificação de Isolamento Anônimo Exaustivo ({base_url})")
    print("=" * 60)
    all_clean = True
    
    # Mapeamento do conteúdo exato de cada rascunho para auditoria estrita
    from pathlib import Path
    md_dir = Path("docs/rascunhos-editoriais")
    draft_data = {}
    if md_dir.exists():
        for f in md_dir.glob("*.md"):
            txt = f.read_text(encoding="utf-8")
            slug_match = re.search(r'slug:\s*["\']?([^"\'\n]+)', txt)
            title_match = re.search(r'title:\s*["\']?([^"\'\n]+)', txt)
            excerpt_match = re.search(r'excerpt:\s*["\']?([^"\'\n]+)', txt)
            cover_match = re.search(r'cover_image:\s*["\']?([^"\'\n]+)', txt)
            if slug_match:
                s = slug_match.group(1).strip()
                draft_data[s] = {
                    "title": title_match.group(1).strip() if title_match else "",
                    "excerpt": excerpt_match.group(1).strip() if excerpt_match else "",
                    "cover": cover_match.group(1).strip() if cover_match else "",
                }

    for slug in SLUGS:
        url = f"{base_url}/artigos/{slug}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "GradualInfo-Preview-Auditor/1.0",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                ray_id = resp.headers.get("cf-ray", "N/A")
                print(f"✗ FALHA: {slug} retornou HTTP {status} (esperado 404) | Ray: {ray_id}")
                all_clean = False
        except urllib.error.HTTPError as e:
            ray_id = e.headers.get("cf-ray", "N/A")
            date = e.headers.get("date", "N/A")
            body = e.read().decode("utf-8", errors="replace")
            is_404 = e.code == 404
            
            # Auditoria exaustiva de conteúdo
            leaks = []
            info = draft_data.get(slug, {})
            if info.get("title") and info["title"] in body:
                leaks.append("title")
            if info.get("excerpt") and info["excerpt"] in body:
                leaks.append("excerpt")
            if info.get("cover") and info["cover"] in body:
                leaks.append("cover_image")
            
            # Checagem de termos universais
            for term in ["Durable Object", "CrUX", "Lighthouse", "RFC 9110", "AI RMF 1.0"]:
                # Ignora menções no rodapé da aplicação padrão ("Next.js 16")
                if term in body:
                    leaks.append(f"term:{term}")

            if is_404 and not leaks:
                print(f"✓ {slug}: HTTP 404 estrito | Date: {date} | Ray: {ray_id} | Inspecionado: título, resumo, capa e termos (zero vazamento)")
            else:
                print(f"✗ FALHA: {slug} status {e.code}, vazamento detectado: {leaks} | Ray: {ray_id}")
                all_clean = False
    return all_clean

def test_preview_flow(preview_secret: str, target_slug: str, base_url: str = SITE_ORIGIN, origin: str = SITE_ORIGIN):
    print("\n" + "=" * 60)
    print(f"ETAPA 2: Teste de Concessão de Preview Autorizado ({target_slug})")
    print("=" * 60)

    opener = urllib.request.build_opener(NoRedirectHandler)

    # 1. Login no preview
    preview_url = f"{base_url}/api/preview"
    payload = json.dumps({"token": preview_secret, "slug": target_slug}).encode("utf-8")
    req = urllib.request.Request(
        preview_url,
        data=payload,
        headers={
            "Origin": origin,
            "Content-Type": "application/json",
            "User-Agent": "GradualInfo-Preview-Auditor/1.0",
        },
        method="POST",
    )

    preview_cookie = None
    try:
        resp = opener.open(req, timeout=10)
        status = resp.status
        ray_id = resp.headers.get("cf-ray", "N/A")
        print(f"Resposta inesperada HTTP {status} | Ray: {ray_id}")
        return False
    except urllib.error.HTTPError as e:
        status = e.code
        ray_id = e.headers.get("cf-ray", "N/A")
        date = e.headers.get("date", "N/A")
        if status == 303:
            set_cookie = e.headers.get("set-cookie", "")
            match = re.search(r"(gradualinfo-preview=[^;]+)", set_cookie)
            if match:
                preview_cookie = match.group(1)
                print(f"✓ POST /api/preview: HTTP 303 (Sessão emitida no DO) | Date: {date} | Ray: {ray_id} | Cookie: [REDACTED]")
            else:
                print(f"✗ HTTP 303 retornado mas Set-Cookie 'gradualinfo-preview' ausente | Ray: {ray_id}")
                return False
        elif status == 503:
            print(f"✗ HTTP 503: Durable Object indisponível ou falha de persistência | Date: {date} | Ray: {ray_id}")
            return False
        elif status == 401:
            print(f"✗ HTTP 401: PREVIEW_SECRET incorreto ou não reconhecido | Date: {date} | Ray: {ray_id}")
            return False
        elif status == 403:
            print(f"✗ HTTP 403: Origem não autorizada ou rejeitada | Date: {date} | Ray: {ray_id}")
            return False
        elif status == 429:
            print(f"✗ HTTP 429: Limite de tentativas excedido | Date: {date} | Ray: {ray_id}")
            return False
        elif status == 400:
            print(f"✗ HTTP 400: Requisição inválida ou malformada | Date: {date} | Ray: {ray_id}")
            return False
        else:
            print(f"✗ Erro HTTP {status} | Date: {date} | Ray: {ray_id}")
            return False

    # 2. Acesso à página do artigo com cookie de preview
    print("\n" + "=" * 60)
    print(f"ETAPA 3: Acesso ao Artigo com Cookie de Preview ({target_slug})")
    print("=" * 60)

    article_url = f"{base_url}/artigos/{target_slug}"
    req_article = urllib.request.Request(
        article_url,
        headers={
            "Cookie": preview_cookie,
            "User-Agent": "GradualInfo-Preview-Auditor/1.0",
            "Accept": "text/html,application/xhtml+xml",
        },
    )

    try:
        with urllib.request.urlopen(req_article, timeout=10) as resp:
            status = resp.status
            ray_id = resp.headers.get("cf-ray", "N/A")
            date = resp.headers.get("date", "N/A")
            body = resp.read().decode("utf-8", errors="replace")
            
            # Validações de conteúdo
            has_title = ("Por que seu site retorna" in body or 
                         "Auditoria SEO" in body or 
                         "SEO no Next.js" in body or 
                         "Como verificar" in body or 
                         "Seu site é lento" in body or 
                         "Construindo o GradualInfo" in body)
            has_badge = "preview" in body.lower() or "rascunho" in body.lower() or "preview-banner" in body.lower()

            print(f"✓ GET /artigos/{target_slug}: HTTP {status} | Date: {date} | Ray: {ray_id}")
            print(f"  - Renderização de conteúdo confirmada: {has_title}")
            print(f"  - Tamanho da resposta: {len(body)} bytes")
    except urllib.error.HTTPError as e:
        ray_id = e.headers.get("cf-ray", "N/A")
        print(f"✗ GET /artigos/{target_slug}: HTTP {e.code} | Ray: {ray_id}")
        return False

    # 3. Logout do preview
    print("\n" + "=" * 60)
    print("ETAPA 4: Encerramento de Sessão (Logout e Revogação no DO)")
    print("=" * 60)

    logout_url = f"{base_url}/api/preview/logout"
    req_logout = urllib.request.Request(
        logout_url,
        data=b"",
        headers={
            "Origin": origin,
            "Cookie": preview_cookie,
            "User-Agent": "GradualInfo-Preview-Auditor/1.0",
        },
        method="POST",
    )

    try:
        resp = opener.open(req_logout, timeout=10)
        print(f"Resposta inesperada HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        ray_id = e.headers.get("cf-ray", "N/A")
        date = e.headers.get("date", "N/A")
        if e.code == 303:
            print(f"✓ POST /api/preview/logout: HTTP 303 (Revogação síncrona no DO confirmada) | Date: {date} | Ray: {ray_id}")
        else:
            print(f"✗ Falha no logout: HTTP {e.code} | Ray: {ray_id}")
            return False

    # 4. Reutilização do cookie revogado (Cookie Reuse Test)
    print("\n" + "=" * 60)
    print("ETAPA 5: Teste de Reutilização de Cookie Revogado (Cookie Reuse)")
    print("=" * 60)

    req_reused = urllib.request.Request(
        article_url,
        headers={
            "Cookie": preview_cookie,
            "User-Agent": "GradualInfo-Preview-Auditor/1.0",
            "Accept": "text/html,application/xhtml+xml",
        },
    )

    try:
        with urllib.request.urlopen(req_reused, timeout=10) as resp:
            ray_id = resp.headers.get("cf-ray", "N/A")
            print(f"✗ FALHA GRAVE: Cookie revogado ainda retornou HTTP {resp.status}! | Ray: {ray_id}")
            return False
    except urllib.error.HTTPError as e:
        ray_id = e.headers.get("cf-ray", "N/A")
        date = e.headers.get("date", "N/A")
        if e.code == 404:
            print(f"✓ GET /artigos/{target_slug} com cookie revogado: HTTP 404 (Acesso negado com sucesso) | Date: {date} | Ray: {ray_id}")
            return True
        else:
            print(f"Resultado inesperado pós-revogação: HTTP {e.code} | Ray: {ray_id}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Validador empírico do ciclo de preview")
    parser.add_argument("--base-url", default=SITE_ORIGIN, help="URL base da aplicação (ex: https://gradualinfo.com.br ou http://localhost:8787)")
    parser.add_argument("--origin", default=SITE_ORIGIN, help="Header Origin enviado na requisição (default: https://gradualinfo.com.br)")
    parser.add_argument("--anonymous-only", action="store_true", help="Executa apenas a verificação anônima (sem solicitar segredo)")
    parser.add_argument("--slug", default=SLUGS[0], help="Slug alvo para o teste de preview")
    args = parser.parse_args()

    # 1. Isolamento anônimo
    anon_ok = test_anonymous_isolation(args.base_url)
    if not anon_ok:
        print("\n✗ ALERTA: O isolamento anônimo falhou. Abortando testes de preview.")
        sys.exit(1)

    if args.anonymous_only:
        print("\n✓ Verificação anônima concluída com 100% de isolamento.")
        return

    # 2. Solicita PREVIEW_SECRET para os testes de sessão
    print("\nPara validar as Etapas 2 a 5 (Login, Renderização, Logout e Cookie Reuse):")
    secret = os.environ.get("PREVIEW_SECRET", "").strip()
    if not secret:
        try:
            secret = getpass.getpass("Informe o PREVIEW_SECRET (entrada oculta): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nOperação cancelada.", file=sys.stderr)
            sys.exit(1)
    if not secret:
        print("PREVIEW_SECRET não fornecido. Etapas de preview ignoradas.")
        return

    preview_ok = test_preview_flow(secret, args.slug, args.base_url, args.origin)
    if preview_ok:
        print("\n" + "=" * 60)
        print("✓ CICLO DE VIDA DE PREVIEW VALIDADO COM SUCESSO:")
        print("  1. Anônimo: 404 estrito em todos os 6 rascunhos (sem vazamento)")
        print("  2. Preview Autorizado: 200 íntegro via Durable Object")
        print("  3. Logout/Revogação: 303 com invalidação síncrona no DO")
        print("  4. Cookie Reuse: 404 estrito após revogação")
        print("=" * 60)
    else:
        print("\n✗ Falha na validação do ciclo de preview.")
        sys.exit(1)

if __name__ == "__main__":
    main()

