import { ArrowRight, Bot, Lightbulb, LineChart, Search, ShieldCheck, Zap } from "lucide-react";
import { Button } from "./ui/button";

export function WhyRankioExists() {
  const features = [
    {
      icon: Bot,
      title: "AI Visibility Score",
      description: "Get a comprehensive AI Visibility Score that measures how effectively AI systems can understand, trust, and recommend your website.",
    },
    {
      icon: LineChart,
      title: "Technical Foundation",
      description: "Evaluate the technical elements that support AI discoverability, including crawlability, HTTPS, mobile responsiveness, robots.txt, and sitemap health.",
    },
    {
      icon: Search,
      title: "Structured Data",
      description: "Identify missing or incomplete schema markup that helps AI understand your products, services, organization, and website content.",
    },
    {
      icon: Lightbulb,
      title: "Content Understanding",
      description: "Analyze how clearly your content communicates your expertise, products, and services to AI-powered search systems.",
    },
    {
      icon: ShieldCheck,
      title: "Brand Understanding",
      description: "Measure how consistently your business identity, authority, and trust signals are presented across your website.",
    },
    {
      icon: Zap,
      title: "Personalized Action Plan",
      description: "Receive prioritized recommendations with clear next steps to improve your AI Visibility Score and strengthen your online presence.",
    },
  ];

  return (
    <section id="why-rankio-exists" className="bg-white py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <h2 className="text-[28px] font-bold tracking-tight sm:text-[30px] md:text-[42px]" style={{ lineHeight: 1.08 }}>
            <span className="bg-gradient-to-r from-[#585fc9] to-[#23283f] bg-clip-text text-transparent">
              What Rankio
            </span>{" "}
            <span className="text-[#23283f]">Does</span>
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-[18px] leading-[1.7] text-[#70839a]">
            Rankio analyzes your website’s AI visibility across SEO, structure, and discoverability. Get a clear
            score, identify gaps, and understand how visible your site is in AI search.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={index}
                className="group flex min-h-[200px] flex-col rounded-[14px] border border-[#6670df] bg-[#fafaff] p-6 shadow-[0_1px_0_rgba(102,112,223,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#4f57c8] hover:bg-white hover:shadow-[0_16px_32px_rgba(88,95,201,0.14)] sm:min-h-[220px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5259c7] transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h3 className="mt-7 text-[18px] font-semibold text-[#1f2633]">{feature.title}</h3>
                <p className="mt-3 flex-1 text-[16px] leading-8 text-[#7a8796]">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            asChild
            size="lg"
          className="w-full gap-2 rounded-xl bg-[#5b5bd6] px-8 text-white shadow-[0_14px_32px_rgba(91,91,214,0.24)] hover:bg-[#5050cf] sm:w-auto sm:min-w-[12rem]"
          >
            <a href="#pricing">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
