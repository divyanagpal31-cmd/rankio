import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import { TawkWidget } from "./tawk-widget";

export function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
      }
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  return (
    <>
      <TawkWidget />
      <Outlet />
    </>
  );
}
