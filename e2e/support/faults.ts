import { expect, type APIRequestContext } from '@playwright/test';
export async function setFault(
  request: APIRequestContext,
  mode: 'none' | 'read' | 'logout' | 'refresh',
) {
  const secret = process.env.E2E_FAULT_SECRET;
  if (!secret || process.env.E2E_NETWORK_FAULTS !== '1')
    throw new Error('Execute com o proxy de falhas descartável.');
  expect(
    (
      await request.post(`http://127.0.0.1:3111/${mode}`, {
        headers: { Authorization: `Bearer ${secret}` },
      })
    ).status(),
  ).toBe(204);
}
