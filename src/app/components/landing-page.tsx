import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { WhyRankioExists } from "./why-rankio-exists";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { SampleReport } from "./sample-report";
import { WhyRankio } from "./why-rankio";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <WhyRankioExists />
        <Features />
        <HowItWorks />
        <Pricing />
        <SampleReport />
        <WhyRankio />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
