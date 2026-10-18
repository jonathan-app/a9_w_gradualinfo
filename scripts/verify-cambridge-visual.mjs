/**
 * @fileoverview Script de validação e captura visual da Home Cambridge e Artigo de Referência.
 * @module scripts/verify-cambridge-visual
 * @description Executa bateria empírica de capturas visuais para desktop, mobile, temas claro/escuro
 *   e catálogos com poucos posts (1 a 5 posts), conferindo ausência de overflow e não repetição.
 * @dependencies @playwright/test, node:fs, node:child_process, node:crypto.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EVIDENCE_DIR = path.resolve(
  'docs/reviews/evidence/2026-10-14-0805-0013-home-cambridge-visual',
);
const LOCAL_POSTS_PATH = path.resolve('lib/editorial/local-posts.json');

/**
 * Aguarda a disponibilidade do servidor HTTP loopback.
 * @param {string} url - URL para consulta de liveness.
 * @param {number} timeoutMs - Tempo máximo de espera em milissegundos.
 * @returns {Promise<void>}
 */
async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return;
    } catch {
      // Servidor ainda iniciando
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout esperando servidor em ${url}`);
}

/**
 * Calcula o hash SHA-256 de um arquivo em disco.
 * @param {string} filePath - Caminho absoluto ou relativo do arquivo.
 * @returns {string} Hash SHA-256 em hexadecimal.
 */
function sha256File(filePath) {
  const buffer = readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  if (!existsSync(EVIDENCE_DIR)) {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const originalPostsJson = readFileSync(LOCAL_POSTS_PATH, 'utf8');
  const originalPosts = JSON.parse(originalPostsJson);

  let server = null;
  const isServerRunning = await fetch(BASE_URL)
    .then((res) => res.ok || res.status === 200)
    .catch(() => false);
  if (isServerRunning) {
    console.log(
      `[visual-verify] Servidor existente ativo em ${BASE_URL}. Reutilizando instância...`,
    );
  } else {
    console.log(
      `[visual-verify] Iniciando servidor editorial na porta ${PORT}...`,
    );
    server = spawn(
      'node',
      ['scripts/dev-editorial.mjs', '--port', String(PORT)],
      {
        stdio: 'inherit',
      },
    );
    await waitForServer(BASE_URL);
  }

  try {
    console.log(
      '[visual-verify] Servidor pronto. Iniciando Playwright Chromium...',
    );

    const browser = await chromium.launch();
    const manifest = {
      date: new Date().toISOString(),
      baseUrl: BASE_URL,
      captures: [],
      checks: [],
    };

    /**
     * Tira captura de tela e registra no manifesto.
     * @param {import('@playwright/test').Page} page
     * @param {string} filename
     * @param {string} description
     */
    async function takeScreenshot(page, filename, description) {
      // Pré-carrega imagens lazy através de rolagem suave e espera de carregamento
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 30);
        });
        const imgs = Array.from(document.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
              setTimeout(resolve, 1500);
            });
          }),
        );
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);

      const targetPath = path.join(EVIDENCE_DIR, filename);
      await page.screenshot({ path: targetPath, fullPage: true });
      const hash = sha256File(targetPath);
      manifest.captures.push({
        file: filename,
        description,
        sha256: hash,
      });
      console.log(
        `[visual-verify] Capturado: ${filename} (${hash.slice(0, 12)}...)`,
      );
    }

    // -------------------------------------------------------------------------
    // 1. Matriz Canônica (16 posts): Desktop e Celular, Temas Claro e Escuro
    // -------------------------------------------------------------------------
    console.log(
      '[visual-verify] Executando matriz canônica da Home (16 posts)...',
    );

    // Desktop 1280px Claro
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '01-home-desktop-claro.png',
        'Home Cambridge Desktop 1280px tema claro',
      );
      await context.close();
    }

    // Desktop 1280px Escuro
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '02-home-desktop-escuro.png',
        'Home Cambridge Desktop 1280px tema escuro',
      );
      await context.close();
    }

    // Celular 390px Claro
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '03-home-celular-390-claro.png',
        'Home Cambridge Celular 390px tema claro',
      );
      await context.close();
    }

    // Celular 390px Escuro
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '04-home-celular-390-escuro.png',
        'Home Cambridge Celular 390px tema escuro',
      );
      await context.close();
    }

    // Celular 320px Claro (Compacto)
    {
      const context = await browser.newContext({
        viewport: { width: 320, height: 640 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      manifest.checks.push({
        check: 'home_320px_claro_sem_overflow',
        pass: !hasOverflow,
      });
      await takeScreenshot(
        page,
        '05-home-celular-320-claro.png',
        'Home Cambridge Celular 320px compacto tema claro',
      );
      await context.close();
    }

    // Celular 320px Escuro (Compacto)
    {
      const context = await browser.newContext({
        viewport: { width: 320, height: 640 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('networkidle');
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      manifest.checks.push({
        check: 'home_320px_escuro_sem_overflow',
        pass: !hasOverflow,
      });
      await takeScreenshot(
        page,
        '06-home-celular-320-escuro.png',
        'Home Cambridge Celular 320px compacto tema escuro',
      );
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 2. Artigo de Referência (diagnosticar-erro-500-503-site)
    // -------------------------------------------------------------------------
    console.log(
      '[visual-verify] Executando validação do Artigo de Referência...',
    );
    const REF_SLUG = 'diagnosticar-erro-500-503-site';
    const REF_URL = `${BASE_URL}/artigos/${REF_SLUG}`;

    // Artigo Desktop Claro
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(REF_URL);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '07-artigo-referencia-desktop-claro.png',
        'Artigo de referência Desktop 1280px tema claro',
      );
      await context.close();
    }

    // Artigo Desktop Escuro
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(REF_URL);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '08-artigo-referencia-desktop-escuro.png',
        'Artigo de referência Desktop 1280px tema escuro',
      );
      await context.close();
    }

    // Artigo Celular 390px Claro
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(REF_URL);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '09-artigo-referencia-celular-claro.png',
        'Artigo de referência Celular 390px tema claro',
      );
      await context.close();
    }

    // Artigo Celular 390px Escuro
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(REF_URL);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('networkidle');
      await takeScreenshot(
        page,
        '10-artigo-referencia-celular-escuro.png',
        'Artigo de referência Celular 390px tema escuro',
      );
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 3. Catálogos com Poucos Posts (1 a 5 posts): Sem espaços vazios e sem repetição
    // -------------------------------------------------------------------------
    console.log(
      '[visual-verify] Executando cenários de catálogo com poucos posts...',
    );

    const fewPostsScenarios = [
      {
        count: 1,
        name: '1post',
        desc: 'Catálogo com 1 post: hero largura total (highlightsSingle), zero laterais',
      },
      {
        count: 2,
        name: '2posts',
        desc: 'Catálogo com 2 posts: hero + 1 destaque lateral coluna única, zero últimas leituras',
      },
      {
        count: 3,
        name: '3posts',
        desc: 'Catálogo com 3 posts: hero + 2 destaques laterais coluna única, zero últimas leituras',
      },
      {
        count: 4,
        name: '4posts',
        desc: 'Catálogo com 4 posts: hero + 3 destaques grade 2x2, zero últimas leituras',
      },
      {
        count: 5,
        name: '5posts',
        desc: 'Catálogo com 5 posts: hero + 4 destaques grade 2x2 completa, zero últimas leituras',
      },
    ];

    for (const sc of fewPostsScenarios) {
      const sliced = originalPosts.slice(0, sc.count);
      writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(sliced, null, 2), 'utf8');

      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Verifica repetição do hero
      const leadTitle = sliced[0].title;
      const teaserTitles = await page
        .locator('section[aria-label="Destaques editoriais"] h3')
        .allTextContents();
      const latestTitles = await page
        .locator('section[aria-label="Últimas leituras"] h3')
        .allTextContents();

      const heroRepeatedInTeasers = teaserTitles.includes(leadTitle);
      const heroRepeatedInLatest = latestTitles.includes(leadTitle);

      manifest.checks.push({
        scenario: `${sc.count}_posts`,
        heroTitle: leadTitle,
        heroRepeatedInTeasers,
        heroRepeatedInLatest,
        teasersCount: teaserTitles.length,
        latestCount: latestTitles.length,
        pass: !heroRepeatedInTeasers && !heroRepeatedInLatest,
      });

      await takeScreenshot(
        page,
        `1${sc.count}-home-${sc.name}-desktop.png`,
        sc.desc,
      );
      await context.close();
    }

    await browser.close();

    // -------------------------------------------------------------------------
    // 4. Salva manifesto de evidências
    // -------------------------------------------------------------------------
    const manifestPath = path.join(EVIDENCE_DIR, 'evidence-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(
      `[visual-verify] Manifesto de evidências gravado em: ${manifestPath}`,
    );
  } finally {
    // Restaura o local-posts.json original rigorosamente
    writeFileSync(LOCAL_POSTS_PATH, originalPostsJson, 'utf8');
    console.log(
      '[visual-verify] Catálogo local original restaurado com sucesso.',
    );

    // Encerra servidor se foi iniciado neste processo
    if (server) {
      server.kill('SIGINT');
    }
  }
}

main().catch((err) => {
  console.error('[visual-verify] Falha na execução:', err);
  process.exit(1);
});
