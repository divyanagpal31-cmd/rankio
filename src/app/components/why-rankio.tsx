import { Brain, TrendingUp, Calendar, Target } from "lucide-react";

export function WhyRankio() {
  const features = [
    {
      icon: Brain,
      title: "AI + SEO + UX Combined Audit",
      description: "The only platform analyzing website intelligence across all three critical dimensions."
    },
    {
      icon: TrendingUp,
      title: "Severity-Based Insights",
      description: "Prioritize fixes by impact. Know what matters most for your visibility and performance."
    },
    {
      icon: Calendar,
      title: "Monthly Monitoring",
      description: "Track your progress over time. See how changes affect your AI readiness score."
    },
    {
      icon: Target,
      title: "Actionable Recommendations",
      description: "No vague suggestions. Get specific, implementable steps to improve your score."
    }
  ];

  return (
    <section id="why-rankio" className="py-20 bg-gray-50/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>Why Choose Rankio?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for the future of search and discovery
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white border border-border/50 rounded-xl p-6 space-y-4 hover:shadow-lg hover:border-accent/30 transition-all"
              >
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg text-primary" style={{ fontWeight: 600 }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}