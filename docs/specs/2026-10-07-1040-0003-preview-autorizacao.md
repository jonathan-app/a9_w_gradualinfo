# 0003. Autorização e prazo do preview editorial

**Date**: 2026-10-07
**Status**: Accepted
**Decision source**: o dono aprovou 30 minutos, UUID único e POST nesta
sessão e depois deu "sinal verde para docs/audits/2026-10-07-1350-plano-atualizacao-auditoria.md" em
2026-10-07, autorizando a execução e as recomendações técnicas apresentadas.
O contrato adota o limite de revogação local do MVP. Revisão independente
não foi executada e permanece parte do gate final, sem bloquear a construção.

## Summary

O preview terá entrada por formulário e validade de 30 minutos desde a
entrada, mesmo que o Supabase renove a sessão. Só um usuário configurado no
servidor poderá ler rascunhos no portal. O segredo de entrada será diferente
da senha da conta e não ficará na URL nem em cookie.

## Context

A etapa 3 do plano pede negativos reais de expiração, claim, identidade e
logout. O código atual recebe token por GET, usa o token como senha e
consulta apenas a claim para autorizar preview. Os testes removem cookies
em vez de fazer o prazo vencer e não provocam erro no logout.

O contrato existente em md-0001 manda armazenar o segredo em cookie HttpOnly.
O dono escolheu substituí-lo por troca direta via POST. Esta proposta
especializa somente o preview de md-0001 e md-0002, sem mudar o schema de
posts nem o restante do contrato editorial. As specs anteriores só serão
reconciliadas com este contrato após seu aceite integral.

## Requirements

Como dono, você deve poder revisar conteúdo sem disponibilizar rascunhos ao
leitor público nem expor a credencial de entrada em URLs.

- **preview/AC-01**: formulário envia segredo por POST. GET de entrada e
  logout responde 405, sem autenticar. Segredo não aparece na URL, redirect,
  logs, cookies, HTML de resposta ou mensagens de erro.
- **preview/AC-02**: senha e segredo vêm de configurações privadas distintas;
  ausência, UUID inválido ou igualdade entre senha e segredo falha fechada.
  Comparação do segredo usa hashes SHA-256 de tamanho fixo e timingSafeEqual.
- **preview/AC-03**: leitura de rascunho exige getUser válido, id igual ao UUID
  configurado, claim app_metadata.preview autorizada e autorização local de
  preview válida. Sem claim, com user_metadata apenas ou outra identidade,
  o artigo responde 404, mesmo que a outra identidade tenha claim de preview.
- **preview/AC-04**: prazo vence em 1800 segundos desde a entrada. Cookie
  ausente, assinatura inválida, prazo adulterado, sessão trocada ou prazo
  vencido nega preview. Renovação Supabase não altera o prazo absoluto.
- **preview/AC-05**: cookies de preview e sessão são HttpOnly, SameSite=Lax,
  Path=/ e Secure em produção HTTPS, inclusive após refresh. Respostas do
  fluxo e artigo protegido têm Cache-Control: private, no-store. Requisição
  anônima subsequente nunca recebe conteúdo do preview por cache.
- **preview/AC-06**: logout sempre elimina autorização local e cookies de
  autenticação presentes, mesmo quando signOut retorna erro ou lança exceção.
  Erro de revogação remota responde 503 e não é registrado como sucesso.
  Rascunho permanece inacessível no navegador após qualquer dos dois erros.
- **preview/AC-07**: HTML servido em produção local com título malicioso
  mantém JSON-LD parseável e valores preservados, sem script ou elemento
  injetado. Reutiliza serializeJsonLd e o AC-06 emendado da md-0002.
- **preview/AC-08**: entrada e logout rejeitam origem diferente da origem
  configurada. Redirect usa origem configurada e slug validado, sem confiar
  em Host ou x-forwarded-host para construir destino.

## Options considered

### Correção no cliente e rotas existentes, recomendada

Mantém Supabase Auth e RLS, acrescentando um prazo assinado para o portal.
Evita novas tabelas ou serviço de sessões. Exige validação consistente em
login, leitura e refresh e não revoga JWT já copiado para fora do navegador.

### Sessões de preview em tabela própria

Permite revogação centralizada e consulta de autorização por sessão. Cria
schema, políticas, limpeza e mais uma leitura por requisição. É alternativa
se o dono exigir revogação imediata também para credenciais já copiadas.

### Limite global da sessão Supabase

Reduz código próprio, mas altera o comportamento global de Auth e o timeout
é conferido durante refresh. Não fornece sozinho o prazo absoluto do portal.

## Decision

**Chosen option (proposta)**: corrigir o fluxo existente e acrescentar
validade assinada de 30 minutos, sem nova tabela.

A aprovação parcial fixa prazo, quantidade de identidades e transporte.
Os nomes de configuração, formato do cookie e respostas de erro abaixo são
recomendações técnicas apresentadas para aceite do contrato completo.

**Implementation skills**: supabase, auth-implementation-patterns e
nextjs-app-router-patterns, em .agents/skills/.

## Rationale

O portal já usa Supabase e não precisa de um segundo provedor de autenticação.
Uma autorização local com prazo fixo separa a sessão renovável do direito de
preview. O acesso direto ao Supabase continua sujeito ao contrato RLS
existente; esta proposta não afirma revogação instantânea de JWT copiado.

## Feature design

### Configuração e fontes

Todas as configurações são lidas por lib/env.ts, sem prefixo NEXT_PUBLIC.
Valores reais são provisionados pelo dono no ambiente, nunca em migration.

| Valor                   | Fonte proposta                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| Segredo informado       | Campo token no corpo do POST, formulário urlencoded                    |
| Segredo esperado        | SUPABASE_PREVIEW_TOKEN, existente, mínimo 32 bytes                     |
| Email da conta          | SUPABASE_PREVIEW_EMAIL, obrigatório, sem email hardcoded               |
| Senha da conta          | SUPABASE_PREVIEW_PASSWORD, obrigatório e diferente do token            |
| UUID permitido          | SUPABASE_PREVIEW_USER_ID, UUID obrigatório                             |
| Origem e redirect       | SITE_ORIGIN derivada de NEXT_PUBLIC_SITE_URL                           |
| Identidade e claim      | auth.getUser(), nunca getSession para autorização                      |
| Identificador de sessão | session_id de JWT validado por auth.getClaims                          |
| Momento de emissão      | Relógio UTC do servidor no login concluído                             |
| Vencimento              | Momento de emissão + 1800 segundos, decisão do dono                    |
| Assinatura local        | HMAC-SHA256, chave derivada do token com contexto exclusivo de preview |

### Cookie de autorização

Cookie gradualinfo-preview contém payload versionado com sub (UUID),
session_id, issued_at e expires_at, seguido de assinatura HMAC. O conteúdo
não contém segredo, senha, access token ou refresh token. O servidor confere
assinatura, tipos, versão, UUID, session_id e intervalo exato de 1800 segundos.
A assinatura é comparada em tempo constante. Rotação do segredo invalida
as autorizações locais anteriores. Max-Age não substitui checagem no servidor.

A sessão Supabase permanece nos cookies geridos por @supabase/ssr. O proxy
preserva HttpOnly e Secure ao renová-los e não reemite o prazo local.
Ausência ou falha de getClaims/getUser nega acesso protegido. A claim aceita
os valores true e 'true', como o caminho existente; outros valores negam.

### Superfície

| Endpoint            | Método | Entrada                      | Sucesso                                | Falhas                                                                                                          |
| ------------------- | ------ | ---------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| /preview            | GET    | nenhuma                      | 200, formulário sem segredo preenchido | 503, configuração ausente                                                                                       |
| /api/preview        | POST   | token, slug opcional, Origin | 303 para artigo ou home                | 400 corpo/slug inválido; 401 token inválido; 403 origem/identidade/claim; 503 configuração ou Auth indisponível |
| /api/preview/logout | POST   | Origin e cookies             | 303 para home                          | 403 origem; 503 revogação remota falhou, cookies locais eliminados                                              |
| /artigos/[slug]     | GET    | slug e cookies               | 200 se público ou preview válido       | 404 conteúdo não autorizado; falha de banco segue página de erro existente                                      |

O formulário usa componentes existentes Input e Button, com label para o
campo password, instrução de validade e botão de entrada. Não armazena segredo
no navegador nem repopula o campo ao falhar. Slug permite somente o formato
minúsculo já imposto pelo banco, rejeitando barras, URL absoluta e traversal.
Não adicionar token a parâmetros para compatibilidade: GET antigo é retirado.
Origem de POST deve corresponder exatamente a SITE_ORIGIN; teste local usa
origem configurada explicitamente. Nenhuma chave service_role serve páginas.

### Estados e erros

Sem autorização → POST válido e identidade verificada → autorização por
30 minutos → vencida ou eliminada por logout. Novo POST válido inicia novo
prazo; navegação e refresh não iniciam novo prazo.

No login, cookies só são entregues após validar conta, claim e session_id.
Falha não entrega cookies parciais de autenticação. No logout, signOut usa
escopo local para não encerrar outros navegadores. Cookies do projeto são
eliminados mesmo se Auth não responder. Auditar somente evento, sucesso/falha
e motivo enumerado, sem corpo, token, senha, cookies ou JWT.

### Limites de segurança

Limpeza local bloqueia o navegador que saiu. Sem armazenamento de revogação
por sessão, não há garantia de bloquear imediatamente um cookie copiado antes
do logout quando a revogação remota falha. JWT Supabase pode continuar válido
até expirar. O dono precisa aceitar esse limite ou escolher tabela de sessões.
O limite em memória existente não é proteção distribuída entre Workers;
esta etapa não o declara como garantia de limitação global de tentativas.

## Critical test scenarios

- POST válido com segredo distinto da senha, verifica AC-01, AC-02 e AC-03.
- GET com token em query não autentica; Origin externa e slug malicioso
  rejeitados, verifica AC-01 e AC-08.
- Sessão real sem claim, com user_metadata apenas e com outro UUID mas claim
  válida, verifica AC-03. Não simular removendo cookies.
- Relógio controlado passa o prazo mantendo sessão válida e cookie original;
  refresh antes do prazo não estende autorização, verifica AC-04.
- Cookie assinado adulterado, copiado para outra sessão e assinatura inválida
  negam acesso, verifica AC-04.
- Login e refresh em produção local comprovam atributos de Set-Cookie e
  private/no-store no artigo, verifica AC-05. Usar transporte HTTPS para
  comprovar cookie Secure e não substituir por teste HTTP permissivo.
- Injetar erro retornado e exceção em signOut, conferir 503, cookies removidos
  e próxima leitura negada, verifica AC-06.
- Fixture maliciosa no banco e browser de produção local, verifica AC-07.

## Build plan

1. Configuração tipada, validação e autorização assinada, satisfaz AC-02,
   AC-03 e AC-04.
2. Formulário, POST de entrada e logout, satisfaz AC-01, AC-06 e AC-08.
3. Integrar leitura e renovação com cookies e headers consistentes, satisfaz
   AC-03, AC-04 e AC-05.
4. Testes reais de identidade, prazo, erro de logout e JSON-LD, satisfaz
   AC-01 a AC-08. Executar qualidade local e encaminhar a /check verify.

## Consequences

O preview deixa de depender de URL com segredo e de senha compartilhada com
a credencial de entrada. Renovação Supabase não prolonga o prazo do portal.
O custo é manter assinatura e checagem de prazo, além de provisionar email,
senha e UUID no servidor. O dono precisará informar a configuração real no
ambiente, sem enviar segredos pelo chat.

## Follow-up

- [x] Execução e recomendações autorizadas pelo sinal verde do dono.
- [ ] Emendar a seção Preview de md-0001 e vincular esta spec à md-0002 após
      aceite, preservando a origem das decisões anteriores.
- [ ] Configuração real e fixture CI da conta ficam pendentes de implementação.
- [ ] Revisão independente opcional antes do aceite.
