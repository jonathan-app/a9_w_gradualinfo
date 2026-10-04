import fs from 'fs';
import path from 'path';

const replacements = [
  { file: 'package.json', rules: [
    [/aqua9-boilerplate-v2/g, 'gradualinfo'],
    [/"author": "Aqua9"/g, '"author": "Jonathan Simão"'],
    [/aqua9\/aqua9-boilerplate-v2/g, 'gradualinfo/gradualinfo'],
    [/aqua9\.com\.br/g, 'gradualinfo.com.br']
  ]},
  { file: 'wrangler.jsonc', rules: [
    [/aqua9-boilerplate-v2/g, 'gradualinfo']
  ]},
  { file: 'supabase/config.toml', rules: [
    [/aqua9-boilerplate-v2/g, 'gradualinfo']
  ]},
  { file: '.gitleaks.toml', rules: [
    [/aqua9-boilerplate-v2/g, 'gradualinfo']
  ]},
  { file: '.gitattributes', rules: [
    [/Aqua9 Website \(aqua9\.com\.br\)/g, 'Gradualinfo Website (gradualinfo.com.br)'],
    [/aqua9-website-v1/g, 'gradualinfo-v1']
  ]},
  { file: 'app/layout.tsx', rules: [
    [/Aqua9 Boilerplate/g, 'Gradualinfo']
  ]},
  { file: 'app/page.tsx', rules: [
    [/Aqua9 Boilerplate v2/g, 'Gradualinfo'],
    [/aqua9\/aqua9-boilerplate-v2/g, 'gradualinfo/gradualinfo']
  ]},
  { file: 'components/layout/site-header.tsx', rules: [
    [/>\s*Aqua9\s*</g, '>Gradualinfo<']
  ]},
  { file: 'components/layout/site-footer.tsx', rules: [
    [/Aqua9\. Boilerplate v2\./g, 'Gradualinfo.']
  ]},
  { file: 'e2e/critical-flows.spec.ts', rules: [
    [/Aqua9 Boilerplate v2/g, 'Gradualinfo']
  ]},
  { file: 'e2e/home.spec.ts', rules: [
    [/Aqua9 Boilerplate v2/g, 'Gradualinfo']
  ]},
  { file: 'scripts/client-preflight.mjs', rules: [
    [/aqua9-boilerplate/g, 'gradualinfo'],
    [/Boilerplate Aqua9/g, 'Gradualinfo'],
    [/Aqua9 Client Preflight/g, 'Gradualinfo Client Preflight']
  ]},
  { file: 'scripts/security-free-doctor.mjs', rules: [
    [/Aqua9 Security/g, 'Gradualinfo Security']
  ]},
  { file: 'README.md', rules: [
    [/Aqua9 Boilerplate v2/g, 'Gradualinfo']
  ]}
];

for (const {file, rules} of replacements) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [regex, replaceWith] of rules) {
      content = content.replace(regex, replaceWith);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
}
