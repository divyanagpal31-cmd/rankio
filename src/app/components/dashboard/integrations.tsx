import { GoogleIntegrationCard, type GoogleProperty } from "./google-integration-card";

type SearchConsolePayload = {
  properties?: Array<{
    siteUrl?: string | null;
    permissionLevel?: string | null;
  }>;
};

type AnalyticsPayload = {
  properties?: Array<{
    property?: string | null;
    displayName?: string | null;
    accountDisplayName?: string | null;
    canEdit?: boolean | null;
  }>;
};

function mapSearchConsoleProperties(data: unknown): GoogleProperty[] {
  const payload = data as SearchConsolePayload | null | undefined;
  return Array.isArray(payload?.properties)
    ? payload.properties
        .map((item) => ({
          id: String(item?.siteUrl ?? "").trim(),
          label: String(item?.siteUrl ?? "").trim(),
          meta: item?.permissionLevel ? `Permission: ${String(item.permissionLevel)}` : null,
        }))
        .filter((item) => Boolean(item.id))
    : [];
}

function mapAnalyticsProperties(data: unknown): GoogleProperty[] {
  const payload = data as AnalyticsPayload | null | undefined;
  return Array.isArray(payload?.properties)
    ? payload.properties
        .map((item) => {
          const propertyId = String(item?.property ?? "").trim();
          const displayName = String(item?.displayName ?? "").trim();
          const accountName = String(item?.accountDisplayName ?? "").trim();
          return {
            id: propertyId,
            label: displayName || propertyId,
            meta: [
              accountName ? `Account: ${accountName}` : null,
              item?.canEdit ? "Editable" : "Read only",
            ]
              .filter(Boolean)
              .join(" | "),
          };
        })
        .filter((item) => Boolean(item.id))
    : [];
}

export function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Connect Google data sources to enrich reports with verified search and engagement data.
        </p>
      </div>

      <GoogleIntegrationCard
        provider="google_search_console"
        functionName="search-console"
        title="Google Search Console"
        description="Uses OAuth with your Google account. We only read Search Console data for the property you select."
        connectButtonLabel="Connect Google Search Console"
        mapProperties={mapSearchConsoleProperties}
      />

      <GoogleIntegrationCard
        provider="google_analytics"
        functionName="google-analytics"
        title="Google Analytics 4"
        description="Uses OAuth with your Google account. We only read GA4 data for the property you select."
        connectButtonLabel="Connect Google Analytics"
        mapProperties={mapAnalyticsProperties}
      />
    </div>
  );
}

