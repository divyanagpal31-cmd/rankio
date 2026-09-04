import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type SearchConsoleAuthState = {
  userId: string;
  returnTo: string;
  createdAt: string;
  provider?: string;
};

type IntegrationRow = {
  id: string;
  user_id: string;
  provider: string;
  property_id: string;
  property_name?: string | null;
  status?: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
  scopes?: unknown;
};

type SearchConsoleProperty = { siteUrl: string; permissionLevel?: string | null };
type SearchConsoleRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type AnalyticsProperty = {
  property?: string;
  displayName?: string;
  accountDisplayName?: string;
  canEdit?: boolean;
  propertyType?: string | null;
};
type AnalyticsRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};
type AnalyticsSnapshot = {
  propertyId: string;
  propertyName: string;
  totalActiveUsers: number;
  totalSessions: number;
  totalNewUsers: number;
  engagementRate: number;
  totalPageViews: number;
  topPages: Array<{
    page: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
  }>;
  fetchedAt: string;
};

type SearchConsoleSnapshot = {
  propertyId: string;
  propertyName: string;
  matchedWebsiteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  queryCount: number;
  pageCount: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  fetchedAt: string;
};

const provider = "google_search_console";
const analyticsProvider = "google_analytics";
const scope = "https://www.googleapis.com/auth/webmasters.readonly";
const analyticsScope = "https://www.googleapis.com/auth/analytics.readonly";

function readCfg() {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey: Deno.env.get("SERVICE_ROLE_KEY") ?? "",
    clientId: Deno.env.get("GOOGLE_SEARCH_CONSOLE_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET") ?? "",
    redirectUri: Deno.env.get("GOOGLE_SEARCH_CONSOLE_REDIRECT_URI") ?? "",
    appUrl: Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL") ?? "",
    secretKey: Deno.env.get("SEARCH_CONSOLE_SECRET_KEY") ?? "",
  };
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importAesKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", utf8(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function encryptSecret(value: string, secret: string) {
  if (!value) return "";
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8(value));
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return bytesToBase64Url(result);
}

async function decryptSecret(value: string, secret: string) {
  if (!value) return "";
  const key = await importAesKey(secret);
  const bytes = base64UrlToBytes(value);
  const iv = bytes.slice(0, 12);
  const payload = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, payload);
  return new TextDecoder().decode(decrypted);
}

async function signState(payload: SearchConsoleAuthState, secret: string) {
  const encoded = bytesToBase64Url(utf8(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await importHmacKey(secret), utf8(encoded));
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyState(value: string, secret: string): Promise<SearchConsoleAuthState | null> {
  const [encoded, signature] = String(value ?? "").split(".");
  if (!encoded || !signature) return null;
  const ok = await crypto.subtle.verify("HMAC", await importHmacKey(secret), base64UrlToBytes(signature), utf8(encoded));
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as SearchConsoleAuthState;
  } catch {
    return null;
  }
}

function normalizePropertyId(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("sc-domain:")) return trimmed.toLowerCase();
  try {
    const url = new URL(trimmed);
    url.hash = "";
    if (url.pathname === "/") url.pathname = "";
    return `${url.origin}${url.pathname ? `${url.pathname.replace(/\/$/, "")}/` : "/"}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function matchesProperty(propertyId: string, normalizedUrl: string) {
  const property = normalizePropertyId(propertyId);
  const url = new URL(normalizedUrl);
  if (property.startsWith("sc-domain:")) {
    const domain = property.replace(/^sc-domain:/i, "");
    const host = url.host.replace(/^www\./i, "");
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return url.origin === new URL(property).origin;
  } catch {
    return false;
  }
}

function buildAuthUrl(params: { clientId: string; redirectUri: string; state: string; scope: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function exchangeCode(params: { clientId: string; clientSecret: string; redirectUri: string; code: string }) {
  const body = new URLSearchParams();
  body.set("client_id", params.clientId);
  body.set("client_secret", params.clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Google token exchange failed"));
  return await response.json();
}

async function refreshAccessToken(params: { clientId: string; clientSecret: string; refreshToken: string }) {
  const body = new URLSearchParams();
  body.set("client_id", params.clientId);
  body.set("client_secret", params.clientSecret);
  body.set("refresh_token", params.refreshToken);
  body.set("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Google token refresh failed"));
  return await response.json();
}

async function listProperties(accessToken: string): Promise<SearchConsoleProperty[]> {
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Search Console property list failed"));
  const payload = await response.json();
  return Array.isArray(payload?.siteEntry)
    ? payload.siteEntry.map((entry: any) => ({ siteUrl: String(entry?.siteUrl ?? "").trim(), permissionLevel: entry?.permissionLevel ? String(entry.permissionLevel) : null }))
    : [];
}

async function fetchAnalytics(params: { accessToken: string; propertyId: string; startDate: string; endDate: string }) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(params.propertyId)}/searchAnalytics/query`;
  const bodies = [
    { startDate: params.startDate, endDate: params.endDate, dimensions: ["query"], rowLimit: 10 },
    { startDate: params.startDate, endDate: params.endDate, dimensions: ["page"], rowLimit: 10 },
  ];
  const [queryRes, pageRes] = await Promise.all(
    bodies.map(async (body) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text().catch(() => "Search Console analytics failed"));
      return response.json();
    })
  );
  return { queryRows: Array.isArray(queryRes?.rows) ? queryRes.rows : [], pageRows: Array.isArray(pageRes?.rows) ? pageRes.rows : [] };
}

function buildSnapshot(params: { propertyId: string; propertyName: string; matchedWebsiteUrl: string; queryRows: SearchConsoleRow[]; pageRows: SearchConsoleRow[]; fetchedAt: string }): SearchConsoleSnapshot {
  const normalize = (rows: SearchConsoleRow[]) => rows.map((row) => ({
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
    key: String(row.keys?.[0] ?? "").trim(),
  })).filter((row) => row.key);
  const queryRows = normalize(params.queryRows);
  const pageRows = normalize(params.pageRows);
  const totalClicks = queryRows.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = queryRows.reduce((sum, row) => sum + row.impressions, 0);
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const averagePosition = queryRows.length ? queryRows.reduce((sum, row) => sum + row.position, 0) / queryRows.length : 0;
  return {
    propertyId: params.propertyId,
    propertyName: params.propertyName,
    matchedWebsiteUrl: params.matchedWebsiteUrl,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    queryCount: queryRows.length,
    pageCount: pageRows.length,
    topQueries: queryRows.slice(0, 5).map((row) => ({ query: row.key, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position })),
    topPages: pageRows.slice(0, 5).map((row) => ({ page: row.key, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position })),
    fetchedAt: params.fetchedAt,
  };
}

async function listAnalyticsProperties(accessToken: string): Promise<AnalyticsProperty[]> {
  const properties: AnalyticsProperty[] = [];
  let pageToken = "";

  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(await response.text().catch(() => "Google Analytics property list failed"));
    const payload = await response.json();
    const summaries = Array.isArray(payload?.accountSummaries) ? payload.accountSummaries : [];
    for (const accountSummary of summaries) {
      const accountDisplayName = String(accountSummary?.displayName ?? "").trim();
      const propertySummaries = Array.isArray(accountSummary?.propertySummaries) ? accountSummary.propertySummaries : [];
      for (const property of propertySummaries) {
        const propertyId = String(property?.property ?? "").trim();
        if (!propertyId) continue;
        properties.push({
          property: propertyId,
          displayName: String(property?.displayName ?? propertyId).trim(),
          accountDisplayName,
          canEdit: Boolean(property?.canEdit),
          propertyType: property?.propertyType ? String(property.propertyType) : null,
        });
      }
    }
    pageToken = String(payload?.nextPageToken ?? "").trim();
  } while (pageToken);

  return properties;
}

function metricNumber(row: AnalyticsRow, index: number) {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

function dimensionValue(row: AnalyticsRow, index = 0) {
  return String(row.dimensionValues?.[index]?.value ?? "").trim();
}

async function fetchAnalyticsSnapshot(params: { accessToken: string; propertyId: string; propertyName: string }): Promise<AnalyticsSnapshot> {
  const summaryReport = await fetch(`https://analyticsdata.googleapis.com/v1beta/${encodeURI(params.propertyId)}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "newUsers" }, { name: "engagementRate" }, { name: "screenPageViews" }],
      limit: 1,
    }),
  });
  if (!summaryReport.ok) throw new Error(await summaryReport.text().catch(() => "Google Analytics report failed"));
  const summaryPayload = await summaryReport.json();

  const pageReport = await fetch(`https://analyticsdata.googleapis.com/v1beta/${encodeURI(params.propertyId)}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "engagementRate" }],
      limit: 10,
    }),
  });
  if (!pageReport.ok) throw new Error(await pageReport.text().catch(() => "Google Analytics report failed"));
  const pagePayload = await pageReport.json();

  const summaryRow = (Array.isArray(summaryPayload?.rows) ? summaryPayload.rows : [])[0] as AnalyticsRow | undefined;
  const pageRows = (Array.isArray(pagePayload?.rows) ? pagePayload.rows : []) as AnalyticsRow[];

  return {
    propertyId: params.propertyId,
    propertyName: params.propertyName,
    totalActiveUsers: summaryRow ? metricNumber(summaryRow, 0) : 0,
    totalSessions: summaryRow ? metricNumber(summaryRow, 1) : 0,
    totalNewUsers: summaryRow ? metricNumber(summaryRow, 2) : 0,
    engagementRate: summaryRow ? metricNumber(summaryRow, 3) * 100 : 0,
    totalPageViews: summaryRow ? metricNumber(summaryRow, 4) : 0,
    topPages: pageRows
      .map((row) => ({
        page: dimensionValue(row),
        activeUsers: metricNumber(row, 0),
        sessions: metricNumber(row, 1),
        pageViews: metricNumber(row, 2),
        engagementRate: metricNumber(row, 3) * 100,
      }))
      .filter((row) => Boolean(row.page)),
    fetchedAt: new Date().toISOString(),
  };
}

function okJson(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }, ...init });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  const cfg = readCfg();
  if (!cfg.supabaseUrl || !cfg.serviceRoleKey) {
    return okJson({ error: "MISSING_CONFIG", message: "Missing Supabase configuration" }, { status: 500 });
  }
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri || !cfg.secretKey) {
    return okJson({ error: "MISSING_GOOGLE_CONFIG", message: "Missing Google Search Console configuration" }, { status: 500 });
  }

  const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    userId = data.user?.id ?? null;
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim() ?? "";
    const stateValue = url.searchParams.get("state")?.trim() ?? "";
    const error = url.searchParams.get("error")?.trim() ?? "";

    if (error) return okJson({ error, message: url.searchParams.get("error_description") ?? error }, { status: 400 });
    if (!code) return okJson({ ok: true, message: "Search Console callback endpoint" });

    const state = await verifyState(stateValue, cfg.secretKey);
    if (!state?.userId) return okJson({ error: "INVALID_STATE", message: "Invalid OAuth state" }, { status: 400 });
    const requestedProvider = String(state.provider ?? provider).trim() || provider;
    if (requestedProvider === analyticsProvider) {
      const tokens = await exchangeCode({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: cfg.redirectUri, code });
      const access = String(tokens.access_token ?? "").trim();
      const refresh = String(tokens.refresh_token ?? "").trim();
      const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null;
      const properties = access ? await listAnalyticsProperties(access).catch(() => []) : [];
      const autoProperty = properties.length === 1 ? properties[0].property ?? "__pending__" : "__pending__";

      const upsertPayload = {
        user_id: state.userId,
        provider: analyticsProvider,
        property_id: autoProperty,
        property_name: properties.length === 1 ? properties[0].displayName ?? autoProperty : null,
        status: properties.length === 1 ? "connected" : "pending",
        scopes: tokens.scope ? tokens.scope.split(" ") : [analyticsScope],
        access_token_encrypted: await encryptSecret(access, cfg.secretKey),
        refresh_token_encrypted: refresh ? await encryptSecret(refresh, cfg.secretKey) : null,
        token_expires_at: expiresAt,
      };

      const { data: existing } = await supabase
        .from("integrations")
        .select("id")
        .eq("user_id", state.userId)
        .eq("provider", analyticsProvider)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("integrations").update(upsertPayload).eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert(upsertPayload);
      }
      const redirectTo = new URL(state.returnTo || "/dashboard/integrations", cfg.appUrl || cfg.redirectUri);
      redirectTo.searchParams.set("connected", "1");
      return Response.redirect(redirectTo.toString(), 302);
    }


    const tokens = await exchangeCode({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: cfg.redirectUri, code });
    const access = String(tokens.access_token ?? "").trim();
    const refresh = String(tokens.refresh_token ?? "").trim();
    const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null;
    const properties = access ? await listProperties(access).catch(() => []) : [];
    const autoProperty = properties.length === 1 ? properties[0].siteUrl : "__pending__";

    const upsertPayload = {
      user_id: state.userId,
      provider,
      property_id: autoProperty,
      property_name: properties.length === 1 ? properties[0].siteUrl : null,
      status: properties.length === 1 ? "connected" : "pending",
      scopes: tokens.scope ? tokens.scope.split(" ") : [scope],
      access_token_encrypted: await encryptSecret(access, cfg.secretKey),
      refresh_token_encrypted: refresh ? await encryptSecret(refresh, cfg.secretKey) : null,
      token_expires_at: expiresAt,
    };

    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", state.userId)
      .eq("provider", provider)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("integrations").update(upsertPayload).eq("id", existing.id);
    } else {
      await supabase.from("integrations").insert(upsertPayload);
    }
    const redirectTo = new URL(state.returnTo || "/dashboard/integrations", cfg.appUrl || cfg.redirectUri);
    redirectTo.searchParams.set("connected", "1");
    return Response.redirect(redirectTo.toString(), 302);
  }

  if (req.method !== "POST") {
    return okJson({ error: "METHOD_NOT_ALLOWED", message: "Method not allowed" }, { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return okJson({ error: "INVALID_BODY", message: "Invalid body" }, { status: 400 });
  }

  const action = String(body?.action ?? "").trim();
  const returnTo = String(body?.return_to ?? "/dashboard/integrations").trim() || "/dashboard/integrations";
  const requestedProvider = String(body?.provider ?? provider).trim() || provider;

  if (requestedProvider === analyticsProvider) {
    if (action === "auth_start") {
      if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
      const state = await signState({ userId, returnTo, createdAt: new Date().toISOString(), provider: requestedProvider }, cfg.secretKey);
      return okJson({ auth_url: buildAuthUrl({ clientId: cfg.clientId, redirectUri: cfg.redirectUri, state, scope: analyticsScope }) });
    }

    if (action === "list_properties") {
      if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
      const { data: rows } = await supabase
        .from("integrations")
        .select("id, user_id, provider, property_id, property_name, status, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes")
        .eq("user_id", userId)
        .eq("provider", analyticsProvider)
        .order("updated_at", { ascending: false })
        .limit(5);
      const integration = ((rows ?? []) as IntegrationRow[]).find((row) => row.status !== "disconnected") ?? null;
      if (!integration) return okJson({ properties: [], integration: null });

      let token = integration.access_token_encrypted ? await decryptSecret(integration.access_token_encrypted, cfg.secretKey) : "";
      const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
      if ((!token || expiresAt < Date.now() + 60_000) && integration.refresh_token_encrypted) {
        const refreshToken = await decryptSecret(integration.refresh_token_encrypted, cfg.secretKey);
        const refreshed = await refreshAccessToken({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, refreshToken });
        token = String(refreshed.access_token ?? "").trim();
        const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null;
        await supabase.from("integrations").update({
          access_token_encrypted: await encryptSecret(token, cfg.secretKey),
          token_expires_at: nextExpiresAt,
        }).eq("id", integration.id);
      }
      if (!token) return okJson({ properties: [], integration: null, error: "NO_ACCESS_TOKEN" }, { status: 400 });
      const properties = await listAnalyticsProperties(token);
      return okJson({ properties, integration });
    }

    if (action === "select_property") {
      if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
      const propertyId = String(body?.property_id ?? body?.propertyId ?? "").trim();
      const propertyName = String(body?.property_name ?? body?.propertyName ?? propertyId).trim();
      if (!propertyId) return okJson({ error: "PROPERTY_REQUIRED", message: "property_id is required" }, { status: 400 });
      const { error: updateError } = await supabase
        .from("integrations")
        .update({ property_id: propertyId, property_name: propertyName, status: "connected" })
        .eq("user_id", userId)
        .eq("provider", analyticsProvider)
        .neq("status", "disconnected");
      if (updateError) return okJson({ error: "UPDATE_FAILED", message: updateError.message }, { status: 500 });
      return okJson({ ok: true, property_id: propertyId, property_name: propertyName });
    }

    if (action === "snapshot") {
      if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
      const { data: rows } = await supabase
        .from("integrations")
        .select("id, user_id, provider, property_id, property_name, status, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes")
        .eq("user_id", userId)
        .eq("provider", analyticsProvider)
        .in("status", ["connected", "pending"])
        .order("updated_at", { ascending: false })
        .limit(10);
      const integration = ((rows ?? []) as IntegrationRow[]).find((row) => row.property_id && row.status !== "disconnected") ?? null;
      if (!integration || integration.property_id === "__pending__") return okJson({ snapshot: null, integration: null });

      let token = integration.access_token_encrypted ? await decryptSecret(integration.access_token_encrypted, cfg.secretKey) : "";
      const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
      if ((!token || expiresAt < Date.now() + 60_000) && integration.refresh_token_encrypted) {
        const refreshToken = await decryptSecret(integration.refresh_token_encrypted, cfg.secretKey);
        const refreshed = await refreshAccessToken({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, refreshToken });
        token = String(refreshed.access_token ?? "").trim();
        const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null;
        await supabase.from("integrations").update({
          access_token_encrypted: await encryptSecret(token, cfg.secretKey),
          token_expires_at: nextExpiresAt,
        }).eq("id", integration.id);
      }
      if (!token) return okJson({ snapshot: null, integration, error: "NO_ACCESS_TOKEN" }, { status: 400 });
      const snapshot = await fetchAnalyticsSnapshot({
        accessToken: token,
        propertyId: integration.property_id,
        propertyName: integration.property_name ?? integration.property_id,
      });
      return okJson({ snapshot, integration });
    }

    return okJson({ error: "UNKNOWN_ACTION", message: "Unknown action" }, { status: 400 });
  }


  if (action === "auth_start") {
    if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
    const state = await signState({ userId, returnTo, createdAt: new Date().toISOString(), provider }, cfg.secretKey);
    return okJson({ auth_url: buildAuthUrl({ clientId: cfg.clientId, redirectUri: cfg.redirectUri, state, scope }) });
  }

  if (action === "list_properties") {
    if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
    const { data: rows } = await supabase
      .from("integrations")
      .select("id, user_id, provider, property_id, property_name, status, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes")
      .eq("user_id", userId)
      .eq("provider", provider)
      .order("updated_at", { ascending: false })
      .limit(5);
    const integration = ((rows ?? []) as IntegrationRow[]).find((row) => row.status !== "disconnected") ?? null;
    if (!integration) return okJson({ properties: [], integration: null });

    let token = integration.access_token_encrypted ? await decryptSecret(integration.access_token_encrypted, cfg.secretKey) : "";
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
    if ((!token || expiresAt < Date.now() + 60_000) && integration.refresh_token_encrypted) {
      const refreshToken = await decryptSecret(integration.refresh_token_encrypted, cfg.secretKey);
      const refreshed = await refreshAccessToken({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, refreshToken });
      token = String(refreshed.access_token ?? "").trim();
      const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null;
      await supabase.from("integrations").update({
        access_token_encrypted: await encryptSecret(token, cfg.secretKey),
        token_expires_at: nextExpiresAt,
      }).eq("id", integration.id);
    }
    if (!token) return okJson({ properties: [], integration: null, error: "NO_ACCESS_TOKEN" }, { status: 400 });
    const properties = await listProperties(token);
    return okJson({ properties, integration });
  }

  if (action === "select_property") {
    if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
    const propertyId = String(body?.property_id ?? body?.propertyId ?? "").trim();
    const propertyName = String(body?.property_name ?? body?.propertyName ?? propertyId).trim();
    if (!propertyId) return okJson({ error: "PROPERTY_REQUIRED", message: "property_id is required" }, { status: 400 });
    const { error: updateError } = await supabase
      .from("integrations")
      .update({ property_id: propertyId, property_name: propertyName, status: "connected" })
      .eq("user_id", userId)
      .eq("provider", provider)
      .neq("status", "disconnected");
    if (updateError) return okJson({ error: "UPDATE_FAILED", message: updateError.message }, { status: 500 });
    return okJson({ ok: true, property_id: propertyId, property_name: propertyName });
  }

  if (action === "snapshot") {
    if (!userId) return okJson({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
    const websiteUrl = String(body?.website_url ?? body?.websiteUrl ?? "").trim();
    const normalizedUrl = websiteUrl ? normalizePropertyId(websiteUrl) : "";
    if (!normalizedUrl) return okJson({ error: "WEBSITE_REQUIRED", message: "website_url is required" }, { status: 400 });

    const { data: rows } = await supabase
      .from("integrations")
      .select("id, user_id, provider, property_id, property_name, status, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes")
      .eq("user_id", userId)
      .eq("provider", provider)
      .in("status", ["connected", "pending"])
      .order("updated_at", { ascending: false })
      .limit(10);
    const integrations = ((rows ?? []) as IntegrationRow[]).filter((row) => row.property_id && row.status !== "disconnected");
    const integration = integrations.find((row) => matchesProperty(row.property_id, normalizedUrl)) ?? integrations.find((row) => row.property_id !== "__pending__") ?? null;
    if (!integration) return okJson({ snapshot: null, integration: null });

    let token = integration.access_token_encrypted ? await decryptSecret(integration.access_token_encrypted, cfg.secretKey) : "";
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
    if ((!token || expiresAt < Date.now() + 60_000) && integration.refresh_token_encrypted) {
      const refreshToken = await decryptSecret(integration.refresh_token_encrypted, cfg.secretKey);
      const refreshed = await refreshAccessToken({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, refreshToken });
      token = String(refreshed.access_token ?? "").trim();
      const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null;
      await supabase.from("integrations").update({
        access_token_encrypted: await encryptSecret(token, cfg.secretKey),
        token_expires_at: nextExpiresAt,
      }).eq("id", integration.id);
    }
    if (!token) return okJson({ snapshot: null, integration, error: "NO_ACCESS_TOKEN" }, { status: 400 });

    const endDate = new Date();
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const { queryRows, pageRows } = await fetchAnalytics({
      accessToken: token,
      propertyId: integration.property_id,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    });
    const snapshot = buildSnapshot({
      propertyId: integration.property_id,
      propertyName: integration.property_name ?? integration.property_id,
      matchedWebsiteUrl: normalizedUrl,
      queryRows,
      pageRows,
      fetchedAt: new Date().toISOString(),
    });
    return okJson({ snapshot, integration });
  }

  return okJson({ error: "UNKNOWN_ACTION", message: "Unknown action" }, { status: 400 });
});




