import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny hash router: #/ , #/shop , #/product/{id} , #/mix , #/about , #/cart ,
 * #/checkout , #/track , #/admin , #/404
 * Hash routing keeps deep links shareable without a server rewrite rule.
 */
export type Route =
  | { name: 'home' }
  | { name: 'shop'; category?: string }
  | { name: 'product'; id: string }
  | { name: 'mix'; look?: string }
  | { name: 'about' }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'success' }
  | { name: 'track' }
  | { name: 'admin' }
  | { name: 'notfound' };

export const parseRoute = (rawHash: string): Route => {
  const hash = (rawHash || '').replace(/^#/, '');
  const [pathPart, queryPart] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart || '');

  if (segments.length === 0) return { name: 'home' };

  switch (segments[0]) {
    case 'shop':
      return { name: 'shop', category: query.get('c') || undefined };
    case 'product':
      return segments[1] ? { name: 'product', id: decodeURIComponent(segments[1]) } : { name: 'shop' };
    case 'mix':
      return { name: 'mix', look: query.get('look') || undefined };
    case 'about':
      return { name: 'about' };
    case 'cart':
      return { name: 'cart' };
    case 'checkout':
      return { name: 'checkout' };
    case 'success':
      return { name: 'success' };
    case 'track':
      return { name: 'track' };
    case 'admin':
      return { name: 'admin' };
    default:
      return { name: 'notfound' };
  }
};

export const navigate = (to: string) => {
  const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = target;
};

export const useRoute = () => {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  const sync = useCallback(() => {
    setRoute(parseRoute(window.location.hash));
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [sync]);

  useEffect(() => {
    const isAnchorOnly = /^#(shop|mix|about)$/.test(window.location.hash) === false;
    if (!isAnchorOnly) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  return route;
};
