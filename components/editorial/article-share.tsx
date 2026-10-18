'use client';
/**
 * @fileoverview Compartilhamento sem scripts externos.
 * @module components/editorial/article-share
 * @description Copia a URL sem parâmetros; oferece alternativa se a área de transferência falhar.
 * @dependencies React, APIs opcionais do navegador.
 */
import { useState } from 'react';

/** Compartilha o artigo corrente com retorno acessível. */
export function ArticleShare({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState('');
  const url = () => `${window.location.origin}${window.location.pathname}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setFallback('');
      setMessage('Link copiado.');
    } catch {
      setFallback(url());
      setMessage('Selecione e copie o link abaixo.');
    }
  };
  const share = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title, url: url() });
      setMessage('Compartilhamento concluído.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        await copy();
      }
    }
  };
  return (
    <div className="article-share">
      <span>Gostou da leitura?</span>
      <div>
        <button type="button" onClick={copy}>
          Copiar link
        </button>
        <button type="button" onClick={share}>
          Compartilhar
        </button>
      </div>
      <p role="status">{message}</p>
      {fallback && (
        <label>
          Link do artigo
          <input
            readOnly
            value={fallback}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
