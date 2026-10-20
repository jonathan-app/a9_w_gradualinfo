// @vitest-environment node
/**
 * @fileoverview Teste de integração do provisionamento de fixtures efêmeras da CI.
 * @module __tests__/integration/ci-fixtures.test
 * @description Executa `scripts/ci-fixtures.mjs` contra um Supabase local simulado e
 *   comprova que credenciais efêmeras são registradas em `::add-mask::`, que os valores
 *   esperados chegam ao `GITHUB_ENV` e que a trava de stack local recusa hosts remotos
 *   e execuções sem `GITHUB_ENV`.
 * @dependencies vitest, node:child_process, node:http, node:fs/promises, node:os,
 *   node:path, node:crypto.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/ci-fixtures.mjs');
const SERVICE_ROLE_KEY = 'local-service-role-key';
const ANON_KEY = 'local-anon-key';
const GUARD_MESSAGE = 'Fixtures somente na stack local descartável de CI.';

let server: Server;
let serverUrl = '';
let authCalls = 0;
let postCalls = 0;
let insertedPosts: Array<Record<string, unknown>> = [];
let tempDir = '';
let statusPath = '';
let envPath = '';

type RunOptions = {
  withGithubEnv?: boolean;
  networkFaults?: boolean;
  origin?: string;
  offersIngestSecret?: string;
};

type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

beforeAll(async () => {
  server = createServer((request, response) => {
    if (
      request.method === 'POST' &&
      request.url?.startsWith('/auth/v1/admin/users')
    ) {
      authCalls += 1;
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        const parsed = JSON.parse(body || '{}') as { email?: string };
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            user: { id: randomUUID(), email: parsed.email ?? '' },
          }),
        );
      });
      return;
    }

    if (
      request.method === 'POST' &&
      request.url?.startsWith('/rest/v1/posts')
    ) {
      postCalls += 1;
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        insertedPosts = JSON.parse(body || '[]') as Array<
          Record<string, unknown>
        >;
        response.writeHead(201, { 'content-type': 'application/json' });
        response.end('[]');
      });
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'not found' }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Não foi possível obter a porta do Supabase simulado.');
  }
  serverUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'ci-fixtures-test-'));
  statusPath = join(tempDir, 'supabase-status.json');
  envPath = join(tempDir, 'github-env');
  authCalls = 0;
  postCalls = 0;
  insertedPosts = [];
  await writeFile(envPath, '');
  await writeStatus(serverUrl);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeStatus(apiUrl: string): Promise<void> {
  await writeFile(
    statusPath,
    JSON.stringify({
      API_URL: apiUrl,
      SERVICE_ROLE_KEY,
      ANON_KEY,
    }),
  );
}

function runFixtures(options: RunOptions = {}): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (options.withGithubEnv === false) {
    delete env.GITHUB_ENV;
  } else {
    env.GITHUB_ENV = envPath;
  }
  if (options.networkFaults) {
    env.E2E_NETWORK_FAULTS = '1';
  } else {
    delete env.E2E_NETWORK_FAULTS;
  }
  if (options.origin) {
    env.CI_FIXTURE_ORIGIN = options.origin;
  }
  if (options.offersIngestSecret) {
    env.OFFERS_INGEST_SECRET = options.offersIngestSecret;
  } else {
    delete env.OFFERS_INGEST_SECRET;
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, statusPath], {
      cwd: REPO_ROOT,
      env,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ status: null, stdout, stderr });
    }, 15_000);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      finish({ status: null, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (status) => {
      finish({ status, stdout, stderr });
    });
  });
}

function parseGithubEnv(contents: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of contents.split('\n')) {
    if (!line) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    values.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return values;
}

describe('scripts/ci-fixtures.mjs', () => {
  it('mascara as credenciais efêmeras e exporta os valores para o GITHUB_ENV', async () => {
    const result = await runFixtures({
      networkFaults: true,
      origin: 'https://localhost:3100',
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(authCalls).toBe(3);
    expect(postCalls).toBe(1);
    expect(insertedPosts).toHaveLength(18);
    for (const field of ['excerpt', 'cover_image_url', 'editoria'])
      expect(new Set(insertedPosts.map((post) => post[field])).size).toBe(18);

    const envContents = await readFile(envPath, 'utf8');
    const env = parseGithubEnv(envContents);
    expect(env.get('CI_LOCAL_SERVICE_ROLE')).toBe(SERVICE_ROLE_KEY);
    expect(env.get('SUPABASE_SERVICE_ROLE_KEY')).toBe(SERVICE_ROLE_KEY);
    expect(env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')).toBe(ANON_KEY);
    expect(env.get('NEXT_PUBLIC_SUPABASE_URL')).toBe('http://127.0.0.1:3110');
    expect(env.get('E2E_SUPABASE_UPSTREAM')).toBe(serverUrl);
    expect(env.get('E2E_BASE_URL')).toBe('https://localhost:3100');
    expect(env.get('SUPABASE_PREVIEW_EMAIL')).toMatch(
      /^preview-[a-f0-9]+@example\.invalid$/,
    );
    expect(env.get('SUPABASE_PREVIEW_USER_ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const previewToken = env.get('SUPABASE_PREVIEW_TOKEN');
    const previewPassword = env.get('SUPABASE_PREVIEW_PASSWORD');
    const faultSecret = env.get('E2E_FAULT_SECRET');
    const offersSecret = env.get('OFFERS_INGEST_SECRET');
    const noClaim = env.get('E2E_NO_CLAIM');
    const otherIdentity = env.get('E2E_OTHER_IDENTITY');

    expect(previewToken).toBeTruthy();
    expect(previewPassword).toBeTruthy();
    expect(faultSecret).toBeTruthy();
    expect(offersSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(noClaim).toBeTruthy();
    expect(otherIdentity).toBeTruthy();

    const maskedValues = new Set(
      [
        SERVICE_ROLE_KEY,
        previewToken,
        previewPassword,
        faultSecret,
        offersSecret,
        noClaim,
        otherIdentity,
      ].filter((value): value is string => Boolean(value)),
    );
    for (const value of maskedValues) {
      expect(result.stdout).toContain(`::add-mask::${value}`);
    }

    for (const json of [noClaim, otherIdentity]) {
      const user = JSON.parse(json!) as { password: string };
      expect(result.stdout).toContain(`::add-mask::${user.password}`);
    }
  });

  it('reutiliza OFFERS_INGEST_SECRET fornecido e o mascara', async () => {
    const providedSecret = 'collector-secret-fornecido-32-chars';
    const result = await runFixtures({ offersIngestSecret: providedSecret });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);

    const env = parseGithubEnv(await readFile(envPath, 'utf8'));
    expect(env.get('OFFERS_INGEST_SECRET')).toBe(providedSecret);
    expect(result.stdout).toContain(`::add-mask::${providedSecret}`);
  });

  it('recusa API_URL fora de loopback mesmo com GITHUB_ENV', async () => {
    await writeStatus('https://db.example.com');

    const result = await runFixtures();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(GUARD_MESSAGE);
    expect(authCalls).toBe(0);
    expect(postCalls).toBe(0);
  });

  it('recusa execução sem GITHUB_ENV', async () => {
    const result = await runFixtures({ withGithubEnv: false });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(GUARD_MESSAGE);
    expect(authCalls).toBe(0);
    expect(postCalls).toBe(0);
  });
});
