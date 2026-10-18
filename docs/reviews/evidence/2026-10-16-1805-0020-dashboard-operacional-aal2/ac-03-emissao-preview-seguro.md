# Evidência admin-dashboard/AC-03: Emissão de Preview Seguro via Contrato Existente

## Critério
A listagem editorial deve fornecer acionamento de prévia que consome o endpoint `POST /api/admin/preview`, o qual cria o registro da sessão no Durable Object (`store.createSession`) e assina criptograficamente o cookie `PREVIEW_COOKIE` na resposta de redirecionamento HTTP 303 para `/artigos/[slug]`, sem transferir a responsabilidade de assinatura criptográfica para o Durable Object.

## Verificação Empírica

1. **Integração e Contrato Existente**:
   - O painel operacional consome o endpoint `/api/admin/preview` através do componente `ActionHub` e dos botões de ação na `EditorialTable`.
   - O endpoint `/api/admin/preview` valida:
     1. Guarda `assertAdminApiAuth(request)` (AAL2 e `ADMIN_USER_ID`).
     2. Proteção de cabeçalho CSRF (`validateAdminRequestOrigin`).
     3. Criação de registro de sessão no Durable Object (`store.createSession`).
     4. Assinatura do cookie `PREVIEW_COOKIE` diretamente pelo servidor Next.js usando HMAC-SHA256 (`signPreviewCookie`), garantindo que o segredo de assinatura não é delegado ao DO.
     5. Resposta com status HTTP 303 e cabeçalho `Location: /artigos/[slug]` (ou `/`).

2. **Interface e Diálogo de Confirmação (`components/admin/dashboard/action-hub.tsx`)**:
   - Por se tratar de operação que gera credencial criptográfica e estado no servidor, o acionamento pelo Action Hub utiliza um modal acessível (`PreviewModal`) com `role="dialog"`, `aria-modal="true"` e título associado.
   - O formulário submete `slug` validado e processa a resposta redirecionando diretamente para a visualização do rascunho com o cookie assinado presente.

3. **Cobertura de Testes**:
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Teste de abertura do diálogo de prévia ao clicar no botão "Gerar Prévia" no Action Hub.
     - Verificação de acessibilidade: foco, fechamento com tecla Escape e submissão de formulário.
   - `__tests__/integration/preview-cookie-reuse.test.ts`:
     - Validação da criação de sessão no DO, assinatura do cookie e bloqueio de cookies forjados ou expirados.

## Veredito
**PASS**
