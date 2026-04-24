import { ArrowUpRight, Globe, TrendingUp, FileText, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useStats } from "../../services/data-hooks";
import { Link } from "react-router";

export function Overview() {
  const { stats, loading } = useStats();
  const cards = [
    {
      title: "Total Websites Scanned",
      value: String(stats.totalWebsites ?? 0),
      icon: Globe,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Average AI Score",
      value: String(stats.averageScore ?? 0),
      suffix: "/100",
      icon: TrendingUp,
      color: "from-accent to-purple-600",
    },
    {
      title: "Active Plan",
      value: stats.activePlan ?? "Free",
      icon: CreditCard,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Reports Generated",
      value: String(stats.reportsGenerated ?? 0),
      icon: FileText,
      color: "from-orange-500 to-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
          Welcome back, Alex
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your AI readiness and website performance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-3xl text-primary" style={{ fontWeight: 700 }}>
                    {loading ? "…" : stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground mb-1">{stat.suffix}</span>
                  )}
                </div>
              </CardContent>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary" style={{ fontWeight: 600 }}>
              Recent Activity
            </CardTitle>
            <Link
              to="/dashboard/reports"
              className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80"
            >
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.recentScans ?? []).length === 0 ? (
              <div className="p-6 rounded-lg border border-border/40 text-sm text-muted-foreground">
                No recent activity yet. Run a scan to generate your first report.
              </div>
            ) : (
              (stats.recentScans ?? []).map((scan, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/40 hover:border-accent/20 hover:bg-accent/5 transition-all gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-primary">{scan.url}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{scan.date}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* AI Score Circle */}
                    <div className="flex items-center gap-2">
                      <div className="relative h-12 w-12">
                        <svg className="h-full w-full -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#5B5BD6"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 20 * (scan.score / 100)} ${2 * Math.PI * 20}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{scan.score}</span>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">AI Score</p>
                        <p
                          className={`text-sm font-medium ${
                            scan.status === "Optimized"
                              ? "text-green-600"
                              : scan.status === "Good"
                                ? "text-blue-600"
                                : "text-orange-600"
                          }`}
                        >
                          {scan.status}
                        </p>
                      </div>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-accent/20 text-accent hover:bg-accent hover:text-white"
                      disabled={!scan.reportId}
                    >
                      <Link to={scan.reportId ? `/report?reportId=${encodeURIComponent(scan.reportId)}` : "#"}>
                        View Report
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
