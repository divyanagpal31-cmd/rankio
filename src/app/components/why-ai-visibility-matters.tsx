import aiVisibilityWomanImage from "../../assets/why-ai-visibility-woman.jpeg";
import timelineAim from "../../assets/timeline-aim.png";
import timelineGemini from "../../assets/timeline-gemini.png";
import timelineGrowth from "../../assets/timeline-growth.png";
import timelineVisible from "../../assets/timeline-visible.png";

function GoogleIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_14px_34px_rgba(71,70,176,0.18)]">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
        <path
          fill="#4285F4"
          d="M23.99 10.5c3.1 0 5.9 1.08 8.1 2.85l5.97-5.97C34.4 4.16 29.57 2 23.99 2 15.38 2 7.93 6.94 4.29 14.06l6.95 5.39c1.73-5.21 6.63-8.95 12.75-8.95Z"
        />
        <path
          fill="#EA4335"
          d="M45.26 24.48c0-1.57-.13-2.73-.41-3.93H24v7.43h12.4c-.25 1.85-1.44 4.63-4.14 6.49l6.5 5.04c3.9-3.6 6.5-8.9 6.5-15.03Z"
        />
        <path
          fill="#FBBC05"
          d="M10.62 28.62a13.4 13.4 0 0 1-.7-4.26c0-1.48.26-2.92.69-4.26L3.66 14.7A21.98 21.98 0 0 0 2 24.36c0 3.51.83 6.83 2.31 9.66l6.31-5.4Z"
        />
        <path
          fill="#34A853"
          d="M23.99 46c5.58 0 10.28-1.84 13.71-5l-6.5-5.04c-1.74 1.17-4.07 1.99-7.21 1.99-6.12 0-11.02-3.73-12.75-8.95l-6.95 5.39C7.93 41.06 15.38 46 23.99 46Z"
        />
      </svg>
    </div>
  );
}

function TimelineBubble({
  icon,
  alt,
}: {
  icon: string;
  alt: string;
}) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_14px_34px_rgba(71,70,176,0.18)]">
      <img src={icon} alt={alt} className="h-10 w-10" />
    </div>
  );
}

function TimelineRow() {
  return (
    <div className="relative mt-6 pt-2 pb-12 pr-16 sm:pb-16 sm:pr-24 lg:pr-28">
      <div className="absolute left-[3%] right-[14%] top-[160px] hidden h-[12px] rounded-full bg-[linear-gradient(90deg,rgba(109,108,229,0.18)_0%,rgba(109,108,229,0.38)_32%,rgba(99,103,232,0.68)_64%,rgba(99,103,232,0.9)_100%)] sm:block" />
      <div className="absolute right-[-6px] top-[104px] hidden sm:block lg:right-[-10px] lg:top-[96px]">
        <img
          src={timelineAim}
          alt="Aim icon"
          className="h-[108px] w-[108px] object-contain lg:h-[126px] lg:w-[126px]"
        />
      </div>

      <div className="grid grid-cols-4 gap-3 text-center sm:gap-4 lg:gap-5">
        {[
          {
            heading: "Yesterday",
            title: "Google Search",
            description: "The era of traditional search begins.",
            isGoogle: true,
          },
          {
            heading: "Today",
            title: "Google AI Overview\nChatGPT\nPerplexity\nGemini",
            description: "AI-powered answers are redefining how people find information.",
            icon: timelineGemini,
          },
          {
            heading: "Tomorrow",
            title: "AI-first Discovery",
            description: "Brands that adapt today will lead discovery tomorrow.",
            icon: timelineGrowth,
          },
          {
            heading: "The Future",
            title: "AI-First Discovery",
            description: "Be visible where decisions are made - before the search even happens.",
            icon: timelineVisible,
          },
        ].map((item, index) => {
          return (
            <div key={item.heading} className="relative min-w-0">
              <div className="mx-auto flex max-w-[190px] flex-col items-center">
                <div className="min-h-[92px]">
                  <p className="text-[12px] font-semibold leading-none text-[#5d67dc] sm:text-[14px]">{item.heading}</p>
                  <div className="mt-2 whitespace-pre-line text-[11px] font-semibold leading-[1.35] text-[#23263a] sm:text-[12px]">
                    {item.title}
                  </div>
                </div>

                <div className="relative mt-[28px] flex h-[84px] w-full items-center justify-center">
                  <div className="absolute left-1/2 top-[-30px] hidden h-[30px] -translate-x-1/2 border-l border-dashed border-[#d6d8ef] sm:block" />
                  <div className="absolute left-1/2 top-[-13px] hidden -translate-x-1/2 sm:block">
                    <span className="block h-3 w-3 rotate-45 border-b-2 border-r-2 border-[#6266e8]" />
                  </div>

                  <div className="relative z-10">
                    {item.isGoogle ? (
                      <GoogleIcon />
                    ) : (
                      <TimelineBubble icon={item.icon} alt={item.heading} />
                    )}
                  </div>
                </div>

                <p className="mt-4 max-w-[165px] text-[10px] leading-4 text-[#5f6780] sm:text-[11px]">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WhyAiVisibilityMatters() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-4 text-[28px] font-bold tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
              Why AI Visibility
            </span>{" "}
            <span className="text-[#242840]">Matters?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.7] text-[#70839a] sm:text-[18px]">
            The Future of Search Is Changing
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-8 text-[#70839a] md:text-[18px]">
            AI-powered search experiences are changing how people discover information online. Search engines and AI assistants increasingly rely on structured, trustworthy, and well-organized content to understand businesses and recommend relevant results.
          </p>
        </div>

        <div className="mx-auto mt-14 p-4 md:p-6">
          <div className="grid items-center gap-10 md:grid-cols-[0.82fr_1.18fr] xl:grid-cols-[0.78fr_1.22fr]">
            <div className="relative flex items-center justify-center overflow-hidden">
              <img
                src={aiVisibilityWomanImage}
                alt="Woman working on a laptop"
                className="block h-auto w-full max-h-[560px] object-contain object-center sm:max-h-[620px] lg:max-h-[680px]"
                loading="eager"
              />
            </div>

            <div className="relative flex h-full items-center px-0 py-2 md:pl-4 lg:pl-6 xl:pl-10">
              <TimelineRow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
