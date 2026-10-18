---
title: 'Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram'
slug: 'site-lento-mesmo-com-boa-nota-pagespeed'
editoria: 'Performance & SEO'
excerpt: 'Uma pontuação 100 no PageSpeed Insights de laboratório não garante que usuários reais tenham uma experiência rápida. Entenda as armadilhas entre dados sintéticos e dados de campo (CrUX), como interpretar LCP, INP e CLS no percentil 75 e onde a auditoria cega falha.'
cover_image: '/artigos/site-lento-mesmo-com-boa-nota-pagespeed.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
fontes_citadas:
  - titulo: 'web.dev: Lab vs Field Data in Web Performance'
    url: 'https://web.dev/articles/lab-and-field-data-differences'
  - titulo: 'Chrome User Experience Report (CrUX) Methodology'
    url: 'https://developer.chrome.com/docs/crux/methodology'
  - titulo: 'Interaction to Next Paint (INP) Specification'
    url: 'https://web.dev/articles/inp'
  - titulo: 'Largest Contentful Paint (LCP) Optimization Guide'
    url: 'https://web.dev/articles/lcp'
---

# Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram

Poucas métricas causam tanta ilusão em equipes de produto e marketing quanto o número verde de pontuação no Google PageSpeed Insights ou Lighthouse. É comum presenciar projetos com pontuação acima de 95 nos testes automatizados, mas com taxas de rejeição elevadas, queixas recorrentes de lentidão em conexões móveis e métricas de Core Web Vitals reprovadas no Google Search Console.

A explicação para esse paradoxo reside na diferença estrutural entre **dados de laboratório (_lab data_)** e **dados de campo (_field data_)**. Compreender essa separação é o primeiro passo para auditar performance com rigor técnico e impacto real nos negócios.

---

## O Que o Teste de Laboratório (Lighthouse) Realmente Mede

O PageSpeed Insights executa o Lighthouse em uma máquina virtual padronizada:

- **Dispositivo emulado:** Um smartphone de gama média específico (geralmente Moto G4 ou similar emulado).
- **Rede simulada:** Conexão 4G lenta com latência e taxa de transferência fixas via _throttling_ de software.
- **Navegador sem histórico:** Cache frio, sem extensões instaladas, sem autenticação, cookies ou preferências do usuário.
- **Sessão estática:** O robô carrega a página, aguarda alguns segundos até a estabilização e encerra o teste, **sem realizar cliques, digitações ou interações de navegação**.

Esse ambiente é excelente para benchmarking reprodutível e controle de regressão em pipelines de integração contínua (CI). Porém, ele não reflete a realidade do seu público.

---

## O Que os Dados de Campo (CrUX) Revelam

Os dados que o algoritmo de ranqueamento do Google efetivamente considera para os Core Web Vitals vêm do **Chrome User Experience Report (CrUX)**. O CrUX agrega métricas de telemetria coletadas de usuários reais que navegam no seu site sob condições imprevisíveis:

1. **Hardware heterogêneo:** Desde processadores topo de linha até smartphones de entrada com pouca memória RAM disponível.
2. **Conexões oscilantes:** Redes móveis que alternam entre 5G, 4G e 3G instável, túneis de metrô e redes Wi-Fi congestionadas.
3. **Interações reais:** Usuários rolam a página rapidamente, tocam em botões, abrem menus móveis e preenchem formulários longos.
4. **Regra do Percentil 75 (p75):** O Google avalia se 75% de todas as sessões registradas no CrUX durante os últimos 28 dias atingiram os limiares de excelência.

Se o seu site pontua 100 no Lighthouse com um dispositivo vazio, mas trava por 300ms quando um usuário tenta abrir o menu no celular em uma conexão real, sua métrica de campo será reprovada.

---

## Os Três Pontos Cegos que o Laboratório Esconde

### 1. O Novo Rei: Interaction to Next Paint (INP)

O Lighthouse mede Total Blocking Time (TBT) durante o carregamento inicial, mas **não é capaz de medir INP**.

O INP monitora todas as interações do usuário durante a permanência na página (cliques, toques em tela e pressionamentos de tecla) e registra a pior latência observada até que a tela seja atualizada visualmente:

- **Bom:** até 200 ms.
- **Precisa de melhoria:** entre 200 ms e 500 ms.
- **Ruim:** acima de 500 ms.

Se o seu JavaScript executa _event handlers_ pesados, faz renderizações bloqueantes do DOM ou processa JSON volumoso na thread principal após o carregamento inicial, o usuário sentirá a interface travar, enquanto a pontuação do Lighthouse permanecerá impecável.

### 2. Cache e Conteúdo Dinâmico Autenticado

Os testes de laboratório sempre acessam o site em modo anônimo e cache limpo. Na vida real:

- Usuários autenticados recebem HTML gerado no servidor sem cache de CDN, ou sofrem com _hydration mismatches_ quando bibliotecas de estado reescrevem o DOM no cliente.
- Mecanismos de _Service Worker_ mal configurados podem criar concorrência na rede ou servir dados obsoletos que forçam re-downloads desnecessários.

### 3. Scripts de Terceiros e Tags de Rastreamento Tardias

Muitos sites utilizam gerenciadores de tags (como Google Tag Manager) configurados para disparar tags de publicidade, chat ao vivo e mapas de calor após 3 a 5 segundos de visita. O Lighthouse muitas vezes encerra sua análise antes que esses scripts comecem a disputar a CPU principal com a navegação do usuário.

---

## Como Diagnosticar a Experiência Real sem Falsos Positivos

Para estabelecer um diagnóstico fidedigno, siga este protocolo de três camadas:

1. **Monitore o CrUX diretamente:** Acesse o painel de Core Web Vitals no Google Search Console ou utilize a API pública do CrUX (`crux.run`) para inspecionar o histórico real dos últimos 28 dias para dispositivos móveis e desktop separadamente.
2. **Implemente RUM (Real User Monitoring):** Instale a biblioteca leve oficial `web-vitals` do Google para enviar métricas das sessões diretamente para sua ferramenta de telemetria ou analytics. Isso permite correlacionar quedas de INP com rotas e componentes específicos.
3. **Audite a Thread Principal com o Chrome DevTools Performance Profiler:** Conecte um aparelho físico via cabo USB, ative a limitação de CPU (4x ou 6x slowdown) e grave uma sessão gravando você mesmo interagindo com os elementos interativos mais complexos da página.

Uma boa pontuação de laboratório é o ponto de partida do desenvolvimento, mas a estabilidade e a responsividade comprovadas nos dados de campo são a única métrica que importa para o usuário e para o mecanismo de busca.
