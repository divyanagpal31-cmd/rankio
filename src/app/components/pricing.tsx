import { Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../providers/auth-provider";
import { AuthModal } from "./auth-modal";
import { Button } from "./ui/button";
import { paymentPlans } from "../services/payment-plans";

export function Pricing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = (planId: "starter" | "growth") => {
    const target = `/dashboard/subscription?plan=${planId}`;
    if (user) {
      navigate(target);
      return;
    }
    setRedirectTo(target);
    setAuthModalOpen(true);
  };

  const handleContactSales = () => {
    window.location.href = "mailto:sales@rankio.ai?subject=Rankio%20Pro%20Plan";
  };

  return (
    <>
      <section id="pricing" className="bg-white py-20 md:py-28">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Pay Per Report,
              </span>{" "}
              <span className="text-[#242840]">No Subscriptions</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500 md:text-lg">
              Get detailed AI readiness insights. Pay only for what you need.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
            {paymentPlans.map((plan) => (
              <article
                key={plan.id}
                className={`group relative rounded-[2rem] border border-[#6c72e8] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(91,91,214,0.16)] ${
                  plan.popular
                    ? "bg-[#f8f7ff] shadow-[0_20px_60px_rgba(91,91,214,0.16)] scale-[1.02] hover:border-[#6a6af1] hover:bg-white"
                    : "bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] hover:border-[#6a6af1] hover:bg-[#fbfbff]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/20">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{plan.description}</p>
                  </div>

                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-bold text-slate-900">{plan.priceLabel}</span>
                  </div>
                  <span className="pb-1 text-sm text-slate-400">One time payment</span>

                  {plan.checkoutEnabled ? (
                    <Button
                      onClick={() => handleCheckout(plan.id)}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleContactSales}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>

                <div className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                      <span className="text-sm leading-6 text-slate-500">{feature}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-slate-400">
            All plans include secure processing, clear reporting, and regular product updates.
          </p>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} redirectTo={redirectTo} />
    </>
  );
}
