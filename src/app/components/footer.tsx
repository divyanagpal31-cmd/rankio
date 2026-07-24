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
    <footer className={cn("border-t border-white/10 bg-[#0b1027] py-12 text-white/70", className)}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-8 space-y-4 text-center">
          <div className="flex justify-center">
            <Link to="/" className="inline-flex">
              <img src={lightLogo} alt="Rankio" className="h-12" />
            </Link>
          </div>
          {/* <p className="mx-auto max-w-md text-base text-white/60">
            AI-powered website intelligence for the modern web.
          </p> */}
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-8">
          {variant === "landing" ? (
            <>
              <a href="#features" className="text-sm transition-colors hover:text-white">
                Industries
              </a>
              <a href="#how-it-works" className="text-sm transition-colors hover:text-white">
                How It Works
              </a>
              <a href="#pricing" className="text-sm transition-colors hover:text-white">
                Pricing
              </a>
              <a href="#sample-report" className="text-sm transition-colors hover:text-white">
                Sample Report
              </a>
            </>
          ) : (
            <>
              <Link to="/#features" className="text-sm transition-colors hover:text-white">
                Industries
              </Link>
              <Link to="/#how-it-works" className="text-sm transition-colors hover:text-white">
                How It Works
              </Link>
              <Link to="/#pricing" className="text-sm transition-colors hover:text-white">
                Pricing
              </Link>
              <Link to="/#sample-report" className="text-sm transition-colors hover:text-white">
                Sample Report
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-white/50">© 2026 Rankio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-sm text-white/50 transition-colors hover:text-white">
              Terms of Use
            </Link>
            <Link to="/privacy" className="text-sm text-white/50 transition-colors hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
