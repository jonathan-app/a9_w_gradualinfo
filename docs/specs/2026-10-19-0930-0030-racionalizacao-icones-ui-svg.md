# 0030. Racionalizacao de icones de interface e remocao de dependencia externa

**Date**: 2026-10-19  
**Status**: Accepted  
**Decision source**: Aprovado pelo usuario no chat em 2026-10-19

## Summary

Esta decisao formaliza a substituicao da biblioteca externa react-icons por componentes SVG nativos isolados no repositorio GradualInfo. A remocao elimina um pacote volumoso que continha milhares de icones para atender apenas 5 simbolos em 3 arquivos. Com isso, preservamos exatamente a aparencia visual, garantimos acessibilidade com leitores de tela e reduzimos o peso da arvore de dependencias sem qualquer perda de funcionalidade.

## Context

Ao longo da auditoria de dependencias da Fase 1, identificamos que o pacote react-icons (versao 5.7.0) esta instalado como dependencia de producao no package.json. No entanto, uma varredura completa em toda a base de codigo comprovou que a biblioteca e importada em apenas 3 componentes para exibir 5 icones da subfamilia Lucide:

1. app/busca/page.tsx: LuArrowUpRight e LuSearch
2. components/layout/site-header.tsx: LuHouse e LuSearch
3. components/shared/theme-toggle.tsx: LuMoon e LuSun

Enquanto o painel administrativo ja adota icones SVG nativos e acessiveis sem dependencias externas adicionais (a exemplo de components/admin/dashboard/table-icon.tsx), a casca publica mantinha a dependencia de react-icons ativa. Manter essa biblioteca apenas para 5 icones onera a pasta node_modules, amplia a superficie de analise de seguranca em lockfiles e introduz camadas desnecessarias de abstracao no empacotamento do Next.js.

## Requirements

**User stories**:

- Como visitante do portal, quero ver icones nitidos e visualmente identicos na busca, navegacao e seletor de tema claro e escuro.
- Como usuario com deficiencia visual, quero que icones meramente decorativos fiquem ocultos para leitores de tela via atributo aria-hidden adequado.
- Como engenheiro de software, quero componentes reutilizaveis e tipados em TypeScript em pasta dedicada, sem dependencias externas pesadas.

**Acceptance criteria**:

- **icon-clean/AC-01**: Criacao de componentes de icone SVG nativos em components/shared/icons/ cobrindo SearchIcon, HomeIcon, ArrowUpRightIcon, SunIcon e MoonIcon, com viewBox 0 0 24 24, stroke currentColor, strokeWidth 2, fill none e suporte as propriedades className e aria-hidden.
- **icon-clean/AC-02**: Atualizacao de app/busca/page.tsx para utilizar SearchIcon e ArrowUpRightIcon locais em substituicao a LuSearch e LuArrowUpRight, preservando dimensoes e estilos Tailwind existentes.
- **icon-clean/AC-03**: Atualizacao de components/layout/site-header.tsx e components/shared/theme-toggle.tsx para utilizar HomeIcon, SearchIcon, MoonIcon e SunIcon locais, sem nenhuma alteracao de layout ou interatividade.
- **icon-clean/AC-04**: Remocao definitiva do pacote react-icons de dependencies no package.json e reconciliacao do pnpm-lock.yaml, comprovando ausencia total de imports remanescentes.
- **icon-clean/AC-05**: Aprovacao integral dos portoes de qualidade locais via pnpm check:all (859 testes Vitest verdes, typecheck limpo, ESLint limpo, Prettier e seguranca estatica com 0 segredos e 0 erros).

## Options considered

### Option 1: Criacao de componentes SVG dedicados em components/shared/icons/ e remocao de react-icons (Recomendada)

Criar arquivos individuais com componentes React puros renderizando os tracados SVG exatos da familia Lucide com stroke currentColor e viewBox 24x24.

**Pros**:

- Elimina uma dependencia inteira de producao (react-icons).
- Zero impacto no layout visual, mantendo proporcoes e cores identicas.
- Alinhado ao padrao que o projeto ja adotou com sucesso no painel administrativo.
- Facil de auditar e sem custos de analise estatica em lockfiles gigantes.

**Cons**:

- Exige criacao de 5 componentes leves no repositorio.

### Option 2: Migrar para a biblioteca lucide-react

Substituir react-icons pelo pacote oficial lucide-react.

**Pros**:

- Fornece suporte direto aos icones da familia Lucide via pacote dedicado.

**Cons**:

- Adiciona uma nova dependencia externa de producao para apenas 5 icones.
- Contraria os principios Ponytail de senioridade que priorizam a menor quantidade de codigo novo e zero dependencias dispensaveis.

### Option 3: SVGs inline diretamente dentro do JSX de cada componente

Escrever os elementos SVG inline diretamente nos 3 arquivos consumidores.

**Pros**:

- Nao cria arquivos novos em components/shared/icons/.

**Cons**:

- Duplica a definicao do SearchIcon, que e utilizado tanto em app/busca quanto em site-header.
- Dificulta a manutencao e reaproveitamento de estilos em outros componentes.

## Decision

**Chosen option**: Option 1: Criacao de componentes SVG dedicados em components/shared/icons/ e remocao de react-icons

A solucao adota componentes funcionais puros em TypeScript para cada um dos 5 icones necessarios, organizados em components/shared/icons/, permitindo a remocao completa da biblioteca react-icons do projeto.

## Rationale

A Opcao 1 respeita com exatidao as diretrizes de senioridade do modo Ponytail e as regras universais de desenvolvimento limpo. O GradualInfo utiliza apenas 5 icones da biblioteca Lucide. Carregar um pacote com dezenas de milhares de icones para consumir apenas 5 e um desperdicio de espaco em disco e complexidade de arvore de dependencias. A solucao nativa reutiliza o padrao SVG existente no repositorio, mantem acessibilidade impecavel e garante paridade absoluta de pixels.

## Feature design

**Componentes e interfaces**:

Os componentes serao alocados em components/shared/icons/:

- components/shared/icons/search-icon.tsx
- components/shared/icons/home-icon.tsx
- components/shared/icons/arrow-up-right-icon.tsx
- components/shared/icons/sun-icon.tsx
- components/shared/icons/moon-icon.tsx
- components/shared/icons/index.ts (barril de exportacoes limpo)

**Interface tipada padronizada**:

```typescript
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}
```

Cada componente assume por padrao:

- `aria-hidden="true"` quando nenhum aria-label for informado
- `fill="none"`
- `stroke="currentColor"`
- `strokeWidth="2"`
- `strokeLinecap="round"`
- `strokeLinejoin="round"`
- `viewBox="0 0 24 24"`

**Value sourcing**:

| Acao                               | Valor produzido / exibido | Origem                                                        |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------- |
| Renderizar icone de busca          | SVG vetorial com lupa     | Tracado Lucide exato (cx 11 cy 11 r 8 e linha m21 21-4.3-4.3) |
| Renderizar icone de pagina inicial | SVG vetorial com casa     | Tracado Lucide exato (paredes e telhado 24x24)                |
| Renderizar icone de link externo   | SVG vetorial com seta     | Tracado Lucide exato (seta diagonal nordeste)                 |
| Renderizar icone de tema sol       | SVG vetorial de sol       | Tracado Lucide exato (circulo central e 8 raios)              |
| Renderizar icone de tema lua       | SVG vetorial de lua       | Tracado Lucide exato (arco crescente 24x24)                   |

**Cenarios criticos de teste**:

- Renderizacao visual e DOM: os icones renderizam nos 3 componentes consumidores com as classes Tailwind esperadas (text-muted-foreground, h-4 w-4, etc.), verificando **icon-clean/AC-01**, **icon-clean/AC-02** e **icon-clean/AC-03**
- Acessibilidade: atributos decorativos aria-hidden presentes evitando leitura repetitiva por tecnologias assistivas, verificando **icon-clean/AC-01**
- Higiene de dependencias: nenhuma referencia a react-icons em arquivos .ts ou .tsx e pacote removido do package.json, verificando **icon-clean/AC-04**
- Seguranca e suites: suíte completa Vitest com 859 testes mantida 100 por cento verde, verificando **icon-clean/AC-05**

## Migration plan

**Strategy**: replace directly

A substituicao e de baixo risco e escopo delimitado a 3 arquivos consumidores:

1. Criacao dos 5 componentes de icone em components/shared/icons/ e arquivo de indice.
2. Troca cirurgica dos imports em app/busca/page.tsx, components/layout/site-header.tsx e components/shared/theme-toggle.tsx.
3. Remocao do pacote react-icons via comando pnpm remove react-icons.
4. Validacao total com pnpm check:all.

**Rollback**:
Em caso de anomalia, reversao direta das alteracoes de codigo e reinstalacao da versao anterior via pnpm install.

## Build plan

1. Criar pasta components/shared/icons/ com os 5 componentes de icones SVG e o index de exportacao, satisfazendo **icon-clean/AC-01**
2. Atualizar imports e uso dos icones em app/busca/page.tsx, satisfazendo **icon-clean/AC-02**
3. Atualizar imports e uso dos icones em components/layout/site-header.tsx e components/shared/theme-toggle.tsx, satisfazendo **icon-clean/AC-03**
4. Executar a remocao de react-icons do package.json e atualizar pnpm-lock.yaml, satisfazendo **icon-clean/AC-04**
5. Executar o portao consolidado local pnpm check:all e testes de regressao visual, satisfazendo **icon-clean/AC-05**

## Consequences

- Reducao imediata de complexidade e tamanho na pasta node_modules.
- Menor tempo de resolucao de dependencias no pnpm install tanto em desenvolvimento quanto na CI.
- Manutencao de 100 por cento de fidelidade visual para os leitores e usuarios do GradualInfo.
- Nenhum novo pacote externo introduzido no projeto.
