---
name: Gradualinfo Editorial
description: Design system base para o portal Gradualinfo
colors:
  background: 'oklch(1 0 0)'
  foreground: 'oklch(0.21 0.02 264)'
  muted: 'oklch(0.97 0.005 264)'
  muted-foreground: 'oklch(0.55 0.02 264)'
  border: 'oklch(0.92 0.005 264)'
  brand-50: 'oklch(0.97 0.02 250)'
  brand-100: 'oklch(0.93 0.04 250)'
  brand-500: 'oklch(0.62 0.17 250)'
  brand-600: 'oklch(0.55 0.17 250)'
  brand-700: 'oklch(0.47 0.15 250)'
typography:
  font-sans:
    fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif'
  font-mono:
    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace'
rounded:
  card: '0.75rem'
---

# Gradualinfo Editorial

## Overview

O portal Gradualinfo é focado em estudantes de programação. A identidade visual busca ser clara, acessível e focada no conteúdo (os artigos e os guias).

## Colors

- **Brand:** Tons de matiz 250 (oklch), trazendo uma identidade de roxo/azul sereno.
- **Background e Neutros:** Contrastes acessíveis, definidos via oklch para garantir mesma uniformidade de brilho percebido. O modo escuro inverte as superfícies utilizando as classes `.dark`.

## Typography

- **Geist Sans:** Fonte padrão limpa para os textos e corpo do portal.
- **Geist Mono:** Tipografia monoespaçada, importante caso trechos de código sejam exibidos (guia tech).

## Layout

Grid espaçosa focada na leitura. O componente central será a lista de artigos (cards).

## Do's and Don'ts

- **Do:** Usar `brand-500` para destaque e links clicáveis com outline offset.
- **Do:** Preservar a hierarquia visual (1 destaque + grade menor) na listagem dos artigos.
- **Don't:** Usar cores que falhem nos testes de contraste WCAG AA.
