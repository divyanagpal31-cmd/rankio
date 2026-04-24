import { Bot, LineChart, FileSearch, Lightbulb, Shield, Zap } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Bot,
      title: "AI Readiness Analysis",
      description: "Evaluate structure, schema, and semantic signals used by AI systems."
    },
    {
      icon: LineChart,
      title: "SEO Foundation Score",
      description: "Identify technical gaps affecting crawlability and rankings."
    },
    {
      icon: FileSearch,
      title: "Structured Data Validation",
      description: "Ensure schema markup supports search engines and AI parsing."
    },
    {
      icon: Lightbulb,
      title: "UX Clarity Assessment",
      description: "Measure how clearly content communicates intent and hierarchy."
    },
    {
      icon: Shield,
      title: "Answer Engine Optimization",
      description: "Optimize for AI-driven summaries and conversational search."
    },
    {
      icon: Zap,
      title: "Actionable Insights",
      description: "Get prioritized, severity-based recommendations."
    }
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-gray-50/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl text-primary mb-4" style={{ fontWeight: 700 }}>
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground" style={{ lineHeight: 1.6 }}>
            Comprehensive website intelligence powered by AI to help you stay ahead in search and discovery.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-xl border border-border/50 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="mb-4 h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg text-primary mb-2" style={{ fontWeight: 600 }}>
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}