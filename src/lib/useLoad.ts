import { useCallback, useEffect, useState } from 'react';

export type LoadState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

/**
 * 화면이 열릴 때(그리고 load 가 바뀔 때) 받아 온다. reload 로 다시 받고, setData 로 받은 값을 바꿔 둔다.
 * load 는 useCallback 으로 고정해서 넘긴다.
 */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setState({ status: 'loading' });
    load().then(
      (data) => {
        if (!stale) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (!stale) setState({ status: 'error', error });
      },
    );
    return () => {
      stale = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((data: T) => setState({ status: 'ready', data }), []);
  return { state, reload, setData };
}
