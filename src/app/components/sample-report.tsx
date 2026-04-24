import { CheckCircle2, XCircle, AlertTriangle, Lock, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { AuthModal } from "./auth-modal";
import { useAuth } from "../providers/auth-provider";
import { useNavigate } from "react-router";

export function SampleReport() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePrimaryCta = () => {
    if (user) {
      navigate("/dashboard/websites");
      return;
    }
    setAuthModalOpen(true);
  };
  
  const categoryScores = [
    { category: "SEO Foundation", score: 84, color: "bg-accent" },
    { category: "AI Readiness", score: 68, color: "bg-accent" },
    { category: "UX Clarity", score: 71, color: "bg-accent" },
    { category: "Technical Health", score: 77, color: "bg-accent" }
  ];

  const reportItems = [
    {
      parameter: "Meta Description",
      status: "success",
      severity: "Low",
      suggestion: "Optimized for all pages"
    },
    {
      parameter: "Structured Data",
      status: "warning",
      severity: "Medium",
      suggestion: "Missing Schema.org markup on product pages"
    },
    {
      parameter: "Mobile Responsiveness",
      status: "success",
      severity: "Low",
      suggestion: "Fully responsive design detected"
    },
    {
      parameter: "Core Web Vitals",
      status: "error",
      severity: "High",
      suggestion: "LCP exceeds 2.5s on homepage"
    },
    {
      parameter: "FAQ Markup",
      status: "warning",
      severity: "Medium",
      suggestion: "No FAQ schema found"
    },
    {
      parameter: "AI Answer Visibility Score",
      status: "error",
      severity: "Critical",
      suggestion: "Content structure not optimized for LLM parsing"
    },
    {
      parameter: "Content Semantic Analysis",
      status: "warning",
      severity: "High",
      suggestion: "Entity relationships lack clarity for AI systems"
    },
    {
      parameter: "Advanced AEO Optimization",
      status: "warning",
      severity: "Medium",
      suggestion: "Answer-focused content formatting needs improvement"
    }
  ];

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    if (status === "error") return <XCircle className="h-5 w-5 text-red-600" />;
    return <Lock className="h-5 w-5 text-gray-400" />;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "Critical") return "text-red-600 bg-red-50";
    if (severity === "High") return "text-orange-600 bg-orange-50";
    if (severity === "Medium") return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <section id="sample-report" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4 mb-6">
          <h2 className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>
            See What Your Website Score Really Means
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>
            A transparent breakdown of your AI readiness and SEO performance.
          </p>
        </div>

        <p className="text-center text-base text-muted-foreground max-w-3xl mx-auto mb-12" style={{ lineHeight: 1.6 }}>
          Your report includes detailed scoring, issue severity levels, and clear next steps — so you know exactly what to improve.
        </p>

        <div className="max-w-6xl mx-auto">
          {/* Dashboard Preview Card */}
          <div className="bg-white border border-border/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-8 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl mb-2" style={{ fontWeight: 700 }}>AI Readiness Report</h3>
                  <p className="text-white/80">yourwebsite.com</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-4xl" style={{ fontWeight: 700 }}>72</div>
                    <div className="text-sm text-white/80">Overall Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-border/50">
              {categoryScores.map((item, index) => (
                <div key={index} className="p-6 space-y-3 border-r border-b border-border/50 last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <div className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                    {item.category}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl text-primary" style={{ fontWeight: 700 }}>
                      {item.score}
                    </span>
                    <span className="text-muted-foreground mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${item.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Analysis Table */}
            <div className="p-6 space-y-4">
              <h4 className="text-lg text-primary text-center" style={{ fontWeight: 600 }}>
                Detailed Analysis
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Parameter
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Severity
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Suggestion
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportItems.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/30"
                      >
                        <td className="py-3 px-4 text-sm text-primary">
                          {item.parameter}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusIcon(item.status)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getSeverityColor(
                              item.severity
                            )}`}
                            style={{ fontWeight: 600 }}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {item.suggestion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CTA Section - Moved Outside Report Card */}
          <div className="text-center mt-12 space-y-4">
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>
              Get a personalized AI readiness analysis for your website
            </p>
            <Button className="bg-accent hover:bg-accent/90 text-white gap-2 h-12 px-8" onClick={handlePrimaryCta}>
              Get Your Website Report Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </section>
  );
}
