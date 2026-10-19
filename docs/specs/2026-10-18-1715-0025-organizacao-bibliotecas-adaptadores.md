# Spec 0025: Organizacao de Bibliotecas, Adaptadores e Autenticacao de Ingestao (Lote L2)

Status: Accepted  
Data: 2026-10-18T17:15:00-03:00  
Autor: Antigravity  
Aprovacao: Aceite do proprietario registrado em 2026-10-18T17:06Z via comando /develop  
Origem: docs/scope/2026-10-18-1400-faxina-backend.md (Lote L2) e docs/audits/2026-10-18-1420-inventario-faxina-backend-l0.md

---

## 1. Contexto e Problema

O inventario L0 mapeou 40 modulos em lib. Foram identificadas duas fontes concorrentes de autenticacao HMAC para coletores de ofertas:

1. O modulo lib/offers/webhook-auth.ts criado na Spec 0017 que utiliza cache em memoria volátil (MemoryNonceCache) e cabeçalhos legados de webhook.
2. O modulo lib/offers/ingest-auth.ts criado na Spec 0021 que adota assinatura HMAC canonica com corpo em SHA256 e tabela no PostgreSQL (offers_ingest_nonces).

Alem disso, a rota administrativa app/api/admin/ofertas/[id]/avaliar-selo/route.ts ainda consome o metodo antigo de webhook-auth, enquanto a rota dedicada app/api/ingest/ofertas/route.ts consome ingest-auth. Ha duplicacao de funcoes criptograficas de tempo constante e risco de confusao sobre qual mecanismo de anti replay governa o perimetro.

Na camada de persistencia probatoria, os adaptadores em lib/offers/storage necessitam de fronteiras explicitas para assegurar que adaptadores efemeros de memoria jamais operem em producao e que o manuseio de provas WORM seja deterministico.

---

## 2. Decisoes Recomendadas

### Decisao 1: Unificacao Criptografica de Coletores

Recomendacao: Manter lib/offers/ingest-auth.ts como o motor criptografico canônico para todas as rotas que recebem dados de coletores externos.  
Por que: A assinatura padronizada na Spec 0021 com string canonica (metodo, caminho, id do coletor, timestamp, nonce e hash SHA256 do corpo) e comprovadamente mais segura contra adulteracao em transito.  
Alternativa rejeitada: Manter duas bibliotecas HMAC separadas, o que preserva codigo redundante e exige manter duas suites de testes criptograficos.

### Decisao 2: Destino do MemoryNonceCache

Recomendacao: Isolar MemoryNonceCache exclusivamente como fixture de teste ou utilitario de desenvolvimento local em memoria. Declarar explicitamente que a persistencia em banco (tabela offers_ingest_nonces) e o unico mecanismo anti replay valido para o perimetro HTTP.  
Por que: Em ambiente distribuido como Cloudflare Workers, isolates independentes nao compartilham memoria RAM. Nonce em memoria gera falsa sensacao de seguranca em producao.  
Alternativa rejeitada: Apagar MemoryNonceCache imediatamente, o que quebraria testes unitarios isolados que rodam sem container de PostgreSQL.

### Decisao 3: Fronteira Estrita dos Adaptadores de Storage Probatorio

Recomendacao: Reforcar em lib/offers/storage/storage-factory.ts que o MemoryEvidenceStorageAdapter so pode ser resolvido se NODE_ENV for test ou se o ambiente declarar explicitamente flag de teste unitario. Em qualquer outro caso sem Cloudflare R2 ou sistema de arquivos local configurado, a fabrica deve falhar fechada com ContentUnavailableError ou EvidenceStorageUnavailableError.  
Por que: Impede vazamento acidental de provas WORM para memoria volatil.

---

## 3. Criterios de Aceite (lib-clean/AC-01 a AC-05)

- **`lib-clean/AC-01`**: O calculo e a verificacao de assinatura HMAC utilizam utilitarios compartilhados de comparacao em tempo constante em lib/offers/ingest-auth.ts sem duplicacao de logica criptografica.
- **`lib-clean/AC-02`**: A classe MemoryNonceCache em lib/offers/webhook-auth.ts e marcada como utilitario exclusivo de teste local, mantendo compatibilidade com testes legados sem permitir uso em rotas de producao.
- **`lib-clean/AC-03`**: A rota app/api/admin/ofertas/[id]/avaliar-selo/route.ts e refatorada para aceitar a autenticacao unificada ou sessao administrativa AAL2 sem depender de funcoes orfas.
- **`lib-clean/AC-04`**: A fabrica lib/offers/storage/storage-factory.ts preserva fail closed estrito, rejeitando fallback silencioso para memoria em qualquer execucao fora de ambiente de teste unitario.
- **`lib-clean/AC-05`**: A suite de testes pnpm check:all e pnpm test:run executa com 100 por cento de aprovacao, comprovando que nenhum contrato publico ou de teste foi quebrado.

---

## 4. Plano de Construcao (/develop)

1. Criar funcoes criptograficas puras em lib/offers/ingest-auth.ts para reutilizacao.
2. Adaptar lib/offers/webhook-auth.ts para consumir o motor unificado ou servir de fachada retrocompativel para os testes existentes.
3. Atualizar a rota de avaliacao de selo em app/api/admin/ofertas/[id]/avaliar-selo/route.ts.
4. Validar limites de seguranca em storage-factory.ts.
5. Reexecutar a suite completa Vitest e scanners de seguranca.
