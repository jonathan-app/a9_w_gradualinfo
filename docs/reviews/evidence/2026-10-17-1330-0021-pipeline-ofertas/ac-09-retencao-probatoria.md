# Evidência AC-09: Política de retenção probatória em camadas e ciclo de vida

**AC**: ofertas-pipeline/AC-09  
**Status**: UNVERIFIABLE (WORM do provedor de nuvem não verificado localmente)  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4, sistema de arquivos local  

## O que foi verificado (PASS — escopo local)

1. **`lib/offers/storage/filesystem-adapter.ts`**: retenção registrada com marco inicial na coleta (`created_at`), camada quente de 730 dias (`retention_days` = 730 no `putEvidence`), extensão de retenção apenas para o futuro (`extendRetention` proíbe redução), exclusão terminantemente proibida (`deleteEvidence` lança `WORMOperationForbiddenError`).
2. A política em camadas (730 dias quente, transição fria até 1825 dias/cinco anos, expurgo condicionado à ausência de legal hold) está formalizada na spec (docs/specs/...0021...:126-132) e na AGENTS.md do módulo.
3. Desfeita a equiparação automática ao art. 27 do CDC (marco próprio: ciência do dano e da autoria).

## O que NÃO foi comprovado (UNVERIFIABLE — produção)

1. **Cloudflare R2 com Bucket Locks**: `lib/offers/storage/storage-factory.ts:59-62` lança `EvidenceStorageUnavailableError` informando que o adaptador R2 está **pendente de validação específica em infraestrutura real de produção**. O bucket de nuvem, seus bloqueios de expurgo (Object Lock/Bucket Lock) e o ciclo de vida em camadas quente/fria **não estão disponíveis localmente** e não foram homologados.
2. Testes de filesystem local **não comprovam** imutabilidade regulatoria nem retenção do provedor de nuvem. A spec 0021 (linha 13, 89, 174) deixa a homologação do R2 como marco futuro de infraestrutura independente.

## Conclusão

A retenção probatória em camadas está especificada e o adaptador local a simula para desenvolvimento/teste, mas o **WORM do provedor de nuvem permanece não verificado**. Produção continua bloqueada (AC-03) até homologação dedicada em nuvem.

## Código relevante

- `lib/offers/storage/storage-factory.ts:39-63`
- `lib/offers/storage/filesystem-adapter.ts`
- `docs/specs/2026-10-16-2050-0021-pipeline-ofertas-worm-duravel.md:126-132, 174`
