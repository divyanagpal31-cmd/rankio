import { Check } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { AuthModal } from "./auth-modal";
import { useAuth } from "../providers/auth-provider";
import { useNavigate } from "react-router";

export function Pricing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlanCta = () => {
    if (user) {
      navigate("/dashboard/websites");
      return;
    }
    setAuthModalOpen(true);
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      description: "For early-stage founders testing AI readiness",
      features: [
        "3 scans (lifetime)",
        "Basic AI readiness score",
        "Limited insights preview"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Professional",
      price: "49",
      description: "For growing businesses optimizing visibility",
      features: [
        "Unlimited scans",
        "Full SEO & AI audit",
        "Actionable recommendations",
        "Monthly monitoring",
        "PDF export"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Agency",
      price: "199",
      description: "For teams managing multiple clients",
      features: [
        "Multi-project dashboard",
        "White-label reports",
        "API access",
        "Priority support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <>
      <section id="pricing" className="py-20 md:py-32 bg-gray-50/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl text-primary mb-4" style={{ fontWeight: 700 }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground" style={{ lineHeight: 1.6 }}>
              Start free. Upgrade as you scale.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.name === "Agency"
                    ? "bg-white border border-border/50 opacity-60 pointer-events-none"
                    : plan.popular
                      ? "bg-primary text-white border-2 border-accent shadow-2xl scale-105"
                      : "bg-white border border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span
                      className="bg-accent text-white text-xs px-4 py-1.5 rounded-full"
                      style={{ fontWeight: 600 }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-xl ${plan.popular ? "text-white" : "text-primary"}`} style={{ fontWeight: 700 }}>
                      {plan.name}
                    </h3>
                    {plan.name === "Agency" && (
                      <span
                        className="bg-gradient-to-r from-accent/20 to-purple-500/20 text-accent border border-accent/30 text-xs px-3 py-1 rounded-full"
                        style={{ fontWeight: 600 }}
                      >
                        COMING SOON
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${plan.popular ? "text-white/80" : "text-muted-foreground"}`}>{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl ${plan.popular ? "text-white" : "text-primary"}`} style={{ fontWeight: 700 }}>
                      ${plan.price}
                    </span>
                    <span className={`text-sm ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>/month</span>
                  </div>
                </div>

                <Button
                  disabled={plan.name === "Agency"}
                  onClick={handlePlanCta}
                  className={`w-full mb-6 ${
                    plan.popular ? "bg-white text-primary hover:bg-gray-100" : "bg-accent text-white hover:bg-accent/90"
                  }`}
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-accent" : "text-accent"}`} />
                      <span className={`text-sm ${plan.popular ? "text-white/90" : "text-muted-foreground"}`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            All plans include SSL encryption, GDPR compliance, and regular feature updates.
          </p>
        </div>
      </section>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
