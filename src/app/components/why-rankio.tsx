import { BrainCircuit, Building2, FileText, ListChecks, ShieldCheck, Zap } from "lucide-react";

export function WhyRankio() {
  const features = [
    {
      icon: BrainCircuit,
      title: "AI-First Analysis",
      description: "Built specifically for AI-powered search and answer engines—not just traditional SEO.",
    },
    {
      icon: Building2,
      title: "Industry-Specific Reports",
      description: "Every report adapts to your business type and website goals.",
    },
    {
      icon: ListChecks,
      title: "Actionable Recommendations",
      description: "Prioritized improvements with clear explanations and business impact.",
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description: "Download and share beautifully designed PDF reports with your team or clients.",
    },
    {
      icon: Zap,
      title: "Fast & Easy",
      description: "Analyze your website in minutes without complex setup or integrations.",
    },
    {
      icon: ShieldCheck,
      title: "Privacy Focused",
      description: "Your website is analyzed securely. No code installation or website changes are required.",
    },
  ];

  const comparisonRows = [
    { feature: "Technical SEO", traditional: true, rankio: true },
    { feature: "AI Visibility Analysis", traditional: false, rankio: true },
    { feature: "Industry-Specific Scoring", traditional: false, rankio: true },
    { feature: "AI Citation Visibility", traditional: false, rankio: true },
    { feature: "Action Plan", traditional: "Limited", rankio: true },
    { feature: "Downloadable Report", traditional: "Varies", rankio: true },
  ];

  return (
    <section id="why-rankio" className="bg-[#F6F6FF] py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mt-4 text-[28px] font-bold tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Why Rankio 
              </span>{" "}
              <span className="text-[#242840]">Is Different?</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500 md:text-lg">
            Rankio goes beyond traditional SEO audits by evaluating how AI systems understand, interpret, and recommend your website. Every report is designed to deliver practical insights—not just technical data.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group flex min-h-[200px] flex-col rounded-[14px] border border-[#5d67dc] bg-[#fbfbff] p-6 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-[#4f59d8] hover:bg-white hover:shadow-[0_20px_44px_rgba(89,95,201,0.18)] sm:min-h-[240px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5b63d8] transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h3 className="mt-7 text-[18px] font-semibold leading-[1.4] text-[#232c41]">
                  {feature.title}
                </h3>
                <p className="mt-3 w-full text-[16px] leading-7 text-[#8a96a8]">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-16 rounded-[18px] border border-[#d9ddf6] bg-white/85 p-5 shadow-[0_18px_40px_rgba(89,95,201,0.08)] md:p-7">          
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="mt-4 text-[28px] font-bold tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
              <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                  Traditional SEO Audit  
                </span><br></br>{" "}
                <span className="text-[#242840]">vs</span><br></br>
                <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">Rankio AI Visibility Report</span>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#7b8698] md:text-[16px]">
                See how Rankio goes beyond a standard SEO audit with AI-specific analysis, scoring, and actionable guidance.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] border border-[#e2e6f3]">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[#f6f7ff] text-left">
                    <th className="px-5 py-4 text-sm font-semibold text-[#232c41]">Feature</th>
                    <th className="px-5 py-4 text-sm font-semibold text-[#232c41]">Traditional SEO Audit</th>
                    <th className="px-5 py-4 text-sm font-semibold text-[#232c41]">Rankio AI Visibility Report</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr
                      key={row.feature}
                      className={index !== comparisonRows.length - 1 ? "border-b border-[#edf0f7]" : ""}
                    >
                      <td className="px-5 py-4 text-sm font-medium text-[#232c41]">{row.feature}</td>
                      <td className="px-5 py-4 text-sm text-[#5c677b]">
                        {row.traditional === true ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                            Included
                          </span>
                        ) : row.traditional === false ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                            Not included
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                            {row.traditional}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#5c677b]">
                        {row.rankio === true ? (
                          <span className="inline-flex items-center rounded-full bg-[#eef0ff] px-3 py-1 font-semibold text-[#5b63d8]">
                            Included
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                            Not included
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
