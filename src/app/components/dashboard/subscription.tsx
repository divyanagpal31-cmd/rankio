import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useLocation } from "react-router";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../providers/auth-provider";
import { submitPlanLead } from "../../services/lead-service";

type Plan = {
  id: "free" | "professional" | "agency";
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0 / month",
    description: "For early-stage founders testing AI readiness",
    features: ["3 scans (lifetime)", "Basic AI readiness score", "Limited insights preview"],
    cta: "Current Plan",
  },
  {
    id: "professional",
    name: "Professional",
    priceLabel: "$49 / month",
    description: "For growing businesses optimizing visibility",
    features: ["Unlimited scans", "Full SEO & AI audit", "Actionable recommendations", "Monthly monitoring", "PDF export"],
    cta: "Choose Professional",
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    priceLabel: "$199 / month",
    description: "For teams managing multiple clients",
    features: ["Multi-project dashboard", "White-label reports", "API access", "Priority support"],
    cta: "Contact Sales",
  },
];

export function Subscription() {
  const location = useLocation();
  const { user } = useAuth();

  const limitState = (location.state as any) ?? null;
  const showLimitBanner = limitState?.reason === "scan_limit";
  const limit = typeof limitState?.limit === "number" ? limitState.limit : 3;

  const defaultName = useMemo(() => {
    const n = (user?.user_metadata?.full_name as string | undefined) ?? "";
    return n.trim();
  }, [user]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState((user?.email ?? "").trim());
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const openPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!fullName && defaultName) setFullName(defaultName);
    if (!email && user?.email) setEmail(String(user.email).trim());
    setDialogOpen(true);
  };

  const onSubmit = async () => {
    if (!selectedPlan) return;
    setSubmitError(null);
    setSubmitSuccess(null);

    const e = email.trim();
    if (!e) {
      setSubmitError("Email is required.");
      return;
    }

    setSubmitting(true);
    const { error } = await submitPlanLead({
      plan: selectedPlan.name,
      full_name: fullName.trim(),
      email: e,
      company: company.trim(),
      phone: phone.trim(),
      website: website.trim(),
      notes: notes.trim(),
      source: showLimitBanner ? "scan_limit" : "subscription_page",
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error);
      return;
    }

    setSubmitSuccess("Thanks — we’ll reach out shortly.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
          Subscription
        </h1>
        <p className="text-muted-foreground mt-2">Choose a plan. Payments come next — for now, we’ll contact you.</p>
      </div>

      {showLimitBanner && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-primary">
          You’ve reached the free limit of <span className="font-semibold">{limit}</span> scans. Upgrade to continue
          scanning.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative rounded-2xl p-6 border ${
              plan.popular ? "bg-primary text-white border-accent/30 shadow-xl" : "bg-white border-border/40"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent text-white text-xs px-4 py-1.5 rounded-full" style={{ fontWeight: 600 }}>
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="mb-4">
              <h2 className={`text-xl ${plan.popular ? "text-white" : "text-primary"}`} style={{ fontWeight: 700 }}>
                {plan.name}
              </h2>
              <p className={`text-sm mt-1 ${plan.popular ? "text-white/80" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
            </div>

            <div className="mb-4">
              <div className={`text-3xl ${plan.popular ? "text-white" : "text-primary"}`} style={{ fontWeight: 700 }}>
                {plan.priceLabel}
              </div>
            </div>

            <Button
              onClick={() => openPlan(plan)}
              disabled={plan.id === "free"}
              className={`w-full mb-5 ${
                plan.id === "free"
                  ? "opacity-70"
                  : plan.popular
                    ? "bg-white text-primary hover:bg-gray-100"
                    : "bg-accent text-white hover:bg-accent/90"
              }`}
            >
              {plan.cta}
            </Button>

            <div className="space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className={`h-5 w-5 mt-0.5 ${plan.popular ? "text-accent" : "text-accent"}`} />
                  <span className={`text-sm ${plan.popular ? "text-white/90" : "text-muted-foreground"}`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPlan ? `Enquire about ${selectedPlan.name}` : "Enquire"}</DialogTitle>
            <DialogDescription>
              Share a few details and we’ll email you back. Payments and upgrades are coming next.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead-full-name">Full name</Label>
                <Input id="lead-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead-company">Company</Label>
                <Input id="lead-company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-website">Website</Label>
              <Input id="lead-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea
                id="lead-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know (goals, number of sites, timeline, etc.)"
              />
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {submitSuccess && <p className="text-sm text-green-700">{submitSuccess}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !selectedPlan || selectedPlan.id === "free"}>
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
