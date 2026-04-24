import image_48465712b4d339319e0650703ff691d0ee522582 from '../../assets/48465712b4d339319e0650703ff691d0ee522582.png'
import image_98b02e88937244902253e83d91e5e27bd18935bd from '../../assets/98b02e88937244902253e83d91e5e27bd18935bd.png'
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./auth-modal";
import { useNavigate } from "react-router";
import { useAuth } from "../providers/auth-provider";

export function HowItWorks() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePrimaryCta = () => {
    if (user) {
      navigate("/dashboard/websites");
      return;
    }
    setAuthModalOpen(true);
  };
  
  const steps = [
    {
      number: "1",
      title: "Enter Your Website",
      description: "Submit your website URL to start the AI-powered analysis."
    },
    {
      number: "2",
      title: "AI Analyzes Structure & Discoverability",
      description: "Our system evaluates SEO signals, structured data, performance, and UX clarity."
    },
    {
      number: "3",
      title: "Get Your Rankio Score & Action Plan",
      description: "Receive a detailed breakdown with prioritized recommendations."
    }
  ];

  return (
    <>
      <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1a1f3a] to-primary py-20 md:py-32">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          {/* Two-column layout */}
          <div className="grid lg:grid-cols-[45%_55%] gap-12 lg:gap-16 items-stretch max-w-6xl mx-auto mb-12">
            
            {/* LEFT SIDE - AI Visual */}
            <div className="relative group h-full">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl h-full">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-purple-500/10 to-transparent z-10"></div>
                
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-purple-500/50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                
                {/* Image */}
                <img 
                  src={image_48465712b4d339319e0650703ff691d0ee522582}
                  alt="AI-powered analysis visualization"
                  className="relative z-20 w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>

            {/* RIGHT SIDE - Vertical Timeline */}
            <div className="space-y-8">
              {/* Section Title */}
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl text-white" style={{ fontWeight: 700 }}>How It Works</h2>
                <p className="text-lg text-white/70">Get actionable insights in three intelligent steps.</p>
              </div>

              {/* Steps Timeline */}
              <div className="relative space-y-8 pt-4">
                {/* Vertical connecting line */}
                <div className="absolute left-[15px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-accent/50 via-accent/30 to-transparent"></div>

                {steps.map((step, index) => (
                  <div key={index} className="relative flex gap-6 group">
                    {/* Number badge */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center text-white text-sm shadow-lg" style={{ fontWeight: 600 }}>
                        {step.number}
                      </div>
                      {/* Glow effect on number */}
                      <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <h3 className="text-lg md:text-xl text-white mb-2" style={{ fontWeight: 600 }}>
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base text-white/70 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* CTA Button Row - Centered */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-4 md:px-6">
          <Button 
            onClick={handlePrimaryCta}
            className="h-16 bg-accent hover:bg-[#4a4ac0] text-white gap-2 shadow-lg shadow-accent/30 text-lg px-[120px] py-[8px]" 
            style={{ fontWeight: 600 }}
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="text-sm text-white/60 text-center">
            Start analyzing your website in seconds — no credit card required
          </p>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
