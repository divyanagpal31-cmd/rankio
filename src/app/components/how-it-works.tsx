import { ArrowRight } from "lucide-react";
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
      description: "Provide your website URL. Rankio begins analyzing the technical, structural, and content signals that influence AI visibility.",
    },
    {
      number: "2",
      title: "AI Visibility Analysis",
      description: "Rankio evaluates website accessibility, structure, structured data, content clarity, brand understanding, and AI citation visibility to measure how AI systems interpret your website.",
    },
    {
      number: "3",
      title: "Receive Your AI Visibility Report",
      description: "Get your AI Visibility Score, detailed findings, and prioritized recommendations designed specifically for your website and industry.",
    },
  ];

  return (
    <>
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-[linear-gradient(180deg,#1b2340_0%,#141b33_100%)] py-12 sm:py-16 md:py-24"
      >
        <div className="container relative mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-[28px] font-bold tracking-tight sm:text-[30px] md:text-[42px]" style={{ lineHeight: 1.08 }}>
              <span className="bg-gradient-to-r from-[#585fc9] to-[#fff] bg-clip-text text-transparent">
                Analyze Your Website in <br></br>
              </span>{" "}
              <span className="text-[#fff]">Three Simple Steps</span>
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-white/80">
              Get actionable insights in three intelligent steps.
            </p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.16fr_0.84fr] lg:gap-14">
            <div className="relative flex flex-col items-center">
              <div className="relative hidden w-full max-w-[740px] md:block">
                <div className="absolute -inset-4 rounded-[2.5rem] bg-[#6c71e9]/10 blur-3xl" />
                <div className="relative flex min-h-[280px] items-end sm:min-h-[430px]">
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
                variant="outline"
                size="lg"
                className="hidden mt-8 w-full border-white bg-white text-accent shadow-sm hover:-translate-y-0.5 hover:border-white hover:bg-[#f6f6ff] hover:text-[#4f57c8] hover:shadow-[0_14px_30px_rgba(255,255,255,0.18)] sm:w-auto"
              >
                Generate My AI Report
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="hidden mt-5 text-[16px] text-white/65">
                Generate your first AI Visibility Report in minutes. No credit card required.
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
                    <div className="relative min-h-[110px] overflow-hidden rounded-[17px] bg-[#212a49] px-5 py-5 sm:min-h-[142px] sm:px-6 sm:py-6">
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[56px] font-light leading-none text-transparent sm:right-5 sm:text-[74px]"
                        style={{
                          WebkitTextStroke: "1px rgba(111,116,239,0.95)",
                        } as CSSProperties}
                      >
                        {step.number}
                      </div>
                      <div className="relative pr-10 sm:pr-16">
                        <h3 className="max-w-[28ch] text-[18px] font-semibold text-white sm:text-[20px]">
                          {step.title}
                        </h3>
                        <p className="mt-4 max-w-[33ch] text-[15px] leading-7 text-white/70 sm:text-[16px]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <Button
              onClick={handlePrimaryCta}
              variant="outline"
              size="lg"
              className="w-full border-white bg-white text-accent shadow-sm hover:-translate-y-0.5 hover:border-white hover:bg-[#f6f6ff] hover:text-[#4f57c8] hover:shadow-[0_14px_30px_rgba(255,255,255,0.18)] sm:w-auto"
            >
              Generate My AI Report
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="mt-5 text-center text-[16px] text-white/65">
              Generate your first AI Visibility Report in minutes. No credit card required. 
            </p>
          </div>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
