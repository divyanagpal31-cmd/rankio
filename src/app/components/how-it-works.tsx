import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";

import howItWorksImage from "../../assets/how-it-works.png";
import { useAuth } from "../providers/auth-provider";
import { Button } from "./ui/button";
import { AuthModal } from "./auth-modal";

export function HowItWorks() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePrimaryCta = () => {
    if (user) {
      navigate("/dashboard/reports");
      return;
    }
    setAuthModalOpen(true);
  };

  const steps = [
    {
      number: "1",
      title: "Enter Your Website",
      description: "Submit your website URL to start the AI-powered analysis.",
    },
    {
      number: "2",
      title: "AI Analyzes Structure & Discoverability",
      description: "Our system evaluates SEO signals, structured data, performance, and UX clarity.",
    },
    {
      number: "3",
      title: "Get Your Rankio Score & Action Plan",
      description: "Receive a detailed breakdown with prioritized recommendations.",
    },
  ];

  return (
    <>
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-[linear-gradient(180deg,#1b2340_0%,#141b33_100%)] py-16 md:py-24"
      >
        <div className="container relative mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-[30px] font-bold tracking-tight md:text-[42px]" style={{ lineHeight: 1.08 }}>
              <span className="bg-gradient-to-r from-[#585fc9] to-[#fff] bg-clip-text text-transparent">
                How It
              </span>{" "}
              <span className="text-[#fff]">Works</span>
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-white/80">
              Get actionable insights in three intelligent steps.
            </p>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[1.16fr_0.84fr] lg:gap-14">
            <div className="relative flex flex-col items-center">
              <div className="relative w-full max-w-[740px]">
                <div className="absolute -inset-4 rounded-[2.5rem] bg-[#6c71e9]/10 blur-3xl" />
                <div className="relative flex min-h-[430px] items-end">
                  <img
                    src={howItWorksImage}
                    alt="How it works"
                    className="h-full w-full object-cover object-center"
                  />

                  {/* <div className="absolute left-[-12px] top-[34%] rounded-xl bg-[#6f74ef] px-4 py-3 text-white shadow-[0_12px_30px_rgba(111,116,239,0.35)]">
                    <div className="flex items-center gap-2 text-[12px] text-white/90">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>eCommerce Growth</span>
                    </div>
                    <div className="mt-1 text-[22px] font-bold">+40%</div>
                  </div> 

                  <div className="absolute right-[10%] top-[-10px] rounded-xl bg-[#6f74ef] px-4 py-3 text-white shadow-[0_12px_30px_rgba(111,116,239,0.35)]">
                    <div className="flex items-center gap-2 text-[12px] text-white/90">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Conversion Rate</span>
                    </div>
                    <div className="mt-1 text-[22px] font-bold">+30%</div>
                  </div>

                  <div className="absolute bottom-[12%] right-[7%] rounded-xl bg-[#6f74ef] px-4 py-3 text-white shadow-[0_12px_30px_rgba(111,116,239,0.35)]">
                    <div className="flex items-center gap-2 text-[12px] text-white/90">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>AI Visibility</span>
                    </div>
                    <div className="mt-1 text-[22px] font-bold">+67%</div>
                  </div> */}
                </div>
              </div>

              <Button
                onClick={handlePrimaryCta}
                size="lg"
                className="mt-8"
              >
                Get Started
              </Button>
              <p className="mt-5 text-[16px] text-white/65">
                Start analyzing your website in seconds — no credit card required
              </p>
            </div>

            <div className="space-y-7 self-start pt-6">
              {steps.map((step) => {
                return (
                  <article
                    key={step.number}
                    className="group relative rounded-[18px] p-[1px] shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(26,34,61, 0.78) 80%, rgba(26,34,61,0.9) 100%)",
                    }}
                  >
                    <div className="relative min-h-[142px] overflow-hidden rounded-[17px] bg-[#212a49] px-6 py-6">
                      <div
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[74px] font-light leading-none text-transparent"
                        style={{
                          WebkitTextStroke: "1px rgba(111,116,239,0.95)",
                        } as CSSProperties}
                      >
                        {step.number}
                      </div>
                      <div className="relative pr-16">
                        <h3 className="max-w-[28ch] text-[20px] font-semibold text-white">
                          {step.title}
                        </h3>
                        <p className="mt-4 max-w-[33ch] text-[16px] leading-7 text-white/70">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
