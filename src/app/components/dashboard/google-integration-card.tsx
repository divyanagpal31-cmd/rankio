import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../../lib/supabase";

type IntegrationRow = {
  id: string;
  provider: string;
  property_id: string;
  property_name?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

export type GoogleProperty = {
  id: string;
  label: string;
  meta?: string | null;
};

type GoogleIntegrationCardProps = {
  provider: string;
  functionName: string;
  title: string;
  description: string;
  connectButtonLabel: string;
  mapProperties: (data: unknown) => GoogleProperty[];
};

function isPendingProperty(value?: string | null) {
  return !value || value === "__pending__";
}

export function GoogleIntegrationCard({
  provider,
  functionName,
  title,
  description,
  connectButtonLabel,
  mapProperties,
}: GoogleIntegrationCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [properties, setProperties] = useState<GoogleProperty[]>([]);

  const activeIntegration = useMemo(
    () => integrations.find((row) => row.provider === provider) ?? null,
    [integrations, provider]
  );

  const invokeFunction = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    return await supabase.functions.invoke(functionName, {
      body: { provider, ...body },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  };

  const loadIntegrations = async () => {
    if (!user) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("integrations")
      .select("id, provider, property_id, property_name, status, updated_at")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setIntegrations([]);
      setLoading(false);
      return;
    }

    setIntegrations(((data ?? []) as IntegrationRow[]).filter(Boolean));
    setError(null);
    setLoading(false);
  };

  const loadProperties = async () => {
    if (!user || !activeIntegration) return;
    setSaving(true);
    setError(null);

    const { data, error: invokeError } = await invokeFunction({ action: "list_properties" });

    if (invokeError) {
      setError(invokeError.message);
      setProperties([]);
      setSaving(false);
      return;
    }

    setProperties(mapProperties(data));
    setSaving(false);
  };

  useEffect(() => {
    void loadIntegrations();
  }, [user, provider]);

  useEffect(() => {
    if (!activeIntegration) {
      setProperties([]);
      return;
    }

    if (isPendingProperty(activeIntegration.property_id)) {
      void loadProperties();
      return;
    }

    setProperties([]);
  }, [activeIntegration?.id, activeIntegration?.property_id]);

  const handleConnect = async () => {
    setConnectLoading(true);
    setError(null);

    const { data, error: invokeError } = await invokeFunction({
      action: "auth_start",
      return_to: "/dashboard/integrations",
    });

    if (invokeError) {
      setError(invokeError.message);
      setConnectLoading(false);
      return;
    }

    const authUrl = String((data as any)?.auth_url ?? "").trim();
    if (!authUrl) {
      setError(`${title} auth link was not returned.`);
      setConnectLoading(false);
      return;
    }

    window.location.assign(authUrl);
  };

  const handleRefresh = async () => {
    await loadIntegrations();
    await loadProperties();
  };

  const handleDisconnect = async () => {
    if (!activeIntegration) return;
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from("integrations").delete().eq("id", activeIntegration.id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setStatus(`${title} disconnected.`);
      setIntegrations([]);
      setProperties([]);
    }
    setSaving(false);
  };

  const handleChooseProperty = async (property: GoogleProperty) => {
    if (!activeIntegration) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await invokeFunction({
      action: "select_property",
      property_id: property.id,
      property_name: property.label,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setStatus(`Connected ${title} property: ${property.label}`);
      await loadIntegrations();
      setProperties([]);
    }
    setSaving(false);
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading integration status...
          </div>
        ) : activeIntegration ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
              <p className="mt-1 text-sm text-emerald-900/80">
                {isPendingProperty(activeIntegration.property_id)
                  ? "Google account connected. Choose the property you want to use for reports."
                  : `Property: ${activeIntegration.property_name ?? activeIntegration.property_id}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleRefresh} disabled={saving}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" variant="outline" onClick={handleDisconnect} disabled={saving}>
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>

            {isPendingProperty(activeIntegration.property_id) ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Available properties</Label>
                {saving ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading properties...
                  </div>
                ) : properties.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {properties.map((property) => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => void handleChooseProperty(property)}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-accent hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">{property.label}</span>
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                        {property.meta ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{property.meta}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No properties returned yet. Click refresh if you recently connected a Google account.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Connect your Google account to let Rankio use verified {title} data inside reports.
            </p>
            <Button type="button" onClick={handleConnect} disabled={connectLoading}>
              {connectLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {connectButtonLabel}
            </Button>
          </div>
        )}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
