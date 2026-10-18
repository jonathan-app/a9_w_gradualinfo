import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const tenSlugs = [
  'otimizar-velocidade-site-sem-perder-design',
  'nextjs-cloudflare-workers-producao',
  'logs-metricas-traces-diagnostico',
  'checklist-seguranca-aplicacao-deploy',
  'usar-ia-produtividade-com-controle-de-qualidade',
  'sistema-produtividade-digital-sustentavel',
  'ferramentas-ia-gratuitas-vs-pagas',
  'transformar-site-conteudo-ativo-digital',
  'seo-palavras-chave-conversoes',
  'arquitetura-conteudo-seo-clusters',
];

const _sixPreservedSlugs = [
  'auditoria-seo-tecnico-checklist',
  'como-verificar-respostas-da-ia',
  'construindo-gradualinfo-estudo-de-caso',
  'diagnosticar-erro-500-503-site',
  'seo-nextjs-16-metadata-indexacao',
  'site-lento-mesmo-com-boa-nota-pagespeed',
];

const errors = [];
const results = {};

for (const slug of tenSlugs) {
  const filePath = path.join('docs/rascunhos-editoriais', `${slug}.md`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check [fonte a confirmar] and [web:n]
  if (content.includes('[fonte a confirmar]')) {
    errors.push(`${slug}: contém [fonte a confirmar]`);
  }
  if (/\[web:\d+\]/.test(content)) {
    errors.push(`${slug}: contém marcador opaco [web:n]`);
  }

  // Frontmatter checks
  const fmMatch = content.match(/^---\n([\s\S]+?)\n---/);
  if (!fmMatch) {
    errors.push(`${slug}: frontmatter ausente`);
    continue;
  }
  const fm = fmMatch[1];

  if (!fm.includes("status: 'rascunho'")) {
    errors.push(`${slug}: status não é 'rascunho'`);
  }
  if (!fm.includes("revisao_editorial: 'aprovada'")) {
    errors.push(`${slug}: revisao_editorial não é 'aprovada'`);
  }

  const excerptMatch = fm.match(/excerpt:\s*'([^']+)'/);
  if (!excerptMatch) {
    errors.push(`${slug}: excerpt não encontrado`);
  } else {
    const len = excerptMatch[1].length;
    if (len < 140 || len > 160) {
      errors.push(
        `${slug}: excerpt tem ${len} caracteres (deve ter 140 a 160)`,
      );
    }
  }

  const coverMatch = fm.match(/cover_image:\s*'([^']+)'/);
  if (coverMatch) {
    const coverRel = coverMatch[1].replace(/^\//, '');
    if (!fs.existsSync(path.join('public', coverRel))) {
      errors.push(`${slug}: imagem de capa não existe em public/: ${coverRel}`);
    }
  }

  // Heading checks (stripping code blocks first)
  const bodyWithoutCode = content
    .slice(fmMatch[0].length)
    .replace(/```[\s\S]*?```/g, '');

  const h1Matches = bodyWithoutCode.match(/^#\s+.+$/gm) || [];
  if (h1Matches.length !== 1) {
    errors.push(
      `${slug}: esperado exatamente 1 h1, encontrado ${h1Matches.length}`,
    );
  }

  const lines = bodyWithoutCode.split('\n');
  let currentH2 = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      currentH2 = line;
    } else if (line.startsWith('### ')) {
      if (!currentH2) {
        errors.push(
          `${slug}: h3 antes de qualquer h2 (linha ${i + 1}): ${line}`,
        );
      }
    }
  }

  const hash = crypto.createHash('sha256').update(content).digest('hex');
  results[slug] = {
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: hash,
  };
}

if (errors.length > 0) {
  console.error('Erros encontrados nos 10 rascunhos:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
} else {
  console.log(
    'Todos os 10 rascunhos passaram 100% nas validações estruturais, frontmatter e headings!',
  );
  console.log(JSON.stringify(results, null, 2));
}
