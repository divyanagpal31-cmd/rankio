import {
  ArrowRight,
  FileText,
  Laptop,
  MapPin,
  ShoppingCart,
  Sparkles,
  Tags,
  MessageSquareText,
  PackageCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "../providers/auth-provider";
import { AuthModal } from "./auth-modal";
import { Button } from "./ui/button";
import industriesPattern from "../../assets/IndustriesWeCover-Pattern.png";

type IndustryHighlight = {
  icon: LucideIcon;
  label: string;
};

type Industry = {
  icon: LucideIcon;
  title: string;
  description: string;
  statLabel: string;
  statValue: string;
  highlights?: IndustryHighlight[];
};

export function Features() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();

  const industries: Industry[] = [
    {
      icon: Laptop,
      title: "SaaS Platforms",
      description: "Evaluate product messaging, documentation, feature pages, pricing, and technical content to improve how AI understands and explains your software.",
      highlights: [
        { icon: MessageSquareText, label: "Product Messaging" },
        { icon: FileText, label: "Documentation" },
        { icon: Sparkles, label: "Feature Pages" },
        { icon: Tags, label: "Pricing Structure" },
      ],
      statLabel: "Increase in qualified demo requests",
      statValue: "+35%",
    },
    {
      icon: Users,
      title: "Agencies",
      description: "Generate professional AI Visibility Reports for client websites with prioritized recommendations that strengthen your consulting and optimization services.",
      highlights: [
        { icon: MessageSquareText, label: "Client Reports" },
        { icon: FileText, label: "AI Visibility Score" },
        { icon: Sparkles, label: "Priority Recommendations" },
        { icon: Tags, label: "White-Label Ready (future feature)" },
      ],
      statLabel: "Client retention improvement",
      statValue: "+28%",
    },
    {
      icon: FileText,
      title: "Content & Media Websites",
      description: "Assess article structure, topical authority, FAQs, and content organization to improve how AI discovers, summarizes, and references your content.",
      highlights: [
        { icon: MessageSquareText, label: "Content Structure" },
        { icon: FileText, label: "Internal Linking" },
        { icon: Sparkles, label: "Topic Authority" },
        { icon: Tags, label: "AI Citation Visibility" },
      ],
      statLabel: "Boost in organic visibility",
      statValue: "+52%",
    },
    {
      icon: MapPin,
      title: "Local Businesses",
      description: "Review business information, local trust signals, structured data, and location-specific content that influence AI-powered local discovery.",
      highlights: [
        { icon: MessageSquareText, label: "Local Business Schema" },
        { icon: FileText, label: "Contact Information" },
        { icon: Sparkles, label: "Reviews" },
        { icon: Tags, label: "Business Profile Consistency" },
      ],
      statLabel: "Increase in local discovery",
      statValue: "+45%",
    },
  ];

  return (
    <section id="features" className="relative overflow-hidden bg-[#f2f2f5] py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.16] grayscale"
        style={{ backgroundImage: `url(${industriesPattern})` }}
      />
      <div className="absolute inset-0 bg-[rgba(242,242,245,0.86)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_38%)]" />

      <div className="relative container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-12 grid gap-8 xl:grid-cols-4 xl:items-center">
          <div className="max-w-2xl xl:col-span-2">
            <h2 className="mt-5 text-[28px] font-bold tracking-tight sm:text-[30px] md:text-[42px]">
              <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Built for
              </span>{" "}
              <span className="text-[#242840]">Your Industry</span>
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.6] text-[#6f7f95] sm:text-[18px]">
              Every industry has different AI visibility challenges. Rankio tailors its analysis, scoring, and recommendations based on your business type—so every report is relevant, actionable, and built around how AI understands your website.
            </p>
          </div>

          <article className="group relative rounded-[16px] border border-[#6c72e8] bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_14px_32px_rgba(89,95,201,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(89,95,201,0.24)] xl:col-span-2">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5259c7]">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold text-[#20263a]">AI Visibility for Online Stores</h3>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Impact
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[16px] leading-7 text-[#6f7f95]">
                  Analyze product pages, structured data, category hierarchy, reviews, and buying signals to understand how AI-powered search systems interpret and recommend your products.
                </p>
                <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Tags, label: "Product schema" },
                    { icon: PackageCheck, label: "Category structure" },
                    { icon: Sparkles, label: "Product content" },
                    { icon: MessageSquareText, label: "Customer reviews" },
                    { icon: ShoppingCart, label: "Shopping FAQs" },
                  ].map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex min-w-0 items-center gap-3 text-[13px] font-medium leading-5 text-[#4f5e77] sm:text-[14px]"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#5b63d8]">
                          <ItemIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                {/*<div className="mt-5 border-t border-[#d9ddf6] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#6f7f95]">
                      <span className="h-2 w-2 rounded-full bg-[#15c16a]" />
                      <span>Average growth in AI-optimized stores</span>
                    </div>
                    <span className="text-[18px] font-bold text-accent">+40%</span>
                  </div>
                </div>*/}
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <article
                key={industry.title}
                className="group min-h-[180px] rounded-[16px] border border-[#6c72e8] bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_14px_32px_rgba(89,95,201,0.14)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(89,95,201,0.2)] sm:min-h-[210px]"
              >
                <div className="flex flex-col items-start gap-3 sm:flex-row">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#6c72e8] bg-white text-[#5259c7]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] font-semibold text-[#20263a]">{industry.title}</h3>
                    <p className="mt-4 text-[16px] leading-7 text-[#6f7f95]">{industry.description}</p>
                    {industry.highlights && (
                      <ul className="mt-5 space-y-3">
                        {industry.highlights.map((item) => {
                          const ItemIcon = item.icon;

                          return (
                            <li
                              key={item.label}
                              className="flex min-w-0 items-center gap-3 text-[13px] font-medium leading-5 text-[#4f5e77] sm:text-[14px]"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#5b63d8]">
                                <ItemIcon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0">{item.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* <div className="mt-7 border-t border-[#d9ddf6] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#6f7f95]">
                      <span className="h-2 w-2 rounded-full bg-[#15c16a]" />
                      <span>{industry.statLabel}</span>
                    </div>
                    <span className="text-[18px] font-bold text-accent">{industry.statValue}</span>
                  </div>
                </div> */}
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              if (user) {
                window.location.href = "/pricing";
                return;
              }

              setAuthModalOpen(true);
            }}
          >
            Analyze Your Industry
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </section>
  );
}
