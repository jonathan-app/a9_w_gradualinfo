# Evidência AC-09: Política de retenção probatória em camadas e ciclo de vida

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-09`  
**Status**: PASS  

## Descrição e comprovação empírica

A política de retenção probatória está formalizada no contrato da Spec 0021 e nas definições operacionais de ciclo de vida do storage:

1. **Camadas de retenção estruturadas**:
   - **Camada quente (Hot tier)**: 730 dias (dois anos) para acesso operacional imediato, auditoria e consultas de contestação comercial.
   - **Camada fria / arquivamento (Cold tier)**: do 731º dia até 1825 dias (cinco anos), transferida para modalidade de menor custo por governança de risco.
   - **Marco inicial**: calculado a partir da data de coleta comprovada (`created_at`).

2. **Exceções de preservação obrigatória (Legal Hold)**:
   - Evidências associadas a contestações comerciais ativas, auditorias ou processos judiciais têm o expurgo suspenso indefinidamente.

3. **Expurgo programado aos cinco anos**:
   - Condicionado estritamente à ausência de flags de legal hold.
   - Fica desfeita qualquer equiparação automática desse prazo de governança à prescrição do art. 27 do CDC (cujo marco inicial legal depende da ciência do dano e da autoria).

4. **Delimitação de homologação remota**:
   - A homologação das regras de Bucket Lock e políticas de lifecycle em bucket Cloudflare R2 real permanece registrada como pendente de infraestrutura de nuvem em produção, garantindo que o ambiente local e de CI não assuma garantias de WORM em nuvem sem execução real na Cloudflare.
