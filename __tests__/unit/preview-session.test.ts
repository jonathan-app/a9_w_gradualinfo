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
  it('vence exatamente no prazo mesmo com cookie ainda presente', () => {
    const value = issuePreviewGrant(sub, session, secret, 1_000_000);
    expect(readPreviewGrant(value, secret, 2_799_999)?.sub).toBe(sub);
    expect(readPreviewGrant(value, secret, 2_800_000)).toBeNull();
  });
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
  it('compara segredos de comprimentos diferentes sem exceção', () => {
    expect(equalSecret(secret, secret)).toBe(true);
    expect(equalSecret('a', secret)).toBe(false);
  });
});
