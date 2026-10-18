---
title: 'Antes de publicar uma aplicação: checklist de segurança para segredos, APIs e deploys'
slug: 'checklist-seguranca-aplicacao-deploy'
editoria: 'Engenharia & Confiabilidade'
excerpt: 'Publicar uma aplicação exige decidir quem acessa dados, proteger segredos, tratar erros e validar builds antes de colocar qualquer serviço em produção.'
cover_image: '/artigos/checklist-seguranca-aplicacao-deploy.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
revisao_editorial: 'aprovada'
fontes_citadas:
  - titulo: 'OWASP: Top 10 Application Security Risks'
    url: 'https://owasp.org/www-project-top-ten/'
  - titulo: 'OWASP: Secrets Management Cheat Sheet'
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'
  - titulo: 'OWASP: Authentication Cheat Sheet'
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html'
  - titulo: 'OWASP: CSRF Prevention Cheat Sheet'
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'
  - titulo: 'Cloudflare Workers Documentation: Configuration'
    url: 'https://developers.cloudflare.com/workers/wrangler/configuration/'
  - titulo: 'Cloudflare: Security headers'
    url: 'https://developers.cloudflare.com/fundamentals/reference/security-headers/'
  - titulo: 'gitleaks: A Golang-based secret scanner'
    url: 'https://github.com/gitleaks/gitleaks'
---

# Antes de publicar uma aplicação: checklist de segurança para segredos, APIs e deploys

Publicar uma aplicação não é apenas colocar código no ar. É decidir quem pode acessar dados, quais segredos existem, como erros são registrados e o que acontece se uma dependência falhar.

Este checklist separa bloqueadores de release, riscos importantes e melhorias posteriores.

## 1. Bloqueadores de release

Não publique se algum destes itens estiver pendente.

- [ ] Nenhum segredo no repositório.
- [ ] Nenhum segredo no bundle do cliente.
- [ ] Nenhuma chave secreta em variável `NEXT_PUBLIC_*`.
- [ ] `.env` e `.dev.vars` fora do Git.
- [ ] Tokens e senhas fora de logs.
- [ ] Validação de entrada no servidor.
- [ ] Autorização verificada no servidor.
- [ ] Rotas administrativas protegidas.
- [ ] Dependências críticas atualizadas.
- [ ] Build de produção concluído.
- [ ] Testes essenciais passando.
- [ ] Plano de rollback definido.

Segredos nunca devem ser expostos ao navegador. Variáveis públicas podem terminar no bundle; segredos precisam permanecer no servidor ou em um serviço de segredos.

## 2. Gestão de segredos e credenciais

Verifique:

- [ ] `.env` está no `.gitignore`.
- [ ] `.env.local` está no `.gitignore`.
- [ ] `.dev.vars` está no `.gitignore`.
- [ ] Não há credenciais em fixtures.
- [ ] Não há credenciais em testes.
- [ ] Não há credenciais em logs.
- [ ] Não há credenciais em mensagens de erro.
- [ ] Tokens têm escopo mínimo.
- [ ] Tokens têm prazo de validade quando possível.
- [ ] Há processo de rotação.

Um bom teste é procurar padrões comuns de segredos antes do commit:

```bash
git diff --staged |
  grep -Ein "(api[_-]?key|secret|token|password|authorization)['\"]?\s*[:=]"
```

Esse comando é uma triagem, não uma garantia. Use ferramentas dedicadas como gitleaks para uma verificação mais completa.

## 3. Segurança e consumo de APIs externas

Para cada integração externa, responda:

- Qual dado ela acessa?
- Qual permissão ela precisa?
- O token tem escopo mínimo?
- O timeout está definido?
- Há tratamento de erro?
- A chamada pode ser feita no servidor?
- O resultado pode ser cacheado com segurança?
- O erro pode vazar informação sensível?

Uma API de leitura pública não precisa das mesmas permissões de uma API administrativa.

## 4. Autenticação e autorização no servidor

Autenticação responde “quem é você?”. Autorização responde “o que essa pessoa pode fazer?”.

Verifique:

- [ ] Login exige senha forte.
- [ ] MFA está disponível ou obrigatório para admin.
- [ ] Sessões expiram.
- [ ] Cookies usam flags seguras.
- [ ] Rotas administrativas validam sessão no servidor.
- [ ] Operações sensíveis validam permissão no servidor.
- [ ] O banco aplica políticas de acesso.
- [ ] Tentativas repetidas são limitadas.
- [ ] Logout invalida a sessão quando possível.

Não confie apenas em esconder botões no frontend.

## 5. Headers HTTP e cookies seguros

Verifique:

- HTTPS em todas as rotas.
- Cookies `Secure`.
- Cookies `HttpOnly` quando aplicável.
- `SameSite` adequado.
- Proteção contra CSRF.
- Política de segurança de conteúdo.
- Headers de segurança coerentes com a aplicação.

## 6. Logs estruturados e prevenção de vazamentos

Logs são úteis, mas podem vazar dados.

Nunca registre:

- Senhas.
- Tokens.
- Cookies.
- Chaves de API.
- Números de cartão.
- Documentos completos sem necessidade.
- Dados pessoais desnecessários.

Registre:

- Horário.
- Rota.
- Método.
- Status HTTP.
- ID de correlação.
- Versão.
- Mensagem de erro sanitizada.

## 7. Revisão de artefatos de build

Antes do deploy, confira:

- [ ] Build de produção foi executado.
- [ ] O artefato não inclui `.env`.
- [ ] O artefato não inclui arquivos de teste com segredos.
- [ ] O bundle não inclui chaves privadas.
- [ ] O preview funciona.
- [ ] Rotas administrativas exigem autenticação.
- [ ] Rotas públicas não expõem rascunhos.

## 8. Auditoria de dependências

Antes de publicar:

```bash
pnpm audit
pnpm outdated
```

Não atualize tudo às cegas. Leia as mudanças, teste o build e priorize correções de vulnerabilidades reais.

## 9. Práticas contínuas após o deploy

Estas ações são importantes, mas nem sempre bloqueiam a primeira entrega:

- SAST automatizado.
- Testes de penetração.
- Monitoramento avançado.
- Rotação automática de segredos.
- Backup testado.
- Alertas de anomalia.
- Revisão periódica de permissões.

## 10. Próximo passo: checklist no repositório

Crie uma checklist de release no repositório. Antes de cada deploy, responda: “Se esta aplicação fosse atacada agora, quais dados, segredos ou operações ficariam expostos?”
