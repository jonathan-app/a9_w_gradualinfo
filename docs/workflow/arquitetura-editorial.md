# Arquitetura Agêntica do GradualInfo

O GradualInfo não é apenas um site, é um **produto editorial e uma máquina de conteúdo repetível**. Para garantir velocidade, qualidade e confiabilidade sem sobrecarregar o contexto da IA, utilizamos um ecossistema de skills reduzido e focado, dividido em três camadas.

## As Três Camadas

```text
                    GRADUALINFO
                         │
              ┌──────────┴──────────┐
              │                     │
       ENGINEERING CORE       SPECIALIST BASE
              │                     │
          9 skills              selecionadas
              │                     │
              └──────────┬──────────┘
                         │
                 EDITORIAL SYSTEM
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
        SEO          Conteúdo        Confiabilidade
          │              │              │
      indexing       planning       citations
      technical      clusters       sources
      schema         writing        verification
      internal       refresh        fact checking
      links
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                     LEITOR
                         ↓
                  retorno / confiança
                         ↓
                    monetização
```

## 1. Engineering Core (P0)

A base de sustentação do código e ciclo de vida.

- **[Instalado em `.agents/skills/`]**: `/scope`, `/audit`, `/architect`, `/develop`, `/check`, `/test`, `/document`, `/sync`, `/debug`

## 2. Specialist Base (Web & Engenharia)

Skills focadas na stack atual. Estas são carregadas apenas quando uma fatia de desenvolvimento exige.

- **[Instaladas no projeto]**: `nextjs-seo-indexing` (P0), `supabase` (P1), `supabase-postgres-best-practices` (P1), `security-and-hardening` (P1), `testing-qa` (P1), `frontend-design` (P2)
- **[Candidatas futuras - não instaladas]**: `web-performance-optimization` (P1), `ui-a11y` (P1), `e2e-testing` (P1), `ui-ux-designer` (P2), `ux-audit` (P2), `ux-copy` (P2), `react-component-performance` (P2)

## 3. Editorial System (O Motor do Portal)

Skills focadas na estratégia de conteúdo, SEO e validação de fatos (Fact Checking). _Nenhuma destas skills está fisicamente instalada ainda (precisarão ser restauradas da origem antes da produção de conteúdo)._

- **Confiabilidade:** `verify-citations` (P0)
- **Planejamento:** `seo-fundamentals` (P0), `seo-content-planner` (P0), `seo-aeo-keyword-research` (P0)
- **Escrita e Qualidade:** `seo-content` (P0), `seo-aeo-content-quality-auditor` (P0), `seo-content-auditor` (P1), `seo-content-refresher` (P1)
- **Arquitetura de Informação:** `seo-aeo-content-cluster` (P0), `seo-aeo-internal-linking` (P1), `seo-schema` (P1), `seo-technical` (P1)

## Regras de Ouro

1. **Não instale skills de ataque** (ex: `sql-injection-testing`, `burp-suite-testing`). O foco de segurança deve ser defensivo.
2. **Contexto limpo (Dynamic Loading):** Diferencie as skills de ciclo de vida (Core) das skills Especialistas. Especialistas sob demanda (como UI/UX ou refatoração) não devem sobrecarregar o contexto global do bot; elas devem ser chamadas individualmente durante a tarefa (`@skill-name` ou via instalação temporária na branch).
3. **Foco na Veracidade:** A skill `verify-citations` é um pilar P0. Nenhuma afirmação é publicada sem verificação de fonte confiável.
