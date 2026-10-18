# Fragmento de alteração concorrente de login

Preservado antes de integração com o contrato Access aceito explicitamente pelo proprietário. A função atual de quota recebe somente a operação; este fragmento não constitui contrato aprovado de particionamento por IP.

```typescript
/**
 * Extrai o IP real confiável fornecido pela Cloudflare, nunca pelo cliente.
 * Confia apenas em headers gerenciados pela Cloudflare (cf-connecting-ip).
 * @param request - Requisição do Worker.
 * @returns IP canônico ou 'unknown' quando indeterminável.
 */
function getRealClientIp(request: Request): string {
  const headers = request.headers;
  const connectingIp = headers.get('cf-connecting-ip');
  if (connectingIp) return connectingIp;
  return 'unknown';
}

// Chamada concorrente recebida:
await consumeAdminRateLimit('login', clientIp);
```
