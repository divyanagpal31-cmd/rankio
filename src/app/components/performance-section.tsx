import { Check } from "lucide-react";

import performanceImage from "../../assets/Group_23.png";

export function PerformanceSection() {
  const points = [
    {
      title: "Structured visibility",
      description:
        "AI-optimized websites improve discoverability across search engines and AI assistants through better semantic markup.",
    },
    {
      title: "Enhanced AI extraction",
      description:
        "Rich schema markup increases the likelihood of accurate data extraction by language models and answer engines.",
    },
    {
      title: "Faster LLM processing",
      description:
        "Well-structured content enables faster parsing and comprehension by large language models, improving response quality.",
    },
    {
      title: "Answer engine performance",
      description:
        "Clear content hierarchy significantly boosts your chances of appearing in AI-generated answers and summaries.",
    },
  ];

  return (
    <section className="bg-white pt-20 pb-0 md:pt-28 md:pb-0">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-[42px]" style={{ lineHeight: 1.08 }}>
            <span className="bg-gradient-to-r from-[#585fc9] to-[#22283e] bg-clip-text text-transparent">
              AI-Ready Websites
            </span>{" "}
            <span className="text-[#22283e]">Perform Better</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-[1.7] text-[#70839a]">
            Early data shows a clear shift toward AI-driven discovery and conversion.
          </p>
        </div>

        <div className="grid items-stretch gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:gap-14">
          <div className="relative flex h-full w-full items-end">
            <img
              src={performanceImage}
              alt="AI-ready websites perform better"
              className="h-full w-full object-contain object-bottom"
            />
          </div>

          <div className="self-center space-y-0 lg:pr-2">
            {points.map((point, index) => (
              <article
                key={point.title}
                className={`flex gap-4 py-6 transition-all duration-300 hover:translate-x-1 ${
                  index !== points.length - 1 ? "border-b border-[#d9ddf6]" : ""
                }`}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#1f2440] bg-[#e1e1fb] text-[#1f2440]">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#1f2440]">{point.title}</h3>
                  <p className="mt-2 max-w-[36ch] text-[16px] leading-7 text-[#70839a]">
                    {point.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
