const VISITOR_ID_KEY = "rankio.visitor_id";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fallbackUuidV4(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getVisitorId(): string | null {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && isUuid(existing)) return existing;
    return null;
  } catch {
    return null;
  }
}

export function getOrCreateVisitorId(): string {
  const existing = getVisitorId();
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackUuidV4();

  try {
    localStorage.setItem(VISITOR_ID_KEY, id);
  } catch {
    // ignore storage failures (quota/private mode)
  }

  return id;
}

