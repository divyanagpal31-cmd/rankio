import { useEffect } from "react";
import { useLocation } from "react-router";

import { hideTawkWidget, initTawkWidget, showTawkWidget } from "../services/tawk-service";

const LANDING_CHAT_DELAY_MS = 8000;

function shouldShowImmediately(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/report") || pathname === "/contact";
}

function shouldShowAfterDelay(pathname: string) {
  return pathname === "/";
}

export function TawkWidget() {
  const location = useLocation();

  useEffect(() => {
    initTawkWidget();
  }, []);

  useEffect(() => {
    const pathname = location.pathname;

    if (shouldShowImmediately(pathname)) {
      showTawkWidget();
      return;
    }

    if (shouldShowAfterDelay(pathname)) {
      hideTawkWidget();
      const timer = window.setTimeout(showTawkWidget, LANDING_CHAT_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    hideTawkWidget();
  }, [location.pathname]);

  return null;
}
