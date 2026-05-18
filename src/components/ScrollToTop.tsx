import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const portalScrollShells = Array.from(
      document.querySelectorAll<HTMLElement>('[data-portal-scroll-shell]')
    );
    const hasPortalScrollShell = portalScrollShells.length > 0;

    const resetScroll = () => {
      // Always reset window scroll — the portal shells use min-height
      // (not a fixed height) so the document body is the real scroll
      // container. We also reset any element scrollTop just in case a
      // shell ever becomes a real scroll container.
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      portalScrollShells.forEach((element) => {
        element.scrollTop = 0;
      });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
