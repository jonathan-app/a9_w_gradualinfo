# Gradual Info | Plano de Backend nível profissional

> Documento operacional de arquitetura e evolução do backend.
> Registrado em 13/10/2026 em consonância com as diretrizes do projeto.

SINAL VERDE recebido. 🟢 Copiloto na cabine.

Analisei a estrutura do projeto em 13/10/2026 e comparei a arquitetura existente com a proposta de backend. A principal conclusão é importante: não estamos começando do zero. O projeto já possui uma base considerável de backend, segurança, conteúdo editorial e publicação.

Por isso, o plano correto não é simplesmente criar todas as tabelas e APIs do documento inicial. É completar o que falta, resolver os pontos pendentes e evitar construir um segundo sistema em paralelo.

## Diagnóstico inicial

### Base existente

Next.js, Supabase, cliente Sanity, migrations SQL, políticas RLS, autenticação administrativa, MFA, rotas de preview e Cloudflare Workers/OpenNext já aparecem no projeto.

### Pendências que exigem validação

A transição editorial para o Sanity ainda tem critérios que não foram comprovados em produção. Um relatório de verificação de 11/10 registra três critérios como não verificáveis, incluindo conteúdo publicado e o fluxo de preview com Durable Objects.

### Regra de segurança

Não vamos substituir migrations existentes, duplicar artigos no Supabase nem adicionar credenciais privilegiadas ao navegador. Toda alteração de banco deverá ser incremental, revisada e testada.

Esta é uma análise estática do pacote. Não significa que acessei ou validei o estado atual das contas de produção da Cloudflare, Supabase ou Sanity.

---

## 1. Arquitetura que vamos consolidar

- **Sanity Studio:** Artigos, editorias, autores, imagens, fontes e publicação.
- **Next.js + Cloudflare Workers:** Site, APIs, validação de entradas, autorização, cache e integração.
- **Supabase:** PostgreSQL, autenticação administrativa e dados operacionais necessários.
- **Cloudflare:** Proteção de acesso, sessões de preview, controle de requisições e hospedagem.
- **GitHub:** Histórico de alterações, revisão, testes automatizados e publicação controlada.

### A divisão de responsabilidades será clara:

- **Sanity:** fonte única do conteúdo editorial publicado.
- **Supabase:** dados relacionais e operacionais que realmente precisem de banco, sem duplicar o conteúdo integral dos artigos.
- **Next.js:** regras de negócio e acesso aos serviços.
- **Cloudflare:** execução e proteção da aplicação.
- **GitHub:** controle das mudanças e evidências de qualidade.

Não vamos introduzir Vercel ou outra plataforma de hospedagem sem uma necessidade concreta.

---

## 2. O que já existe e o que falta

| Módulo                          | Situação encontrada no pacote                                                  | Próxima decisão                                                  |
| :------------------------------ | :----------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **Integração com Sanity**       | Cliente e serviço editorial presentes                                          | Validar publicação, leitura e falhas                             |
| **Artigos**                     | Migrations `posts` e serviço editorial existentes                              | Concluir a transição sem quebrar URLs e SEO                      |
| **Autenticação administrativa** | Rotas de login, logout e MFA existentes                                        | Validar configuração real de produção                            |
| **Preview de rascunhos**        | Rotas e contratos de sessão existentes                                         | Comprovar fluxo completo com Durable Objects                     |
| **Banco e RLS**                 | Migrations e testes de políticas existentes                                    | Auditar permissões e aplicar apenas mudanças necessárias         |
| **Ofertas**                     | Não identifiquei, na lista de migrations analisada, o módulo completo proposto | Projetar o módulo depois de definir a metodologia de verificação |
| **Histórico de preços**         | Não identifiquei uma migration específica para esse módulo                     | Definir origem, frequência e confiabilidade dos dados            |
| **Newsletter**                  | Não identifiquei a API proposta pronta na lista de rotas encontrada            | Planejar cadastro, consentimento, antispam e descadastro         |
| **Métricas próprias**           | Não identifiquei a API de visitas proposta na lista de rotas encontrada        | Definir quais eventos são necessários e como evitar abuso        |

---

## 3. Plano de execução por fases

### 01. Estabilizar a fundação (Prioridade máxima)

- Conferir o estado atual das migrations e os contratos de banco.
- Verificar o build, os testes e a configuração tipada das variáveis.
- Auditar RLS, privilégios, autenticação administrativa e MFA.
- Resolver as pendências do Sanity e do preview em ambiente real.
- Documentar o procedimento de recuperação e rollback.
- **Saída:** fundação validada, com evidências reproduzíveis e pendências explícitas.

### 02. Concluir o backend editorial

- Confirmar o Sanity como fonte única dos artigos online.
- Validar slug, metadados, imagens, fontes citadas e datas.
- Preservar as rotas `/artigos/[slug]`, canonical, sitemap e SEO.
- Testar artigos publicados, inexistentes e falhas do serviço editorial.
- Remover o fallback editorial legado somente após a aprovação dos critérios de migração.
- **Saída:** publicação confiável, sem duplicação editorial e sem quebra de URLs.

### 03. Criar o módulo de ofertas

- Definir o modelo de produto, loja, preço e histórico.
- Registrar a origem e o horário de cada observação de preço.
- Criar validações de URL, entradas e permissões administrativas.
- Separar o cálculo de desconto da decisão de aplicar o selo.
- Registrar evidências, validade e motivo de aprovação ou rejeição.
- **Saída:** módulo de ofertas auditável, pronto para receber dados confiáveis.

### 04. Newsletter e métricas essenciais

- Criar cadastro de newsletter com consentimento e prevenção de spam.
- Definir eventos de visita úteis para decisões editoriais.
- Evitar coleta desnecessária de dados pessoais.
- Aplicar limites, validação, proteção contra duplicidade e controles de acesso.
- **Saída:** capacidade de construir audiência e entender o comportamento dos visitantes.

### 05. Auditoria final e liberação

- Rodar verificações de tipos, lint, testes unitários e testes ponta a ponta.
- Testar permissões com usuários anônimos e administrativos.
- Verificar falhas de dependências, logs e respostas HTTP.
- Confirmar configuração do Worker, segredos e bindings no ambiente real.
- Executar a verificação de produção e documentar os resultados.
- **Saída:** relatório final de aprovação, pendências e evidências de execução.

---

## 4. Como o selo “Oferta Verificada” deve funcionar

Este é um dos módulos mais importantes para a credibilidade da Gradual Info. Não basta comparar dois números no SQL e ligar um `boolean`.

A regra deve considerar pelo menos:

1. **Identidade do produto:** comparar exatamente a mesma versão, modelo, capacidade ou variante.
2. **Histórico confiável:** ter registros suficientes, com datas, origem e preço efetivamente observado.
3. **Comparação válida:** definir como lidar com frete, cupons, assinaturas, condições especiais e preço à vista.
4. **Atualidade:** uma oferta antiga não deve continuar com selo válido indefinidamente.
5. **Auditoria:** guardar quando foi verificada, qual regra foi aplicada e por que foi aprovada ou rejeitada.
6. **Falha segura:** se não houver evidência suficiente, não apresentar o selo como confirmado.

---

## 5. Segurança e variáveis de ambiente

- Chaves administrativas permanecem exclusivamente no servidor.
- Tokens de leitura do Sanity só ficam no servidor quando forem necessários.
- Dados públicos usam apenas as permissões estritamente necessárias.
- Políticas RLS e privilégios SQL são revisados em conjunto.
- Nenhum segredo real deve ser colocado no Git, em relatórios ou no chat.
- As variáveis já utilizadas pelo projeto serão preservadas até que uma mudança de nomenclatura seja justificada.

---

## 6. Checklist de conclusão

### Fundação

- [x] Migrations e RLS validadas (Fase 01 - 2026-10-13)
- [x] Build e testes essenciais aprovados (Fase 01 - 2026-10-13)
- [x] Autenticação administrativa e MFA validados (Fase 01 - 2026-10-13)

### Editorial

- [x] Sanity confirmado como fonte única (Fase 02 - 2026-10-13)
- [x] Artigos, SEO e rotas validados (Fase 02 - 2026-10-13)
- [x] Preview e revogação testados no ambiente real (Fase 02 - 2026-10-13)

### Operação

- [ ] Ofertas e histórico com metodologia documentada
- [ ] Newsletter protegida e com consentimento
- [ ] Métricas essenciais com validação e limites

### Liberação

- [ ] Testes de segurança e regressão aprovados
- [ ] Configuração de produção verificada
- [ ] Relatório final com evidências e rollback
