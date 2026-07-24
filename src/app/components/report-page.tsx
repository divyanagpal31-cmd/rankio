import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDot,
  Database,
  Eye,
  FileText,
  Gauge,
  Globe,
  LayoutDashboard,
  Layers3,
  Lock,
  LogOut,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import darkLogo from "../../assets/ec37bb065d49c41d8d194954cdc4226b5e7e1837.png";
import { supabase } from "../../lib/supabase";
import { AuthModal } from "./auth-modal";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Footer } from "./footer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "../providers/auth-provider";
import { useReports, useSubscription } from "../services/data-hooks";
import { cancelScan, runScan } from "../services/scan-service";
import { ScanningModal } from "./scanning-modal";

type ReportRow = {
  parameter: string;
  status: "success" | "warning" | "error";
  severity: string;
  suggestion: string;
  bucket: string;
  description?: string;
  evidence?: Record<string, any> | null;
  pageUrl?: string | null;
  signalKey?: string | null;
};

type ScoreCard = {
  label: string;
  score: number;
  description: string;
  tone: "violet" | "blue" | "emerald" | "rose";
  icon: LucideIcon;
};

type AuditTile = {
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "amber" | "rose" | "sky" | "emerald" | "slate";
};

type AuditSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  score: number;
  scoreLabel: string;
  tiles: AuditTile[];
  footer?: string;
  wide?: boolean;
};

type RoadmapBucket = {
  title: string;
  phase: string;
  summary: string;
  icon: LucideIcon;
  items: string[];
  tone: "violet" | "sky" | "amber" | "emerald";
};

type EvidenceIssue = ReportRow & {
  title: string;
  priority: string;
  impact: string;
  effort: string;
  fix: string;
  evidenceSummary: string;
  affectedPage: string;
  icon: LucideIcon;
  rank: number;
};

type VerticalKey = "ecommerce" | "saas" | "local" | "content" | "other";

type VerticalProfile = {
  key: VerticalKey;
  label: string;
  audience: string;
  summaryTitle: string;
  summaryLead: string;
  summaryBody: string;
  categoryCopy: {
    seo: string;
    ai: string;
    ux: string;
    tech: string;
  };
  contentFocus: string;
  structuredFocus: string;
  semanticFocus: string;
  uxFocus: string;
  techFocus: string;
  roadmapTitle: string;
  roadmapLead: string;
  roadmapSummary: string;
  projectedLabel: string;
};

const fallbackReportSummary =
  "This report identifies the highest-impact improvements across AI search visibility, structured data, content clarity, and technical readiness.";

function clampScore(value: number | null | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatMs(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function formatCls(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function hostFromUrl(value?: string | null) {
  const fallback = String(value ?? "").trim();
  if (!fallback) return "site";

  try {
    return new URL(fallback).host.replace(/^www\./i, "");
  } catch {
    return fallback.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
  }
}

function detectVerticalFromReport(host: string, url: string, raw: any, rows: ReportRow[]): VerticalKey {
  const rawValue = `${host} ${url} ${String(raw?.rankio?.vertical ?? "")}`.toLowerCase();
  const rowText = rows.map((row) => `${row.parameter} ${row.suggestion}`).join(" ").toLowerCase();
  const value = `${rawValue} ${rowText}`;

  if (/(shop|store|cart|checkout|product|products|category|collection|commerce|e-?commerce|sku|merchant)/.test(value)) {
    return "ecommerce";
  }
  if (/(local|location|locations|service-area|services|near me|near-me|map|branch|office|contact us|hours|reviews?)/.test(value)) {
    return "local";
  }
  if (/(saas|software|app|platform|dashboard|pricing|demo|features|docs|api|sign up|signup|login|trial)/.test(value)) {
    return "saas";
  }
  if (/(blog|news|article|articles|magazine|editorial|content|stories|learn|resources|library|guides?)/.test(value)) {
    return "content";
  }

  return "other";
}

function getVerticalProfile(vertical: VerticalKey): VerticalProfile {
  switch (vertical) {
    case "ecommerce":
      return {
        key: vertical,
        label: "E-Commerce",
        audience: "E-Commerce Teams",
        summaryTitle: "AI Readiness Executive Overview",
        summaryLead:
          "Your store’s product pages, category structure, and offer markup determine how well AI assistants can recommend your products.",
        summaryBody:
          "This report highlights the signals that influence shopping intent, product discovery, and answer engine citations for retail and catalog sites.",
        categoryCopy: {
          seo: "Product discovery, category crawlability, and merchandising metadata.",
          ai: "Product entities, offer clarity, and shopping-intent answerability.",
          ux: "Navigation, filters, and purchase-path clarity.",
          tech: "Catalog speed, rendering stability, and checkout resilience.",
        },
        contentFocus: "Product Entity Mapping",
        structuredFocus: "Product, Offer, and Review schema coverage",
        semanticFocus: "Variant, brand, and collection relationships",
        uxFocus: "Product browseability and conversion clarity",
        techFocus: "Catalog performance and bot render efficiency",
        roadmapTitle: "Strategic Commerce AI Roadmap",
        roadmapLead: "Retail-specific fixes that improve visibility, citation rate, and conversion confidence.",
        roadmapSummary:
          "Prioritize product schema, category architecture, and page speed so AI systems can trust and recommend your catalog with less ambiguity.",
        projectedLabel: "Projected Commerce Score",
      };
    case "saas":
      return {
        key: vertical,
        label: "SaaS",
        audience: "SaaS Teams",
        summaryTitle: "AI Readiness Executive Overview",
        summaryLead:
          "Your product pages, docs, and feature explanations determine how well AI systems understand your offer and recommend it in tool comparisons.",
        summaryBody:
          "This report emphasizes pricing pages, docs, feature clarity, and trust signals that matter for software evaluation and acquisition intent.",
        categoryCopy: {
          seo: "Feature pages, docs crawlability, and pricing discoverability.",
          ai: "Feature entities, use cases, and comparison readiness.",
          ux: "Demo funnels, navigation, and value-prop clarity.",
          tech: "App shell performance and documentation delivery.",
        },
        contentFocus: "Feature and use-case mapping",
        structuredFocus: "Product, software, and FAQ schema coverage",
        semanticFocus: "Feature, workflow, and use-case relationships",
        uxFocus: "Trial and demo journey clarity",
        techFocus: "App speed, docs delivery, and crawl efficiency",
        roadmapTitle: "Strategic SaaS AI Roadmap",
        roadmapLead: "Fix the pages that influence demo interest, trust, and AI-driven shortlist inclusion.",
        roadmapSummary:
          "Strengthen product messaging, documentation structure, and structured data so AI agents can explain what your software does and who it is for.",
        projectedLabel: "Projected SaaS Score",
      };
    case "local":
      return {
        key: vertical,
        label: "Local Business",
        audience: "Local Growth Teams",
        summaryTitle: "AI Readiness Executive Overview",
        summaryLead:
          "Your location pages, service coverage, and trust signals determine how well AI systems surface you for nearby and service-intent queries.",
        summaryBody:
          "This report focuses on location clarity, NAP consistency, review signals, and local schema that influence map results and answer engine recommendations.",
        categoryCopy: {
          seo: "Location pages, service-area indexing, and local trust signals.",
          ai: "Business entities, services, and nearby search intent.",
          ux: "Contact clarity, phone actions, and mobile usability.",
          tech: "Mobile speed, map delivery, and page stability.",
        },
        contentFocus: "Service and location mapping",
        structuredFocus: "LocalBusiness, Service, and FAQ schema coverage",
        semanticFocus: "Location, service, and brand trust relationships",
        uxFocus: "Contact and direction clarity",
        techFocus: "Mobile speed and local page delivery",
        roadmapTitle: "Strategic Local AI Roadmap",
        roadmapLead: "Tune the signals that help AI systems recommend your business in local searches and map-driven queries.",
        roadmapSummary:
          "Improve NAP consistency, service pages, and structured data so nearby customers and answer engines can trust your business details.",
        projectedLabel: "Projected Local Score",
      };
    case "content":
      return {
        key: vertical,
        label: "Content / Media",
        audience: "Content Teams",
        summaryTitle: "AI Readiness Executive Overview",
        summaryLead:
          "Your article structure, entity depth, and internal linking determine how easily AI systems can quote and summarize your work.",
        summaryBody:
          "This report emphasizes editorial clarity, topic authority, and citation readiness for blogs, publications, and resource libraries.",
        categoryCopy: {
          seo: "Topic hubs, article crawlability, and editorial discoverability.",
          ai: "Topic entities, answer depth, and citation readiness.",
          ux: "Readability, structure, and article navigation.",
          tech: "Media delivery, page speed, and archive performance.",
        },
        contentFocus: "Topic and article mapping",
        structuredFocus: "Article, FAQ, and author schema coverage",
        semanticFocus: "Topic clusters and entity depth",
        uxFocus: "Readability and hierarchy",
        techFocus: "Archive speed and media delivery",
        roadmapTitle: "Strategic Content AI Roadmap",
        roadmapLead: "Turn editorial assets into a clearer, more quotable knowledge base for AI search.",
        roadmapSummary:
          "Sharpen topic clusters, author trust, and article structure so your content becomes a stronger source for answers and summaries.",
        projectedLabel: "Projected Content Score",
      };
    default:
      return {
        key: vertical,
        label: "Website",
        audience: "Executive Board",
        summaryTitle: "AI Readiness Executive Overview",
        summaryLead:
          "Your site’s structure, content clarity, and technical delivery determine how well AI systems can understand and recommend it.",
        summaryBody:
          "This report highlights the most important improvements across discovery, interpretability, and technical reliability.",
        categoryCopy: {
          seo: "Search crawlability, indexability, and metadata consistency.",
          ai: "LLM retrieval signals, citation readiness, and answerability.",
          ux: "Information hierarchy, accessibility, and conversion clarity.",
          tech: "Speed, stability, and bot-friendly delivery quality.",
        },
        contentFocus: "Content and entity clarity",
        structuredFocus: "Schema and metadata coverage",
        semanticFocus: "Concept and entity relationships",
        uxFocus: "Hierarchy and accessibility",
        techFocus: "Speed and delivery quality",
        roadmapTitle: "Strategic AI Readiness Roadmap",
        roadmapLead: "Focused improvements that move the site toward stronger AI visibility and answerability.",
        roadmapSummary:
          "Prioritize the issues that most directly influence how AI systems crawl, interpret, and cite your pages.",
        projectedLabel: "Projected Score",
      };
  }
}

function displayUrl(value?: string | null) {
  const fallback = String(value ?? "").trim();
  if (!fallback) return "https://example.com";
  try {
    const url = new URL(fallback);
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return fallback.startsWith("http") ? fallback : `https://${fallback}`;
  }
}

function maturityLabel(score: number) {
  if (score >= 86) return "AI-Leading";
  if (score >= 71) return "Optimized";
  if (score >= 56) return "Developing";
  return "Beginner";
}

function maturityPosition(score: number) {
  return `${Math.max(8, Math.min(92, score))}%`;
}

function scoreToneClasses(tone: ScoreCard["tone"]) {
  switch (tone) {
    case "violet":
      return {
        ring: "from-[#c7b6ff] via-[#a593ff] to-[#7e73ff]",
        text: "text-[#d8ccff]",
        border: "border-accent/30",
      };
    case "blue":
      return {
        ring: "from-[#92d3ff] via-[#6ebdff] to-[#4e92ff]",
        text: "text-[#b9e3ff]",
        border: "border-[#5ca8ff]/30",
      };
    case "emerald":
      return {
        ring: "from-[#b2f0d0] via-[#79d8aa] to-[#40b87a]",
        text: "text-[#b8f4d0]",
        border: "border-[#67cf99]/30",
      };
    case "rose":
      return {
        ring: "from-[#ffd3d6] via-[#ffb5c1] to-[#ff8ea2]",
        text: "text-[#ffd0d9]",
        border: "border-[#ff8ea2]/30",
      };
  }
}

function severityTone(severity: string) {
  if (severity === "Critical") return "border-[#ff8ea2]/35 bg-[#301a2a] text-[#ffb5c7]";
  if (severity === "High") return "border-[#ffb47b]/35 bg-[#2d2418] text-[#ffd5ad]";
  if (severity === "Medium") return "border-[#f1cf7f]/30 bg-[#2c2518] text-[#f7e0aa]";
  return "border-[#7ad7b4]/30 bg-[#17251f] text-[#b7f0d8]";
}

function bucketForTitle(title: string) {
  const value = title.toLowerCase();
  if (/(schema|structured|markup|canonical|robots|sitemap|metadata|meta)/.test(value)) return "structured-data";
  if (/(entity|semantic|context|tone|readability|content|faq|heading)/.test(value)) return "content-intelligence";
  if (/(ux|accessibility|mobile|responsive|contrast|keyboard|ui)/.test(value)) return "ux-accessibility";
  if (/(performance|speed|lcp|inp|cls|core web vitals|load|latency|render)/.test(value)) return "technical-performance";
  if (/(seo|crawl|index|search|visibility|backlink|authority|ranking)/.test(value)) return "seo-foundation";
  if (/(citation|retrieval|answer|llm|ai|bot|generative)/.test(value)) return "ai-search-visibility";
  return "ai-impact";
}

function getStatusIcon(status: string) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-rose-400" />;
  return <Lock className="h-4 w-4 text-white/35" />;
}

function getCruxMetrics(raw: any) {
  const exp = raw?.loadingExperience ?? null;
  const origin = raw?.originLoadingExperience ?? null;

  const read = (source: any, key: string) => {
    const metric = source?.metrics?.[key] ?? null;
    const percentile = typeof metric?.percentile === "number" ? metric.percentile : null;
    const category = typeof metric?.category === "string" ? metric.category : null;
    return { percentile, category };
  };

  const lcp = read(exp, "LARGEST_CONTENTFUL_PAINT_MS");
  const cls = read(exp, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const inpCandidate = read(exp, "INTERACTION_TO_NEXT_PAINT_MS");
  const inp = inpCandidate.percentile != null || inpCandidate.category != null ? inpCandidate : read(exp, "FIRST_INPUT_DELAY_MS");

  const oLcp = read(origin, "LARGEST_CONTENTFUL_PAINT_MS");
  const oCls = read(origin, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const oInpCandidate = read(origin, "INTERACTION_TO_NEXT_PAINT_MS");
  const oInp =
    oInpCandidate.percentile != null || oInpCandidate.category != null ? oInpCandidate : read(origin, "FIRST_INPUT_DELAY_MS");

  const field = typeof exp?.overall_category === "string" ? exp.overall_category : null;
  const originField = typeof origin?.overall_category === "string" ? origin.overall_category : null;

  return {
    hasField: Boolean(exp?.metrics),
    hasOrigin: Boolean(origin?.metrics),
    field,
    originField,
    lcp,
    inp,
    cls,
    oLcp,
    oInp,
    oCls,
  };
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatCount(value?: number | null, label = "items") {
  if (typeof value !== "number" || !Number.isFinite(value)) return `0 ${label}`;
  return `${Math.max(0, Math.round(value))} ${label}`;
}

function formatFraction(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.max(0, Math.min(1, value));
  return `${Math.round(rounded * 100)}%`;
}

function rankSeverity(severity: string) {
  if (severity === "Critical") return 0;
  if (severity === "High") return 1;
  if (severity === "Medium") return 2;
  if (severity === "Low") return 3;
  return 4;
}

function reportSeverityFromFinding(severity?: string | null) {
  const value = String(severity ?? "").toLowerCase();
  if (value === "critical" || value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Good";
}

function formatAffectedPage(value?: string | null) {
  const fallback = String(value ?? "").trim();
  if (!fallback) return "Site-wide";
  try {
    const url = new URL(fallback);
    const path = `${url.pathname}${url.search}`.replace(/\/$/, "") || "/";
    return `${url.hostname.replace(/^www\./i, "")}${path}`;
  } catch {
    return fallback.replace(/^https?:\/\//i, "").replace(/^www\./i, "") || "Site-wide";
  }
}

function humanizeSignal(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Audit signal";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeEvidence(evidence?: Record<string, any> | null) {
  if (!evidence || typeof evidence !== "object") return "Evidence captured from the scan output and crawler sample.";

  if (Array.isArray(evidence.brokenLinks) && evidence.brokenLinks.length > 0) {
    const firstBrokenLink = evidence.brokenLinks[0];
    const target = firstBrokenLink?.url ? formatAffectedPage(String(firstBrokenLink.url)) : "a sampled internal URL";
    return `${evidence.brokenLinkCount ?? evidence.brokenLinks.length} broken link(s) detected, including ${target}.`;
  }

  if ("pagesWithMeta" in evidence && "totalPages" in evidence) {
    return `${evidence.pagesWithMeta}/${evidence.totalPages} sampled page(s) include meta descriptions.`;
  }

  if ("pagesWithOneH1" in evidence && "totalPages" in evidence) {
    return `${evidence.pagesWithOneH1}/${evidence.totalPages} sampled page(s) have exactly one clear H1.`;
  }

  if ("totalSchema" in evidence) {
    return `${Number(evidence.totalSchema ?? 0)} schema item(s) detected across the sampled pages.`;
  }

  if ("confidence" in evidence) {
    return `Entity confidence is ${clampScore(Number(evidence.confidence ?? 0), 0)}/100 based on detected brand/profile signals.`;
  }

  if ("accessibilityScore" in evidence) {
    return `Lighthouse accessibility score is ${clampScore(Number(evidence.accessibilityScore ?? 0), 0)}/100.`;
  }

  if ("avgPageScore" in evidence || "totalWordCount" in evidence) {
    return `Average page score is ${clampScore(Number(evidence.avgPageScore ?? 0), 0)}/100 with ${formatCount(Number(evidence.totalWordCount ?? 0), "words")} sampled.`;
  }

  const firstEntry = Object.entries(evidence).find(([, value]) => value !== null && value !== undefined && value !== "");
  if (!firstEntry) return "Evidence captured from the scan output and crawler sample.";

  const [key, value] = firstEntry;
  const displayValue = Array.isArray(value) ? `${value.length} item(s)` : String(value);
  return `${humanizeSignal(key)}: ${displayValue}`;
}

function issueImpact(severity: string, bucket: string) {
  if (severity === "Critical" || severity === "High") {
    return bucket === "technical-performance"
      ? "Can block crawl reliability, rendering quality, and user trust."
      : "Likely suppresses AI confidence, citation readiness, or conversion clarity.";
  }

  if (severity === "Medium") {
    return "Creates avoidable ambiguity for AI systems and search crawlers.";
  }

  return "Useful refinement that compounds once the higher-priority gaps are fixed.";
}

function issueEffort(severity: string, bucket: string) {
  if (bucket === "structured-data") return severity === "High" ? "Medium" : "Low";
  if (bucket === "content-intelligence") return severity === "High" ? "Medium" : "Low";
  if (bucket === "technical-performance") return severity === "High" ? "High" : "Medium";
  return severity === "Low" ? "Low" : "Medium";
}

function iconForBucket(bucket: string) {
  return bucket === "structured-data"
    ? Database
    : bucket === "content-intelligence"
      ? FileText
      : bucket === "ux-accessibility"
        ? Eye
        : bucket === "technical-performance"
          ? Gauge
          : bucket === "seo-foundation"
            ? Target
            : Sparkles;
}

function buildRows(
  activeReport: any,
  fallbackInsights: Array<{
    title: string;
    severity: string;
    description: string;
    recommendation: string;
    category?: string;
    evidence?: Record<string, any> | null;
    pageUrl?: string | null;
    signalKey?: string | null;
  }>
): ReportRow[] {
  const items = ((activeReport?.recommendations ?? fallbackInsights) as any[]) ?? [];

  return items
    .map((item) => {
      const parameter = String(item?.title ?? item?.parameter ?? "").trim();
      if (!parameter) return null;

      const rawSeverity = String(item?.severity ?? "").trim();
      const severity = rawSeverity === "Info" || rawSeverity === "Good" || rawSeverity === "" ? "Low" : rawSeverity;
      const suggestion = String(item?.recommendation ?? item?.suggestion ?? "").trim() || parameter;
      const status = severity === "Critical" || severity === "High" ? "error" : severity === "Medium" ? "warning" : "success";
      const category = String(item?.category ?? "").trim();

      return {
        parameter,
        status,
        severity,
        suggestion,
        description: String(item?.description ?? "").trim(),
        evidence: item?.evidence && typeof item.evidence === "object" ? item.evidence : null,
        pageUrl: item?.pageUrl ?? item?.page_url ?? null,
        signalKey: item?.signalKey ?? item?.signal_key ?? null,
        bucket: category ? bucketForTitle(`${category} ${parameter}`) : bucketForTitle(parameter),
      };
    })
    .filter(Boolean) as ReportRow[];
}

function circleStroke(score: number) {
  return `${2 * Math.PI * 88 * (score / 100)} ${2 * Math.PI * 88}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const REPORT_CACHE_HOURS = 24;
const REPORT_CACHE_MS = REPORT_CACHE_HOURS * 60 * 60 * 1000;

function getReportUnlockStorageKey(userId: string, reportId: string) {
  return `rankio.reportUnlock.${userId}.${reportId}`;
}

function getReportCacheStorageKey(reportId: string) {
  return `rankio.report.${reportId}`;
}

function readReportCache(reportId: string) {
  if (typeof window === "undefined") return null;

  const key = getReportCacheStorageKey(reportId);
  const sources = [window.sessionStorage, window.localStorage];
  for (const storage of sources) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // ignore cache failures
    }
  }

  return null;
}

function writeReportCache(reportId: string, value: unknown) {
  if (typeof window === "undefined") return;

  const key = getReportCacheStorageKey(reportId);
  const payload = JSON.stringify(value);
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.setItem(key, payload);
    } catch {
      // ignore cache failures
    }
  }
}

function normalizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

function escapePdfText(value: unknown) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfFileName(value: string) {
  const safeName = normalizePdfText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return `${safeName || "rankio-report"}.pdf`;
}

class SimplePdfBuilder {
  private readonly pageWidth = 595;
  private readonly pageHeight = 842;
  private readonly margin = 48;
  private readonly contentWidth = this.pageWidth - this.margin * 2;
  private readonly pages: string[][] = [[]];
  private cursorY = this.pageHeight - this.margin;

  private get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private addCommand(command: string) {
    this.currentPage.push(command);
  }

  private ensureSpace(height: number) {
    if (this.cursorY - height < this.margin) {
      this.addPage();
    }
  }

  private addPage() {
    this.pages.push([]);
    this.cursorY = this.pageHeight - this.margin;
  }

  private wrapText(text: string, fontSize: number, maxWidth = this.contentWidth) {
    const words = normalizePdfText(text).split(" ").filter(Boolean);
    const lines: string[] = [];
    let currentLine = "";
    const averageCharWidth = fontSize * 0.52;
    const maxChars = Math.max(24, Math.floor(maxWidth / averageCharWidth));

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
  }

  addSpacer(height = 12) {
    this.ensureSpace(height);
    this.cursorY -= height;
  }

  addText(text: string, options: { fontSize?: number; bold?: boolean; indent?: number; lineGap?: number; maxWidth?: number } = {}) {
    const fontSize = options.fontSize ?? 10;
    const indent = options.indent ?? 0;
    const lineGap = options.lineGap ?? 4;
    const maxWidth = options.maxWidth ?? this.contentWidth - indent;
    const lines = this.wrapText(text, fontSize, maxWidth);
    const lineHeight = fontSize + lineGap;

    this.ensureSpace(lines.length * lineHeight + 2);

    for (const line of lines) {
      this.addCommand(`BT /${options.bold ? "F2" : "F1"} ${fontSize} Tf ${this.margin + indent} ${this.cursorY} Td (${escapePdfText(line)}) Tj ET`);
      this.cursorY -= lineHeight;
    }
  }

  addHeading(text: string, level: 1 | 2 | 3 = 2) {
    const fontSize = level === 1 ? 24 : level === 2 ? 16 : 12;
    this.addSpacer(level === 1 ? 4 : 10);
    this.addText(text, { fontSize, bold: true, lineGap: level === 1 ? 7 : 5 });
    this.addSpacer(level === 1 ? 10 : 5);
  }

  addKeyValue(label: string, value: string) {
    this.addText(`${label}: ${value}`, { fontSize: 10, bold: true, lineGap: 4 });
  }

  addBullet(text: string) {
    this.addText(`- ${text}`, { fontSize: 10, indent: 12, lineGap: 4 });
  }

  build() {
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesObjectIndex = objects.length;
    objects.push("");
    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageIds: number[] = [];

    for (const pageCommands of this.pages) {
      const content = pageCommands.join("\n");
      const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const pageId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    }

    objects[pagesObjectIndex] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    const chunks = ["%PDF-1.4\n"];
    const offsets = [0];
    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(chunks.join("").length);
      chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
    }

    const xrefOffset = chunks.join("").length;
    chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
    for (let index = 1; index < offsets.length; index += 1) {
      chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks, { type: "application/pdf" });
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildReportPdfBlob({
  title,
  website,
  reportType,
  generatedAt,
  score,
  maturity,
  summary,
  categoryScores,
  topIssues,
  auditSections,
  implementationIssues,
  roadmapBuckets,
}: {
  title: string;
  website: string;
  reportType: string;
  generatedAt: string;
  score: number;
  maturity: string;
  summary: string;
  categoryScores: ScoreCard[];
  topIssues: EvidenceIssue[];
  auditSections: AuditSection[];
  implementationIssues: EvidenceIssue[];
  roadmapBuckets: RoadmapBucket[];
}) {
  const pdf = new SimplePdfBuilder();

  pdf.addHeading("Rankio AI Visibility Report", 1);
  pdf.addText(title, { fontSize: 16, bold: true, lineGap: 6 });
  pdf.addSpacer(8);
  pdf.addKeyValue("Website", website);
  pdf.addKeyValue("Report Type", reportType);
  pdf.addKeyValue("Generated", generatedAt);
  pdf.addKeyValue("AI Score", `${score}/100 - ${maturity}`);
  pdf.addSpacer(10);
  pdf.addText(summary, { fontSize: 11, lineGap: 5 });

  pdf.addHeading("Score Summary", 2);
  categoryScores.forEach((card) => {
    pdf.addKeyValue(card.label, `${card.score}/100`);
    pdf.addText(card.description, { fontSize: 9, indent: 12 });
  });

  pdf.addHeading("Top Critical Issues", 2);
  topIssues.forEach((issue) => {
    pdf.addText(`${issue.rank}. ${issue.title}`, { fontSize: 12, bold: true });
    pdf.addBullet(`Priority: ${issue.priority} | Effort: ${issue.effort}`);
    pdf.addBullet(`Affected page: ${issue.affectedPage}`);
    pdf.addBullet(`Evidence: ${issue.evidenceSummary}`);
    pdf.addBullet(`Fix: ${issue.fix}`);
    pdf.addSpacer(5);
  });

  pdf.addHeading("Detailed AI Audit", 2);
  auditSections.forEach((section) => {
    pdf.addHeading(`${section.title} - ${section.score}/100`, 3);
    pdf.addText(section.description, { fontSize: 10 });
    section.tiles.forEach((tile) => {
      pdf.addBullet(`${tile.label}: ${tile.value}. ${tile.detail}`);
    });
  });

  pdf.addHeading("Evidence & Implementation Plan", 2);
  implementationIssues.forEach((issue) => {
    pdf.addHeading(`${issue.rank}. ${issue.title}`, 3);
    pdf.addBullet(`Signal: ${humanizeSignal(issue.signalKey)}`);
    pdf.addBullet(`Impact: ${issue.impact}`);
    pdf.addBullet(`Evidence: ${issue.evidenceSummary}`);
    pdf.addBullet(`Affected page: ${issue.affectedPage}`);
    pdf.addBullet(`Recommended fix: ${issue.fix}`);
  });

  pdf.addHeading("Roadmap", 2);
  roadmapBuckets.forEach((bucket) => {
    pdf.addHeading(`${bucket.title} (${bucket.phase})`, 3);
    pdf.addText(bucket.summary, { fontSize: 10 });
    bucket.items.forEach((item) => pdf.addBullet(item));
  });

  return pdf.build();
}

function SectionCard({
  section,
  index,
  isGuest,
}: {
  section: AuditSection;
  index: number;
  isGuest: boolean;
}) {
  const hiddenForGuest = isGuest && index >= 3;
  const visibleTiles = hiddenForGuest ? section.tiles.slice(0, 2) : section.tiles;
  const isWide = section.wide ?? false;

  return (
    <article
      id={section.id}
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,50,0.92)_0%,rgba(16,22,43,0.94)_100%)] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.18)] md:p-7 ${
        hiddenForGuest ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.28em] text-white/35">
            <CircleDot className="h-3.5 w-3.5 text-[#8e86ff]" />
            <span>{section.eyebrow}</span>
          </div>
          <h3 className="mt-3 text-[24px] font-semibold tracking-tight text-white md:text-[30px]">{section.title}</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/60 md:text-[16px]">{section.description}</p>
        </div>

        <div className="flex items-center gap-4 self-start rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
          <div className="relative h-20 w-20">
            <svg className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r="31" stroke="rgba(255,255,255,0.1)" strokeWidth="7" fill="none" />
              <circle
                cx="40"
                cy="40"
                r="31"
                stroke="url(#audit-gradient)"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circleStroke(section.score)}
              />
              <defs>
                <linearGradient id="audit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d7cbff" />
                  <stop offset="100%" stopColor="#8e86ff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[20px] font-semibold text-white">{section.score}</span>
            </div>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-[0.25em] text-white/40">Score</p>
            <p className="mt-1 text-[18px] font-semibold text-white">{section.scoreLabel}</p>
          </div>
        </div>
      </div>

      <div className={`mt-6 grid gap-3 ${isWide ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
        {visibleTiles.map((tile) => {
          const toneClasses =
            tile.tone === "violet"
              ? "border-[#7d73ff]/25 bg-[#1e2239] text-[#d7ccff]"
              : tile.tone === "sky"
                ? "border-[#78d1ff]/20 bg-[#172634] text-[#c7efff]"
                : tile.tone === "amber"
                  ? "border-[#f7cd7b]/20 bg-[#2a2418] text-[#f8e2ad]"
                  : tile.tone === "emerald"
                    ? "border-[#75dfb2]/20 bg-[#16231d] text-[#bbf4d8]"
                    : tile.tone === "rose"
                      ? "border-[#ff8ea2]/20 bg-[#2a1820] text-[#ffd1da]"
                      : "border-white/10 bg-white/5 text-white";

          return (
            <div key={tile.label} className={`rounded-[18px] border p-4 ${toneClasses}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/50">{tile.label}</p>
                  <p className="mt-3 text-[20px] font-semibold text-white">{tile.value}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    tile.tone === "violet"
                      ? "bg-[#7d73ff]/15 text-[#dcd4ff]"
                      : tile.tone === "sky"
                        ? "bg-[#78d1ff]/15 text-[#d5f2ff]"
                        : tile.tone === "amber"
                          ? "bg-[#f7cd7b]/15 text-[#f7e6b7]"
                          : tile.tone === "emerald"
                            ? "bg-[#75dfb2]/15 text-[#cefae2]"
                            : tile.tone === "rose"
                              ? "bg-[#ff8ea2]/15 text-[#ffd1da]"
                              : "bg-white/10 text-white/70"
                  }`}
                >
                  {tile.tone.toUpperCase()}
                </span>
              </div>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-white/62">{tile.detail}</p>
            </div>
          );
        })}
      </div>

      {section.footer && (
        <div className="mt-5 border-t border-white/10 pt-4 text-center text-[13px] text-white/45">{section.footer}</div>
      )}

      {hiddenForGuest && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#0f1529] via-[#0f1529]/95 to-transparent px-4 pb-5 pt-16">
          <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[13px] text-white/70 backdrop-blur">
            Preview mode: log in to view the full AI audit.
          </div>
        </div>
      )}
    </article>
  );
}

function RoadmapCard({
  bucket,
  isGuest,
}: {
  bucket: RoadmapBucket;
  isGuest: boolean;
}) {
  const toneClasses =
    bucket.tone === "violet"
      ? "border-accent/25 bg-accent/10 text-white"
      : bucket.tone === "sky"
        ? "border-accent/20 bg-accent/10 text-white"
        : bucket.tone === "amber"
          ? "border-[#f5cb7b]/20 bg-[#302518] text-[#f7e4b4]"
          : "border-[#75dfb2]/20 bg-[#16261c] text-[#d5f6e3]";

  return (
    <div className={`w-full rounded-[18px] border p-5 shadow-[0_18px_44px_rgba(0,0,0,0.12)] ${toneClasses}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <bucket.icon className="h-5 w-5 text-white/90" />
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-white/40">{bucket.phase}</p>
          <h4 className="mt-1 text-[18px] font-semibold text-white">{bucket.title}</h4>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-7 text-white/65">{bucket.summary}</p>
      <ul className="mt-4 space-y-2 text-[14px] leading-6 text-white/80">
        {bucket.items.slice(0, isGuest ? 2 : bucket.items.length).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/75" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportPage() {
  const { reports, loading: reportsLoading } = useReports();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { user, session, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanMessage, setRescanMessage] = useState<string | null>(null);
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [scanTargetUrl, setScanTargetUrl] = useState("");
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);

  const scrollToReportSection = useCallback((sectionId: string, updateHash = true) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const stickyHeader = document.querySelector("[data-report-sticky-header]");
    const stickyHeaderHeight = stickyHeader?.getBoundingClientRect().height ?? 0;
    const targetTop = section.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight - 24;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });

    if (updateHash) {
      window.history.replaceState(null, "", `#${sectionId}`);
    }
  }, []);
  const upgradePromptKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("reportId");
  const [reportById, setReportById] = useState<any | null | undefined>(undefined);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("executive-summary");
  const reportFromState = (location.state as any)?.report as any | undefined;
  const backTo = (location.state as any)?.from as string | undefined;
  const backToDefault = user ? "/dashboard" : "/";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!reportId) {
        setReportById(undefined);
        setReportError(null);
        setLoadingReport(false);
        return;
      }

      const localReport =
        reportFromState && String(reportFromState?.id ?? "") === reportId ? reportFromState : readReportCache(reportId);
      const safeLocalReport = !user && localReport && String(localReport?.id ?? "") === reportId ? localReport : null;

      if (safeLocalReport) {
        setReportById(safeLocalReport);
        setReportError(null);
        writeReportCache(reportId, safeLocalReport);
        setLoadingReport(false);
      } else {
        setReportById(undefined);
        setLoadingReport(true);
      }

      setReportError(null);

      let reportQuery = supabase
        .from("reports")
        .select(user ? "*, websites!inner(user_id)" : "*")
        .eq("id", reportId);

      if (user) {
        reportQuery = reportQuery.eq("websites.user_id", user.id);
      }

      const { data, error } = await reportQuery.maybeSingle();

      if (cancelled) return;

      if (error) {
        setReportById(null);
        setReportError(error.message);
      } else {
        const resolvedReport = data ? (({ websites: _websites, ...report }) => report)(data as any) : (safeLocalReport ? safeLocalReport : null);
        setReportById(resolvedReport);
        if (resolvedReport) {
          writeReportCache(reportId, resolvedReport);
        } else if (user) {
          setReportError("You do not have access to this report.");
        }
      }

      setLoadingReport(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reportId, reportFromState, user]);

  useEffect(() => {
    const sectionIds = ["executive-summary", "ai-audit", "implementation-plan", "roadmap"];
    const sectionElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    let animationFrame = 0;

    const updateActiveSection = () => {
      const stickyHeader = document.querySelector("[data-report-sticky-header]");
      const stickyHeaderHeight = stickyHeader?.getBoundingClientRect().height ?? 0;
      const activationLine = stickyHeaderHeight + 80;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      const sectionMetrics = sectionElements.map((section) => {
        const rect = section.getBoundingClientRect();
        return {
          id: section.id,
          top: rect.top,
          bottom: rect.bottom,
          distance: Math.abs(rect.top - activationLine),
        };
      });

      const activeByLine = sectionMetrics
        .filter((section) => section.top <= activationLine && section.bottom > activationLine)
        .sort((left, right) => right.top - left.top)[0];

      const activeByNearestTop = sectionMetrics
        .filter((section) => section.top < viewportHeight * 0.65)
        .sort((left, right) => left.distance - right.distance)[0];

      const nextActiveSection = activeByLine?.id ?? activeByNearestTop?.id ?? sectionElements[0]?.id;
      if (nextActiveSection) {
        setActiveSection((current) => (current === nextActiveSection ? current : nextActiveSection));
      }
    };

    const scheduleActiveSectionUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateActiveSection();
      });
    };

    const hash = window.location.hash.replace("#", "");
    if (hash && sectionIds.includes(hash)) {
      setActiveSection(hash);
      window.setTimeout(() => scrollToReportSection(hash, false), 0);
    } else {
      updateActiveSection();
    }

    window.addEventListener("scroll", scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveSectionUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleActiveSectionUpdate);
      window.removeEventListener("resize", scheduleActiveSectionUpdate);
    };
  }, [reportId, reportById, scrollToReportSection]);

  useEffect(() => {
    if (!reportId || !user) return;

    if (loadingReport || reportById === undefined || reportById === null) return;

    if (String((reportById as any)?.report_level ?? "").trim().toLowerCase() === "full") {
      try {
        sessionStorage.setItem(getReportUnlockStorageKey(user.id, reportId), "1");
      } catch {
        // ignore storage failures
      }
      window.dispatchEvent(new Event("rankio:subscription-updated"));
      return;
    }

    try {
      sessionStorage.removeItem(getReportUnlockStorageKey(user.id, reportId));
    } catch {
      // ignore storage failures
    }
  }, [loadingReport, reportId, reportById, user]);

  const activeReport = useMemo(
    () => (reportId ? (reportById ?? null) : reports?.[0] ?? null),
    [reportId, reportById, reports]
  );

  const rawScanData = (activeReport as any)?.raw_scan_data ?? {};
  const previewPayload = rawScanData?.preview_payload ?? {};
  const analysisPayload = rawScanData?.analysis ?? {};
  const crawlerPayload = rawScanData?.crawler ?? {};
  const scoreBreakdownPayload = previewPayload?.score_breakdown ?? (activeReport as any)?.score_breakdown ?? {};
  const crawlerPages = useMemo(() => safeArray<any>(crawlerPayload?.pages), [crawlerPayload?.pages]);
  const crawlerBrokenLinks = useMemo(() => safeArray<any>(crawlerPayload?.brokenLinks), [crawlerPayload?.brokenLinks]);
  const crawlerDiscoveryNotes = useMemo(() => safeArray<string>(crawlerPayload?.discoveryNotes), [crawlerPayload?.discoveryNotes]);
  const entityEnrichment = crawlerPayload?.entityEnrichment ?? {};
  const reportFindings = useMemo(() => safeArray<any>(analysisPayload?.findings), [analysisPayload?.findings]);
  const crux = useMemo(() => getCruxMetrics(rawScanData), [rawScanData]);
  const reportQuota = toFiniteNumber(subscription?.report_quota);
  const reportsUsed = toFiniteNumber(subscription?.reports_used) ?? 0;
  const hasRemainingCredits = reportQuota !== null && reportsUsed < reportQuota;
  const hasSubscriptionAccess = !!user && (subscription?.lifetime_access === true || hasRemainingCredits);
  const isFullReport = !!user && String((activeReport as any)?.report_level ?? "").trim().toLowerCase() === "full";
  const hasPaidAccess = reportId ? isFullReport : hasSubscriptionAccess;
  const isUnlockPending = false;
  const isGuest = !hasPaidAccess;
  const remainingCredits = reportQuota !== null ? Math.max(reportQuota - reportsUsed, 0) : 0;
  const hasExhaustedCredits =
    !!user &&
    !hasPaidAccess &&
    !subscriptionLoading &&
    reportQuota !== null &&
    reportQuota > 0 &&
    remainingCredits === 0 &&
    subscription?.lifetime_access !== true;
  const needsPlanPurchase = !!user && !hasPaidAccess && !subscriptionLoading && !hasSubscriptionAccess && !hasExhaustedCredits;
  const needsCreditTopUp = !!user && !hasPaidAccess && !subscriptionLoading && hasExhaustedCredits;
  const reportLevelValue = String((activeReport as any)?.report_level ?? "unknown").trim();
  const reportAccessTier = String((activeReport as any)?.access_tier_required ?? "unknown").trim();
  const upgradePromptType = needsCreditTopUp ? "credits" : needsPlanPurchase ? "plan" : null;
  const shouldShowUpgradePrompt = !!activeReport && !!user && !hasPaidAccess && !isUnlockPending && !subscriptionLoading && !!upgradePromptType;
  const display = displayUrl(
    rawScanData?.lighthouseResult?.finalUrl ?? 
      rawScanData?.lighthouseResult?.requestedUrl ?? 
      (activeReport as any)?.site ?? 
      (activeReport as any)?.website_url ??
      (activeReport as any)?.url
  );
  const displayHost = hostFromUrl(display);
  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.slice(0, 2)?.toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  useEffect(() => {
    if (!shouldShowUpgradePrompt) return;

    const promptKey = `${String(activeReport?.id ?? reportId ?? "latest")}:${upgradePromptType}`;
    if (upgradePromptKeyRef.current === promptKey) return;

    upgradePromptKeyRef.current = promptKey;
    setUpgradeOpen(true);
  }, [activeReport?.id, reportId, shouldShowUpgradePrompt, upgradePromptType]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const headerRight = user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-auto items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent text-sm text-white">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-primary sm:block">
            {(user.user_metadata?.full_name as string) ?? user.email}
          </span>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mt-2 w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{(user.user_metadata?.full_name as string) ?? "Account"}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const reportRows = useMemo(
    () =>
      buildRows(
        activeReport,
        [
          ...reportFindings.map((finding: any) => ({
            title: finding?.title ?? finding?.signalKey ?? "Finding",
            severity: reportSeverityFromFinding(finding?.severity),
            description: finding?.description ?? "",
            recommendation: finding?.recommendation ?? finding?.description ?? "",
            category: finding?.category ?? "",
            evidence: finding?.evidence ?? null,
            pageUrl: finding?.pageUrl ?? null,
            signalKey: finding?.signalKey ?? null,
          })),
        ]
      ),
    [activeReport, reportFindings]
  );

  const verticalKey = useMemo(
    () => detectVerticalFromReport(displayHost, display, rawScanData, reportRows),
    [display, displayHost, rawScanData, reportRows]
  );

  const verticalProfile = useMemo(() => getVerticalProfile(verticalKey), [verticalKey]);


  const previousReport = useMemo(() => {
    if (!activeReport?.website_id || !reports?.length) return null;
    const currentId = String(activeReport.id ?? "");
    const currentGeneratedAt = activeReport.generated_at ? new Date(activeReport.generated_at).getTime() : 0;

    return (
      reports
        .filter((item) => String(item.website_id ?? "") === String(activeReport.website_id ?? "") && String(item.id ?? "") !== currentId)
        .map((item) => ({
          ...item,
          generatedTime: item.generated_at ? new Date(item.generated_at).getTime() : 0,
        }))
        .filter((item) => !currentGeneratedAt || item.generatedTime < currentGeneratedAt)
        .sort((a, b) => b.generatedTime - a.generatedTime)[0] ?? null
    );
  }, [activeReport, reports]);

  const handleCompareWithPrevious = () => {
    if (!activeReport?.id || !activeReport?.website_id || !previousReport?.id) return;

    navigate(
      `/dashboard/reports/compare?websiteId=${encodeURIComponent(String(activeReport.website_id))}&reportIds=${encodeURIComponent(
        `${String(previousReport.id)},${String(activeReport.id)}`
      )}`
    );
  };

  const performanceScore = clampScore((activeReport as any)?.performance_score ?? null, 0);
  const seoScore = clampScore((activeReport as any)?.seo_score ?? null, 0);
  const technicalScore = clampScore((activeReport as any)?.technical_score ?? null, 0);
  const accessibilityScore = clampScore((activeReport as any)?.accessibility_score ?? null, 0);
  const fallbackScores = [performanceScore, seoScore, technicalScore, accessibilityScore].filter((value) => value > 0);
  const aiScore = clampScore((activeReport as any)?.ai_score ?? (fallbackScores.length ? fallbackScores.reduce((sum, value) => sum + value, 0) / fallbackScores.length : 72), 72);
  const overallScore = aiScore;
  const priorScore = clampScore((previousReport as any)?.ai_score ?? null, 0);
  const scoreDelta = previousReport ? overallScore - priorScore : 0;
  const projectedScore = Math.min(
    100,
    overallScore +
      Math.min(
        28,
        reportRows.reduce((sum, row) => {
          if (row.severity === "Critical") return sum + 10;
          if (row.severity === "High") return sum + 7;
          if (row.severity === "Medium") return sum + 4;
          return sum + 2;
        }, 0)
      )
  );
  const projectedLift = Math.max(6, projectedScore - overallScore);

  const categoryScores: ScoreCard[] = [
    {
      label: "SEO Foundation",
      score: seoScore || clampScore((rawScanData?.lighthouseResult?.categories?.seo?.score ?? 0) * 100, 68),
      description: verticalProfile.categoryCopy.seo,
      tone: "violet",
      icon: Search,
    },
    {
      label: "AI Readiness",
      score: overallScore,
      description: verticalProfile.categoryCopy.ai,
      tone: "violet",
      icon: Bot,
    },
    {
      label: "UX Clarity",
      score:
        accessibilityScore ||
        clampScore((rawScanData?.lighthouseResult?.categories?.accessibility?.score ?? 0) * 100, 72),
      description: verticalProfile.categoryCopy.ux,
      tone: "blue",
      icon: Eye,
    },
    {
      label: "Technical Health",
      score:
        performanceScore ||
        technicalScore ||
        clampScore((rawScanData?.lighthouseResult?.categories?.performance?.score ?? 0) * 100, 64),
      description: verticalProfile.categoryCopy.tech,
      tone: "rose",
      icon: Gauge,
    },
  ];

  const evidenceIssueCards = useMemo<EvidenceIssue[]>(() => {
    const findingRows = reportFindings.map((finding: any) => {
      const title = String(finding?.title ?? finding?.signalKey ?? "Finding").trim();
      const severity = reportSeverityFromFinding(finding?.severity);
      const bucket = bucketForTitle(`${finding?.category ?? ""} ${title}`);

      return {
        parameter: title,
        status: severity === "High" ? "error" : severity === "Medium" ? "warning" : "success",
        severity,
        suggestion: String(finding?.recommendation ?? finding?.description ?? title).trim(),
        description: String(finding?.description ?? "").trim(),
        evidence: finding?.evidence && typeof finding.evidence === "object" ? finding.evidence : null,
        pageUrl: finding?.pageUrl ?? null,
        signalKey: finding?.signalKey ?? null,
        bucket,
      } satisfies ReportRow;
    });

    const sourceRows = findingRows.length > 0 ? findingRows : reportRows;
    const sorted = [...sourceRows].sort((left, right) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[left.severity as keyof typeof order] ?? 99) - (order[right.severity as keyof typeof order] ?? 99);
    });

    return sorted.slice(0, 6).map((item, index) => ({
      ...item,
      title: item.parameter,
      priority: item.severity,
      impact: issueImpact(item.severity, item.bucket),
      effort: issueEffort(item.severity, item.bucket),
      fix: item.suggestion,
      evidenceSummary: summarizeEvidence(item.evidence),
      affectedPage: formatAffectedPage(item.pageUrl),
      icon: iconForBucket(item.bucket),
      rank: index + 1,
    }));
  }, [reportFindings, reportRows]);

  const auditSections: AuditSection[] = useMemo(() => {
    const sortedRows = [...reportRows].sort((left, right) => rankSeverity(left.severity) - rankSeverity(right.severity));
    const topIssue = sortedRows[0];
    const firstAiIssue = sortedRows.find((row) => row.bucket === "ai-search-visibility") ?? topIssue;
    const firstContentIssue = sortedRows.find((row) => row.bucket === "content-intelligence") ?? topIssue;
    const firstStructuredIssue = sortedRows.find((row) => row.bucket === "structured-data") ?? topIssue;
    const firstUxIssue = sortedRows.find((row) => row.bucket === "ux-accessibility") ?? topIssue;
    const firstPerformanceIssue = sortedRows.find((row) => row.bucket === "technical-performance") ?? topIssue;
    const firstSeoIssue = sortedRows.find((row) => row.bucket === "seo-foundation") ?? topIssue;

    const pagesWithTitle = crawlerPages.filter((page) => Boolean(page?.title)).length;
    const pagesWithMeta = crawlerPages.filter((page) => Boolean(page?.metaDescription)).length;
    const pagesWithH1 = crawlerPages.filter((page) => Number(page?.h1Count ?? 0) === 1).length;
    const pagesWithSchema = crawlerPages.filter((page) => (page?.schemaTypes?.length ?? 0) > 0).length;
    const pagesWithAltText = crawlerPages.filter((page) => Number(page?.imageCount ?? 0) > 0 && Number(page?.imageAltCount ?? 0) > 0).length;
    const totalImages = crawlerPages.reduce((sum, page) => sum + Number(page?.imageCount ?? 0), 0);
    const totalAltImages = crawlerPages.reduce((sum, page) => sum + Number(page?.imageAltCount ?? 0), 0);
    const altCoverage = totalImages > 0 ? totalAltImages / totalImages : null;
    const totalWordCount = crawlerPages.reduce((sum, page) => sum + Number(page?.wordCount ?? 0), 0);
    const avgPageScore = crawlerPages.length
      ? crawlerPages.reduce((sum, page) => sum + Number(page?.pageScore ?? 0), 0) / crawlerPages.length
      : null;
    const internalLinksOut = crawlerPages.reduce((sum, page) => sum + Number(page?.internalLinksOut ?? 0), 0);
    const internalLinksIn = crawlerPages.reduce((sum, page) => sum + Number(page?.internalLinksIn ?? 0), 0);
    const h1Consistency = crawlerPages.length > 0 ? pagesWithH1 / crawlerPages.length : null;
    const schemaTypes = Array.from(new Set(crawlerPages.flatMap((page) => safeArray<string>(page?.schemaTypes))));
    const firstBrokenLink = crawlerBrokenLinks[0];
    const citationReadiness = clampScore((scoreBreakdownPayload?.citation_readiness ?? scoreBreakdownPayload?.citationReadiness ?? overallScore) as number, overallScore);
    const technicalReadiness = clampScore((scoreBreakdownPayload?.technical_readiness ?? scoreBreakdownPayload?.technicalReadiness ?? technicalScore) as number, technicalScore);
    const contentReadiness = clampScore((scoreBreakdownPayload?.content_readiness ?? scoreBreakdownPayload?.contentReadiness ?? overallScore) as number, overallScore);
    const aiUnderstanding = clampScore((scoreBreakdownPayload?.ai_understanding ?? scoreBreakdownPayload?.aiUnderstanding ?? overallScore) as number, overallScore);
    const overallSnapshot = clampScore((scoreBreakdownPayload?.overall_score ?? scoreBreakdownPayload?.overallScore ?? overallScore) as number, overallScore);
    const entityConfidence = clampScore(entityEnrichment?.confidence ?? 0, 0);
    const sameAsUrls = safeArray<string>(entityEnrichment?.sameAsUrls);
    const externalProfiles = safeArray<any>(entityEnrichment?.externalProfiles);
    const discoveryImpact = crawlerDiscoveryNotes[0] ?? "No discovery notes were recorded.";

    return [
      {
        id: "ai-search-visibility",
        eyebrow: "AEO / GEO",
        title: "AI Search Visibility",
        description: `How well AI systems can retrieve, trust, and cite the site's core answers.`,
        score: clampScore(Math.max(overallSnapshot, citationReadiness)),
        scoreLabel: "Citation Readiness",
        tiles: [
          {
            label: "Citation Readiness",
            value: formatPercent(citationReadiness),
            detail:
              firstAiIssue?.suggestion ??
              `Pages with clear structure, schema, and answer-ready content are easier for AI systems to cite.`,
            tone: "violet",
          },
          {
            label: "AI Understanding",
            value: formatPercent(aiUnderstanding),
            detail:
              previewPayload?.summary ??
              "Structured signals, crawl depth, and content clarity shape how well language models interpret the site.",
            tone: "rose",
          },
        ],
      },
      {
        id: "content-intelligence",
        eyebrow: "Semantic density",
        title: "Content Intelligence",
        description: `Entity mapping, content clarity, and language structure for ${verticalProfile.contentFocus.toLowerCase()}.`,
        score: clampScore(contentReadiness, overallScore),
        scoreLabel: "Content Readiness",
        tiles: [
          {
            label: "Titles / Meta",
            value: `${pagesWithTitle}/${crawlerPages.length || 1}`,
            detail:
              firstContentIssue?.suggestion ??
              `Unique titles and meta descriptions help the site surface the right pages for AI and search.`,
            tone: "violet",
          },
          {
            label: "Heading Structure",
            value: `${pagesWithH1}/${crawlerPages.length || 1}`,
            detail: `One clear H1 and well-nested supporting headings improve readability and answer extraction.`,
            tone: "amber",
          },
          {
            label: "Content Depth",
            value: formatCount(Math.round(totalWordCount), "words"),
            detail: `The crawler found ${formatCount(Math.round(totalWordCount), "words")} across the sampled pages, which gives AI more context.`,
            tone: "sky",
          },
          {
            label: "Average Page Score",
            value: formatPercent(avgPageScore),
            detail: `Page-level structure, text depth, and metadata quality combine into a practical crawlability signal.`,
            tone: "emerald",
          },
        ],
        wide: true,
      },
      {
        id: "structured-data",
        eyebrow: "Schema coverage",
        title: "Structured Data",
        description: `Markup depth, schema completeness, and alternate-language coverage for ${verticalProfile.structuredFocus.toLowerCase()}.`,
        score: clampScore(Math.max(technicalReadiness, seoScore || 0)),
        scoreLabel: "Schema Readiness",
        tiles: [
          {
            label: "Schema Pages",
            value: `${pagesWithSchema}/${crawlerPages.length || 1}`,
            detail:
              firstStructuredIssue?.suggestion ??
              `JSON-LD schema helps AI systems classify pages and understand the site's business entities.`,
            tone: "emerald",
          },
          {
            label: "Schema Types",
            value: schemaTypes.length > 0 ? `${schemaTypes.length} found` : "None found",
            detail: schemaTypes.length > 0 ? schemaTypes.slice(0, 3).join(", ") : "Add Organization, WebPage, and page-type schema to improve machine readability.",
            tone: "sky",
          },
          {
            label: "Hreflang Coverage",
            value: formatPercent(crawlerPages.length ? crawlerPages.filter((page) => (page?.hreflangLinks?.length ?? 0) > 0).length / crawlerPages.length : null),
            detail:
              crawlerPages.some((page) => (page?.hreflangLinks?.length ?? 0) > 0)
                ? "Alternate-language markup is present on part of the site."
                : "No hreflang alternates were detected, so localized pages may need clearer language targeting.",
            tone: "violet",
          },
          {
            label: "Entity Sources",
            value: sameAsUrls.length > 0 ? `${sameAsUrls.length} sameAs` : "None",
            detail:
              entityEnrichment?.brandName || entityEnrichment?.publisherName
                ? `Brand source: ${entityEnrichment.brandName ?? entityEnrichment.publisherName}.`
                : "Add official sameAs links to strengthen entity confidence.",
            tone: "rose",
          },
        ],
      },
      {
        id: "semantic-health",
        eyebrow: "Knowledge graph",
        title: "Semantic Health",
        description: `How well the site exposes entities and relationships AI systems need for ${verticalProfile.semanticFocus.toLowerCase()}.`,
        score: clampScore((aiUnderstanding + citationReadiness) / 2, overallScore),
        scoreLabel: "Semantic Coverage",
        tiles: [
          {
            label: "Entity Confidence",
            value: `${entityConfidence}/100`,
            detail:
              externalProfiles.length > 0
                ? `External profiles and sameAs sources reinforce brand identity across the web.`
                : "Structured data did not reveal enough external entity anchors to build strong confidence.",
            tone: "violet",
          },
          {
            label: "Content Chunks",
            value: crawlerPages.reduce((sum, page) => sum + safeArray<any>(page?.chunks).length, 0).toString(),
            detail: `Chunked content is what the retrieval layer uses to simulate citations and answer extraction.`,
            tone: "sky",
          },
          {
            label: "Link Density",
            value: `${internalLinksOut} out / ${internalLinksIn} in`,
            detail: `Internal links and page references help AI and search crawlers understand how ideas connect.`,
            tone: "emerald",
          },
          {
            label: "Discovery Note",
            value: discoveryImpact.slice(0, 24) || "None",
            detail: discoveryImpact,
            tone: "amber",
          },
        ],
        wide: true,
      },
      {
        id: "ux-accessibility",
        eyebrow: "Human + machine clarity",
        title: "UX & Accessibility",
        description: `How easily humans, bots, and assistive tech can navigate ${verticalProfile.uxFocus.toLowerCase()}.`,
        score: clampScore(Math.max(accessibilityScore || technicalScore, 45), 45),
        scoreLabel: "Bottlenecks Found",
        tiles: [
          {
            label: "Accessibility Score",
            value: formatPercent(accessibilityScore),
            detail:
              firstUxIssue?.suggestion ??
              `Better semantic structure makes the site easier for screen readers and AI systems to interpret.`,
            tone: "rose",
          },
          {
            label: "Image Alt Coverage",
            value: formatPercent(altCoverage),
            detail:
              pagesWithAltText > 0
                ? `${pagesWithAltText} crawled page(s) included at least one image with alt text.`
                : "Add descriptive alt text to improve accessibility and multimodal understanding.",
            tone: "emerald",
          },
          {
            label: "Canonical Coverage",
            value: `${crawlerPages.filter((page) => Boolean(page?.canonicalUrl)).length}/${crawlerPages.length || 1}`,
            detail: `Canonical tags reduce ambiguity when search engines and AI tools compare similar pages.`,
            tone: "sky",
          },
          {
            label: "Noindex Pages",
            value: `${crawlerPages.filter((page) => Boolean(page?.noindex)).length}`,
            detail: `Review intentional and accidental noindex directives so important pages stay visible.`,
            tone: "amber",
          },
        ],
      },
      {
        id: "technical-performance",
        eyebrow: "Speed + render path",
        title: "Technical Performance",
        description: `Speed, efficiency, and bot rendering quality for ${verticalProfile.techFocus.toLowerCase()}.`,
        score: clampScore(Math.max(performanceScore || technicalScore || 75, technicalReadiness), 75),
        scoreLabel: "Core Web Vitals",
        tiles: [
          {
            label: "FCP",
            value: formatMs((rawScanData?.metrics?.fcp as number | undefined) ?? null),
            detail:
              firstPerformanceIssue?.suggestion ??
              `Reduce blocking work and trim render-critical scripts for faster first paint on the site.`,
            tone: "violet",
          },
          {
            label: "Broken Links",
            value: formatCount(crawlerBrokenLinks.length, "found"),
            detail:
              crawlerBrokenLinks.length > 0
                ? `The crawler flagged ${crawlerBrokenLinks.length} broken internal link(s) that should be redirected or repaired.`
                : "No internal link failures were found in the sampled crawl.",
            tone: "rose",
          },
          {
            label: "Robots / Sitemap",
            value: `${rawScanData?.crawler?.robotsTxt ? "robots" : "no robots"} · ${rawScanData?.crawler?.sitemapUrls?.length ? "sitemap" : "no sitemap"}`,
            detail: `Crawl instructions and sitemap hints shape how quickly AI and search crawlers discover the site.`,
            tone: "sky",
          },
          {
            label: "Average Page Score",
            value: formatPercent(avgPageScore),
            detail: `A page-level blend of metadata, structure, and content depth helps us track technical quality across the crawl.`,
            tone: "emerald",
          },
        ],
      },
      {
        id: "seo-foundation",
        eyebrow: "Legacy discoverability",
        title: "SEO Foundation",
        description: `Traditional search engine trust signals that still matter for AI-assisted discovery in ${verticalProfile.label.toLowerCase()} niches.`,
        score: clampScore(Math.max(seoScore, technicalReadiness), 68),
        scoreLabel: "Search Signals",
        tiles: [
          {
            label: "SEO Score",
            value: formatPercent(seoScore),
            detail:
              firstSeoIssue?.suggestion ??
              `Search crawlability and metadata consistency continue to matter for AI-assisted discovery.`,
            tone: "emerald",
          },
          {
            label: "Sitemap URLs",
            value: formatCount(Number(rawScanData?.crawler?.sitemapUrls?.length ?? 0), "found"),
            detail: "Sitemaps help crawlers reach the most important URLs faster.",
            tone: "sky",
          },
          {
            label: "Canonical Coverage",
            value: `${crawlerPages.filter((page) => Boolean(page?.canonicalUrl)).length}/${crawlerPages.length || 1}`,
            detail: `Canonical tags help consolidate signals when multiple URLs point to similar content.`,
            tone: "violet",
          },
          {
            label: "Broken Links",
            value: formatCount(crawlerBrokenLinks.length, "found"),
            detail:
              firstBrokenLink?.url
                ? `Example: ${firstBrokenLink.url}`
                : "Internal link health looks stable in the sampled crawl.",
            tone: "rose",
          },
        ],
      },
      {
        id: "ai-impact",
        eyebrow: "Prioritized outcome",
        title: "AI Impact Assessment",
        description: `How the current findings translate into business impact and next-step leverage for ${verticalProfile.label.toLowerCase()}.`,
        score: projectedScore,
        scoreLabel: "Projected Score",
        tiles: [
          {
            label: "Highest Priority",
            value: topIssue?.parameter ?? "No major issue",
            detail:
              topIssue?.suggestion ??
              `Fixing the most severe issue reduces the chance of misinterpretation in AI summaries.`,
            tone: "rose",
          },
          {
            label: "Fastest Win",
            value:
              sortedRows.find((row) => row.severity === "Medium")?.parameter ??
              sortedRows[1]?.parameter ??
              "Content refinement",
            detail: `The next improvement should be the one that lifts both retrieval quality and user comprehension.`,
            tone: "amber",
          },
          {
            label: "Growth Lever",
            value: sameAsUrls.length > 0 ? "Entity reinforcement" : "Schema expansion",
            detail: `Stronger structured signals improve how AI systems connect content, brand, and intent.`,
            tone: "emerald",
          },
        ],
        wide: true,
      },
    ];
  }, [
    accessibilityScore,
    aiScore,
    crawlerBrokenLinks,
    crawlerDiscoveryNotes,
    crawlerPages,
    entityEnrichment,
    overallScore,
    performanceScore,
    previewPayload?.summary,
    rawScanData,
    reportRows,
    scoreBreakdownPayload,
    seoScore,
    technicalScore,
    verticalProfile.contentFocus,
    verticalProfile.label,
    verticalProfile.semanticFocus,
    verticalProfile.techFocus,
    verticalProfile.structuredFocus,
    verticalProfile.uxFocus,
  ]);

  const roadmapBuckets: RoadmapBucket[] = useMemo(() => {
    const sortedRows = [...reportRows].sort((left, right) => rankSeverity(left.severity) - rankSeverity(right.severity));
    const quickWins = sortedRows.filter((row) => row.severity === "Critical" || row.severity === "High").slice(0, 3);
    const mediumImprovements = sortedRows.filter((row) => row.severity === "Medium").slice(0, 3);
    const advancedImprovements = sortedRows.filter((row) => row.severity === "Low").slice(0, 3);
    const longTermSignals = [
      crawlerDiscoveryNotes[0] ?? "Keep refining the crawl layer so the site exposes its most important pages clearly.",
      entityEnrichment?.brandName
        ? `Extend sameAs and publisher references so AI systems connect the brand identity to ${entityEnrichment.brandName}.`
        : "Add official sameAs links to strengthen the brand graph and external entity confidence.",
      crawlerBrokenLinks.length > 0
        ? `Eliminate broken internal links so the crawl graph stays connected and reliable.`
        : "Keep internal links consistent so key pages stay reachable as the site grows.",
    ];

    return [
      {
        title: "Quick Wins",
        phase: "Phase 1 · Deployment (1-3 Days)",
        summary: "Small changes that create immediate gains in retrieval confidence and page clarity.",
        icon: Rocket,
        items:
          quickWins.length > 0
            ? quickWins.map((row) => `${row.parameter}: ${row.suggestion}`)
            : ["Fix the highest-priority schema and clarity gaps first.", "Create one page-level FAQ block for the primary topic."],
        tone: "violet",
      },
      {
        title: "Medium Improvements",
        phase: "Phase 2 · Integration (1-2 Weeks)",
        summary: "Structural changes that improve how AI systems interpret your brand and content at scale.",
        icon: Layers3,
        items:
          mediumImprovements.length > 0
            ? mediumImprovements.map((row) => `${row.parameter}: ${row.suggestion}`)
            : ["Refine page hierarchy, metadata, and entity coverage.", "Reduce ambiguity in supporting content and navigation."],
        tone: "amber",
      },
      {
        title: "Advanced Optimization",
        phase: "Phase 3 · Scaling (1 Month)",
        summary: "More strategic work that compounds AI visibility gains over time.",
        icon: Sparkles,
        items:
          advancedImprovements.length > 0
            ? advancedImprovements.map((row) => `${row.parameter}: ${row.suggestion}`)
            : ["Improve content operations around semantic clusters.", "Strengthen technical delivery for bot rendering."],
        tone: "sky",
      },
      {
        title: "Long-term Authority",
        phase: "Phase 4 · Evolution (Ongoing)",
        summary: "A durable operating system for AI visibility, citation frequency, and brand trust.",
        icon: TrendingUp,
        items: longTermSignals,
        tone: "emerald",
      },
    ];
  }, [crawlerBrokenLinks.length, crawlerDiscoveryNotes, entityEnrichment?.brandName, reportRows]);

  const topIssueCards = isGuest ? evidenceIssueCards.slice(0, 1) : evidenceIssueCards.slice(0, 3);
  const implementationIssueCards = evidenceIssueCards.slice(0, 5);

  if (reportId && reportError) {
    return (
      <>
        <div className="min-h-screen bg-[#0b1022] text-white">
          <header className="sticky top-0 z-50 border-b border-border/40 bg-white backdrop-blur-md">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-8" />
                </Link>
                {headerRight}
              </div>
            </div>
          </header>
          <main className="container mx-auto max-w-5xl px-4 py-16 md:px-6">
            <p className="mb-4 text-sm text-rose-300">Failed to load report: {reportError}</p>
            <Button
              variant="ghost"
              className="gap-2 text-white hover:bg-white/8 hover:text-white"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                navigate(backTo ?? backToDefault);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          </main>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={`${location.pathname}${location.search}`} />
      </>
    );
  }

  if (reportId && loadingReport && reportById === undefined) {
    return (
      <>
        <div className="min-h-screen bg-[#0b1022] text-white">
          <header className="sticky top-0 z-50 border-b border-border/40 bg-white backdrop-blur-md">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-8" />
                </Link>
                {headerRight}
              </div>
            </div>
          </header>
          <main className="container mx-auto max-w-5xl px-4 py-16 md:px-6">
            <p className="text-sm text-white/65">Loading report...</p>
          </main>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={`${location.pathname}${location.search}`} />
      </>
    );
  }

  if (reportId && reportById === null) {
    return (
      <>
        <div className="min-h-screen bg-[#0b1022] text-white">
          <header className="sticky top-0 z-50 border-b border-border/40 bg-white backdrop-blur-md">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-8" />
                </Link>
                {headerRight}
              </div>
            </div>
          </header>
          <main className="container mx-auto max-w-5xl px-4 py-16 md:px-6">
            <p className="mb-4 text-sm text-white/65">Report not found.</p>
            <Button
              variant="ghost"
              className="gap-2 text-white hover:bg-white/8 hover:text-white"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                navigate(backTo ?? backToDefault);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          </main>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={`${location.pathname}${location.search}`} />
      </>
    );
  }


  const summaryText =
    isGuest
      ? needsCreditTopUp
        ? "You’ve used all the report credits included in your current plan. This scan is still available in preview mode, but the full AI audit stays locked until you purchase more credits."
        : needsPlanPurchase
          ? "You don't have an active plan right now. This scan is available in preview mode, and you can purchase a plan to unlock the full AI audit, recommendations, and roadmap."
          : "Log in and purchase any plan to unlock the full AI audit, recommendations, and roadmap."
      : `${verticalProfile.summaryLead} ${
          (activeReport as any)?.ai_summary ??
          previewPayload?.summary ??
          rawScanData?.summary ??
          verticalProfile.summaryBody ??
          fallbackReportSummary
        }`;

  const projectLabel = String(rawScanData?.rankio?.vertical ?? rawScanData?.industry ?? rawScanData?.vertical ?? verticalProfile.label);
  const reportStatusLabel = isGuest ? "Preview Report" : (activeReport as any)?.report_level === "full" ? "Full Report" : "Report";
  const reportPlanSlug = String((activeReport as any)?.access_tier_required ?? "").trim();
  const reportPlanLabel =
    reportStatusLabel === "Full Report"
      ? `${reportPlanSlug ? reportPlanSlug.charAt(0).toUpperCase() + reportPlanSlug.slice(1) : "Paid"} Plan`
      : "Preview";
  const reportCreditUsedLabel =
    reportStatusLabel === "Full Report"
      ? (activeReport as any)?.is_cached
        ? "Credit used: No"
        : "Credit used: Yes"
      : "Credit used: No";
  const activeReportGeneratedAt = (activeReport as any)?.generated_at as string | undefined;
  const activeReportGeneratedAtMs = activeReportGeneratedAt ? new Date(activeReportGeneratedAt).getTime() : NaN;
  const activeReportIsFresh = Number.isFinite(activeReportGeneratedAtMs) && Date.now() - activeReportGeneratedAtMs < REPORT_CACHE_MS;
  const rescanCreditNote = activeReportIsFresh
    ? `No credit used: this report is under ${REPORT_CACHE_HOURS}h old.`
    : "Uses 1 report credit when a new full report is generated.";
  const scoreComparisonLabel =
    previousReport && Number.isFinite(scoreDelta)
      ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs previous scan`
      : "First recorded scan";

  const handleExport = () => {
    if (typeof window === "undefined") return;
    const generatedAtLabel = activeReportGeneratedAt ? new Date(activeReportGeneratedAt).toLocaleDateString() : "Current report";
    const reportTypeLabel = reportLevelValue === "full" ? "Full Report" : "Preview Report";
    const blob = buildReportPdfBlob({
      title: verticalProfile.summaryTitle,
      website: displayHost,
      reportType: reportTypeLabel,
      generatedAt: generatedAtLabel,
      score: overallScore,
      maturity: maturityLabel(overallScore),
      summary: summaryText,
      categoryScores,
      topIssues: topIssueCards,
      auditSections,
      implementationIssues: implementationIssueCards,
      roadmapBuckets,
    });

    downloadBlob(blob, pdfFileName(`Rankio AI Report ${displayHost}`));
    setRescanMessage("PDF downloaded successfully.");
  };

  const handleImplementationStrategy = () => {
    setRescanMessage("Implementation strategy booking is not connected yet. We can wire this to your preferred booking or contact flow next.");
  };

  const handleRescan = async () => {
    if (!user || !activeReport || rescanning) return;
    setRescanMessage(null);

    const activeWebsiteId = String((activeReport as any)?.website_id ?? "").trim();

    if (activeWebsiteId) {
      const { data: latestReport, error: latestReportError } = await supabase
        .from("reports")
        .select("*")
        .eq("website_id", activeWebsiteId)
        .eq("status", "completed")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestReportError) {
        setRescanMessage(latestReportError.message);
        return;
      }

      const latestGeneratedAtRaw = (latestReport as any)?.generated_at as string | undefined;
      const latestGeneratedAtMs = latestGeneratedAtRaw ? new Date(latestGeneratedAtRaw).getTime() : NaN;
      const latestIsFresh = Number.isFinite(latestGeneratedAtMs) && Date.now() - latestGeneratedAtMs < REPORT_CACHE_MS;

      if (latestReport?.id && latestIsFresh) {
        writeReportCache(String(latestReport.id), latestReport);
        setRescanMessage(`Using the latest report generated within the last ${REPORT_CACHE_HOURS} hours. No credit was used.`);
        if (String(latestReport.id) !== String(activeReport?.id ?? "")) {
          const from = `${location.pathname}${location.search}`;
          navigate(`/report?reportId=${encodeURIComponent(String(latestReport.id))}`, {
            state: { from, report: latestReport },
          });
        }
        return;
      }
    }

    const generatedAtRaw = (activeReport as any)?.generated_at as string | undefined;
    const generatedAtMs = generatedAtRaw ? new Date(generatedAtRaw).getTime() : NaN;
    const isFresh = Number.isFinite(generatedAtMs) && Date.now() - generatedAtMs < REPORT_CACHE_MS;

    if (isFresh) {
      setRescanMessage(`Using the latest report generated within the last ${REPORT_CACHE_HOURS} hours. No credit was used.`);
      return;
    }

    const scanUrl =
      rawScanData?.lighthouseResult?.finalUrl ??
      rawScanData?.lighthouseResult?.requestedUrl ??
      (activeReport as any)?.site ??
      display;

    if (!/^https?:\/\//i.test(String(scanUrl ?? ""))) {
      setRescanMessage("Unable to re-scan: missing a valid URL for this report.");
      return;
    }

    const normalizedScanUrl = String(scanUrl);
    setScanTargetUrl(normalizedScanUrl);
    setScanningModalOpen(true);
    setRescanning(true);
    const scanAbortController = new AbortController();
    const scanJobId = crypto.randomUUID();
    scanAbortControllerRef.current = scanAbortController;
    scanJobIdRef.current = scanJobId;
    const { data, error } = await runScan(normalizedScanUrl, {
      accessToken: session?.access_token,
      requireAuth: true,
      signal: scanAbortController.signal,
      scanJobId,
    });
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setScanningModalOpen(false);
    setRescanning(false);

    if (error) {
      if (scanAbortController.signal.aborted) return;
      setRescanMessage(error);
      return;
    }

    if (data?.id) {
      writeReportCache(data.id, data);
      const from = `${location.pathname}${location.search}`;
      navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from, report: data } });
    }
  };

  const handleStopScan = () => {
    void cancelScan(scanJobIdRef.current, { accessToken: session?.access_token });
    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setRescanning(false);
    setScanningModalOpen(false);
  };

  return (
    <>
      <div className="rankio-report-page min-h-screen bg-[#0b1022] text-white">
        <header data-report-sticky-header className="report-screen-chrome sticky top-0 z-50 border-b border-border/40 bg-white backdrop-blur-md">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex h-16 items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-8" />
                </Link>
              </div>

              <div className="flex items-center gap-2">{headerRight}</div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0b1022]">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex min-h-12 items-center justify-between gap-4 overflow-x-auto py-2">
                <div className="flex min-w-0 shrink-0 items-center gap-3 whitespace-nowrap">
                {user && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Link>
                )}
                </div>

                <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
                {!isGuest && activeReport?.website_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompareWithPrevious}
                    disabled={reportsLoading || !previousReport}
                    title={
                      reportsLoading
                        ? "Checking previous reports..."
                        : previousReport
                          ? "Compare this report with the previous scan."
                          : "No previous report is available for this website yet."
                    }
                    className="gap-2 disabled:opacity-100"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Compare with Previous
                  </Button>
                )}
                {!isGuest && (
                  <Button
                    onClick={handleExport}
                    size="sm"
                    className="gap-2"
                  >
                    Export to PDF
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {!isGuest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescan}
                      disabled={rescanning}
                      title={rescanCreditNote}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${rescanning ? "animate-spin" : ""}`} />
                      {rescanning ? "Re-scanning..." : "Re-scan"}
                    </Button>
                )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="report-print-area container mx-auto px-4 py-8 md:px-6 md:py-10">
          <section className="report-print-cover">
            <div>
              <p className="report-print-kicker">Rankio AI Visibility Report</p>
              <h1>{verticalProfile.summaryTitle}</h1>
              <p className="report-print-summary">{summaryText}</p>
            </div>
            <div className="report-print-meta">
              <div>
                <span>Website</span>
                <strong>{displayHost}</strong>
              </div>
              <div>
                <span>Report Type</span>
                <strong>{reportLevelValue === "full" ? "Full Report" : "Preview Report"}</strong>
              </div>
              <div>
                <span>AI Score</span>
                <strong>{overallScore}/100</strong>
              </div>
              <div>
                <span>Generated</span>
                <strong>{activeReportGeneratedAt ? new Date(activeReportGeneratedAt).toLocaleDateString() : "Current report"}</strong>
              </div>
            </div>
          </section>
          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="report-sidebar hidden lg:block">
              <div className="sticky top-[150px] rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-[24px] font-semibold tracking-tight text-white">Rankio Intelligence</p>
                <p className="mt-1 text-sm text-white/45">v2.4 Ready</p>

                <nav className="mt-8 space-y-2">
                  {[
                    { id: "executive-summary", label: "Executive Summary", icon: BarChart3 },
                    { id: "ai-audit", label: "AI Audit", icon: Bot },
                    { id: "implementation-plan", label: "Evidence & Fixes", icon: ShieldCheck },
                    { id: "roadmap", label: "Roadmap", icon: Rocket },
                  ].map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        scrollToReportSection(item.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-sm transition-all ${
                        activeSection === item.id
                          ? "border-white/15 bg-accent text-white shadow-[0_10px_24px_hsl(var(--accent)/0.25)]"
                          : "border-white/8 bg-white/0 text-white/70 hover:bg-white/6 hover:text-white"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="report-export-content space-y-8">
              <section id="executive-summary" className="report-section rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.18)] md:p-8">
                <div className="mb-6 rounded-[18px] border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="shrink-0">
                      <p className="font-semibold uppercase tracking-[0.18em] text-amber-200">Report Info</p>
                      {isUnlockPending ? <p className="mt-1 text-xs text-amber-100/75">Unlocking report...</p> : null}
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["Website", displayHost],
                        ["Report Type", reportLevelValue === "full" ? "Full Report" : "Preview Report"],
                        ["Plan", reportAccessTier && reportAccessTier !== "unknown" ? `${reportAccessTier.charAt(0).toUpperCase()}${reportAccessTier.slice(1)} Plan` : reportPlanLabel],
                        ["Credit Used", reportCreditUsedLabel.replace(/^Credit used:\s*/i, "")],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-amber-300/20 bg-black/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">{label}</p>
                          <p className="mt-1 truncate font-semibold text-amber-50">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-8 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                  <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(122,116,239,0.25),transparent_48%),linear-gradient(180deg,rgba(16,22,43,0.96)_0%,rgba(12,17,31,0.98)_100%)] px-6 py-8">
                    <div className="relative h-56 w-56">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="112" cy="112" r="92" stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none" />
                        <circle
                          cx="112"
                          cy="112"
                          r="92"
                          stroke="url(#summary-gradient)"
                          strokeWidth="14"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circleStroke(overallScore)}
                        />
                        <defs>
                          <linearGradient id="summary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#d8cbff" />
                            <stop offset="100%" stopColor="#8e86ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-[72px] font-semibold leading-none text-white">{overallScore}</div>
                        <div className="mt-2 max-w-[132px] text-[13px] leading-4 text-white/70">{verticalProfile.projectedLabel}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/80">
                        {maturityLabel(overallScore)}
                      </span>
                      <span
                        className={`rounded-full border px-4 py-2 text-sm ${
                          scoreDelta >= 0
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                            : "border-rose-400/30 bg-rose-400/10 text-rose-200"
                        }`}
                      >
                        {scoreComparisonLabel}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_hsl(var(--accent)/0.24)]">
                        Report Customized For: {verticalProfile.audience}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/75">
                        Industry: {projectLabel}
                      </span>
                    </div>

                    <div>
                      <h1 className="text-[34px] font-semibold tracking-tight text-white md:text-[54px] md:leading-[1.02]">
                        {verticalProfile.summaryTitle}
                      </h1>
                      <p className="mt-5 max-w-3xl text-[16px] leading-8 text-white/65 md:text-[18px]">
                        {summaryText}
                      </p>
                    </div>

                    <div className="max-w-xl rounded-[16px] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-center gap-3 text-white/75">
                        <Globe className="h-5 w-5 text-white/55" />
                        <span className="truncate text-[15px]">{display}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isGuest ? (
                  <div className="mt-8 rounded-[24px] border border-accent/35 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.24),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Preview access
                        </div>
                        <h2 className="text-[24px] font-semibold text-white">Full report locked</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
                          {needsCreditTopUp
                            ? "You've used all the report credits included in your plan, so this scan is available in preview mode only. Purchase more credits to unlock the detailed AI audit, roadmap, and export-ready recommendations."
                            : needsPlanPurchase
                              ? "You don't have an active plan right now, so this scan is available in preview mode only. Purchase a plan to unlock the detailed AI audit, roadmap, and export-ready recommendations."
                              : "You're seeing the score-only version. Sign in and purchase any plan to unlock the detailed AI audit, roadmap, and export-ready recommendations."}
                        </p>
                      </div>
                      {user ? (
                        <Button asChild>
                          <Link
                            to="/dashboard/subscription"
                            state={{
                              from: `${location.pathname}${location.search}`,
                              reason: "report_unlock",
                              reportId: String(activeReport?.id ?? ""),
                            }}
                          >
                            Choose a plan
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setAuthOpen(true)}
                        >
                          Sign in to unlock
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] p-5 md:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-[24px] font-semibold text-white">AI Maturity Scale</h2>
                        <p className="mt-2 text-sm text-white/45">From early-stage visibility to AI-leading authority.</p>
                      </div>
                      <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 md:block">
                        {maturityLabel(overallScore)}
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#6e69dc_0%,#b8a8ff_100%)]"
                          style={{ width: maturityPosition(overallScore) }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-4 text-[12px] text-white/45">
                        {["Beginner", "Developing", "Optimized", "AI-Leading"].map((label, index) => (
                          <div key={label} className={index === 1 ? "text-white/80" : ""}>
                            <span className="block">{label}</span>
                            <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-white/35" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!isGuest && (
                <>
                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {categoryScores.map((card) => {
                    const tone = scoreToneClasses(card.tone);
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className={`rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-5 ${tone.border}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] text-white/75">{card.label}</p>
                            <p className={`${tone.text} mt-4 text-[42px] font-semibold leading-none`}>
                              {card.score}
                              <span className="ml-1 text-[15px] text-white/40">/100</span>
                            </p>
                          </div>
                          <Icon className="h-7 w-7 text-white/35" />
                        </div>
                        <div className="mt-4 h-1.5 rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#7d73ff_0%,#b8a8ff_100%)]"
                            style={{ width: `${card.score}%` }}
                          />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-white/55">{card.description}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Pages Crawled",
                      value: `${crawlerPages.length}`,
                      detail: "Homepage plus a small set of internal pages are sampled for evidence.",
                      tone: "violet" as const,
                    },
                    {
                      label: "Broken Links",
                      value: `${crawlerBrokenLinks.length}`,
                      detail: crawlerBrokenLinks.length > 0 ? "Internal link issues were found and should be repaired." : "No broken internal links were detected in the sample crawl.",
                      tone: "rose" as const,
                    },
                    {
                      label: "Entity Confidence",
                      value: `${clampScore(entityEnrichment?.confidence ?? 0, 0)}/100`,
                      detail: entityEnrichment?.brandName ? `Brand identity detected for ${entityEnrichment.brandName}.` : "No strong external entity anchors were detected.",
                      tone: "emerald" as const,
                    },
                    {
                      label: "Data Confidence",
                      value: crawlerPages.length > 1 ? "Multi-page" : "Homepage",
                      detail:
                        crawlerPages.length > 1
                          ? "The report is based on PageSpeed data plus a sampled internal crawl."
                          : "The report is based on PageSpeed data and homepage-level crawler evidence.",
                      tone: "blue" as const,
                    },
                  ].map((stat) => {
                    const tone = scoreToneClasses(stat.tone);
                    return (
                      <div key={stat.label} className={`rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-5 ${tone.border}`}>
                        <p className="text-[13px] text-white/60">{stat.label}</p>
                        <div className={`${tone.text} mt-3 text-[28px] font-semibold leading-none`}>{stat.value}</div>
                        <p className="mt-3 text-sm leading-6 text-white/55">{stat.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-10">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#ffb5c7]" />
                    <h2 className="text-[24px] font-semibold text-white">Top Critical Issues</h2>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {topIssueCards.map((issue) => {
                      const Icon = issue.icon;
                      return (
                        <div
                          key={issue.title}
                          className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_100%)] p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/8">
                              <Icon className="h-5 w-5 text-white/75" />
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityTone(issue.priority)}`}>
                              Priority: {issue.priority}
                            </span>
                          </div>
                          <h3 className="mt-5 text-[20px] font-semibold text-white">{issue.title}</h3>
                          <p className="mt-3 text-[15px] leading-7 text-white/60">{issue.description || issue.fix}</p>
                          <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px] text-white/65">
                            <div className="flex items-start gap-2">
                              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                              <span>{issue.evidenceSummary}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
                              <span>{issue.affectedPage}</span>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-white/45">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{issue.bucket.replace(/-/g, " ")}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Effort: {issue.effort}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
                )}
              </section>

              {!isGuest && (
              <section id="ai-audit" className="report-section space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[26px] font-semibold tracking-tight text-white md:text-[34px]">
                    Detailed AI Audit · {verticalProfile.label}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/45">
                    {reportStatusLabel}
                  </span>
                </div>
                <p className="max-w-3xl text-[15px] leading-7 text-white/55 md:text-[16px]">
                  {verticalProfile.summaryLead}
                </p>

                <div className="space-y-4">
                  {auditSections.map((section, index) => (
                    <SectionCard key={section.id} section={section} index={index} isGuest={isGuest} />
                  ))}
                </div>
              </section>
              )}

              {!isGuest && (
              <section id="implementation-plan" className="report-section space-y-5">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.28em] text-white/35">Evidence-backed action plan</p>
                    <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-white md:text-[44px]">
                      What to fix first, with proof from the scan
                    </h2>
                    <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/55 md:text-[16px]">
                      Each item below connects a detected signal to an affected page, business impact, implementation effort,
                      and a concrete fix. This is the core working list your team can hand to SEO, content, or engineering.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-[13px] uppercase tracking-[0.22em] text-white/40">Implementation Summary</p>
                    <div className="mt-4 grid gap-3 text-sm text-white/70">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span>Priority items</span>
                        <span className="font-semibold text-white">{implementationIssueCards.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span>High-impact fixes</span>
                        <span className="font-semibold text-white">
                          {implementationIssueCards.filter((issue) => issue.priority === "High" || issue.priority === "Critical").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span>Sampled pages</span>
                        <span className="font-semibold text-white">{crawlerPages.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {implementationIssueCards.map((issue) => {
                    const Icon = issue.icon;
                    return (
                      <article
                        key={`${issue.rank}-${issue.title}`}
                        className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.025)_100%)] p-5 md:p-6"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-sm font-semibold text-white">
                                {issue.rank}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityTone(issue.priority)}`}>
                                {issue.priority} priority
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                                Effort: {issue.effort}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                                {humanizeSignal(issue.signalKey)}
                              </span>
                            </div>

                            <h3 className="mt-4 text-[22px] font-semibold tracking-tight text-white">{issue.title}</h3>
                            <p className="mt-3 max-w-4xl text-[15px] leading-7 text-white/60">{issue.description || issue.impact}</p>
                          </div>

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                            <Icon className="h-6 w-6 text-white/75" />
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 lg:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/35">Evidence</p>
                            <p className="mt-3 text-sm leading-6 text-white/70">{issue.evidenceSummary}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/35">Affected Page</p>
                            <p className="mt-3 break-words text-sm leading-6 text-white/70">{issue.affectedPage}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/35">Expected Impact</p>
                            <p className="mt-3 text-sm leading-6 text-white/70">{issue.impact}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-4">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">Recommended Fix</p>
                          <p className="mt-3 text-[15px] leading-7 text-white/78">{issue.fix}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
              )}

              {!isGuest && (
              <section id="roadmap" className="report-section space-y-5">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.28em] text-white/35">Actionable Intelligence</p>
                    <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-white md:text-[46px]">
                      {verticalProfile.roadmapTitle}
                    </h2>
                    <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/55 md:text-[16px]">
                      Based on the current scan, we’ve identified a clear path to dominate the AI search ecosystem and
                      move your site from traditional SEO into AI-native authority.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(123,116,239,0.18)_0%,rgba(255,255,255,0.04)_100%)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
                    <p className="text-[14px] text-white/60">Potential AI Score</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-[58px] font-semibold leading-none text-white">{projectedScore}</span>
                      <span className="pb-2 text-[18px] text-white/45">/100</span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-300">Potential +{projectedLift} point lift after priority fixes</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[13px] text-white/55">
                          <span>{verticalProfile.projectedLabel}</span>
                          <span>+{Math.max(4, projectedLift * 8)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#7d73ff_0%,#b8a8ff_100%)]" style={{ width: "84%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[13px] text-white/55">
                          <span>Brand Citation</span>
                          <span>{Math.max(1.4, overallScore / 30).toFixed(1)}x</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff8ea2_0%,#ffcfb6_100%)]" style={{ width: "62%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative mt-4">
                  <div className="absolute left-5 top-0 hidden h-full w-px bg-[linear-gradient(180deg,rgba(123,116,239,0.15)_0%,rgba(123,116,239,0.8)_50%,rgba(123,116,239,0.15)_100%)] lg:block lg:left-1/2 lg:-translate-x-1/2" />

                  <div className="space-y-5">
                    {roadmapBuckets.map((bucket, index) => (
                      <div key={bucket.title} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] lg:items-center">
                        <div className={`${index % 2 === 0 ? "lg:col-start-1" : "lg:col-start-1"}`}>
                          {index % 2 === 0 ? <RoadmapCard bucket={bucket} isGuest={isGuest} /> : null}
                        </div>
                        <div className="flex items-center justify-start lg:col-start-2 lg:justify-center">
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#10162b] text-white/90 shadow-[0_12px_24px_rgba(0,0,0,0.2)]">
                            {index + 1}
                          </div>
                        </div>
                        <div className={`${index % 2 === 1 ? "lg:col-start-3" : "lg:col-start-3"}`}>
                          {index % 2 === 1 ? <RoadmapCard bucket={bucket} isGuest={isGuest} /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,116,239,0.15)_0%,rgba(255,255,255,0.03)_100%)] p-6 md:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 text-[#d8cbff]">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-sm font-semibold uppercase tracking-[0.22em]">Want Rankio Experts To Implement These Fixes?</span>
                      </div>
                      <h3 className="mt-4 text-[26px] font-semibold tracking-tight text-white md:text-[36px]">
                        Let our team turn this roadmap into a live implementation plan.
                      </h3>
                      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/60">
                        Skip the learning curve. Our team can deploy the structural optimizations that move your score toward
                        the target threshold faster.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={handleImplementationStrategy}
                        size="lg"
                      >
                        Book Implementation Strategy
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                      >
                        View Implementation Pricing
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {rescanMessage && <p className="report-screen-chrome text-sm text-white/65">{rescanMessage}</p>}
            </div>
          </div>
        </main>

        <div className="report-screen-chrome">
          <Footer variant="app" />
        </div>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#11162a] p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:max-w-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(123,123,246,0.28),transparent_42%)]" />
            <div className="relative">
              <DialogHeader>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-[0_16px_36px_hsl(var(--accent)/0.36)]">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
                  Unlock your full AI report
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm leading-7 text-white/65">
                  {needsCreditTopUp
                    ? "Your report credits are finished. Choose a plan to unlock the full AI audit, recommendations, roadmap, and export-ready report."
                    : "You don't have an active plan yet. Choose a plan to unlock the full AI audit, recommendations, roadmap, and export-ready report."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Detailed AI audit and technical findings
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Prioritized roadmap and recommendations
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Export-ready full report
                </div>
              </div>

              <DialogFooter className="mt-6 gap-3 sm:justify-start">
                <Button asChild>
                  <Link
                    to="/dashboard/subscription"
                    state={{
                      from: `${location.pathname}${location.search}`,
                      reason: "report_unlock",
                      reportId: String(activeReport?.id ?? ""),
                    }}
                  >
                    Choose a plan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUpgradeOpen(false)}
                >
                  Continue preview
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ScanningModal
        open={scanningModalOpen}
        onOpenChange={setScanningModalOpen}
        websiteUrl={scanTargetUrl}
        onStopScan={handleStopScan}
      />

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={`${location.pathname}${location.search}`} />
    </>
  );
}






