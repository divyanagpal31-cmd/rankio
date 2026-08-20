import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShoppingCart,
  Target,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

import { useAuth } from "../providers/auth-provider";
import { Button } from "./ui/button";
import { AuthModal } from "./auth-modal";

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

  const categoryScores = [
    { category: "SEO Foundation", score: 84 },
    { category: "AI Readiness", score: 68 },
    { category: "UX Clarity", score: 71 },
    { category: "Technical Health", score: 77 },
  ];

  const reportItems = [
    { parameter: "Meta Description", status: "success", severity: "Low", suggestion: "Optimized for all pages" },
    { parameter: "Structured Data", status: "warning", severity: "Medium", suggestion: "Missing Schema.org markup on product pages" },
    { parameter: "Mobile Responsiveness", status: "success", severity: "Low", suggestion: "Fully responsive design detected" },
    { parameter: "Core Web Vitals", status: "error", severity: "High", suggestion: "LCP exceeds 2.5s on homepage" },
    { parameter: "FAQ Markup", status: "warning", severity: "Medium", suggestion: "No FAQ schema found" },
    { parameter: "AI Answer Visibility Score", status: "error", severity: "Critical", suggestion: "Content structure not optimized for LLM parsing" },
    { parameter: "Content Semantic Analysis", status: "warning", severity: "High", suggestion: "Entity relationships lack clarity for AI systems" },
    { parameter: "Advanced AEO Optimization", status: "warning", severity: "Medium", suggestion: "Answer-focused content formatting needs improvement" },
  ];

  const headerBadges = [
    {
      icon: ShoppingCart,
      label: "Detected Website Type",
      value: "E-commerce",
    },
    {
      icon: Target,
      label: "Report Customized for",
      value: "Online Store Optimization",
    },
  ];

  const reportIncludes = [
    "AI Visibility Score",
    "Industry-Specific Analysis",
    "Action Plan",
    "Downloadable PDF",
    "Priority Fixes",
  ];

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    if (status === "error") return <XCircle className="h-5 w-5 text-rose-600" />;
    return <Lock className="h-5 w-5 text-slate-400" />;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "Critical") return "text-rose-600 bg-rose-50";
    if (severity === "High") return "text-orange-600 bg-orange-50";
    if (severity === "Medium") return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <section id="sample-report" className="bg-[#ece9ff] py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="mt-4 text-[28px] font-bold tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                See What's Inside Your 
              </span>{" "}
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
              <ul className="flex flex-wrap gap-x-5 gap-y-3">
                {reportIncludes.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full bg-[#f5f7ff] px-3 py-2 text-[13px] font-medium text-[#44506a]"
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

          <div className="overflow-hidden rounded-[18px] border border-[#e7ebf5] bg-white shadow-[0_18px_50px_rgba(26,33,54,0.14)]">
            <div className="flex flex-col gap-6 bg-[linear-gradient(90deg,#142133_0%,#1a2540_100%)] px-5 py-6 text-white md:flex-row md:items-center md:justify-between md:px-6">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold leading-none md:text-[20px]">AI Readiness Report</h3>
                <p className="mt-2 text-[12px] text-white/72 md:text-[13px]">yourwebsite.com</p>
              </div>

              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-center md:gap-4">
                {headerBadges.map((badge) => {
                  const Icon = badge.icon;

                  return (
                    <div
                      key={badge.label}
                    className="flex w-full min-w-0 items-center gap-3 rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 sm:min-w-[210px]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <Icon className="h-4 w-4 text-white/90" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] leading-none text-white/55">{badge.label}</p>
                        <p className="mt-1 truncate text-[13px] font-semibold text-white">{badge.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="min-w-[78px] text-center md:text-right">
                <div className="text-[28px] font-semibold leading-none md:text-[32px]">72</div>
                <div className="mt-1 text-[11px] text-white/55 md:text-[12px]">Overall Score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 border-b border-[#edf0f5] md:grid-cols-4">
              {categoryScores.map((item, index) => (
                <div
                  key={item.category}
                  className={`px-6 py-6 ${index !== categoryScores.length - 1 ? "md:border-r md:border-[#edf0f5]" : ""}`}
                >
                  <div className="text-[13px] font-medium text-[#7a8699]">{item.category}</div>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-[26px] font-semibold leading-none text-[#1f2a3d]">
                      {item.score}
                    </span>
                    <span className="pb-0.5 text-[13px] text-[#8c96a8]">/100</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[#eef1f6]">
                    <div
                      className="h-full rounded-full bg-[#6e69dc]"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-6 pt-6 sm:px-6 md:px-10 md:pb-10">
              <h4 className="text-center text-[16px] font-semibold text-[#283242] md:text-[18px]">
                Detailed Analysis
              </h4>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#edf0f5]">
                      <th className="pb-4 text-left text-[13px] font-medium text-[#718197]">Parameter</th>
                      <th className="pb-4 text-left text-[13px] font-medium text-[#718197]">Status</th>
                      <th className="pb-4 text-left text-[13px] font-medium text-[#718197]">Severity</th>
                      <th className="pb-4 text-left text-[13px] font-medium text-[#718197]">Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportItems.map((item) => (
                      <tr key={item.parameter} className="border-b border-[#f2f4f8] last:border-b-0">
                        <td className="py-3.5 pr-4 text-[13px] text-[#283242]">{item.parameter}</td>
                        <td className="py-3.5 pr-4">
                          {getStatusIcon(item.status)}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`inline-flex rounded-[4px] px-2.5 py-1 text-[11px] font-semibold ${getSeverityColor(
                              item.severity,
                            )}`}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3.5 text-[13px] leading-6 text-[#728197]">
                          {item.suggestion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500">
              Get a personalized AI readiness analysis for your website.
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
