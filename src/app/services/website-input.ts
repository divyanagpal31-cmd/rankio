export function normalizeWebsiteInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Website URL is required");
  }

  if (/\s/.test(trimmed)) {
    throw new Error("Please enter a valid website URL");
  }

  const emailLikePattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailLikePattern.test(trimmed)) {
    throw new Error("Please enter a website URL, not an email address");
  }

  let urlValue = trimmed;
  if (!/^https?:\/\//i.test(urlValue)) {
    urlValue = `https://${urlValue}`;
  }

  const url = new URL(urlValue);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Please enter a valid website URL");
  }

  if (url.username || url.password) {
    throw new Error("Please enter a website URL, not an email address");
  }

  if (!url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) {
    throw new Error("Please enter a valid website URL");
  }

  url.hash = "";
  if (url.pathname === "/") {
    url.pathname = "";
  }

  return url.toString().replace(/\/$/, "");
}
