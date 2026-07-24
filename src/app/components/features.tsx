import { ArrowRight, FileText, Laptop, MapPin, Monitor, ShoppingCart, Users } from "lucide-react";

import { Button } from "./ui/button";
import industriesPattern from "../../assets/IndustriesWeCover-Pattern.png";

export function Features() {
  const industries = [
    {
      icon: Laptop,
      title: "SaaS Platforms",
      description: "Improve feature discovery and technical documentation indexing for better conversions",
      statLabel: "Increase in qualified demo requests",
      statValue: "+35%",
    },
    {
      icon: Users,
      title: "Agencies",
      description: "Deliver comprehensive AI-ready audits and reports to differentiate your services",
      statLabel: "Client retention improvement",
      statValue: "+28%",
    },
    {
      icon: FileText,
      title: "Content & Media Websites",
      description: "Maximize article reach across answer engines, AI summaries, and search snippets",
      statLabel: "Boost in organic visibility",
      statValue: "+52%",
    },
    {
      icon: MapPin,
      title: "Local Businesses",
      description: "Enhance local structured data for voice search, maps, and AI location queries",
      statLabel: "Increase in local discovery",
      statValue: "+45%",
    },
  ];

  return (
    <section id="features" className="relative overflow-hidden bg-[#f2f2f5] py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.16] grayscale"
        style={{ backgroundImage: `url(${industriesPattern})` }}
      />
      <div className="absolute inset-0 bg-[rgba(242,242,245,0.86)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_38%)]" />

      <div className="relative container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div className="max-w-2xl pt-8 lg:pt-10">
            <h2 className="mt-5 text-[30px] font-bold tracking-tight md:text-[42px]">
              <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Industries
              </span>{" "}
              <span className="text-[#242840]">We Cover</span>
            </h2>
            <p className="mt-5 max-w-xl text-[18px] leading-[1.6] text-[#6f7f95]">
              AI readiness matters across every digital business — here&apos;s where Rankio makes the biggest impact.
            </p>
          </div>

          <article className="group relative rounded-[16px] border border-[#6c72e8] bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_14px_32px_rgba(89,95,201,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(89,95,201,0.24)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5259c7]">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold text-[#20263a]">eCommerce Stores</h3>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Impact
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[16px] leading-7 text-[#6f7f95]">
                  Optimize product visibility for AI-driven shopping assistants and recommendation engines
                </p>
                <div className="mt-5 border-t border-[#d9ddf6] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#6f7f95]">
                      <span className="h-2 w-2 rounded-full bg-[#15c16a]" />
                      <span>Average growth in AI-optimized stores</span>
                    </div>
                    <span className="text-[18px] font-bold text-accent">+40%</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <article
                key={industry.title}
                className="group min-h-[210px] rounded-[16px] border border-[#6c72e8] bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_14px_32px_rgba(89,95,201,0.14)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(89,95,201,0.2)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5259c7]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] font-semibold text-[#20263a]">{industry.title}</h3>
                    <p className="mt-4 text-[16px] leading-7 text-[#6f7f95]">{industry.description}</p>
                  </div>
                </div>

                <div className="mt-7 border-t border-[#d9ddf6] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#6f7f95]">
                      <span className="h-2 w-2 rounded-full bg-[#15c16a]" />
                      <span>{industry.statLabel}</span>
                    </div>
                    <span className="text-[18px] font-bold text-accent">{industry.statValue}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="lg">
            Analyze Your Industry
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
