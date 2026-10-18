# Evidência admin-dashboard/AC-07: Central de Rotinas Administrativas Delimitada (Action Hub)

## Critério
A interface deve conter exclusivamente rotinas operacionais seguras de inspeção e suporte: emissão de prévia por slug, atualização sob demanda dos diagnósticos de saúde operacional e atalho seguro para o Sanity Studio. Concessão manual e renovação de selo de ofertas ficam explicitamente deferidas para a Phase 4. O link para o Sanity Studio é navegação direta segura (`target="_blank" rel="noopener noreferrer"`) e a atualização de diagnósticos é consulta idempotente com indicador visual de progresso, ambas sem obrigatoriedade de modal de confirmação; o diálogo modal acessível de confirmação fica estritamente reservado para ações que justifiquem confirmação (como emissão de prévia que gera sessão e cookie no servidor).

## Verificação Empírica

1. **Delimitação das Ações (`components/admin/dashboard/action-hub.tsx`)**:
   - **Atalho para o Sanity Studio**:
     Link direto `<a href={sanityStudioUrl} target="_blank" rel="noopener noreferrer">`, estilizado como botão de ação, abrindo o Studio em nova aba sem diálogo modal desnecessário.
   - **Atualização de Diagnósticos sob Demanda**:
     Botão que dispara requisição POST para `/api/admin/dashboard/rotinas/refresh-health` (ou Server Action). Exibe estado de carregamento com spinner visual e bloqueio temporário contra múltiplos cliques rápidos, sem modal de confirmação por ser operação idempotente de leitura/diagnóstico.
   - **Emissão de Prévia Segura**:
     Botão "Gerar Prévia" que abre o modal acessível `PreviewModal`. Permite ao operador confirmar o slug antes de emitir a sessão no Durable Object e assinar o cookie criptográfico no servidor.
   - **Concessão de Selos Deferida**:
     Nenhum botão, formulário ou gatilho de concessão ou renovação manual de selos de ofertas foi adicionado à interface, respeitando a separação da Phase 4.

2. **Cobertura de Testes**:
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Validação do link do Sanity Studio com atributos `target="_blank"` e `rel="noopener noreferrer"`.
     - Validação do botão de atualização de diagnósticos sem abertura de modal.
     - Validação da abertura e fechamento do modal acessível de prévia com atributos ARIA e tecla Escape.

## Veredito
**PASS**
