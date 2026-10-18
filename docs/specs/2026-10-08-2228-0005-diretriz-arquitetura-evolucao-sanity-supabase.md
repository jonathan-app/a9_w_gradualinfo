# 0005. Diretriz arquitetural de evolução: Sanity + Supabase em duas fases

**Date**: 2026-10-08  
**Status**: Accepted (documentação preparada para versionamento)  
**Decision source**: Decisão e confirmação explícita do dono em 2026-10-08, definindo Sanity + Supabase como a arquitetura futura aprovada (Fase 2) e mantendo Supabase + Markdown no MVP atual (Fase 1).

---

## 1. Summary

Esta diretriz estabelece a fronteira de responsabilidades de longo prazo e a estratégia de evolução da infraestrutura do portal **GradualInfo**, garantindo que o MVP atual permaneça enxuto e validável sem a introdução prematura de serviços adicionais.

| Fase                            | Fonte editorial                                     | Papel do Supabase                                                     |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| **MVP atual (Fase 1)**          | Markdown na tabela `posts` no Supabase              | Conteúdo, persistência e preview existentes                           |
| **Evolução editorial (Fase 2)** | Sanity: artigos, autores, editorias, fontes e mídia | Dados da aplicação e relações pelo ID estável do artigo (`sanity_id`) |

---

## 2. Divisão de Responsabilidades (Fase 2)

Quando o volume editorial justificar a adoção de um CMS headless profissional, a separação será estrita para evitar duplicação ou conflitos de sincronização bidirecional:

### Sanity (CMS / Editorial)

Fonte única da verdade editorial onde o redator trabalha:

- Artigos e blocos editoriais estruturados
- Autores e perfis editoriais
- Categorias, editorias e tags
- Metadados de SEO editoriais
- Mídia e ativos editoriais

### Supabase (Aplicação / Dados Relacionais)

Armazenamento relacional e transacional da aplicação:

- Autenticação de leitores e perfis
- Preferências de usuário
- Dados relacionais vinculados ao conteúdo através do identificador estável (`sanity_id`), nunca replicando o texto editorial
- Políticas de segurança em nível de linha (RLS)

### Next.js na Cloudflare (Orquestração e Apresentação)

- Edge computing / Worker consumindo Sanity para renderização editorial e Supabase para estado de aplicação.

---

## 3. Delimitação Estrita de Escopo (Limites do MVP)

A definição desta arquitetura de evolução **não altera nem expande o escopo do MVP**:

1. **Fora do MVP**: Favoritos, comentários, contas de leitores, métricas internas e engajamento transacional **continuam fora do MVP**. A existência desta divisão não autoriza a implementação antecipada de nenhum desses recursos.
2. **Entregas Vigorosas do MVP**: Mantém-se o modelo acordado em `md-0001` (Markdown no Supabase com PostgreSQL e RLS) e `md-0002` (casca editorial, listagem e rotas `/artigos/[slug]`).
3. **Sem Reabertura**: Entregas e contratos já verificados permanecem preservados e não são reabertos por esta decisão.

---

## 4. Requisitos de Entrada para a Fase 2 (Spec de Migração)

A entrada efetiva do Sanity na Fase 2 **não poderá ocorrer de forma ad-hoc**. Ela exigirá obrigatoriamente uma spec formal de migração (`/architect`) que substitua explicitamente os contratos editoriais atuais, contemplando:

- **Substituição de Contratos**: Leitura pública, publicação, parsing de Markdown/Portable Text, preview com rascunhos, processamento de imagens e estratégias de cache/revalidação na Cloudflare.
- **Transferência de Conteúdo**: Migração do conteúdo existente em `posts` para o Sanity com validação de paridade.
- **Preservação de URLs e SEO**: Garantia de integridade de slugs, canonicals, sitemap e metadados estruturados para evitar qualquer quebra de indexação.
- **Fonte Única Ativa**: Após a virada de chave, apenas uma única fonte editorial permanecerá ativa, sem manter duplicatas no PostgreSQL.
- **Plano de Rollback e Validação**: Procedimento seguro de reversão caso ocorram anomalias na migração.

---

## 5. Próximo Passo Imediato

Esta diretriz fica aprovada e versionada como norte arquitetural futuro. O trabalho técnico imediato permanece focado na conclusão da configuração e validação do Cloudflare Worker com o Supabase de produção.
