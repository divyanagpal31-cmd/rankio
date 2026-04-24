import { Check, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useSubscription } from "../../services/data-hooks";

const planFeatures = [
  "50 website scans per month",
  "Advanced AI readiness analysis",
  "Detailed SEO & AEO reports",
  "Priority email support",
  "Custom report exports",
  "API access",
];

export function Subscription() {
  const { subscription, loading } = useSubscription();
  const usageStats = [
    {
      label: "Scans Used",
      current: 12,
      limit: 50,
      percentage: 24,
    },
    {
      label: "Reports Generated",
      current: 24,
      limit: "Unlimited",
      percentage: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
          Subscription
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your plan and billing preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="lg:col-span-2">
          <Card className="border-accent/20 shadow-lg shadow-accent/5 relative overflow-hidden">
            {/* Accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
            
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-accent/10 text-accent border-accent/20 mb-3">
                    Current Plan
                  </Badge>
                  <CardTitle className="text-2xl text-primary mb-2" style={{ fontWeight: 700 }}>
                    {loading ? "…" : subscription?.plan ?? "Free"}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {subscription?.status ?? "Manage your plan and billing preferences"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">$49</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Features List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary mb-3">Plan Features</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {planFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-border/40">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Next billing date</p>
                  <p className="text-sm text-muted-foreground">March 23, 2026</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1 bg-accent hover:bg-accent/90 text-white">
                  Upgrade Plan
                </Button>
                <Button variant="outline" className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Stats Sidebar */}
        <div className="space-y-6">
          {/* Usage Card */}
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Usage This Month</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {usageStats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-semibold text-primary">
                      {stat.current} {typeof stat.limit === "number" && `/ ${stat.limit}`}
                    </span>
                  </div>
                  {typeof stat.limit === "number" && (
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  )}
                  {stat.limit === "Unlimited" && (
                    <div className="h-2 bg-accent/20 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full w-full" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Method Card */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">•••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/27</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Update Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Plan Comparison (Optional) */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Looking for more?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Explore our Enterprise plan for unlimited scans and dedicated support
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="border-accent/20 text-accent hover:bg-accent hover:text-white">
            Compare All Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
