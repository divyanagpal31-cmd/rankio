export function WhyAiVisibilityMatters() {
  return (
    <section className="bg-[#f6f6ff] py-20 md:py-28">
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

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {["Simple.", "Accurate.", "Future-proof."].map((item) => (
            <div
              key={item}
              className="rounded-[16px] border border-[#d9ddf6] bg-white/85 px-5 py-6 text-center shadow-[0_12px_30px_rgba(89,95,201,0.08)]"
            >
              <p className="text-[20px] font-semibold tracking-tight text-[#232c41] md:text-[22px]">
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
