/**
 * @fileoverview Inicia a prévia editorial sem serviços remotos.
 * @module scripts/dev-editorial
 * @description Escuta somente em loopback; não executa build nem publicação.
 * @dependencies node:child_process, node:module, Next instalado no projeto.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const port =
  args.length === 0
    ? '3000'
    : args.length === 2 && args[0] === '--port'
      ? args[1]
      : '';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  console.error('Uso: pnpm dev:editorial [--port 3000]');
  process.exit(1);
}
const sync = spawnSync(process.execPath, ['scripts/sync-editorial.mjs'], {
  stdio: 'inherit',
});
if (sync.status !== 0) process.exit(1);

const lockPath = '.next-editorial/dev/lock';
if (existsSync(lockPath)) {
  try {
    const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (lockData.pid) {
      try {
        process.kill(lockData.pid, 0);
      } catch (err) {
        if (err.code === 'ESRCH') {
          unlinkSync(lockPath);
        }
      }
    }
  } catch {
    // Se o lockfile estiver inacessível ou formato desconhecido, conserva
  }
}
function getParentPid(pid) {
  try {
    if (existsSync(`/proc/${pid}/stat`)) {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const lastParen = stat.lastIndexOf(')');
      if (lastParen === -1) return null;
      const parts = stat.slice(lastParen + 2).split(' ');
      return parseInt(parts[1], 10);
    }
  } catch {
    // Sem `/proc` (Windows, contêineres sem mount) o fallback do `ps` entra abaixo.
  }
  try {
    const res = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], {
      encoding: 'utf8',
    });
    if (res.status === 0 && res.stdout) {
      const ppid = parseInt(res.stdout.trim(), 10);
      return Number.isNaN(ppid) ? null : ppid;
    }
  } catch {
    // `ps` indisponível: sem pai detectável.
  }
  return null;
}

function isDescendantOf(parentPid, targetPid) {
  if (!parentPid || !targetPid) return false;
  let curr = targetPid;
  while (curr && curr > 0) {
    if (curr === parentPid) return true;
    curr = getParentPid(curr);
  }
  return false;
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err.code === 'EPERM') return true;
    return false;
  }
}

function waitForPidExit(pid, timeoutMs = 3000) {
  if (!pid || !isPidAlive(pid)) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isPidAlive(pid)) return true;
    const waitArr = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(waitArr, 0, 0, 50);
  }
  return !isPidAlive(pid);
}

const child = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    port,
  ],
  {
    stdio: [process.stdin.isTTY ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    env: {
      ...process.env,
      EDITORIAL_LOCAL: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
      NEXT_PUBLIC_GTM_ID: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
    },
  },
);

let claimedPid = null;
let ownershipProven = false;

const checkLockOwnership = () => {
  if (ownershipProven) return;
  if (existsSync(lockPath)) {
    try {
      const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));
      if (lockData.pid) {
        if (
          lockData.pid === child.pid ||
          isDescendantOf(child.pid, lockData.pid)
        ) {
          claimedPid = lockData.pid;
          ownershipProven = true;
        }
      }
    } catch {
      // Lockfile malformado ou inacessível: propriedade não comprovada.
    }
  }
};

const lockMonitorInterval = setInterval(checkLockOwnership, 200);

const cleanup = () => {
  clearInterval(lockMonitorInterval);
  checkLockOwnership();
  try {
    if (existsSync(lockPath)) {
      const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));
      const targetPid = lockData.pid;
      const matchesClaimed =
        ownershipProven &&
        (targetPid === claimedPid || targetPid === child.pid);
      const isDirectChild = targetPid === child.pid;
      const isProvenDescendant =
        targetPid && isDescendantOf(child.pid, targetPid);

      if (matchesClaimed || isDirectChild || isProvenDescendant) {
        const exited = waitForPidExit(targetPid, 3000);
        if (exited) {
          unlinkSync(lockPath);
        } else {
          console.warn(
            `[dev-editorial] Processo vinculado (PID ${targetPid}) não encerrou no tempo limite. Lockfile conservado.`,
          );
        }
      } else {
        console.warn(
          `[dev-editorial] Propriedade do lockfile ambígua ou não vinculada à árvore do processo filho (PID no lock: ${targetPid}, PID filho: ${child.pid}). Arquivo conservado.`,
        );
      }
    }
  } catch {
    // Limpeza do lockfile não pode derrubar o encerramento do processo.
  }
};
child.on('error', () => {
  cleanup();
  console.error('Não foi possível iniciar a prévia local.');
  process.exit(1);
});
child.on('exit', (code, signal) => {
  cleanup();
  if (signal) {
    console.log(
      `[dev-editorial] Processo filho finalizado com sinal ${signal}.`,
    );
  }
  process.exit(code ?? 0);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[dev-editorial] Recebido sinal ${signal} no processo.`);
    try {
      child.kill(signal);
    } catch {
      // Ignora se o processo filho já não existe
    }
  });
}
process.on('SIGHUP', () => {
  console.log('[dev-editorial] Recebido SIGHUP, mantendo processo ativo.');
});
