# Plano de atualização após auditoria

Data: 2026-10-07 · Estado: execução autorizada pelo dono; implementação parcial; prova em produção e CI pendentes.
Base: HEAD `cfcfd6fa5bed981393ee6e8cc18afb30243403e7` com alterações locais; não representa sozinho a árvore atual.
Fonte: [auditoria original](docs/audits/2026-10-06-deep-audit-original.txt), SHA-256 `a02c7b9ce8a49e26105110fdff66129a6155102194e33048670ce0a1ab3babbc`.

Objetivo: fechar lacunas da entrega editorial com contrato e prova por AC, mantendo Next/React/Tailwind, Supabase/RLS e Cloudflare/OpenNext. O dono deu sinal verde em 2026-10-07 para executar o plano e as recomendações apresentadas, incluindo os contratos 0003 e 0004. Merge e deploy dependem da decisão final da etapa 10.

## Reconciliação com a árvore atual

O serializador JSON-LD e seu teste unitário já existem. A exceção exclusiva de JSON-LD em AC-06 e a política de cache foram aprovadas nesta sessão; a md-0002 está registrada como Accepted na árvore, sem que isso prove funcionamento. O dono decidiu preview com 30 minutos absolutos, um UUID configurado e POST sem guardar o segredo. O contrato consolidado está Accepted em [0003-preview-autorizacao](docs/specs/0003-preview-autorizacao.md), com o aceite e seu limite registrados. Implementação e revisão são estados distintos.

CI e gate foram inspecionados em [auditoria da etapa 4](docs/audits/2026-10-07-ci-gate-etapa4.md), com falhas de vínculo SHA/árvore, completude de ACs, banco/fixtures no E2E, servidor compilado, typecheck E2E e scanners. A implementação depende da etapa 3 e do contrato do gate. [Inventário da etapa 5](docs/audits/2026-10-07-skills-governanca.md) registra 90 diretórios de skills, 9 no lock, 81 extras e referências locais ausentes; allowlist e prova de versão permanecem pendentes.

CSP/HSTS, threat model e regras de exportação já existem: validar, não recriar. Metadata boilerplate e /exemplo no sitemap continuam pendentes de reconciliação. Relatórios registram execuções em dev, mas não substituem a prova dos 12 cenários em produção compilada nem CI remota. Nenhuma dessas etapas foi declarada concluída por presença de arquivo.

**Progresso da etapa 1:** matriz dos 13 ACs, 12 cenários, classificação do diff e manifesto de 301 arquivos registrados em [inventário](docs/reviews/2026-10-07-md0002-inventario.md). O inventário histórico registrou gate REPROVADO, 13 UNVERIFIABLE e 2 BLOCKER estáticos. Há execução posterior em dev registrada no STATE; a verificação de produção compilada e a consolidação por revisão continuam pendentes. A etapa não está concluída.

## Sequência de trabalho

Cada linha vira uma entrega separada; registrar artefato e prova no STATE antes de avançar. As referências P0/P1/P2 correspondem à auditoria de origem.

| Ordem | Atualização e responsável                                                                                                                                                                                                          | Dependência e critério de conclusão                                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Inventário e evidência atual — /check** (P0-05/06/09; P1-11). Registrar revisão/hash da spec, SHA e manifesto da árvore, classificar o diff sem descartar nada; produzir matriz AC-01…13 e anexar os 12 cenários HTTP/auth/axe.  | Começar pela verificação local já autorizada. Nenhuma ausência vira PASS; identificar bloqueio técnico e separar evidência histórica.                                                    |
| 2     | **Contrato editorial — /architect + dono** (P0-03; P1-03/07). Resolver AC-06/JSON-LD, política de cache e origem das imagens; apresentar o conteúdo de md-0002 para aceite.                                                        | Após 1. Emenda/aceite só com decisão explícita; não substituir dangerouslySetInnerHTML por helper e declarar AC cumprido.                                                                |
| 3     | **JSON-LD e preview — /develop** (P0-04; P1-08/09/10). Reutilizar serializador; validar HTML malicioso; projetar segredo separado da senha, transporte sem query, expiração, comparação criptográfica e autorização de identidade. | Após contrato em 2. Negativos reais: sessão expirada, sem claim, identidade diferente, falha de logout; cookie Secure e artigo protegido no-store.                                       |
| 4     | **CI e gate por SHA — /develop** (P0-02/07; P1-12/13). Auditar jobs existentes, fixtures/banco no job E2E, servidor compilado, typecheck E2E, gitleaks, regras Semgrep locais e ferramentas pinadas.                               | Após 1–3. Gate rejeita decisão ausente, incompleta, reprovada ou de outra árvore/SHA; comparar conjuntos exatos de ACs. Checks mecânicos continuam distintos de aprovação.               |
| 5     | **Skills e governança — /audit + /document** (P0-01/08; P2-01). Conferir lock versus instalação e allowlist local; reconciliar BRANCHES, CODEOWNERS e referências inexistentes.                                                    | Inventário de 1. Verificador detecta skill extra/versão divergente; proteção GitHub só consta ativa com evidência remota. Alterações administrativas dependem de autorização específica. |
| 6     | **Headers, segredos e dependências — /architect → /develop** (P1-01/02). Revisar threat model e CSP com Sentry/hidratação; condicionar HSTS ao domínio HTTPS; avaliar regras oficiais Next e compatibilidade Next/OpenNext.        | Após 2–3. Rodar security:secrets, security:sast e audit sem ignorar achados. Versão alvo, incluindo sugestão 16.4, deve ser confirmada em fontes oficiais na execução; sem upgrade cego. |
| 7     | **Produto editorial — /develop** (P1-04/05/06). Corrigir metadata, navegação e sitemap; fechar home/artigo/fontes conforme spec aceita.                                                                                            | Após 2. Sem /exemplo público; canonical e sitemap coerentes. Teto de 1000 documentado com gatilho de paginação, sem antecipar escala.                                                    |
| 8     | **Testes e exportação — /test + /develop** (P0-10; P1-14/15). Revisar duplicações e cobertura por domínio; validar export limpo com regras existentes.                                                                             | Após correções. Testes sensíveis à quebra de autorização/render; medir antes de elevar piso; ZIP sem .git, builds, caches, worktrees ou resultados de teste.                             |
| 9     | **Verificação final — /check verify e review** (todos os P0/P1). Executar check:all, cobertura, pgTAP, E2E em produção local, axe/teclado/mobile/reduced motion, build Next/OpenNext e preview local; confirmar CI.                | Após 2–8 e ambiente liberado. 13 ACs completos + 12 cenários rastreados sem confundir suas contagens; provas por SHA/árvore; review independente; ambos os gates aprovados.              |
| 10    | **Publicação e evolução — decisão do dono → /scope** (P2-02/03/04). Só após 9, propor conteúdo real, domínio, observabilidade e publicação; busca/newsletter/afiliados depois.                                                     | Merge/deploy continuam sem autorização. RAG, MCP de produto, preços, comunidade e painel ficam fora desta atualização; precisam de escopo próprio.                                       |

## Saída

A atualização técnica termina em 9 com contratos aceitos, evidências completas e gates/CI confirmados. Build verde não prova HTTP, auth ou acessibilidade; timeout permanece UNVERIFIABLE. O passo 10 é uma decisão futura, não tarefa de deploy autorizada. Relatórios antigos são preservados como históricos e não contam como aprovação da revisão atual.

## Execução autorizada em 2026-10-07

Preview implementado com POST, credenciais distintas, UUID único e prazo
assinado de 30 minutos vinculado à sessão verificada. Gate estrito compara
conjuntos de ACs, spec, SHA, árvore e hashes das evidências. CI provisiona
banco local e fixtures, compila servidor E2E com HTTPS, inclui typecheck E2E
e scanners locais. A matriz gerada preserva UNVERIFIABLE até avaliação por
AC, portanto não há aprovação de entrega.

Permanecem pendentes: negativos E2E completos de identidade e claim, falha
real de leitura, pin de actions por SHA confirmado upstream, execução de
scanners, banco, E2E, Lighthouse e CI; integração de avaliação completa do
/check com o artefato gerado; governança remota, reconciliação dos 81 extras
de skills e evidência de origem das imagens reais. Sem remoção de skills,
merge ou deploy nesta execução. Verificação detalhada em
`docs/audits/2026-10-07-plano-execucao-parcial.md`.

### Continuação para resolver problemas

Negativos E2E, três contas e stress do limite de dez implementados. Proxy
local de falhas e banco descartável de JWT curto ficam fora da aplicação e
do checkout avaliado. Gate agora deriva avaliação mecânica de casos
específicos e manifests, com negação de provas incompletas. Actions foram
pinadas por SHA confirmado; Lighthouse recebeu configuração válida.
Quarentena de 81 extras preparada sem apagar conteúdo, pendente de permissão
na pasta protegida. Implementação não substitui execução: próxima etapa é
/check verify após liberar processos, containers e scanners solicitados.

### /check verify executado parcialmente

Registro em `docs/reviews/2026-10-07-plano-verificacao-final.md`. SHA base
`d4f81f3e142a7797eeb2ef60ce1a1103fbf0a0bf`, checkout sujo e manifesto de
345 arquivos. Tipos/lint/formatação passam, unitários completos mostram
70 PASS e 18 falhas de preparação por EPERM. Build, containers e scanners
bloqueados pelo ambiente; 13 ACs e 12 cenários continuam UNVERIFIABLE,
decisão real REPROVADO. Aguardar as execuções escaladas e retomar a prova;
nenhuma etapa recebe conclusão por essa execução parcial.
