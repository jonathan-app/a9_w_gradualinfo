'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/**
 * hooks/use-supabase-user.ts — usuário logado, no cliente
 *
 * Quando usar
 * Quando o estado do usuário é de fato do cliente: botão "sair", avatar,
 * menu que muda conforme o login. Para decidir o que renderizar no servidor
 * (uma tela protegida), o certo é ler o usuário no Server Component ou no
 * proxy — não spinning no cliente e depois redirecionar.
 *
 * Por que `mounted` no retorno
 * No primeiro render o browser ainda não leu o cookie de sessão. Sem esse
 * sinal, qualquer condição `user ? ... : ...` trocaria de ramo na hidratação e
 * o React acusaria mismatch. O consumidor deve renderizar o estado "carregando"
 * enquanto `mounted` for falso.
 */
type State = {
  user: User | null;
  isLoading: boolean;
  mounted: boolean;
};

/**
 * Espelha a sessão do Supabase no cliente e devolve o `signOut`.
 *
 * @returns `{ user, isLoading, mounted, signOut }` — renderize o estado de
 *   carregamento enquanto `mounted` for `false`; é o que evita trocar de ramo
 *   na hidratação (premissa detalhada no cabeçalho do arquivo).
 */
export function useSupabaseUser() {
  const [state, setState] = useState<State>({
    user: null,
    isLoading: true,
    mounted: false,
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // onAuthStateChange escuta login, logout e refresh de token. A subscription
    // precisa ser devolvida para ser cancelada no cleanup — sem isso, cada
    // montagem deixa um listener vivo para sempre.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (active) {
          setState({
            user: session?.user ?? null,
            isLoading: false,
            mounted: true,
          });
        }
      },
    );

    // getUser() (e não getSession()) vai ao servidor: é o que valida o token.
    void supabase.auth.getUser().then(() => {
      if (active) {
        setState((previous) => ({
          ...previous,
          isLoading: false,
          mounted: true,
        }));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  return { ...state, signOut };
}
