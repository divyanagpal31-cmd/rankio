import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, AlertCircle, CheckCircle2, Lightbulb, MinusCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../providers/auth-provider";
import { buildReportComparison, type ComparedFinding, type ReportComparisonInput } from "../../services/report-comparison-service";
import { formatReadableDate } from "../../services/date-format";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

function formatDelta(delta: number | null) {
  if (delta === null) return "N/A";
  if (delta === 0) return "No change";
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function deltaBadgeClass(delta: number | null) {
  if (delta === null || delta === 0) return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
  if (delta > 0) return "border-green-200 bg-green-100 text-green-700 hover:bg-green-100";
  return "border-red-200 bg-red-100 text-red-700 hover:bg-red-100";
}

function parseReportIds(value: string | null) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
}

function FindingList({ findings, tone }: { findings: ComparedFinding[]; tone: "green" | "orange" | "slate" }) {
  const toneClass =
    tone === "green"
      ? "border-green-100 bg-green-50 text-green-800"
      : tone === "orange"
        ? "border-orange-100 bg-orange-50 text-orange-800"
        : "border-slate-200 bg-slate-50 text-primary";

  if (findings.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing to show in this section.</p>;
  }

  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <div key={finding.key} className={`rounded-xl border p-4 ${toneClass}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">{finding.title}</p>
              <p className="mt-1 text-xs opacity-80">
                {finding.category} · {finding.severity}
              </p>
            </div>
            {finding.pageUrl && <Badge variant="outline" className="max-w-full truncate">{finding.pageUrl}</Badge>}
          </div>
          {finding.description && <p className="mt-3 text-sm opacity-90">{finding.description}</p>}
          {finding.recommendation && <p className="mt-2 text-sm font-medium">Recommendation: {finding.recommendation}</p>}
        </div>
      ))}
    </div>
  );
}

export function ReportComparisonPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportIds = useMemo(() => parseReportIds(searchParams.get("reportIds")), [searchParams]);
  const websiteId = searchParams.get("websiteId")?.trim() ?? "";
  const [reports, setReports] = useState<ReportComparisonInput[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("Website");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      if (reportIds.length < 2 || reportIds.length > 3) {
        setError("Select 2 or 3 reports to compare.");
        setReports([]);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("reports")
        .select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, recommendations, generated_at, report_level, is_cached, websites!inner(user_id, url, normalized_url)")
        .in("id", reportIds)
        .eq("websites.user_id", user.id);

      setLoading(false);

      if (fetchError) {
        setError(fetchError.message);
        setReports([]);
        return;
      }

      const rows = (data ?? []) as any[];
      if (rows.length !== reportIds.length) {
        setError("One or more selected reports could not be loaded.");
        setReports([]);
        return;
      }

      const websiteIds = new Set(rows.map((row) => String(row.website_id ?? "")));
      if (websiteIds.size !== 1 || (websiteId && !websiteIds.has(websiteId))) {
        setError("Comparison is only available for reports from one website.");
        setReports([]);
        return;
      }

      setWebsiteUrl(String(rows[0]?.websites?.url ?? rows[0]?.websites?.normalized_url ?? "Website"));
      setReports(rows.map(({ websites: _websites, ...report }) => report));
    };

    void fetchReports();
  }, [reportIds, user, websiteId]);

  const comparison = useMemo(() => buildReportComparison(reports), [reports]);
  const firstReport = comparison?.reports[0] ?? null;
  const latestReport = comparison?.reports[comparison.reports.length - 1] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/reports")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <h1 className="mt-4 text-3xl text-primary" style={{ fontWeight: 700 }}>
            Report Comparison
          </h1>
          <p className="mt-2 text-muted-foreground">
            Comparing {websiteUrl} from {formatReadableDate(firstReport?.generated_at)} to {formatReadableDate(latestReport?.generated_at)}
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading comparison...</p>}
      {error && (
        <Card className="border-red-100 bg-red-50">
          <CardContent className="flex items-start gap-3 p-5 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Comparison unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparison && (
        <>
          <Card className="border-border/40 shadow-sm">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overall Result</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">{comparison.resultLabel}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {comparison.reports.length > 2
                      ? `Using all ${comparison.reports.length} selected reports for score trends. Change counts compare the first and latest reports.`
                      : "Change counts compare the first and latest selected reports for the same website."}
                  </p>
                </div>
                <Badge className={deltaBadgeClass(comparison.metrics[0]?.delta ?? null)}>
                  AI Score {formatDelta(comparison.metrics[0]?.delta ?? null)}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[firstReport, latestReport].map((report, index) => (
                  <div key={report?.id ?? index} className="rounded-xl border border-border/50 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {index === 0 ? "Starting Report" : "Latest Report"}
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="font-semibold text-primary">{formatReadableDate(report?.generated_at)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Report ID: {report?.id ?? "-"}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div className="rounded-lg border border-border/50 bg-white px-4 py-2 text-right">
                          <p className="text-xs text-muted-foreground">AI Score</p>
                          <p className="text-xl font-bold text-primary">{typeof report?.ai_score === "number" ? report.ai_score : "-"}</p>
                        </div>
                        {report?.id && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/report?reportId=${encodeURIComponent(String(report.id))}`}>View Full Report</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {comparison.metrics.map((metric) => (
                  <div key={metric.key} className="rounded-xl border border-border/50 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-xl font-bold text-primary">
                      {metric.firstValue ?? "-"} <span className="text-muted-foreground">-&gt;</span> {metric.lastValue ?? "-"}
                    </p>
                    <Badge className={`mt-3 ${deltaBadgeClass(metric.delta)}`}>{formatDelta(metric.delta)}</Badge>
                    {comparison.reports.length === 3 && (
                      <p className="mt-3 text-xs text-muted-foreground">Trend: {metric.values.map((value) => value ?? "-").join(" -> ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-green-100 bg-green-50">
              <CardContent className="p-5">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-700">Fixed Findings</p>
                <p className="mt-2 text-3xl font-bold text-green-700">{comparison.fixedFindings.length}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-100 bg-orange-50">
              <CardContent className="p-5">
                <AlertCircle className="h-5 w-5 text-orange-700" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-orange-700">New Findings</p>
                <p className="mt-2 text-3xl font-bold text-orange-700">{comparison.newFindings.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-white">
              <CardContent className="p-5">
                <MinusCircle className="h-5 w-5 text-muted-foreground" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still Open</p>
                <p className="mt-2 text-3xl font-bold text-primary">{comparison.persistentFindings.length}</p>
              </CardContent>
            </Card>
            <Card className="border-accent/20 bg-accent/10">
              <CardContent className="p-5">
                <Lightbulb className="h-5 w-5 text-accent" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">New Recommendations</p>
                <p className="mt-2 text-3xl font-bold text-accent">{comparison.addedRecommendations.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Key Insights</p>
              <p className="mt-1 text-sm text-muted-foreground">Plain-English summary of what changed between these reports.</p>
              <ul className="mt-4 grid gap-3">
                {comparison.insightBullets.map((insight) => (
                  <li key={insight} className="flex items-start gap-3 rounded-xl border border-border/50 bg-white p-4 text-sm text-primary">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-bold text-primary">Detailed Changes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open each section to review the findings and recommendations behind the summary counts.
            </p>
          </div>

          <Accordion type="multiple" defaultValue={comparison.persistentFindings.length > 0 ? ["open"] : comparison.newFindings.length > 0 ? ["new"] : []} className="space-y-4">
            <AccordionItem value="fixed" className="rounded-2xl border border-border/40 bg-white px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline">Fixed Findings ({comparison.fixedFindings.length})</AccordionTrigger>
              <AccordionContent>
                <FindingList findings={comparison.fixedFindings} tone="green" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="new" className="rounded-2xl border border-border/40 bg-white px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline">New Findings ({comparison.newFindings.length})</AccordionTrigger>
              <AccordionContent>
                <FindingList findings={comparison.newFindings} tone="orange" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="open" className="rounded-2xl border border-border/40 bg-white px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline">Still Open ({comparison.persistentFindings.length})</AccordionTrigger>
              <AccordionContent>
                <FindingList findings={comparison.persistentFindings} tone="slate" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="recommendations" className="rounded-2xl border border-border/40 bg-white px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline">
                Recommendation Changes ({comparison.addedRecommendations.length + comparison.removedRecommendations.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">Added Recommendations</p>
                    {comparison.addedRecommendations.length > 0 ? (
                      <div className="space-y-2">
                        {comparison.addedRecommendations.map((recommendation) => (
                          <p key={recommendation} className="rounded-lg border border-accent/20 bg-accent/10 p-3 text-sm text-primary">
                            {recommendation}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recommendations were added.</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Removed Recommendations</p>
                    {comparison.removedRecommendations.length > 0 ? (
                      <div className="space-y-2">
                        {comparison.removedRecommendations.map((recommendation) => (
                          <p key={recommendation} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-muted-foreground">
                            {recommendation}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recommendations were removed.</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link to="/dashboard/reports">Back to Reports</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

