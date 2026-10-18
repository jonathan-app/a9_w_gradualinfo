# Spec 0017 · Adendo da Fatia 2: elegibilidade de frete

**Estado:** proposta técnica da Fatia 2, pendente de execução automatizada e integração na árvore canônica.

## Regra determinística

- Todos os valores monetários são centavos inteiros não negativos; `price_cents` deve ser maior que zero.
- O frete é elegível sem exceção quando `shipping_cost_cents * 100 <= price_cents * 15`. O limite de 15% é inclusivo e a comparação usa aritmética inteira, sem ponto flutuante.
- Se o frete ultrapassar 15%, a avaliação rejeita a oferta na ausência de exceção catalogada aplicável.
- Falha de dados, oferta inexistente, exceção inativa/expirada ou escopo incompatível resulta em rejeição (fail closed).

## Catálogo de exceções

O catálogo distingue explicitamente:

1. `bulky_product`: exceção vinculada a um único `product_id` com descrição, fonte de evidência, caminho de armazenamento e hash SHA-256.
2. `remote_region`: exceção vinculada a um código de região normalizado, baseada em tabela tarifária oficial e uniforme do parceiro logístico. Não pode ser uma exceção global sem região.

Cada registro tem período de validade e revisão humana identificada. Um registro no catálogo **não** libera o selo por si só. Para uma exceção de frete acima do limite, a função de avaliação exige log em `price_audit_logs` associado à oferta, `action` `concessao` ou `renovacao`, `rule_result = aprovado`, origem `admin_aal2`, `rule_applied = shipping_exception:<exception_id>` e hash igual ao SHA-256 cadastrado.

A elegibilidade regional depende de `region_code` informado no momento da avaliação. Não se deve interpretar a aprovação regional como elegibilidade universal para todos os destinos.

## Interface de decisão

`evaluate_offer_shipping(offer_id, region_code)` retorna `eligible`, `decision`, `reason`, `exception_id` e `requires_manual_review`. O avaliador é privilegiado e só pode ser executado por `service_role`; a concessão/renovação do selo deve consumir esse resultado e registrar a auditoria manual exigida.

## Critérios de aceite da fatia

- Exatamente 15% passa; 15,01% falha sem exceção.
- Frete zero é válido; preço zero, valores fracionários e valores negativos são inválidos.
- Exceção volumosa só corresponde ao produto exato.
- Exceção regional só corresponde à região exata, após normalização, e exige região no contexto.
- Exceção ausente, expirada, inativa ou sem revisão válida falha fechado.
- Catálogo sozinho nunca libera o selo; a auditoria precisa corresponder à oferta, ao ID da exceção, à origem administrativa e ao hash exato.
- Roles públicas não podem ler ou alterar o catálogo nem executar a função privilegiada.
