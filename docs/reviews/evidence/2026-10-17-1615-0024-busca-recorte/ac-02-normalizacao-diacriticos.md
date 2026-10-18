# Evidência de verificação busca/AC-02

- Critério: A busca textual normaliza caracteres removendo diacríticos e convertendo para minúsculas, avaliando correspondências nos campos título, resumo, editoria e corpo textual dos artigos públicos.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação da função de normalização e busca unitária

A suíte __tests__/unit/lib/search-posts.test.ts valida a função pura normalize e a correspondência nos quatro campos do artigo:
- Removidos acentos agudos, circunflexos, tis e cedilhas: "Atenção Épica Ímpar Órbita Úmido Ç" converte para "atencao epica impar orbita umido c".
- Busca por "nuvem" encontra artigo com termo no título ("Segurança em Nuvem").
- Busca por "criptografia" encontra artigo com termo no resumo ("Guia de criptografia").
- Busca por "digital" encontra artigo com termo na editoria ("Segurança Digital").
- Busca por "firewall" encontra artigo com termo no corpo ("Auditoria de firewall").

## 2. Comprovação no navegador via Playwright

O teste em e2e/search-flow.spec.ts navega para:
- /busca?q=inteligencia (sem acento)
- /busca?q=inteligência (com acento)

Ambas as consultas retornam com sucesso o cabeçalho correspondente e encontram artigos com termos acentuados.

Veredito: PASS
