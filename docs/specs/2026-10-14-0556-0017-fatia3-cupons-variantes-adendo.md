# Spec 0017 / Fatia 3: cupons, variantes e pipeline do selo

## Contrato de cupom

- `universal`: disponível a qualquer usuário no checkout, sem requisitos de conta nova, cartão específico ou assinatura paga.
- `restricted`: explicitamente não elegível para o selo geral.
- Tipos monetários: `fixed_cents` (valor em centavos) e `percent_bps` (basis points, 10000 = 100%).
- Preço efetivo = preço-base menos desconto; percentuais são calculados com aritmética inteira e arredondamento para baixo. Desconto não pode ser zero nem igual/superior ao preço-base.
- Cupons podem ser delimitados por loja, produto e `variant_key`. Vigência e escopo devem passar antes do desconto.

## Contrato de identidade

- SKU canônico e anunciado são obrigatórios e idênticos.
- Quando `products.ean_upc` estiver preenchido, o EAN anunciado também é obrigatório e idêntico.
- O objeto anunciado de variante deve coincidir integralmente com `products.specs_json`.
- Divergência bloqueia concessão/renovação do selo.

## Contrato do pipeline

- A função de banco avalia identidade, cupom, mediana de 30 dias, frete e auditoria em uma única transação.
- O preço efetivo auditado precisa ser estritamente inferior à mediana.
- O frete precisa ser menor ou igual a 15% do preço efetivo, salvo exceção catalogada com hash exato e auditoria `admin_aal2` vinculada a `shipping_exception:<id>`.
- O selo aprovado dura no máximo 24 horas. Falhas não concedem selo.
- O pipeline é executável somente por `service_role`; não expor execução pública.

## Limite do adendo

A implementação inicial está sujeita às limitações registradas em `docs/reviews/2026-10-14-fatia3-spec0017-cupons-variantes-pipeline.md`. Este adendo não certifica WORM físico, retenção de storage nem execução dos testes de runtime.
