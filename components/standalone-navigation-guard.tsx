"use client";

import * as React from "react";

const EDGE_WIDTH = 20;

export function StandaloneNavigationGuard() {
  React.useEffect(() => {
    // iOS exposes this flag only when launched from the home screen.
    const isIosStandalone = (
      navigator as Navigator & { standalone?: boolean }
    ).standalone === true;

    if (!isIosStandalone) return;

    const preventEdgeNavigation = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !event.cancelable) return;

      const { clientX } = event.touches[0];
      if (clientX <= EDGE_WIDTH || clientX >= window.innerWidth - EDGE_WIDTH) {
        // WebKit must receive cancellation at touchstart, before it takes
        // over the gesture. Touches in this narrow edge strip cannot scroll.
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", preventEdgeNavigation, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchstart", preventEdgeNavigation);
    };
  }, []);

  return null;
}
