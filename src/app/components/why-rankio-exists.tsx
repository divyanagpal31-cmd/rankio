import { Brain, Search, Eye } from "lucide-react";

export function WhyRankioExists() {
  const pillars = [
    {
      icon: Brain,
      title: "AI Readiness",
      description: "Evaluate how well your site is structured for AI-driven search."
    },
    {
      icon: Search,
      title: "Search Visibility",
      description: "Identify technical SEO gaps impacting discoverability."
    },
    {
      icon: Eye,
      title: "UX Clarity",
      description: "Ensure your content is structured for users and algorithms."
    }
  ];

  return (
    <section id="why-rankio-exists" className="py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="text-center space-y-6 mb-12">
          <p className="text-xs text-accent tracking-widest" style={{ fontWeight: 600 }}>
            BUILT FOR THE AI-DRIVEN WEB
          </p>
          <h2 className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>
            The AI Search Revolution is Here
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto" style={{ lineHeight: 1.7 }}>
            Rankio.ai helps businesses prepare for the future of search and AI discovery. We analyze your website's structure, visibility, and user clarity — so search engines and AI systems can properly understand, rank, and recommend your content.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {pillars.map((pillar, index) => (
            <div key={index} className="text-center space-y-4 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 border border-border/50 rounded-xl p-6 hover:shadow-lg hover:border-accent/30 transition-all">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-accent/10 mx-auto">
                <pillar.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg text-primary" style={{ fontWeight: 600 }}>
                {pillar.title}
              </h3>
              <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}