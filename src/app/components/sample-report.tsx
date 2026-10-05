import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

import { useAuth } from "../providers/auth-provider";
import { Button } from "./ui/button";
import { AuthModal } from "./auth-modal";
import desktopSampleReport from "../../assets/sample-report-desktop.png";
import mobileSampleReport from "../../assets/sample-report-mobile.png";

export function SampleReport() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePrimaryCta = () => {
    if (user) {
      navigate("/dashboard/reports");
      return;
    }
    setAuthModalOpen(true);
  };

  const reportIncludes = [
    "AI Visibility Score",
    "Industry-Specific Analysis",
    "Action Plan",
    "Downloadable PDF",
    "Priority Fixes",
  ];

  return (
    <section id="sample-report" className="bg-[#ece9ff] py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="mt-4 text-[28px] font-bold tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                See What's Inside Your 
              </span><br></br>{" "}
              <span className="text-[#242840]">AI Visibility Report</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500 md:text-lg">
            Every Rankio report includes an AI Visibility Score, detailed technical analysis, content insights, and a prioritized action plan tailored to your website and industry.
          </p>
        </div>

        <div className="mx-auto max-w-[1180px]">
          <div className="mb-5 rounded-[16px] border border-[#dfe4f2] bg-white/85 px-5 py-4 shadow-[0_10px_28px_rgba(26,33,54,0.06)] backdrop-blur-sm md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6e69dc]">
                  Every Report Includes
                </p>
                <p className="mt-1 text-[14px] leading-6 text-[#5f6b80]">
                  A quick view of the value you get before diving into the full report.
                </p>
              </div>
              <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-3">
                {reportIncludes.map((item) => (
                  <li
                    key={item}
                    className="flex w-full items-center gap-2 rounded-full bg-[#f5f7ff] px-3 py-2 text-[13px] font-medium text-[#44506a] sm:inline-flex sm:w-auto"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6e69dc]/10 text-[#6e69dc]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSampleReport} />
            <img
              src={mobileSampleReport}
              alt="Sample Rankio AI visibility report with overall score, platform performance, industry comparison, and recommendations"
              className="block h-auto w-full"
              loading="lazy"
            />
          </picture>
          <div className="mt-10 text-center">
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500">
              Get a personalized AI visibility analysis for your website.
            </p>
            <Button className="mt-5" onClick={handlePrimaryCta}>
              Generate My AI Visibility Report
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500"><small><strong>Note: </strong>Every report is customized based on your industry. An e-commerce website, SaaS platform, publisher, or local business receives different scoring, recommendations, and optimization priorities.</small></p>
          </div>
        </div>
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </section>
  );
}
