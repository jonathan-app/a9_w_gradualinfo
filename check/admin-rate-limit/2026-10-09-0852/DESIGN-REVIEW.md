# Revisão independente do contrato de rate limiting

Data: 2026-10-09, America/Sao_Paulo.

Documento: docs/specs/2026-10-09-0852-rate-limiting-admin.md.

Revisão somente leitura por gpt-6.1-sol, explicitamente solicitada pelo proprietário. Sem execução de aplicação, alterações de código ou consultas remotas pelo revisor. Não equivale a /check verify nem aprovação de implementação.

Resultado: desenho coerente, sem incompatibilidade fundamental com DO dedicado. O revisor identificou sete pontos: semântica de janela fixa e rajada na fronteira; limite de proteção aos handlers frente à API direta do Supabase; coordenação de persistência e alarme; justificativa dos novos parâmetros; schema/headers/deadline/limites em bytes; prova real da integração OpenNext; provas de concorrência e persistência no Worker.

Recomendações apresentadas ao proprietário: manter janela fixa explícita, coordenar consumo e alarme, completar protocolo e testes, justificar os parâmetros e delimitar a proteção. Resposta explícita: “Aplicar as correções recomendadas”. As correções foram registradas em seção própria do contrato, com precedência sobre trechos anteriores.

O contrato integral continua Proposed até aceite específico. Provider DO dedicado e falha 503 já estavam aprovados. Implementação, headers na rede, persistência e comportamento entre Workers continuam sem execução nesta rodada. Merge e deploy sem autorização.
