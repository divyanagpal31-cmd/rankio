import { CalendarDays, Cloud, ChartSpline, Target } from "lucide-react";

export function WhyRankio() {
  const features = [
    {
      icon: Cloud,
      title: "AI + SEO + UX Combined Audit",
      description: "The only platform analyzing website intelligence across all three critical dimensions.",
    },
    {
      icon: ChartSpline,
      title: "Severity-Based Insights",
      description: "Prioritize fixes by impact. Know what matters most for your visibility and performance.",
    },
    {
      icon: CalendarDays,
      title: "Monthly Monitoring",
      description: "Track your progress over time. See how changes affect your AI readiness score.",
    },
    {
      icon: Target,
      title: "Actionable Recommendations",
      description: "No vague suggestions. Get specific, implementable steps to improve your score.",
    },
  ];

  return (
    <section id="why-rankio" className="bg-white py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Why Choose
              </span>{" "}
              <span className="text-[#242840]">Rankio?</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500 md:text-lg">
            Built for the future of search and discovery
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group min-h-[240px] rounded-[14px] border border-[#5d67dc] bg-[#fbfbff] p-6 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-[#4f59d8] hover:bg-white hover:shadow-[0_20px_44px_rgba(89,95,201,0.18)]"
              >
                <div className="flex h-12 w-12 items-center justify-center text-[#232c41] transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-12 w-12 stroke-[1.6]" />
                </div>
                <h3 className="mt-7 max-w-[13ch] text-[18px] font-semibold leading-[1.4] text-[#232c41]">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-[24ch] text-[16px] leading-7 text-[#8a96a8]">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
