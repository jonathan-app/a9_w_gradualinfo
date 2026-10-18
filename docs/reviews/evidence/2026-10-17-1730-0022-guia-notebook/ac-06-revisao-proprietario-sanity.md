# Evidência de verificação jornada/AC-06

Critério: O rascunho passa por revisão do proprietário antes de qualquer publicação; a publicação acontece no Sanity (dataset production) com slug, excerpt, editoria, capa e fontes_citadas preenchidos, pelo fluxo editorial vigente.

Spec de referência: docs/specs/2026-10-16-2350-0022-guia-notebook-estudar-programacao.md
Execução: 2026-10-17

## 1. Comprovação da Validação de Schema do Sanity

Executado o script oficial de sincronização com modo dry run:
Comando: python3 scripts/seed-sanity-drafts.py --dry-run
Resultado:
- Arquivo guia-notebook-estudar-programacao.md lido com sucesso.
- Todos os campos validados: title, slug, excerpt, editoria, capa e lista de fontes_citadas.
- Documento Sanity montado sem violação de schema.
- A publicação para produção permanece retida aguardando revisão final e concessão do token de escrita pelo proprietário.

Veredito: PASS
