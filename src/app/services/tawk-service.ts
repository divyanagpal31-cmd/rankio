const TAWK_SCRIPT_ID = "rankio-tawk-widget";
const TAWK_WIDGET_SRC = "https://embed.tawk.to/6ab11db4bfea1e344254d90a/1k31to35o";

type TawkApi = {
  onLoad?: () => void;
  maximize?: () => void;
  minimize?: () => void;
  hideWidget?: () => void;
  showWidget?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
    __rankioTawkOpenWhenReady?: boolean;
    __rankioTawkVisibleWhenReady?: boolean;
  }
}

function getTawkApi() {
  return typeof window === "undefined" ? undefined : window.Tawk_API;
}

function openLoadedChat() {
  const api = getTawkApi();
  if (!api?.maximize) return false;

  api.showWidget?.();
  api.maximize();
  window.__rankioTawkOpenWhenReady = false;
  window.__rankioTawkVisibleWhenReady = true;
  return true;
}

export function initTawkWidget() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

  const previousOnLoad = window.Tawk_API.onLoad;
  window.Tawk_API.onLoad = () => {
    previousOnLoad?.();

    if (window.__rankioTawkOpenWhenReady) {
      openLoadedChat();
      return;
    }

    if (window.__rankioTawkVisibleWhenReady) {
      window.Tawk_API?.showWidget?.();
      return;
    }

    window.Tawk_API?.hideWidget?.();
  };

  if (document.getElementById(TAWK_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = TAWK_SCRIPT_ID;
  script.async = true;
  script.src = TAWK_WIDGET_SRC;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");

  const firstScript = document.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
}

export function showTawkWidget() {
  if (typeof window === "undefined") return;

  window.__rankioTawkVisibleWhenReady = true;
  initTawkWidget();
  getTawkApi()?.showWidget?.();
}

export function hideTawkWidget() {
  if (typeof window === "undefined") return;

  window.__rankioTawkVisibleWhenReady = false;
  window.__rankioTawkOpenWhenReady = false;
  getTawkApi()?.hideWidget?.();
}

export function openTawkChat() {
  if (typeof window === "undefined") return;

  window.__rankioTawkOpenWhenReady = true;
  window.__rankioTawkVisibleWhenReady = true;
  initTawkWidget();

  if (!openLoadedChat()) {
    window.setTimeout(openLoadedChat, 600);
  }
}
