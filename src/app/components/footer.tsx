import { Link } from "react-router";
import lightLogo from "../../assets/c96eb4a1a4dc0f6986adfdbb56831fc1fd8cf6e5.png";
import { cn } from "./ui/utils";

type FooterVariant = "landing" | "app";

type FooterProps = {
  variant?: FooterVariant;
  className?: string;
};

export function Footer({ variant = "landing", className }: FooterProps) {
  return (
    <footer className={cn("bg-primary text-white/70 py-12 border-t border-white/10", className)}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Center Logo and Tagline */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <img src={lightLogo} alt="Rankio" className="h-12" />
          </div>
          <p className="text-base text-white/60 max-w-md mx-auto">
            AI-powered website intelligence for the modern web.
          </p>
        </div>

        {/* Important Links - Single Row */}
        <div className="flex justify-center items-center gap-8 mb-8 flex-wrap">
          {variant === "landing" ? (
            <>
              <a href="#features" className="text-sm hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#sample-report" className="text-sm hover:text-white transition-colors">
                Sample Report
              </a>
            </>
          ) : (
            <>
              <Link to="/#features" className="text-sm hover:text-white transition-colors">
                Features
              </Link>
              <Link to="/#how-it-works" className="text-sm hover:text-white transition-colors">
                How It Works
              </Link>
              <Link to="/#pricing" className="text-sm hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/#sample-report" className="text-sm hover:text-white transition-colors">
                Sample Report
              </Link>
            </>
          )}
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © 2026 Rankio. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-sm text-white/50 hover:text-white transition-colors">
              Terms of Use
            </Link>
            <Link to="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
