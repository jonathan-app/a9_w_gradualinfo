# Recuperação manual do MFA administrativo

Contrato: [endurecimento administrativo](../specs/2026-10-09-0842-endurecimento-auth-admin.md), aceito pelo proprietário para implementação local em 2026-10-09. Este procedimento não foi executado na conta real. Prova operacional permanece UNVERIFIABLE.

## Pré-requisitos

O proprietário tem acesso confiável à plataforma Supabase e confirma o projeto e o UUID de ADMIN_USER_ID. Recuperação da conta da plataforma Supabase é distinta da recuperação do usuário Auth do GradualInfo. A conta Auth precisa permitir nova autenticação por senha; se necessário, usar a recuperação oficial de senha entregue ao e-mail do proprietário, sem desabilitar MFA ou alterar UUID.

Operações administrativas ocorrem no painel oficial ou em estação confiável, fora do app. Se necessário usar Admin API, criar cliente administrativo temporário apenas nesse ambiente. A credencial administrativa, senha e access token nunca entram em comandos compartilhados, logs, chat, arquivos de evidência ou repositório.

## Procedimento

1. Confirmar projeto e usuário no Supabase. Listar fatores via administração oficial, por exemplo auth.admin.mfa.listFactors com userId confirmado. Identificar o fator perdido por ID e status, sem registrar segredo. Se houver fator válido remanescente, usá-lo para desafio em vez de matricular outro.
2. Remover somente o fator perdido pela administração oficial, por exemplo auth.admin.mfa.deleteFactor com userId e id confirmados. Resultado de erro interrompe o fluxo. Múltiplos fatores inutilizáveis exigem decisão manual para cada exclusão, sem remover todos automaticamente.
3. Revogar globalmente as sessões com a operação oficial auth.admin.signOut(accessToken, 'global'). Essa operação requer token válido do usuário alvo e credencial administrativa da estação confiável. Confirmar identidade do token com auth.getUser antes de usá-lo, sem imprimir seu conteúdo. Se não houver token utilizável após a remoção, o proprietário pode abrir uma sessão temporária por senha para esse UUID, usar seu token na revogação global e descartar a sessão temporária. Não depender apenas de signOut local de um browser. Se não for possível obter/verificar os pré-requisitos dessa operação, interromper e manter contenção pendente.
4. Registrar horário da revogação global confirmada e comprovar que as sessões antigas não conseguem renovar seus tokens. Remover fator verificado tem efeito de encerramento de sessões segundo a documentação; remover pendente não substitui a operação global comprovada.
5. Determinar limite superior comprovado para validade de tokens emitidos antes da revogação, incluindo histórico de configurações de expiração e tolerância do validador. Não usar só a expiração atual se ela foi reduzida. Contar desde o horário de revogação global confirmada. Sem limite comprovado, manter contenção pendente. Não guardar tokens como evidência. Uma suspeita de comprometimento que exija bloqueio imediato precisa de decisão explícita de contenção pelo proprietário.
6. Após o prazo seguro, provar que sessões antigas não acessam rotas protegidas. Abrir nova sessão por senha: AAL1 deve continuar bloqueada no painel. Quando não houver TOTP, iniciar matrícula pelo botão que faz POST, configurar o autenticador e confirmar código. Exigir data.currentLevel === 'aal2' na mesma sessão, com cookies atualizados, antes de comprovar acesso.

Perder a resposta inicial de matrícula pode deixar um fator pendente sem segredo disponível. O app não reapresenta a chave nem recria o fator automaticamente. Se o autenticador já tiver sido configurado, usar desafio; caso contrário, o proprietário remove manualmente o pendente e repete o procedimento. Não apagar outros fatores utilizáveis.

## Prova em ambiente controlado

Usar conta de teste e projeto controlados antes de recuperação real. Ter duas sessões anteriores, remover um fator pendente e comprovar revogação global, recusa de refresh e recusa de acesso após o prazo residual. Repetir com fator verificado e com múltiplos fatores. Exercitar nova matrícula, bloqueio AAL1 e liberação AAL2. Evidência contém horários e resultados, nunca tokens, códigos, segredo, QR, dumps do browser ou screenshots sensíveis.

## Referências oficiais

- [Supabase: deleteFactor](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor).
- [Supabase: signOut administrativo](https://supabase.com/docs/reference/javascript/auth-admin-signout).
- [Supabase: validade residual após logout](https://supabase.com/docs/guides/auth/signout).
