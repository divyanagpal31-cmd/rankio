$path = 'supabase/functions/search-console/index.ts'
$text = Get-Content $path -Raw
$text = [regex]::Replace($text, 'const provider = "google_search_console";\r?\nconst scope = "https://www.googleapis.com/auth/webmasters.readonly";', @"
const provider = "google_search_console";
const analyticsProvider = "google_analytics";
const scope = "https://www.googleapis.com/auth/webmasters.readonly";
const analyticsScope = "https://www.googleapis.com/auth/analytics.readonly";
"@)
$text = [regex]::Replace($text, 'function buildAuthUrl\(params: \{ clientId: string; redirectUri: string; state: string \}\) \{\r?\n  const url = new URL\("https://accounts.google.com/o/oauth2/v2/auth"\);\r?\n  url.searchParams.set\("client_id", params.clientId\);\r?\n  url.searchParams.set\("redirect_uri", params.redirectUri\);\r?\n  url.searchParams.set\("response_type", "code"\);\r?\n  url.searchParams.set\("scope", scope\);', @"
function buildAuthUrl(params: { clientId: string; redirectUri: string; state: string; scope: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scope);
"@)
Set-Content $path $text
