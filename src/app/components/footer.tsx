import type { MouseEvent } from "react";
import { Link } from "react-router";

import lightLogo from "../../assets/c96eb4a1a4dc0f6986adfdbb56831fc1fd8cf6e5.png";
import { cn } from "./ui/utils";

type FooterVariant = "landing" | "app";

type FooterProps = {
  variant?: FooterVariant;
  className?: string;
  onNavigate?: (target: string) => void;
};

export function Footer({ variant = "landing", className, onNavigate }: FooterProps) {
  const handleNavigate =
    (target: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (!onNavigate) return;
      event.preventDefault();
      onNavigate(target);
    };

  const productLinks =
    variant === "landing"
      ? [
          { label: "Platform", href: "#why-rankio-exists" },
          { label: "Solutions", href: "#features" },
          { label: "Sample Report", href: "#sample-report" },
          { label: "Pricing", href: "#pricing" },
        ]
      : [
          { label: "Platform", href: "/#features" },
          { label: "Industries", href: "/#features" },
          { label: "Sample Report", href: "/#sample-report" },
          { label: "Pricing", href: "/#pricing" },
        ];

  return (
    <footer className={cn("border-t border-white/10 bg-[#0b1027] text-white/70", className)}>
      <div className="container mx-auto max-w-7xl px-4 pb-16 pt-20 md:px-6 lg:pb-18 lg:pt-24">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-center gap-3" onClick={handleNavigate("/")}>
              <img src={lightLogo} alt="Rankio" className="h-12 w-auto" />
            </Link>
            <p className="mt-4 text-sm leading-7">
              Understand how AI-powered search engines and assistants interpret your website with industry-specific AI Visibility Reports.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Product</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {productLinks.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith("mailto:") ? (
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.label}
                    </a>
                  ) : variant === "landing" ? (
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.href} className="transition-colors hover:text-white" onClick={handleNavigate(item.href)}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Resources</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href="/#faq" className="transition-colors hover:text-white">
                  FAQs
                </a>
              </li>
              <li>
                <a href="mailto:support@rankio.ai" className="transition-colors hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/privacy" className="transition-colors hover:text-white" onClick={handleNavigate("/privacy")}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition-colors hover:text-white" onClick={handleNavigate("/terms")}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">Connect</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://x.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                  X (Twitter)
                </a>
              </li>
              <li>
                <a href="mailto:support@rankio.ai" className="transition-colors hover:text-white">
                  Email
                </a>
              </li>
              <li>
                <a href="mailto:support@rankio.ai" className="transition-colors hover:text-white">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="max-w-4xl text-sm leading-7">
            Rankio helps businesses understand how AI-powered search systems interpret their websites. We do not guarantee rankings, citations, or search placement. Recommendations are based on current best practices and publicly available web standards.
          </p>
          <p className="mt-4 text-sm font-medium">
            © 2026 Rankio.ai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
