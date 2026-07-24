import { Bot, Lightbulb, LineChart, Search, ShieldCheck, Zap } from "lucide-react";

export function WhyRankioExists() {
  const features = [
    {
      icon: Bot,
      title: "AI Readiness Score",
      description: "Instantly understand how optimized your website is for AI search.",
    },
    {
      icon: LineChart,
      title: "SEO + AEO Analysis",
      description: "Evaluate both traditional SEO and AI discoverability signals.",
    },
    {
      icon: Search,
      title: "Structured Data Insights",
      description: "Identify missing schema and machine-readable gaps.",
    },
    {
      icon: Lightbulb,
      title: "UX Clarity Check",
      description: "Ensure your content is easily interpreted by AI systems.",
    },
    {
      icon: ShieldCheck,
      title: "Actionable Recommendations",
      description: "Get clear steps to improve visibility and performance.",
    },
    {
      icon: Zap,
      title: "Competitive Edge",
      description: "Stay ahead as AI search reshapes discovery.",
    },
  ];

  return (
    <section id="why-rankio-exists" className="bg-white py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <h2 className="text-[30px] font-bold tracking-tight md:text-[42px]" style={{ lineHeight: 1.08 }}>
            <span className="bg-gradient-to-r from-[#585fc9] to-[#23283f] bg-clip-text text-transparent">
              What Rankio
            </span>{" "}
            <span className="text-[#23283f]">Does</span>
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-[18px] leading-[1.7] text-[#70839a]">
            Rankio analyzes your website’s AI readiness across SEO, structure, and discoverability. Get a clear
            score, identify gaps, and understand how visible your site is in AI search.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={index}
                className="group min-h-[162px] rounded-[14px] border border-[#6670df] bg-[#fafaff] p-6 shadow-[0_1px_0_rgba(102,112,223,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#4f57c8] hover:bg-white hover:shadow-[0_16px_32px_rgba(88,95,201,0.14)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md text-[#5259c7] transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h3 className="mt-7 text-[18px] font-semibold text-[#1f2633]">{feature.title}</h3>
                <p className="mt-3 max-w-[18ch] text-[16px] leading-7 text-[#7a8796]">
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
