import { useEffect } from "react";
import { useLocation } from "react-router";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { WhyRankioExists } from "./why-rankio-exists";
import { Features } from "./features";
import { PerformanceSection } from "./performance-section";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { SampleReport } from "./sample-report";
import { WhyRankio } from "./why-rankio";
import { FaqSection } from "./faq-section";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";

export function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const targetId = location.hash.replace("#", "");
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return;

      const headerOffset = 88;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
    };

    const timeoutId = window.setTimeout(scrollToTarget, 100);
    return () => window.clearTimeout(timeoutId);
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <WhyRankioExists />
        <Features />
        <PerformanceSection />
        <HowItWorks />
        <Pricing />
        <SampleReport />
        <WhyRankio />
        <FaqSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
