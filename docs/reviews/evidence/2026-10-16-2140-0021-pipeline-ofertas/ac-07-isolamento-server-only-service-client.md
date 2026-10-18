# Evidência AC-07: Isolamento server-only do cliente privilegiado com service_role

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-07`  
**Status**: PASS  

## Descrição e comprovação empírica

O cliente com permissão de serviço é isolado no módulo dedicado `lib/offers/service-client.ts`:

1. **Diretiva `server-only`**:
   * O topo do arquivo declara `import 'server-only'`, garantindo falha em tempo de compilação caso qualquer módulo acessível ao navegador tente importar o cliente privilegiado.
2. **Sem persistência de sessão nem cookies**:
   * O cliente Supabase é instanciado com:
     ```typescript
     {
       auth: {
         persistSession: false,
         autoRefreshToken: false,
         detectSessionInUrl: false,
       }
     }
     ```
   * Isso assegura que a chave `SUPABASE_SERVICE_ROLE_KEY` nunca seja propagada em cookies de resposta, não gere sessões locais e opere exclusivamente como credencial transacional de curta duração no backend.
3. **Comprovação em teste**:
   * Teste unitário `lança ServiceClientConfigError se a chave service_role não estiver configurada` em `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` valida o isolamento do módulo e o tratamento de ausência da chave.
