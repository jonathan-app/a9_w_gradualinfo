/**
 * @fileoverview Suíte do grant assinado de preview (`lib/preview/session`).
 * @module __tests__/unit/preview-session
 * @description O grant é um token autocontido — payload em base64url mais HMAC — que autoriza a
 *   leitura de rascunho sem round-trip ao banco. Aqui se trava o prazo exato de validade, a
 *   integridade da assinatura sob adulteração do payload, a rotação do segredo, o payload
 *   malformado e a comparação de segredos: cada um é uma porta de entrada para ler rascunho
 *   sem autorização.
 * @dependencies vitest, node:buffer, @/lib/preview/session.
 *
 * O "agora" é passado como parâmetro em milissegundos e o grant guarda segundos — por isso os
 * valores dos testes são absolutos e determinísticos: nada aqui depende do relógio da máquina.
 */
import { describe, expect, it } from 'vitest';
import {
  equalSecret,
  issuePreviewGrant,
  readPreviewGrant,
} from '@/lib/preview/session';
const sub = '11111111-1111-4111-8111-111111111111';
const session = '22222222-2222-4222-8222-222222222222';
const secret = 'a-private-test-secret-at-least-thirty-two-bytes';
describe('autorização de preview', () => {
  // A validade é do token, não do cookie: um segundo antes do vencimento ainda vale, no
  // instante exato do vencimento já cai — mesmo com o cookie ainda presente no browser.
  it('vence exatamente no prazo mesmo com cookie ainda presente', () => {
    const value = issuePreviewGrant(sub, session, secret, 1_000_000);
    expect(readPreviewGrant(value, secret, 2_799_999)?.sub).toBe(sub);
    expect(readPreviewGrant(value, secret, 2_800_000)).toBeNull();
  });
  // O payload é decodificado, o prazo é aumentado e o MAC original é reutilizado: o HMAC
  // cobre o payload, então qualquer byte alterado invalida a assinatura antiga. Trocar o
  // segredo cobre a rotação de chave — grant emitido com a chave velha não vale na nova.
  it('nega prazo adulterado, assinatura inválida e rotação de chave', () => {
    const value = issuePreviewGrant(sub, session, secret, 1_000_000);
    const [payload, mac] = value.split('.');
    const grant = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    grant.expires_at += 3600;
    const altered = `${Buffer.from(JSON.stringify(grant)).toString('base64url')}.${mac}`;
    expect(readPreviewGrant(altered, secret, 1_000_001)).toBeNull();
    expect(readPreviewGrant(value + 'x', secret, 1_000_001)).toBeNull();
    expect(readPreviewGrant(value, secret + 'rotated', 1_000_001)).toBeNull();
  });
  // Malformado é rejeitado sem lançar (o `catch` vira null), e um grant emitido para o
  // futuro não vale agora: `issued_at > now` é fraude de relógio, não edge case cosmético.
  it('rejeita payload malformado e emissão futura', () => {
    expect(readPreviewGrant('bad.value', secret)).toBeNull();
    expect(
      readPreviewGrant(
        issuePreviewGrant(sub, session, secret, 2_000_000),
        secret,
        1_000_000,
      ),
    ).toBeNull();
  });
  // Hashear antes de comparar mantém os buffers em tamanho fixo: `timingSafeEqual` lança se
  // os tamanhos diferem, então entradas de comprimento diferente teriam de ser tratadas fora
  // da comparação segura — e é justamente ali que um atacante mede o segredo pelo erro.
  it('compara segredos de comprimentos diferentes sem exceção', () => {
    expect(equalSecret(secret, secret)).toBe(true);
    expect(equalSecret('a', secret)).toBe(false);
  });
});
