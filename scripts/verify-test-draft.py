#!/usr/bin/env python3
import urllib.request, urllib.error, json, re, getpass, sys

SITE_ORIGIN = "https://gradualinfo.com.br"
TEST_SLUG = "artigo-teste-preview"
SLUGS_PUBLISHED = [
    "auditoria-seo-tecnico-checklist",
    "como-verificar-respostas-da-ia",
    "construindo-gradualinfo-estudo-de-caso",
    "diagnosticar-erro-500-503-site",
    "seo-nextjs-16-metadata-indexacao",
    "site-lento-mesmo-com-boa-nota-pagespeed",
]

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def test_published_accessible():
    print("=== Publicados: devem ser 200 ===")
    for slug in SLUGS_PUBLISHED:
        url = f"{SITE_ORIGIN}/artigos/{slug}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "GradualInfo-Preview-Auditor/1.0",
            "Accept": "text/html,application/xhtml+xml",
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"✓ {slug}: HTTP {resp.status}")
        except urllib.error.HTTPError as e:
            print(f"✗ {slug}: HTTP {e.code} (esperado 200)")
            return False
    return True

def test_draft_isolated():
    print(f"\n=== Rascunho {TEST_SLUG}: deve ser 404 ===")
    url = f"{SITE_ORIGIN}/artigos/{TEST_SLUG}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "GradualInfo-Preview-Auditor/1.0",
        "Accept": "text/html,application/xhtml+xml",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"✗ {TEST_SLUG}: HTTP {resp.status} (esperado 404)")
            return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"✓ {TEST_SLUG}: HTTP 404 (isolado)")
            return True
        print(f"✗ {TEST_SLUG}: HTTP {e.code}")
        return False

def test_preview_flow(preview_secret):
    print(f"\n=== Preview flow {TEST_SLUG} ===")
    opener = urllib.request.build_opener(NoRedirectHandler)
    
    # Login
    payload = json.dumps({"token": preview_secret, "slug": TEST_SLUG}).encode()
    req = urllib.request.Request(f"{SITE_ORIGIN}/api/preview", data=payload,
        headers={"Origin": SITE_ORIGIN, "Content-Type": "application/json"}, method="POST")
    
    try:
        resp = opener.open(req, timeout=10)
        print(f"✗ Login: HTTP {resp.status} (esperado 303)")
        return False
    except urllib.error.HTTPError as e:
        if e.code != 303:
            print(f"✗ Login: HTTP {e.code}")
            return False
        cookie = re.search(r"(gradualinfo-preview=[^;]+)", e.headers.get("set-cookie", ""))
        if not cookie:
            print("✗ Cookie não encontrado")
            return False
        cookie_val = cookie.group(1)
        print(f"✓ Login: 303 + cookie")
    
    # Access draft
    req = urllib.request.Request(f"{SITE_ORIGIN}/artigos/{TEST_SLUG}",
        headers={"Cookie": cookie_val})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()
            if "Artigo de Teste para Preview" in body:
                print(f"✓ Acesso rascunho: HTTP 200 + conteúdo")
            else:
                print(f"✗ Acesso rascunho: HTTP 200 mas sem conteúdo esperado")
                return False
    except urllib.error.HTTPError as e:
        print(f"✗ Acesso rascunho: HTTP {e.code}")
        return False
    
    # Logout
    req = urllib.request.Request(f"{SITE_ORIGIN}/api/preview/logout", data=b"",
        headers={"Origin": SITE_ORIGIN, "Cookie": cookie_val}, method="POST")
    try:
        resp = opener.open(req, timeout=10)
        print(f"✗ Logout: HTTP {resp.status} (esperado 303)")
        return False
    except urllib.error.HTTPError as e:
        if e.code != 303:
            print(f"✗ Logout: HTTP {e.code}")
            return False
        print(f"✓ Logout: 303")
    
    # Cookie reuse
    req = urllib.request.Request(f"{SITE_ORIGIN}/artigos/{TEST_SLUG}",
        headers={"Cookie": cookie_val})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"✗ Cookie reuse: HTTP {resp.status} (esperado 404)")
            return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"✓ Cookie reuse: HTTP 404 (revogado)")
            return True
        print(f"✗ Cookie reuse: HTTP {e.code}")
        return False

def main():
    if not test_published_accessible():
        sys.exit(1)
    if not test_draft_isolated():
        sys.exit(1)
    
    secret = getpass.getpass("PREVIEW_SECRET: ").strip()
    if not test_preview_flow(secret):
        sys.exit(1)
    
    print("\n✓ TODOS OS TESTES PASSARAM")

if __name__ == "__main__":
    main()
