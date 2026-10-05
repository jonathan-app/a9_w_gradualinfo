# GradualInfo Editorial

Boilerplate definitivo para aplicações Next.js ultra-rápidas hospedadas na **Cloudflare Workers**, com **Supabase** como backend. Feito para ser o ponto de partida ideal para novos produtos, já trazendo a fundação necessária para desenvolvimento, deploy, CI/CD, testes, segurança e engenharia agêntica.

## 🚀 Stack Principal (Versões Reais)

- **Next.js 16.3**: App Router, Turbopack, e `proxy.ts` (em vez de `middleware.ts`).
- **React 19.3.0 & TypeScript 6.0.3**: Configurações estritas (`noUncheckedIndexedAccess`, `noImplicitOverride`).
- **Tailwind CSS 4.3**: Estilização gerenciada via CSS (`@theme`), eliminando o `tailwind.config.js`.
- **Supabase**: SSR 0.12 + JS 2.117. Autenticação baseada em Cookies de forma nativa e segura.
- **OpenNext 1.20**: Adaptação eficiente da saída do Next.js para o runtime da Cloudflare Workers.
- **Sentry 11.4**: Monitoramento nativo no `instrumentation.ts` sem `withSentryConfig`.
- **QA & Testes**: Vitest 4.1 (Unitários/Componentes) e Playwright 1.63 (E2E em Chromium).
- **Gerenciador de Pacotes**: pnpm 12.5.1 no Node >= 22.

---

## 🛠️ Começando

### 1. Preparação do Ambiente

```bash
# Instala dependências e ativa os hooks do Husky
pnpm install

# Prepara o arquivo de variáveis de ambiente
cp .env.example .env.local
```

### 2. Stack Local do Supabase

> **Nota:** É necessário ter o Docker em execução para rodar o backend localmente.

```bash
pnpm supabase:start   # Inicia a stack local do Supabase
pnpm supabase:reset   # Roda as migrations e o seed.sql
```

### 3. Rodando o Projeto

```bash
pnpm dev              # Inicia o modo de desenvolvimento (com Turbopack)
```

_Obs: O build e a CI deste boilerplate podem rodar **sem** `.env`, pois o `lib/env.ts` inclui padrões locais. No entanto, a autenticação e chamadas de banco dependerão das credenciais reais inseridas no `.env.local`._

---

## 🤖 Engenharia Agêntica & Fluxo de IA

Este projeto não foi desenhado apenas para humanos, mas também para ser manipulado eficientemente por agentes autônomos de IA (como Claude Code, Antigravity, Cursor, etc).

As **skills** estão versionadas em `.agents/skills/` (com origem fixada em `skills-lock.json`), garantindo que a inteligência artificial utilize um mesmo fluxo padronizado:

| Skill        | Propósito                                                               |
| ------------ | ----------------------------------------------------------------------- |
| `/scope`     | Planeja o que deve ser construído na próxima iteração.                  |
| `/architect` | Decide as abordagens técnicas, stack e define contratos arquiteturais.  |
| `/develop`   | Codifica as funcionalidades a partir da especificação aprovada.         |
| `/check`     | Validação e revisão do código feito antes do merge.                     |
| `/sync`      | Mantém os metadados do projeto em dia (atualiza `AGENTS.md` e estados). |
| `/audit`     | Bootstrap de contexto de IA para projetos (não precisa no dia-a-dia).   |

**Regra Universal de Handoff:**
Agentes não mantêm memória compartilhada. Eles se comunicam pelo repositório:

1. `AGENTS.md` guarda as convenções de projeto e contexto técnico (LEIA-O).
2. `workflow/STATE.md` guarda a fila e delegação de tarefas de quem está responsável pela etapa atual.

---

## ⌨️ Scripts Disponíveis

### Desenvolvimento e Build

- `pnpm dev`: Desenvolvimento com Turbopack. (`dev:spotlight` para integrar Sentry Spotlight)
- `pnpm build:next`: Validação rápida verificando se a compilação do Next.js passa.
- `pnpm build`: Build final, adaptado para rodar na infra da Cloudflare via OpenNext.

### Qualidade e Testes

- `pnpm check:all`: Validação global sequencial (Typecheck → Lint → Prettier → Testes Unitários).
- `pnpm test:run`: Roda os testes com Vitest (unitário/componentes).
- `pnpm test:e2e`: Roda os testes end-to-end com Playwright.

### Segurança e Performance

- `pnpm security:sast`: Validação Semgrep local com base em `security/semgrep.yml`.
- `pnpm security:secrets`: Análise de vazamento de credenciais via Gitleaks.
- `pnpm lighthouse:ci`: Builda, inicia o app e avalia os scores mínimos do Lighthouse.

### Template

- `pnpm template:export`: Script utilitário (`scripts/export-template.mjs`) que limpa rastros do Git, zera versões desnecessárias e empacota o boilerplate para iniciar perfeitamente um novo projeto a partir deste código.

---

## 🗺️ Mapa de Pastas

```text
├── app/               # Rotas, Server Components (App Router) e CSS Global
├── components/        # ui (design system), layout (headers/footers) e shared
├── docs/              # Destino e relatórios de IA: scope/, specs/, reviews/
├── e2e/               # Suíte de testes automatizados E2E do Playwright
├── hooks/             # Hooks globais do React
├── lib/               # env.ts tipado, clientes Supabase, e utils puros
├── referencias/       # template-editorial/ = referência visual versionada
├── scripts/           # Ferramentas Node customizadas para o boilerplate
├── security/          # Regras do Semgrep (SAST)
├── supabase/          # Configurações do Supabase, Migrations e Seeds
├── workflow/          # STATE.md (fila de delegação e memória entre IAs)
├── __tests__/         # Suíte de testes do Vitest (Unitários/Componentes)
├── .agents/           # Skills padronizadas da Engenharia Agêntica
└── proxy.ts           # Middleware centralizado para renovar a sessão Supabase
```

---

## 🔒 Portas e Rotas Úteis

Para evitar colisões no desenvolvimento, as portas estão fixadas:

- Aplicação Local: `http://localhost:3000`
- Playwright E2E: `http://localhost:3100` (`E2E_PORT`)
- Lighthouse CI: `http://localhost:3000` (`LIGHTHOUSE_PORT`) _(mudanças aqui exigem ajuste no `lighthouserc.js`)_
