# Auditoria Ponytail — Backend, Autenticação e Módulo de Ofertas

> **Data:** 2026-10-14 21:15  
> **Avaliador:** Engenharia Agêntica (Ponytail Audit & Security Auditor)  
> **Escopo:** Autenticação administrativa, RLS, segurança do backend, runtime de testes e Spec 0017 (Módulo de Ofertas).  
> **Modo:** Auditoria passiva — diagnóstico e proposição de menor diff cirúrgico. Zero alterações de código nesta etapa.

---

## O que este repositório faz

Portal de conteúdo editorial técnico e agregador comercial de ofertas com selo de verificação de preços. O modelo operacional assume carga de **um administrador único** autenticado com MFA (TOTP/AAL2) via Cloudflare Access, e **leitores públicos anônimos** com tráfego de leitura de volume baixo a médio, sem permissão de cadastro público de novos usuários.

---

## 1. Must fix (Falhas de segurança, bugs e quebras funcionais)

1. **Simulação de sessão administrativa por cookie vulnerável em dev/staging** (`lib/supabase/server.ts:46-50`)
   - **O que é isso:** Mecanismo auxiliar que cria o cliente de servidor do Supabase e injeta uma identidade mockada se o cookie `__e2e_session_role` estiver presente.
   - **Problema:** A validação checa apenas `process.env.NODE_ENV !== 'production'`. Qualquer pessoa com acesso à rede do servidor de desenvolvimento ou staging pode injetar `__e2e_session_role=admin_aal2` e assumir imediatamente privilégios de administrador com MFA validado.
   - **Correção:** Restringir a simulação estritamente para quando `process.env.E2E_TEST === '1'` estiver explicitamente configurado no ambiente de teste automatizado.
   - **Se ignorarmos:** Ambientes de homologação ou desenvolvimento compartilhados ficam vulneráveis a bypass completo de autenticação e autorização por qualquer visitante com manipulação de cookies.

2. **Auto-cadastro de usuários aberto na configuração do Supabase** (`supabase/config.toml:179,224`)
   - **O que é isso:** Configuração do serviço Supabase Auth para a infraestrutura local e matriz declarativa do projeto.
   - **Problema:** As opções `enable_signup = true` em `[auth]` e `[auth.email]` permitem cadastro aberto de novos usuários via endpoint público de Auth, contradizendo a política de painel estritamente fechado.
   - **Correção:** Definir `enable_signup = false` em ambas as seções do arquivo de configuração.
   - **Se ignorarmos:** Usuários externos podem registrar contas no banco do projeto e tentar explorar superfícies de ataque contra políticas de RLS e endpoints autenticados.

3. **Falha de permissão na RPC de avaliação de selo de ofertas** (`app/api/admin/ofertas/[id]/avaliar-selo/route.ts:208,385`)
   - **O que é isso:** Rota administrativa que recebe dados de validação e aciona o pipeline de concessão ou renovação do selo de preço verificado.
   - **Problema:** A rota invoca `evaluate_and_set_verified_price` usando o cliente de sessão comum (`createClient()`), associado à role `authenticated`. A migration revogou permissões de execução para `authenticated` e as concedeu exclusivamente à role `service_role`, resultando em falha imediata por permissão negada em chamadas reais.
   - **Correção:** Executar a chamada da RPC utilizando um cliente autenticado com a chave de serviço (`service_role`), após verificar formalmente a identidade e o nível AAL2 da sessão do administrador.
   - **Se ignorarmos:** O fluxo de avaliação de selo falhará invariavelmente em ambiente real com erro 403 / _permission denied_.

4. **Armazenamento de evidências em memória volátil por padrão** (`app/api/admin/ofertas/[id]/avaliar-selo/route.ts:22,324`)
   - **O que é isso:** Camada responsável por salvar o payload bruto e o hash canônico das provas que justificam a atribuição de um selo.
   - **Problema:** Quando executado fora de testes injetados, o código recorre a `getEvidenceStorage()`, que implementa persistência efêmera em memória RAM (`MemoryEvidenceStorageAdapter`). Qualquer reinicialização ou reciclagem de worker apaga todas as evidências salvas.
   - **Correção:** Conectar um adaptador de persistência durável compatível com WORM (Write Once, Read Many), apontando para Supabase Storage privado ou Cloudflare R2 com retenção imutável de 730 dias.
   - **Se ignorarmos:** O histórico probatório de auditoria dos preços verificados será destruído a cada reinicialização da aplicação, inviabilizando a comprovação perante auditorias e órgãos regulatórios.

5. **Exposição de mensagens de erro internas do banco na rota pública de ofertas** (`app/api/ofertas/route.ts:68`)
   - **O que é isso:** Endpoint público que fornece a lista de ofertas ativas para exibição aos leitores.
   - **Problema:** Em caso de falha na consulta SQL, a rota devolve `error.message` diretamente no JSON de resposta com código HTTP 500, expondo detalhes da estrutura interna do PostgreSQL a clientes anônimos.
   - **Correção:** Devolver uma mensagem genérica de erro (`{ error: 'query_failed', message: 'Erro ao consultar ofertas ativas.' }`) e registrar o erro detalhado via `logger.error()`.
   - **Se ignorarmos:** Atores mal-intencionados podem forçar condições de erro para coletar informações confidenciais sobre nomes de tabelas, índices e restrições do banco.

---

## 2. Should fix (Riscos operacionais, testes e completude)

6. **Inexistência de rota de contingência ou códigos de recuperação para o administrador** (`app/api/admin/auth/`)
   - **O que é isso:** Subsistema de login administrativo restrito ao `ADMIN_USER_ID` com obrigatoriedade de segundo fator MFA TOTP (AAL2).
   - **Problema:** Não há suporte a códigos de backup descartáveis nem fluxo de redefinição de emergência. A perda do aplicativo autenticador gera bloqueio definitivo sem intervenção manual e direta no banco de dados.
   - **Correção:** Implementar códigos de contingência (backup codes descartáveis em hash seguro) e fluxo controlado de recuperação para o único administrador.
   - **Se ignorarmos:** O único operador do portal corre o risco de perder permanentemente o acesso ao painel se o dispositivo móvel for danificado ou extraviado.

7. **Desacoplamento do ambiente de teste Playwright em relação ao runtime da Cloudflare** (`playwright.config.ts:70-73`)
   - **O que é isso:** Configuração do servidor web utilizado durante a suíte de testes de ponta a ponta.
   - **Problema:** Em modo de desenvolvimento, o Playwright executa `pnpm dev`, que usa o Next.js puro (Turbopack) sem o adaptador OpenNext, sem o entrypoint do Cloudflare Worker (`scripts/cloudflare-worker.ts`) e sem simular a camada de Cloudflare Access.
   - **Correção:** Padronizar o runner de E2E local para subir o entrypoint integrado com simulação de cabeçalhos Access e contexto do Worker.
   - **Se ignorarmos:** Diferenças comportamentais entre o ambiente local e a infraestrutura de borda da Cloudflare podem ocultar regressões críticas até o momento do deploy.

8. **Ausência de interface operacional para ofertas e selos no painel administrativo** (`app/admin-dashboard/(protegido)/page.tsx`)
   - **O que é isso:** Página principal do painel administrativo protegido por MFA AAL2.
   - **Problema:** O painel atual possui apenas indicadores estáticos do Sanity Studio e disparo de preview editorial, sem qualquer tela para inspeção de ofertas, aprovação de selos ou consulta do histórico de preços.
   - **Correção:** Construir os componentes de visualização e controle operacional da Spec 0017 (listagem de ofertas, status do selo, acionamento do pipeline e logs de auditoria).
   - **Se ignorarmos:** As tarefas operacionais comerciais dependerão de chamadas manuais de API ou scripts de terminal, gerando fricção e risco de erro operacional.

---

## 3. Nice to have (Melhorias de robustez e clareza)

9. **Validação e coerção centralizada de parâmetros de consulta na API de ofertas** (`app/api/ofertas/route.ts:20-40`)
   - **O que é isso:** Leitura dos parâmetros `limit`, `product_id` e `merchant_id` via URLSearchParams.
   - **Problema:** A validação é manual e dispersa; valores inválidos de UUID ou limites negativos chegam à camada do banco em vez de serem rejeitados na fronteira HTTP com 400.
   - **Correção:** Usar um validador de esquema simples para higienizar e limitar os parâmetros antes da montagem da query.
   - **Se ignorarmos:** Parâmetros maliciosos ou incorretos geram tráfego inútil para o banco de dados.

---

## Conclusão da Auditoria

- **Veredito:** O backend possui fundações sólidas (migrações com RLS, hash SHA-256 e testes pgTAP), mas a segurança do ambiente local (`server.ts` e `config.toml`), as permissões da RPC de selo e a persistência WORM precisam ser corrigidas antes de avançar para a operação real.
- **Economia (Lean):** -15 linhas no tratamento de erros e simulação de cookies; 0 dependências novas necessárias (utiliza as bibliotecas e utilitários já instalados no projeto).
- **Não verificado:** Execução de login em navegador real e persistência física em bucket remoto S3/R2 (bloqueados por diretrizes de governança e isolamento local).
