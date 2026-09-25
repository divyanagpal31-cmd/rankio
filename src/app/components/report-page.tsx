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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Footer } from "./footer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useAuth } from "../providers/auth-provider";
import { useReports, useSubscription } from "../services/data-hooks";
import { cancelScan, runScan } from "../services/scan-service";
import { submitCallbackRequest } from "../services/callback-service";
import { ScanningModal } from "./scanning-modal";
import { isScanStateStale } from "../services/scan-staleness";
import { getVisitorId } from "../services/visitor-id";
import { TurnstileWidget, isCaptchaEnabled } from "./turnstile-widget";
import { openTawkChat } from "../services/tawk-service";
import { getPaymentPlanName } from "../services/payment-plans";

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
  tone: "violet" | "blue" | "emerald" | "rose" | "amber" | "slate";
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

type CallbackForm = {
  fullName: string;
  email: string;
  country: string;
  phone: string;
  company: string;
  requirements: string;
};

type CallbackFormErrors = Partial<Record<keyof CallbackForm, string>>;

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

const emptyCallbackForm: CallbackForm = {
  fullName: "",
  email: "",
  country: "",
  phone: "",
  company: "",
  requirements: "",
};

const countryDialCodes: Record<string, string> = {
  AC: "+247",
  AD: "+376",
  AE: "+971",
  AF: "+93",
  AG: "+1",
  AI: "+1",
  AL: "+355",
  AM: "+374",
  AO: "+244",
  AR: "+54",
  AS: "+1",
  AT: "+43",
  AU: "+61",
  AW: "+297",
  AX: "+358",
  AZ: "+994",
  BA: "+387",
  BB: "+1",
  BD: "+880",
  BE: "+32",
  BF: "+226",
  BG: "+359",
  BH: "+973",
  BI: "+257",
  BJ: "+229",
  BL: "+590",
  BM: "+1",
  BN: "+673",
  BO: "+591",
  BQ: "+599",
  BR: "+55",
  BS: "+1",
  BT: "+975",
  BW: "+267",
  BY: "+375",
  BZ: "+501",
  CA: "+1",
  CC: "+61",
  CD: "+243",
  CF: "+236",
  CG: "+242",
  CH: "+41",
  CI: "+225",
  CK: "+682",
  CL: "+56",
  CM: "+237",
  CN: "+86",
  CO: "+57",
  CR: "+506",
  CU: "+53",
  CV: "+238",
  CW: "+599",
  CX: "+61",
  CY: "+357",
  CZ: "+420",
  DE: "+49",
  DJ: "+253",
  DK: "+45",
  DM: "+1",
  DO: "+1",
  DZ: "+213",
  EC: "+593",
  EE: "+372",
  EG: "+20",
  EH: "+212",
  ER: "+291",
  ES: "+34",
  ET: "+251",
  FI: "+358",
  FJ: "+679",
  FK: "+500",
  FM: "+691",
  FO: "+298",
  FR: "+33",
  GA: "+241",
  GB: "+44",
  GD: "+1",
  GE: "+995",
  GF: "+594",
  GG: "+44",
  GH: "+233",
  GI: "+350",
  GL: "+299",
  GM: "+220",
  GN: "+224",
  GP: "+590",
  GQ: "+240",
  GR: "+30",
  GT: "+502",
  GU: "+1",
  GW: "+245",
  GY: "+592",
  HK: "+852",
  HN: "+504",
  HR: "+385",
  HT: "+509",
  HU: "+36",
  ID: "+62",
  IE: "+353",
  IL: "+972",
  IM: "+44",
  IN: "+91",
  IO: "+246",
  IQ: "+964",
  IR: "+98",
  IS: "+354",
  IT: "+39",
  JE: "+44",
  JM: "+1",
  JO: "+962",
  JP: "+81",
  KE: "+254",
  KG: "+996",
  KH: "+855",
  KI: "+686",
  KM: "+269",
  KN: "+1",
  KP: "+850",
  KR: "+82",
  KW: "+965",
  KY: "+1",
  KZ: "+7",
  LA: "+856",
  LB: "+961",
  LC: "+1",
  LI: "+423",
  LK: "+94",
  LR: "+231",
  LS: "+266",
  LT: "+370",
  LU: "+352",
  LV: "+371",
  LY: "+218",
  MA: "+212",
  MC: "+377",
  MD: "+373",
  ME: "+382",
  MF: "+590",
  MG: "+261",
  MH: "+692",
  MK: "+389",
  ML: "+223",
  MM: "+95",
  MN: "+976",
  MO: "+853",
  MP: "+1",
  MQ: "+596",
  MR: "+222",
  MS: "+1",
  MT: "+356",
  MU: "+230",
  MV: "+960",
  MW: "+265",
  MX: "+52",
  MY: "+60",
  MZ: "+258",
  NA: "+264",
  NC: "+687",
  NE: "+227",
  NF: "+672",
  NG: "+234",
  NI: "+505",
  NL: "+31",
  NO: "+47",
  NP: "+977",
  NR: "+674",
  NU: "+683",
  NZ: "+64",
  OM: "+968",
  PA: "+507",
  PE: "+51",
  PF: "+689",
  PG: "+675",
  PH: "+63",
  PK: "+92",
  PL: "+48",
  PM: "+508",
  PR: "+1",
  PS: "+970",
  PT: "+351",
  PW: "+680",
  PY: "+595",
  QA: "+974",
  RE: "+262",
  RO: "+40",
  RS: "+381",
  RU: "+7",
  RW: "+250",
  SA: "+966",
  SB: "+677",
  SC: "+248",
  SD: "+249",
  SE: "+46",
  SG: "+65",
  SH: "+290",
  SI: "+386",
  SJ: "+47",
  SK: "+421",
  SL: "+232",
  SM: "+378",
  SN: "+221",
  SO: "+252",
  SR: "+597",
  SS: "+211",
  ST: "+239",
  SV: "+503",
  SX: "+1",
  SY: "+963",
  SZ: "+268",
  TA: "+290",
  TC: "+1",
  TD: "+235",
  TG: "+228",
  TH: "+66",
  TJ: "+992",
  TK: "+690",
  TL: "+670",
  TM: "+993",
  TN: "+216",
  TO: "+676",
  TR: "+90",
  TT: "+1",
  TV: "+688",
  TW: "+886",
  TZ: "+255",
  UA: "+380",
  UG: "+256",
  US: "+1",
  UY: "+598",
  UZ: "+998",
  VA: "+39",
  VC: "+1",
  VE: "+58",
  VG: "+1",
  VI: "+1",
  VN: "+84",
  VU: "+678",
  WF: "+681",
  WS: "+685",
  XK: "+383",
  YE: "+967",
  YT: "+262",
  ZA: "+27",
  ZM: "+260",
  ZW: "+263",
};

const fallbackCountries = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "DK", name: "Denmark" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

function getCountryOptions() {
  const buildOption = ({ code, name }: { code: string; name: string }) => {
    const displayCode = countryDialCodes[code] ?? code;
    return {
      code,
      name,
      label: `${name} (${displayCode})`,
    };
  };

  try {
    const supportedValuesOf = (Intl as any).supportedValuesOf as ((key: string) => string[]) | undefined;
    const regionCodes = supportedValuesOf?.("region") ?? [];
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const countries = regionCodes
      .map((code) => ({ code, name: displayNames.of(code) ?? "" }))
      .filter((country) => Boolean(country.name))
      .filter((country) => !/unknown region/i.test(country.name));

    return countries
      .map(buildOption)
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return fallbackCountries.map(buildOption).sort((left, right) => left.name.localeCompare(right.name));
  }
}

const countryOptions = getCountryOptions();

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
  "This report identifies the highest-impact improvements across AI search visibility, structured data, content clarity, and technical visibility.";

function clampScore(value: number | null | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

function coverageLabel(matchingCount: number, totalCount: number, labels = { none: "Missing", partial: "Partial", full: "Strong" }) {
  if (totalCount <= 0) return "Not checked";
  if (matchingCount <= 0) return labels.none;
  if (matchingCount >= totalCount) return labels.full;
  return labels.partial;
}

function availableLabel(count: number, labels = { none: "Not found", some: "Available" }) {
  return count > 0 ? labels.some : labels.none;
}

function linkStructureDisplay(internalLinksOut: number, internalLinksIn: number) {
  const totalLinks = internalLinksOut + internalLinksIn;

  if (totalLinks >= 20) {
    return {
      value: "Strong",
      detail: "Important pages appear well connected, which helps visitors and AI tools follow related information.",
    };
  }

  if (totalLinks > 0) {
    return {
      value: "Needs review",
      detail: "Some internal links were found, but key pages may need stronger connections to related content.",
    };
  }

  return {
    value: "Not found",
    detail: "Add helpful links between related pages so visitors and AI tools can understand how the site fits together.",
  };
}

function discoveryNoteDisplay(note?: string | null) {
  const value = String(note ?? "").trim();

  if (!value) {
    return {
      value: "No note",
      detail: "No extra discovery notes were recorded for this scan.",
    };
  }

  if (/sitemap/i.test(value)) {
    return {
      value: "Sitemap found",
      detail: "The scan found sitemap information that can help search engines and AI tools discover important pages.",
    };
  }

  if (/robots/i.test(value)) {
    return {
      value: "Crawl rules found",
      detail: "The scan found access instructions for search engines and AI tools.",
    };
  }

  if (/browser|render/i.test(value)) {
    return {
      value: "Page display checked",
      detail: "The scan checked whether page content is visible after the page loads.",
    };
  }

  return {
    value: "Reviewed",
    detail: "An additional discovery signal was checked during the scan.",
  };
}

function sitemapStatusDisplay(count: number) {
  if (count > 0) {
    return {
      value: "Found",
      detail: "A sitemap was found. This helps search engines and AI tools discover important pages faster.",
    };
  }

  return {
    value: "Not found",
    detail: "Add or submit a sitemap so search engines and AI tools can discover important pages more easily.",
  };
}

function contentDepthDisplay(totalWordCount: number) {
  if (totalWordCount >= 4000) {
    return {
      value: "Strong",
      detail: "The reviewed content gives AI enough context to understand the site's main topics.",
    };
  }

  if (totalWordCount >= 1200) {
    return {
      value: "Moderate",
      detail: "The reviewed content gives AI some useful context, but important topics may need more detail.",
    };
  }

  return {
    value: "Needs more detail",
    detail: "The reviewed content may be too thin for AI tools to understand the site's main topics clearly.",
  };
}

function structuredDetailDisplay(schemaTypes: string[]) {
  const normalizedTypes = schemaTypes.map((type) => String(type ?? "").toLowerCase());
  const includesType = (patterns: RegExp[]) => normalizedTypes.some((type) => patterns.some((pattern) => pattern.test(type)));
  const details: string[] = [];

  if (includesType([/organization/, /brand/, /corporation/, /localbusiness/])) details.push("brand or business details");
  if (includesType([/website/, /webpage/])) details.push("website identity");
  if (includesType([/review/, /rating/])) details.push("reviews and trust signals");
  if (includesType([/faq/])) details.push("question-and-answer content");
  if (includesType([/product/, /offer/])) details.push("product or offer details");
  if (includesType([/article/, /blogposting/, /newsarticle/])) details.push("article content");
  if (includesType([/breadcrumb/])) details.push("page navigation");

  const uniqueDetails = Array.from(new Set(details));
  if (uniqueDetails.length === 0) {
    return {
      value: "Not found",
      detail: "Add business, website, review, and FAQ details so AI tools can understand the site more easily.",
    };
  }

  const visibleDetails = uniqueDetails.slice(0, 3);
  const extraCount = uniqueDetails.length - visibleDetails.length;
  return {
    value: visibleDetails.map((detail) => detail.charAt(0).toUpperCase() + detail.slice(1)).join(", "),
    detail: `AI-readable details found for ${visibleDetails.join(", ")}${extraCount > 0 ? `, and ${extraCount} more area${extraCount === 1 ? "" : "s"}` : ""}.`,
  };
}

function aiBotAccessDisplay(access?: any, hasRobotsTxt?: boolean | null): { value: string; detail: string; tone: ScoreCard["tone"] } {
  const status = String(access?.status ?? "").trim();

  if (status === "allowed") {
    return {
      value: "Allowed",
      detail: "Robots.txt does not appear to block the common AI crawlers we checked.",
      tone: "emerald",
    };
  }

  if (status === "blocked") {
    return {
      value: "Blocked",
      detail: "Robots.txt appears to block common AI crawlers from accessing the site.",
      tone: "rose",
    };
  }

  if (status === "partially_blocked") {
    return {
      value: "Needs review",
      detail: "Robots.txt may limit access for some AI crawlers or important site sections.",
      tone: "amber",
    };
  }

  return {
    value: "Not checked",
    detail: hasRobotsTxt ? "Robots.txt was found, but AI crawler access was not checked for this report." : "Robots.txt was not found or could not be checked.",
    tone: "slate",
  };
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

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return /^\+?[0-9 ()-]{7,20}$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}

function validateCallbackForm(form: CallbackForm): CallbackFormErrors {
  const errors: CallbackFormErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const country = form.country.trim();
  const phone = form.phone.trim();
  const company = form.company.trim();
  const requirements = form.requirements.trim();

  if (!fullName) errors.fullName = "Name is required.";
  else if (fullName.length < 2) errors.fullName = "Name must be at least 2 characters.";
  else if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(fullName)) errors.fullName = "Use letters, spaces, apostrophes, periods, or hyphens only.";

  if (!email) errors.email = "Email is required.";
  else if (!isValidEmailAddress(email)) errors.email = "Enter a valid email address.";

  if (!country) errors.country = "Country is required.";
  else if (country.length < 2) errors.country = "Country must be at least 2 characters.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!isValidPhoneNumber(phone)) errors.phone = "Enter a valid phone number.";

  if (company.length > 200) errors.company = "Company must be 200 characters or less.";

  if (!requirements) errors.requirements = "Requirements are required.";
  else if (requirements.length < 20) errors.requirements = "Please add at least 20 characters.";

  return errors;
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

function scanScopeFromUrl(value?: string | null) {
  try {
    const url = new URL(String(value ?? ""));
    const path = url.pathname.replace(/\/+$/, "");
    const isLandingPage = Boolean(path && path !== "/");

    return {
      label: isLandingPage ? "Landing Page" : "Website",
      targetLabel: isLandingPage ? `${url.host.replace(/^www\./i, "")}${path}` : url.host.replace(/^www\./i, ""),
      description: isLandingPage
        ? "We analyzed your website's homepage and relevant publicly accessible pages to identify key visibility, technical, and content signals."
        : "We analyzed your website's homepage and relevant publicly accessible pages to identify key visibility, technical, and content signals.",
    };
  } catch {
    return {
      label: "Website",
      targetLabel: hostFromUrl(value),
      description: "We analyzed your website's homepage and relevant publicly accessible pages to identify key visibility, technical, and content signals.",
    };
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
        summaryTitle: "AI Visibility Executive Overview",
        summaryLead:
          "Your store's product pages, category structure, and offer markup determine how well AI assistants can recommend your products.",
        summaryBody:
          "This report highlights the signals that influence shopping intent, product discovery, and answer engine citations for retail and catalog sites.",
        categoryCopy: {
          seo: "How easily shoppers and search tools can find product and category pages.",
          ai: "How clearly AI tools can understand products, offers, and buying intent.",
          ux: "Navigation, filters, and purchase-path clarity.",
          tech: "How quickly product pages load and how reliably the shopping journey works.",
        },
        contentFocus: "Product Entity Mapping",
        structuredFocus: "product, offer, and review details",
        semanticFocus: "variant, brand, and collection relationships",
        uxFocus: "easy product browsing and purchase clarity",
        techFocus: "catalog speed and page display reliability",
        roadmapTitle: "Strategic Commerce AI Roadmap",
        roadmapLead: "Retail-specific fixes that improve visibility, citation rate, and conversion confidence.",
        roadmapSummary:
          "Prioritize product details, category structure, and page speed so AI systems can trust and recommend your catalog with less ambiguity.",
        projectedLabel: "Possible Commerce Score After Fixes",
      };
    case "saas":
      return {
        key: vertical,
        label: "SaaS",
        audience: "SaaS Teams",
        summaryTitle: "AI Visibility Executive Overview",
        summaryLead:
          "Your product pages, docs, and feature explanations determine how well AI systems understand your offer and recommend it in tool comparisons.",
        summaryBody:
          "This report emphasizes pricing pages, docs, feature clarity, and trust signals that matter for software evaluation and acquisition intent.",
        categoryCopy: {
          seo: "How easily people and search tools can find feature, pricing, and help pages.",
          ai: "How clearly AI tools can understand features, use cases, and comparisons.",
          ux: "Demo funnels, navigation, and value-prop clarity.",
          tech: "How quickly product and documentation pages load.",
        },
        contentFocus: "Feature and use-case mapping",
        structuredFocus: "product, software, and FAQ details",
        semanticFocus: "Feature, workflow, and use-case relationships",
        uxFocus: "Trial and demo journey clarity",
        techFocus: "app speed and documentation delivery",
        roadmapTitle: "Strategic SaaS AI Roadmap",
        roadmapLead: "Fix the pages that influence demo interest, trust, and AI-driven shortlist inclusion.",
        roadmapSummary:
          "Strengthen product messaging, documentation structure, and structured data so AI agents can explain what your software does and who it is for.",
        projectedLabel: "Possible SaaS Score After Fixes",
      };
    case "local":
      return {
        key: vertical,
        label: "Nearby Customer Visibility",
        audience: "Local and Service Businesses",
        summaryTitle: "AI Visibility Executive Overview",
        summaryLead:
          "This checks whether AI tools can understand where you serve customers, what you offer, and how people can contact you.",
        summaryBody:
          "This report focuses on clear business details, service pages, customer trust signals, and location information that help AI recommend your business to the right people.",
        categoryCopy: {
          seo: "Whether your locations, service areas, and trust signals are easy to find.",
          ai: "Whether AI can understand your business, services, and customer locations.",
          ux: "Whether visitors can quickly find contact details, phone numbers, and directions.",
          tech: "Whether mobile pages load reliably for customers and AI tools.",
        },
        contentFocus: "clear service and location information",
        structuredFocus: "business details, services, and FAQs",
        semanticFocus: "how your services, locations, and brand trust connect",
        uxFocus: "easy contact details and directions",
        techFocus: "fast mobile pages and reliable local pages",
        roadmapTitle: "Local AI Visibility Roadmap",
        roadmapLead: "Improve the signals that help AI tools recommend your business when nearby customers search for your services.",
        roadmapSummary:
          "Make your business name, address, phone, services, and locations clear so customers and AI tools can trust the information.",
        projectedLabel: "Possible Local Visibility After Fixes",
      };
    case "content":
      return {
        key: vertical,
        label: "Content / Media",
        audience: "Content Teams",
        summaryTitle: "AI Visibility Executive Overview",
        summaryLead:
          "Your article structure, topic depth, and internal links determine how easily AI systems can quote and summarize your work.",
        summaryBody:
          "This report emphasizes editorial clarity, topic authority, and citation visibility for blogs, publications, and resource libraries.",
        categoryCopy: {
          seo: "How easily people and search tools can find topic hubs and articles.",
          ai: "How clearly AI tools can understand, quote, and summarize the content.",
          ux: "Readability, structure, and article navigation.",
          tech: "How quickly articles, media, and archive pages load.",
        },
        contentFocus: "Topic and article mapping",
        structuredFocus: "article, FAQ, and author details",
        semanticFocus: "topic groups and author trust",
        uxFocus: "Readability and hierarchy",
        techFocus: "Archive speed and media delivery",
        roadmapTitle: "Strategic Content AI Roadmap",
        roadmapLead: "Turn editorial assets into a clearer, more quotable knowledge base for AI search.",
        roadmapSummary:
          "Sharpen topic clusters, author trust, and article structure so your content becomes a stronger source for answers and summaries.",
        projectedLabel: "Possible Content Score After Fixes",
      };
    default:
      return {
        key: vertical,
        label: "Website",
        audience: "Executive Board",
        summaryTitle: "AI Visibility Executive Overview",
        summaryLead:
          "Your site's structure, content clarity, and technical delivery determine how well AI systems can understand and recommend it.",
        summaryBody:
          "This report highlights the most important improvements across discovery, interpretability, and technical reliability.",
        categoryCopy: {
          seo: "How easily people and search tools can find and understand important pages.",
          ai: "How clearly AI tools can understand, trust, and recommend the site.",
          ux: "How easily visitors can understand the site and take action.",
          tech: "How quickly pages load and how reliably important content appears.",
        },
        contentFocus: "content clarity",
        structuredFocus: "business details, page details, and FAQs",
        semanticFocus: "how the brand, topics, and services connect",
        uxFocus: "Hierarchy and accessibility",
        techFocus: "Speed and delivery quality",
        roadmapTitle: "Strategic AI Visibility Roadmap",
        roadmapLead: "Focused improvements that move the site toward stronger AI visibility and answerability.",
        roadmapSummary:
          "Prioritize the issues that most directly influence how AI systems find, understand, and cite your pages.",
        projectedLabel: "Possible Score After Fixes",
      };
  }
}

function displayUrl(value?: string | null) {
  const fallback = String(value ?? "").trim();
  if (!fallback) return "";
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

function maturityDescription(score: number) {
  if (score >= 86) return "Your website is well-prepared for AI visibility and answer engines.";
  if (score >= 71) return "Your website is in a strong position, with a few improvements left to make.";
  if (score >= 56) return "Your website is making progress, but still needs important improvements.";
  return "Your website is at an early stage and needs foundational AI-visibility improvements.";
}

function maturityShortDescription(label: string) {
  switch (label) {
    case "AI-Leading":
      return "Strong AI visibility";
    case "Optimized":
      return "Nearly ready";
    case "Developing":
      return "Improving steadily";
    default:
      return "Needs core fixes";
  }
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
    case "amber":
      return {
        ring: "from-[#ffe5a3] via-[#f7cd7b] to-[#e6a94e]",
        text: "text-[#f7e3b0]",
        border: "border-[#f1cf7f]/30",
      };
    case "slate":
      return {
        ring: "from-[#d6d9e6] via-[#a6adbf] to-[#788196]",
        text: "text-white/70",
        border: "border-white/15",
      };
  }
}

function severityTone(severity: string) {
  if (severity === "Critical") return "border-[#ff8ea2]/35 bg-[#301a2a] text-[#ffb5c7]";
  if (severity === "High") return "border-[#ff6b6b]/40 bg-[#32181c] text-[#ffaaa8]";
  if (severity === "Medium") return "border-[#8d8bff]/35 bg-[#202044] text-[#c9c8ff]";
  return "border-[#7ad7b4]/30 bg-[#17251f] text-[#b7f0d8]";
}

function bucketForTitle(title: string) {
  const value = title.toLowerCase();
  if (/(nap|business details|address|telephone|phone)/.test(value)) return "content-intelligence";
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
  if (!isDisplayableContentPageUrl(fallback)) return "Site-wide";
  try {
    const url = new URL(fallback);
    const path = `${url.pathname}${url.search}`.replace(/\/$/, "") || "/";
    return `${url.hostname.replace(/^www\./i, "")}${path}`;
  } catch {
    return fallback.replace(/^https?:\/\//i, "").replace(/^www\./i, "") || "Site-wide";
  }
}

function isDisplayableContentPageUrl(value?: string | null) {
  const fallback = String(value ?? "").trim();
  if (!fallback) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(fallback) ? fallback : `https://${fallback}`);
    const pathname = url.pathname.toLowerCase();
    if (/\.(xml|txt|json|rss|atom|pdf|zip|gz|jpg|jpeg|png|gif|webp|svg|ico|css|js|map|mp4|webm|mp3|wav|woff|woff2|ttf|eot)$/i.test(pathname)) return false;
    if (/(^|\/)(sitemap|feed|rss|atom)([-_a-z0-9]*)?\.(xml|txt|json)$/i.test(pathname)) return false;
    if (/(^|\/)(sitemap|feed|rss|atom)(\/|$)/i.test(pathname)) return false;
    return true;
  } catch {
    return true;
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
  if (!evidence || typeof evidence !== "object") return "Evidence captured from the site review.";

  if (Array.isArray(evidence.brokenLinks) && evidence.brokenLinks.length > 0) {
    const firstBrokenLink = evidence.brokenLinks[0];
    const target = firstBrokenLink?.url ? formatAffectedPage(String(firstBrokenLink.url)) : "an internal page";
    return `${evidence.brokenLinkCount ?? evidence.brokenLinks.length} broken link(s) detected, including ${target}.`;
  }

  if ("pagesWithMeta" in evidence && "totalPages" in evidence) {
    const pagesWithMeta = Number(evidence.pagesWithMeta ?? 0);
    const totalPages = Number(evidence.totalPages ?? 0);
    if (pagesWithMeta <= 0) return "Meta descriptions were not found on the reviewed key pages.";
    if (totalPages > 0 && pagesWithMeta >= totalPages) return "Meta descriptions are present across the reviewed key pages.";
    return "Meta descriptions are missing from some reviewed key pages.";
  }

  if ("pagesWithOneH1" in evidence && "totalPages" in evidence) {
    const pagesWithOneH1 = Number(evidence.pagesWithOneH1 ?? 0);
    const totalPages = Number(evidence.totalPages ?? 0);
    if (pagesWithOneH1 <= 0) return "Clear main headings were not found on the reviewed key pages.";
    if (totalPages > 0 && pagesWithOneH1 >= totalPages) return "Reviewed key pages have clear main headings.";
    return "Some reviewed key pages need a clearer main heading.";
  }

  if ("totalPages" in evidence) {
    return "This signal was checked across the reviewed key pages.";
  }

  if ("totalSchema" in evidence) {
    return Number(evidence.totalSchema ?? 0) > 0
      ? "Structured details were detected across the reviewed pages."
      : "No structured details were detected across the reviewed pages.";
  }

  if (evidence.schemaValidation && typeof evidence.schemaValidation === "object") {
    const validation = evidence.schemaValidation;
    return `${Number(validation.errorCount ?? 0)} structured detail issue(s) and ${Number(validation.warningCount ?? 0)} recommendation(s) found.`;
  }

  if (evidence.napConsistency && typeof evidence.napConsistency === "object") {
    const nap = evidence.napConsistency;
    const inconsistent = safeArray<string>(nap.inconsistentFields);
    return inconsistent.length > 0
      ? `Inconsistent business details found for: ${inconsistent.join(", ")}.`
      : "Business details were checked across the reviewed key pages.";
  }

  if ("confidence" in evidence) {
    return `Brand confidence is ${clampScore(Number(evidence.confidence ?? 0), 0)}/100 based on detected brand and profile signals.`;
  }

  if ("accessibilityScore" in evidence) {
    return `Accessibility score is ${clampScore(Number(evidence.accessibilityScore ?? 0), 0)}/100.`;
  }

  if ("avgPageScore" in evidence || "totalWordCount" in evidence) {
    return `Average page quality is ${clampScore(Number(evidence.avgPageScore ?? 0), 0)}/100 based on reviewed content depth.`;
  }

  const firstEntry = Object.entries(evidence).find(([, value]) => value !== null && value !== undefined && value !== "");
  if (!firstEntry) return "Evidence captured from the site review.";

  const [key, value] = firstEntry;
  const displayValue = Array.isArray(value) ? `${value.length} item(s)` : String(value);
  return `${humanizeSignal(key)}: ${displayValue}`;
}

function issueImpact(severity: string, bucket: string) {
  if (severity === "Critical" || severity === "High") {
    return bucket === "technical-performance"
      ? "Can make important pages harder to access, load, or trust."
      : "Can make AI tools less confident when understanding or recommending the site.";
  }

  if (severity === "Medium") {
    return "Creates avoidable confusion for AI tools and search engines.";
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

function hidePageCountCopy(value?: string | null) {
  return String(value ?? "")
    .replace(/\b\d+\s+of\s+\d+\s+(?:reviewed|crawled|sampled)\s+pages?\b/gi, "Reviewed key pages")
    .replace(/\b\d+\s+(?:reviewed|crawled|sampled)\s+page\(s\)/gi, "Reviewed key pages")
    .replace(/\b\d+\s+(?:reviewed|crawled|sampled)\s+pages?\b/gi, "Reviewed key pages")
    .replace(/\bacross\s+\d+\s+(?:reviewed|crawled|sampled)\s+page\(s\)/gi, "across the reviewed key pages")
    .replace(/\bacross\s+\d+\s+(?:reviewed|crawled|sampled)\s+pages?\b/gi, "across the reviewed key pages")
    .replace(/\(\d+\s+checked\)/gi, "")
    .replace(/\bcrawled pages\b/gi, "reviewed key pages")
    .replace(/\bsampled pages\b/gi, "reviewed key pages")
    .replace(/\breviewed pages\b/gi, "reviewed key pages")
    .replace(/\s+/g, " ")
    .trim();
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
      const suggestion = hidePageCountCopy(item?.recommendation ?? item?.suggestion) || parameter;
      const status = severity === "Critical" || severity === "High" ? "error" : severity === "Medium" ? "warning" : "success";
      const category = String(item?.category ?? "").trim();
      const pageUrl = item?.pageUrl ?? item?.page_url ?? null;
      const signalKey = item?.signalKey ?? item?.signal_key ?? null;

      if (String(signalKey ?? "").trim() === "thin_content" && pageUrl && !isDisplayableContentPageUrl(String(pageUrl))) {
        return null;
      }

      return {
        parameter,
        status,
        severity,
        suggestion,
        description: hidePageCountCopy(item?.description),
        evidence: item?.evidence && typeof item.evidence === "object" ? item.evidence : null,
        pageUrl: pageUrl && isDisplayableContentPageUrl(String(pageUrl)) ? pageUrl : null,
        signalKey,
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

async function claimVisitorReportForUser(reportId: string, accessToken?: string | null) {
  if (!accessToken) return false;

  const visitorId = getVisitorId();
  const { data, error } = await supabase.functions.invoke("claim-visitor", {
    body: {
      report_id: reportId,
      visitor_id: visitorId,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    console.warn("claim visitor report failed", error);
    return false;
  }

  const claimed = Number((data as any)?.claimed ?? 0);
  const merged = Number((data as any)?.merged ?? 0);
  if (claimed > 0 || merged > 0) {
    window.dispatchEvent(new Event("rankio:visitor-claimed"));
    window.dispatchEvent(new Event("rankio:dashboard-refresh"));
  }

  return true;
}

function normalizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[-—]/g, "-")
    .replace(/-/g, "-")
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


function copyComputedStyles(source: Element, target: Element) {
  if (!(source instanceof HTMLElement || source instanceof SVGElement) || !(target instanceof HTMLElement || target instanceof SVGElement)) {
    return;
  }

  const computed = window.getComputedStyle(source);
  const style = target instanceof HTMLElement || target instanceof SVGElement ? target.style : null;
  if (style) {
    for (const property of Array.from(computed)) {
      style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) copyComputedStyles(child, targetChild);
  });
}

function absolutizeCloneUrls(clone: HTMLElement) {
  clone.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const src = image.getAttribute("src");
    if (!src) return;
    try {
      image.setAttribute("src", new URL(src, window.location.origin).href);
    } catch {
      // Keep the original source if URL parsing fails.
    }
  });
}

function serializeSvgMarkup(markup: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function binaryFromBase64(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function escapePdfName(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function buildImagePdfBlob(images: Array<{ dataUrl: string; width: number; height: number }>) {
  const pageWidth = 595;
  const pageHeight = 842;
  const encoder = new TextEncoder();
  const objects: Array<string | Uint8Array> = [];
  const addObject = (body: string | Uint8Array) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesObjectIndex = objects.length;
  objects.push("");
  const pageIds: number[] = [];

  images.forEach((image, index) => {
    const imageName = escapePdfName(`Im${index + 1}`);
    const base64 = image.dataUrl.split(",")[1] ?? "";
    const imageBytes = binaryFromBase64(base64);
    const imageHeader = encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
    );
    const imageFooter = encoder.encode("\nendstream");
    const imageId = addObject(concatBytes(imageHeader, imageBytes, imageFooter));
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/${imageName} Do\nQ`;
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[pagesObjectIndex] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;

  const pushString = (value: string) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    length += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    length += bytes.length;
  };

  objects.forEach((object, index) => {
    offsets.push(length);
    pushString(`${index + 1} 0 obj\n`);
    if (object instanceof Uint8Array) pushBytes(object);
    else pushString(object);
    pushString("\nendobj\n");
  });

  const xrefOffset = length;
  pushString(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index < offsets.length; index += 1) {
    pushString(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushString(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

async function renderReportSliceToJpeg(element: HTMLElement, options: { offsetY: number; sliceHeight: number; width: number; scale: number }) {
  const clone = element.cloneNode(true) as HTMLElement;
  copyComputedStyles(element, clone);
  absolutizeCloneUrls(clone);
  clone.querySelectorAll(".report-pdf-exclude").forEach((node) => node.remove());
  clone.style.width = `${options.width}px`;
  clone.style.maxWidth = `${options.width}px`;
  clone.style.margin = "0";
  clone.style.transform = `translateY(-${options.offsetY}px)`;
  clone.style.transformOrigin = "top left";

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.sliceHeight}" viewBox="0 0 ${options.width} ${options.sliceHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${options.width}px;height:${options.sliceHeight}px;overflow:hidden;background:#071225;">
          ${clone.outerHTML}
        </div>
      </foreignObject>
    </svg>`;

  const svgUrl = serializeSvgMarkup(html);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to render report section for PDF export."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(options.width * options.scale);
    canvas.height = Math.ceil(options.sliceHeight * options.scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare PDF canvas.");

    context.fillStyle = "#071225";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    // Data URLs do not need explicit cleanup.
  }
}

async function buildVisualReportPdfBlob(element: HTMLElement) {
  await document.fonts?.ready;

  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width || element.scrollWidth || 1000);
  const pagePaddingX = 44;
  const pagePaddingY = 44;
  const pageWidth = width + pagePaddingX * 2;
  const pageHeight = Math.ceil(pageWidth * (842 / 595));
  const contentHeight = pageHeight - pagePaddingY * 2;
  const totalHeight = Math.ceil(element.scrollHeight || rect.height);
  const scale = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1));
  const images: Array<{ dataUrl: string; width: number; height: number }> = [];

  for (let offsetY = 0; offsetY < totalHeight; offsetY += contentHeight) {
    const sliceHeight = Math.min(contentHeight, totalHeight - offsetY);
    const image = await renderReportSliceToJpeg(element, {
      offsetY,
      sliceHeight,
      width,
      scale,
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(pageWidth * scale);
    canvas.height = Math.ceil(pageHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare PDF page canvas.");

    context.fillStyle = "#071225";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const sectionImage = new Image();
    await new Promise<void>((resolve, reject) => {
      sectionImage.onload = () => resolve();
      sectionImage.onerror = () => reject(new Error("Unable to compose PDF page."));
      sectionImage.src = image.dataUrl;
    });
    context.drawImage(sectionImage, pagePaddingX * scale, pagePaddingY * scale);

    images.push({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return buildImagePdfBlob(images);
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
  const SCAN_COMPLETE_DELAY_MS = 4700;
  const { reports, loading: reportsLoading } = useReports();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { user, session, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [leavePreviewOpen, setLeavePreviewOpen] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanMessage, setRescanMessage] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [recentReportDialogOpen, setRecentReportDialogOpen] = useState(false);
  const [recentReportTarget, setRecentReportTarget] = useState<any | null>(null);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackForm, setCallbackForm] = useState<CallbackForm>(emptyCallbackForm);
  const [callbackErrors, setCallbackErrors] = useState<CallbackFormErrors>({});
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);
  const [callbackNotice, setCallbackNotice] = useState<string | null>(null);
  const [callbackCaptchaToken, setCallbackCaptchaToken] = useState("");
  const [callbackCaptchaError, setCallbackCaptchaError] = useState<string | null>(null);
  const [callbackCaptchaKey, setCallbackCaptchaKey] = useState(0);
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [scanTargetUrl, setScanTargetUrl] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const [stalePromptOpen, setStalePromptOpen] = useState(false);
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const lastActiveAtRef = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActiveAtRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markActive();
      }
    };

    markActive();
    window.addEventListener("focus", markActive);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", markActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
  const [unlockingReport, setUnlockingReport] = useState(false);
  const [unlockAttemptedReportId, setUnlockAttemptedReportId] = useState<string | null>(null);
  const [unlockFailedReportId, setUnlockFailedReportId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [searchConsoleSnapshot, setSearchConsoleSnapshot] = useState<any | null>(null);
  const [searchConsoleLoading, setSearchConsoleLoading] = useState(false);
  const [ga4Snapshot, setGa4Snapshot] = useState<any | null>(null);
  const [ga4Loading, setGa4Loading] = useState(false);
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

      const fetchReport = async () => {
        let reportQuery = supabase
          .from("reports")
          .select(user ? "*, websites!inner(user_id, url, normalized_url)" : "*, websites(url, normalized_url)")
          .eq("id", reportId);

        if (user) {
          reportQuery = reportQuery.eq("websites.user_id", user.id);
        }

        return reportQuery.maybeSingle();
      };

      let { data, error } = await fetchReport();

      if (!error && !data && user && session?.access_token) {
        const claimed = await claimVisitorReportForUser(reportId, session.access_token);
        if (claimed) {
          const retry = await fetchReport();
          data = retry.data;
          error = retry.error;
        }
      }

      if (cancelled) return;

      if (error) {
        setReportById(null);
        setReportError(error.message);
      } else {
        const resolvedReport = data ? (data as any) : (safeLocalReport ? safeLocalReport : null);
        setReportById(resolvedReport);
        if (resolvedReport) {
          writeReportCache(reportId, resolvedReport);
        } else if (user) {
          setReportError("This report belongs to another account or is no longer available.");
        }
      }

      setLoadingReport(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reportId, reportFromState, session?.access_token, user]);

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
  const aiCrawlerAccess = crawlerPayload?.aiCrawlerAccess ?? null;
  const aiBotAccess = useMemo(() => aiBotAccessDisplay(aiCrawlerAccess, Boolean(crawlerPayload?.robotsTxt)), [aiCrawlerAccess, crawlerPayload?.robotsTxt]);
  const crawlerPages = useMemo(() => safeArray<any>(crawlerPayload?.pages), [crawlerPayload?.pages]);
  const crawlerBrokenLinks = useMemo(() => safeArray<any>(crawlerPayload?.brokenLinks), [crawlerPayload?.brokenLinks]);
  const crawlerDiscoveryNotes = useMemo(() => safeArray<string>(crawlerPayload?.discoveryNotes), [crawlerPayload?.discoveryNotes]);
  const schemaValidation = crawlerPayload?.schemaValidation ?? {};
  const topicAnalysis = crawlerPayload?.topicAnalysis ?? {};
  const napConsistency = crawlerPayload?.napConsistency ?? {};
  const entityEnrichment = crawlerPayload?.entityEnrichment ?? {};
  const reportFindings = useMemo(() => safeArray<any>(analysisPayload?.findings), [analysisPayload?.findings]);
  const crux = useMemo(() => getCruxMetrics(rawScanData), [rawScanData]);
  const reportQuota = toFiniteNumber(subscription?.report_quota);
  const reportsUsed = toFiniteNumber(subscription?.reports_used) ?? 0;
  const hasRemainingCredits = reportQuota !== null && reportsUsed < reportQuota;
  const hasSubscriptionAccess = !!user && (subscription?.lifetime_access === true || hasRemainingCredits);
  const isFullReport = !!user && String((activeReport as any)?.report_level ?? "").trim().toLowerCase() === "full";
  const canAutoUnlockReport = !!reportId && !!user && !!activeReport && !isFullReport;
  const isUnlockPending =
    unlockingReport ||
    (canAutoUnlockReport && unlockAttemptedReportId !== reportId && unlockFailedReportId !== reportId);
  const hasPaidAccess = reportId ? isFullReport : hasSubscriptionAccess;
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
  useEffect(() => {
    if (!reportId || !user || !activeReport || loadingReport || unlockingReport) return;
    if (String((activeReport as any)?.report_level ?? "").trim().toLowerCase() === "full") return;
    if (unlockAttemptedReportId === reportId || unlockFailedReportId === reportId) return;

    let cancelled = false;

    const unlockReport = async () => {
      setUnlockingReport(true);
      setUnlockAttemptedReportId(reportId);

      const { data, error } = await supabase.rpc("unlock_report_with_credit", {
        p_report_id: reportId,
      });

      if (cancelled) return;

      const status = String((data as any)?.status ?? "").trim();
      if (error || status !== "success") {
        console.warn("automatic report unlock failed", error ?? data);
        setUnlockFailedReportId(reportId);
        setUnlockingReport(false);
        return;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("reports")
        .select("*, websites!inner(user_id, url, normalized_url)")
        .eq("id", reportId)
        .eq("websites.user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!refreshError && refreshed) {
        const resolvedReport = refreshed as any;
        setReportById(resolvedReport);
        writeReportCache(reportId, resolvedReport);
        try {
          sessionStorage.setItem(getReportUnlockStorageKey(user.id, reportId), "1");
        } catch {
          // ignore storage failures
        }
      } else {
        setReportById((current: any) => current ? { ...current, report_level: "full", generated_by: "authenticated" } : current);
      }

      window.dispatchEvent(new Event("rankio:subscription-updated"));
      window.dispatchEvent(new Event("rankio:dashboard-refresh"));
      setUnlockingReport(false);
    };

    void unlockReport();

    return () => {
      cancelled = true;
    };
  }, [activeReport, loadingReport, reportId, unlockAttemptedReportId, unlockFailedReportId, unlockingReport, user]);

  const linkedWebsite = (activeReport as any)?.websites ?? null;
  const display = displayUrl(
    linkedWebsite?.url ??
      linkedWebsite?.normalized_url ??
      (activeReport as any)?.website_url ??
      (activeReport as any)?.url ??
      (activeReport as any)?.site ??
      rawScanData?.rankio?.url ??
      rawScanData?.url ??
      rawScanData?.site ??
      rawScanData?.lighthouseResult?.finalUrl ??
      rawScanData?.lighthouseResult?.requestedUrl
  );
  const displayHost = hostFromUrl(display);
  const scanScope = scanScopeFromUrl(display);
  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.slice(0, 2)?.toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  useEffect(() => {
    let cancelled = false;

    const loadVerifiedSignals = async () => {
      if (!user || !display) {
        setSearchConsoleSnapshot(null);
        setSearchConsoleLoading(false);
        setGa4Snapshot(null);
        setGa4Loading(false);
        return;
      }

      setSearchConsoleLoading(true);
      setGa4Loading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const [searchConsoleResult, ga4Result] = await Promise.all([
        supabase.functions.invoke("search-console", {
          body: { action: "snapshot", provider: "google_search_console", website_url: display },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }),
        supabase.functions.invoke("google-analytics", {
          body: { action: "snapshot", provider: "google_analytics" },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        }),
      ]);

      if (cancelled) return;

      setSearchConsoleSnapshot((searchConsoleResult.data as any)?.snapshot ?? null);
      setGa4Snapshot((ga4Result.data as any)?.snapshot ?? null);
      setSearchConsoleLoading(false);
      setGa4Loading(false);
    };

    void loadVerifiedSignals();

    return () => {
      cancelled = true;
    };
  }, [display, user, activeReport?.id]);

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

  const requestLeaveLockedPreview = (action: () => void) => {
    if (!isGuest) {
      action();
      return;
    }

    pendingLeaveActionRef.current = action;
    setLeavePreviewOpen(true);
  };

  const handleLeaveAnyway = () => {
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    setLeavePreviewOpen(false);
    action?.();
  };

  const handleUnlockNow = () => {
    pendingLeaveActionRef.current = null;
    setLeavePreviewOpen(false);

    if (user) {
      navigate("/dashboard/credits?tab=plans", {
        state: {
          from: `${location.pathname}${location.search}`,
          reason: "report_unlock",
          reportId: String(activeReport?.id ?? ""),
        },
      });
      return;
    }

    setAuthOpen(true);
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
        <DropdownMenuItem onSelect={(event) => event.preventDefault()} asChild>
          <button
            type="button"
            onClick={() => requestLeaveLockedPreview(() => navigate("/dashboard"))}
            className="flex w-full items-center gap-2"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()} asChild>
          <button
            type="button"
            onClick={() => requestLeaveLockedPreview(() => navigate("/dashboard/settings"))}
            className="flex w-full items-center gap-2"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => requestLeaveLockedPreview(handleLogout)} className="text-red-600">
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
      label: "AI Visibility",
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
      const pageUrl = finding?.pageUrl ?? null;
      const signalKey = finding?.signalKey ?? null;

      if (String(signalKey ?? "").trim() === "thin_content" && pageUrl && !isDisplayableContentPageUrl(String(pageUrl))) {
        return null;
      }

      return {
        parameter: title,
        status: severity === "High" ? "error" : severity === "Medium" ? "warning" : "success",
        severity,
        suggestion: hidePageCountCopy(finding?.recommendation ?? finding?.description) || title,
        description: hidePageCountCopy(finding?.description),
        evidence: finding?.evidence && typeof finding.evidence === "object" ? finding.evidence : null,
        pageUrl: pageUrl && isDisplayableContentPageUrl(String(pageUrl)) ? pageUrl : null,
        signalKey,
        bucket,
      } satisfies ReportRow;
    }).filter(Boolean) as ReportRow[];

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
    const contentDepth = contentDepthDisplay(totalWordCount);
    const avgPageScore = crawlerPages.length
      ? crawlerPages.reduce((sum, page) => sum + Number(page?.pageScore ?? 0), 0) / crawlerPages.length
      : null;
    const firstContentPaintMs = (rawScanData?.metrics?.fcp as number | undefined) ?? null;
    const loadSpeedDetail = firstContentPaintMs
      ? firstPerformanceIssue?.suggestion ?? "The first visible content loaded successfully. Keep scripts and large assets lean so pages stay fast."
      : firstPerformanceIssue?.suggestion
        ? "Speed timing was not available for this scan, but the audit found page resources that may slow loading. Review the recommendation shown in the action plan."
        : "Speed timing was not available for this scan. This can happen when the performance provider does not return lab data for the page.";
    const internalLinksOut = crawlerPages.reduce((sum, page) => sum + Number(page?.internalLinksOut ?? 0), 0);
    const internalLinksIn = crawlerPages.reduce((sum, page) => sum + Number(page?.internalLinksIn ?? 0), 0);
    const schemaTypes = Array.from(new Set(crawlerPages.flatMap((page) => safeArray<string>(page?.schemaTypes))));
    const structuredDetails = structuredDetailDisplay(schemaTypes);
    const schemaItemCount = Number(schemaValidation?.itemCount ?? 0);
    const schemaErrorCount = Number(schemaValidation?.errorCount ?? 0);
    const schemaWarningCount = Number(schemaValidation?.warningCount ?? 0);
    const topicClusters = safeArray<any>(topicAnalysis?.clusters);
    const thinTopics = safeArray<string>(topicAnalysis?.thinTopics);
    const napInconsistentFields = safeArray<string>(napConsistency?.inconsistentFields);
    const napDetected = Boolean(napConsistency?.detected);
    const firstBrokenLink = crawlerBrokenLinks[0];
    const citationVisibility = clampScore((scoreBreakdownPayload?.citation_visibility ?? scoreBreakdownPayload?.citationVisibility ?? overallScore) as number, overallScore);
    const technicalVisibility = clampScore((scoreBreakdownPayload?.technical_visibility ?? scoreBreakdownPayload?.technicalVisibility ?? technicalScore) as number, technicalScore);
    const contentVisibility = clampScore((scoreBreakdownPayload?.content_visibility ?? scoreBreakdownPayload?.contentVisibility ?? overallScore) as number, overallScore);
    const aiUnderstanding = clampScore((scoreBreakdownPayload?.ai_understanding ?? scoreBreakdownPayload?.aiUnderstanding ?? overallScore) as number, overallScore);
    const overallSnapshot = clampScore((scoreBreakdownPayload?.overall_score ?? scoreBreakdownPayload?.overallScore ?? overallScore) as number, overallScore);
    const entityConfidence = clampScore(entityEnrichment?.confidence ?? 0, 0);
    const sameAsUrls = safeArray<string>(entityEnrichment?.sameAsUrls);
    const externalProfiles = safeArray<any>(entityEnrichment?.externalProfiles);
    const answerSectionCount = crawlerPages.reduce((sum, page) => sum + safeArray<any>(page?.chunks).length, 0);
    const linkStructure = linkStructureDisplay(internalLinksOut, internalLinksIn);
    const discoverySignal = discoveryNoteDisplay(crawlerDiscoveryNotes[0]);
    const sitemapStatus = sitemapStatusDisplay(Number(rawScanData?.crawler?.sitemapUrls?.length ?? 0));

    return [
      {
        id: "ai-search-visibility",
        eyebrow: "AI Search",
        title: "AI Search Visibility",
        description: `How well AI tools can find, trust, and cite the site's most important answers.`,
        score: clampScore(Math.max(overallSnapshot, citationVisibility)),
        scoreLabel: "Answer Visibility",
        tiles: [
          {
            label: "Answer Visibility",
            value: formatPercent(citationVisibility),
            detail:
              firstAiIssue?.suggestion ??
              `Pages with clear structure, helpful details, and direct answers are easier for AI tools to cite.`,
            tone: "violet",
          },
          {
            label: "AI Understanding",
            value: formatPercent(aiUnderstanding),
            detail:
              previewPayload?.summary ??
              "Clear business details, easy-to-read content, and accessible pages help AI tools understand the site.",
            tone: "rose",
          },
        ],
      },
      {
        id: "content-intelligence",
        eyebrow: "Content clarity",
        title: "Content Clarity",
        description: `How clearly the site explains its brand, services, topics, and locations for ${verticalProfile.contentFocus.toLowerCase()}.`,
        score: clampScore(contentVisibility, overallScore),
        scoreLabel: "Content Visibility",
        tiles: [
          {
            label: "Titles / Meta",
            value: coverageLabel(Math.min(pagesWithTitle, pagesWithMeta), crawlerPages.length),
            detail:
              firstContentIssue?.suggestion ??
              `Unique titles and meta descriptions help the site surface the right pages for AI and search.`,
            tone: "violet",
          },
          {
            label: "Heading Structure",
            value: coverageLabel(pagesWithH1, crawlerPages.length, { none: "Needs work", partial: "Partial", full: "Clear" }),
            detail: `One clear H1 and well-nested supporting headings improve readability and answer extraction.`,
            tone: "amber",
          },
          {
            label: "Content Depth",
            value: contentDepth.value,
            detail: contentDepth.detail,
            tone: "sky",
          },
          {
            label: "Page Quality",
            value: formatPercent(avgPageScore),
            detail: `This reflects whether reviewed pages are clear, complete, and easy for visitors and AI tools to understand.`,
            tone: "emerald",
          },
          {
            label: "Topic Clusters",
            value: topicClusters.length > 0 ? `${topicClusters.length} found` : "Not enough data",
            detail:
              topicClusters.length > 0
                ? `Top themes: ${topicClusters.slice(0, 3).map((cluster) => String(cluster?.topic ?? "")).filter(Boolean).join(", ")}.`
                : "The scan needs readable page content to identify recurring topics.",
            tone: "violet",
          },
          {
            label: "Topic Coverage",
            value: thinTopics.length > 0 ? `${thinTopics.length} opportun${thinTopics.length === 1 ? "y" : "ies"}` : "No gaps found",
            detail:
              thinTopics.length > 0
                ? `Topics with limited coverage: ${thinTopics.slice(0, 3).join(", ")}.`
                : "No major topic gaps were identified in the reviewed pages.",
            tone: thinTopics.length > 0 ? "amber" : "emerald",
          },
        ],
        wide: true,
      },
      {
        id: "structured-data",
        eyebrow: "AI-readable details",
        title: "Site Details AI Can Read",
        description: `How clearly the site explains key details like ${verticalProfile.structuredFocus.toLowerCase()} in a format AI tools can understand.`,
        score: clampScore(Math.max(technicalVisibility, seoScore || 0)),
        scoreLabel: "Details Clarity",
        tiles: [
          {
            label: "Site Detail Check",
            value: schemaItemCount <= 0 ? "Not found" : schemaErrorCount > 0 || schemaWarningCount > 0 ? "Needs review" : "Clear",
            detail:
              schemaErrorCount > 0
                ? `Some issues and recommendations were found in the site's machine-readable details. Review the affected items in the evidence section.`
                : schemaItemCount > 0
                  ? schemaWarningCount > 0
                    ? "The detected site details include key information AI tools expect, with a few recommendations to review."
                    : "The detected site details include the key information AI tools expect."
                  : "No structured details were found on the reviewed pages.",
            tone: schemaErrorCount > 0 ? "amber" : "emerald",
          },
          {
            label: "AI-Readable Pages",
            value: coverageLabel(pagesWithSchema, crawlerPages.length, { none: "Not found", partial: "Partial", full: "Strong" }),
            detail:
              firstStructuredIssue?.suggestion ??
              `Shows whether key pages include clear details that help AI tools understand the business, services, products, reviews, or FAQs.`,
            tone: "emerald",
          },
          {
            label: "Detail Types",
            value: structuredDetails.value,
            detail: structuredDetails.detail,
            tone: "sky",
          },
          {
            label: "Business Details Match",
            value: !napDetected
              ? "Not detected"
              : napInconsistentFields.length > 0
                ? "Needs review"
                : "Consistent",
            detail: !napDetected
              ? "No clear business name, address, or phone details were found on the reviewed pages."
              : napInconsistentFields.length > 0
                ? `Different ${napInconsistentFields.join(", ")} value(s) were found across the reviewed key pages.`
                : "Business name, address, and phone details match across the reviewed key pages with available data.",
            tone: napInconsistentFields.length > 0 ? "amber" : napDetected ? "emerald" : "slate",
          },
        ],
      },
      {
        id: "semantic-health",
        eyebrow: "Brand understanding",
        title: "AI Understanding",
        description: `How clearly the site connects the brand, topics, and services AI tools need for ${verticalProfile.semanticFocus.toLowerCase()}.`,
        score: clampScore((aiUnderstanding + citationVisibility) / 2, overallScore),
        scoreLabel: "Understanding Score",
        tiles: [
          {
            label: "Brand Trust Signal",
            value: `${entityConfidence}/100`,
            detail:
              externalProfiles.length > 0
                ? `External profiles help confirm the brand identity across the web.`
                : "The site does not provide enough trusted external brand links yet.",
            tone: "violet",
          },
          {
            label: "Answer Sections",
            value: availableLabel(answerSectionCount, { none: "Needs more detail", some: "Available" }),
            detail: `Clear content sections make it easier for AI tools to pull useful answers from the site.`,
            tone: "sky",
          },
          {
            label: "Internal Link Structure",
            value: linkStructure.value,
            detail: linkStructure.detail,
            tone: "emerald",
          },
          {
            label: "Discovery Check",
            value: discoverySignal.value,
            detail: discoverySignal.detail,
            tone: "amber",
          },
        ],
        wide: true,
      },
      {
        id: "ux-accessibility",
        eyebrow: "Visitor clarity",
        title: "User Experience & Accessibility",
        description: `How easily visitors and AI tools can understand and navigate ${verticalProfile.uxFocus.toLowerCase()}.`,
        score: clampScore(Math.max(accessibilityScore || technicalScore, 45), 45),
        scoreLabel: "Bottlenecks Found",
        tiles: [
          {
            label: "Accessibility Score",
            value: formatPercent(accessibilityScore),
            detail:
              firstUxIssue?.suggestion ??
              `Clear page structure makes the site easier for screen readers and AI tools to understand.`,
            tone: "rose",
          },
          {
            label: "Image Alt Coverage",
            value: formatPercent(altCoverage),
            detail:
              pagesWithAltText > 0
                ? "Image alt text was found on reviewed pages that include images."
                : "Add descriptive alt text to improve accessibility and multimodal understanding.",
            tone: "emerald",
          },
          {
            label: "Preferred Page Signals",
            value: coverageLabel(crawlerPages.filter((page) => Boolean(page?.canonicalUrl)).length, crawlerPages.length, {
              none: "Missing",
              partial: "Partial",
              full: "Clear",
            }),
            detail: `These signals help search engines and AI tools understand which version of a similar page should be trusted.`,
            tone: "sky",
          },
          {
            label: "Pages Hidden From Search",
            value: crawlerPages.some((page) => Boolean(page?.noindex)) ? "Needs review" : "Clear",
            detail: `Review pages blocked from search so important content stays visible.`,
            tone: "amber",
          },
        ],
      },
      {
        id: "technical-performance",
        eyebrow: "Page speed",
        title: "Site Speed & Reliability",
        description: `How quickly the site loads and how reliably important pages work for visitors and AI tools.`,
        score: clampScore(Math.max(performanceScore || technicalScore || 75, technicalVisibility), 75),
        scoreLabel: "Speed Score",
        tiles: [
          {
            label: "Page Load Speed",
            value: firstContentPaintMs ? formatMs(firstContentPaintMs) : "Not measured",
            detail: loadSpeedDetail,
            tone: "violet",
          },
          {
            label: "Page Quality",
            value: formatPercent(avgPageScore),
            detail: `This reflects whether important pages are clear, complete, and technically reliable.`,
            tone: "emerald",
          },
        ],
      },
      {
        id: "seo-foundation",
        eyebrow: "Search basics",
        title: "Search Visibility Basics",
        description: `Core search signals that help people and AI tools discover this ${verticalProfile.label.toLowerCase()} site.`,
        score: clampScore(Math.max(seoScore, technicalVisibility), 68),
        scoreLabel: "Search Signals",
        tiles: [
          {
            label: "SEO Score",
            value: formatPercent(seoScore),
            detail:
              firstSeoIssue?.suggestion ??
              `Search visibility, page titles, and descriptions still help AI tools discover and understand the site.`,
            tone: "emerald",
          },
          {
            label: "Sitemap Status",
            value: sitemapStatus.value,
            detail: sitemapStatus.detail,
            tone: "sky",
          },
          {
            label: "Preferred Page Signals",
            value: coverageLabel(crawlerPages.filter((page) => Boolean(page?.canonicalUrl)).length, crawlerPages.length, {
              none: "Missing",
              partial: "Partial",
              full: "Clear",
            }),
            detail: `These signals help search engines and AI tools trust the right version of similar pages.`,
            tone: "violet",
          },
        ],
      },
      {
        id: "supporting-ai-signals",
        eyebrow: "Additional checks",
        title: "Supporting AI Signals",
        description: "Extra signals that help AI tools access, verify, and understand the site more confidently.",
        score: clampScore((technicalVisibility + entityConfidence + Math.max(seoScore, 50)) / 3, overallScore),
        scoreLabel: "Support Score",
        tiles: [
          {
            label: "AI Bot Access",
            value: aiBotAccess.value,
            detail: aiBotAccess.detail,
            tone: aiBotAccess.tone,
          },
          {
            label: "Official Profile Links",
            value: sameAsUrls.length > 0 ? "Found" : "Not found",
            detail:
              sameAsUrls.length > 0
                ? "These links help AI tools confirm that the website, social profiles, and trusted listings belong to the same brand."
                : "Add official profile links so AI tools can connect the website to the right brand, social profiles, and trusted listings.",
            tone: "rose",
          },
          {
            label: "Language Targeting",
            value: coverageLabel(crawlerPages.filter((page) => (page?.hreflangLinks?.length ?? 0) > 0).length, crawlerPages.length, {
              none: "Not set",
              partial: "Partial",
              full: "Clear",
            }),
            detail:
              crawlerPages.some((page) => (page?.hreflangLinks?.length ?? 0) > 0)
                ? "Some pages clearly tell search engines which language or region they are for."
                : "Localized pages may need clearer language and region targeting.",
            tone: "violet",
          },
          {
            label: "Internal Link Health",
            value: crawlerBrokenLinks.length > 0 ? "Needs review" : "Clear",
            detail:
              firstBrokenLink?.url
                ? "A broken internal link was found and should be repaired or redirected."
                : "Internal link health looks stable in the reviewed pages.",
            tone: crawlerBrokenLinks.length > 0 ? "rose" : "emerald",
          },
        ],
        wide: true,
      },
      {
        id: "ai-impact",
        eyebrow: "Next steps",
        title: "Priority Action Plan",
        description: `A simple view of what to fix first, what can improve quickly, and what helps AI tools trust the site over time.`,
        score: projectedScore,
        scoreLabel: "Projected Score",
        tiles: [
          {
            label: "Fix First",
            value: topIssue?.parameter ?? "No major issue",
            detail:
              topIssue?.suggestion ??
              `Start here because this issue is most likely to affect how AI tools understand or recommend the site.`,
            tone: "rose",
          },
          {
            label: "Quick Win",
            value:
              sortedRows.find((row) => row.severity === "Medium")?.parameter ??
              sortedRows[1]?.parameter ??
              "Content refinement",
            detail: `This is a practical improvement that can make the site clearer for both visitors and AI tools.`,
            tone: "amber",
          },
          {
            label: "Long-Term Improvement",
            value: sameAsUrls.length > 0 ? "Profile links found" : "Add profile links",
            detail: `Official profile links help AI tools connect the website to the right brand, audience, and trusted sources.`,
            tone: "emerald",
          },
        ],
        wide: true,
      },
    ];
  }, [
    accessibilityScore,
    aiBotAccess,
    aiScore,
    crawlerBrokenLinks,
    crawlerDiscoveryNotes,
    crawlerPages,
    entityEnrichment,
    schemaValidation,
    topicAnalysis,
    napConsistency,
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
    const discoverySignal = discoveryNoteDisplay(crawlerDiscoveryNotes[0]);
    const longTermSignals = [
      discoverySignal.detail,
      entityEnrichment?.brandName
        ? `Add more official profile links so AI tools connect the site to ${entityEnrichment.brandName}.`
        : "Add official profile links so AI tools can confirm the brand behind the website.",
      crawlerBrokenLinks.length > 0
        ? `Eliminate broken internal links so important pages stay connected and reliable.`
        : "Keep internal links consistent so key pages stay reachable as the site grows.",
    ];

    return [
      {
        title: "Quick Wins",
        phase: "Phase 1 · Deployment (1-3 Days)",
        summary: "Small changes that quickly make pages clearer and easier for AI tools to trust.",
        icon: Rocket,
        items:
          quickWins.length > 0
            ? quickWins.map((row) => `${row.parameter}: ${row.suggestion}`)
            : ["Fix the highest-priority site detail and clarity gaps first.", "Create one helpful FAQ block for the main topic."],
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
            : ["Improve page headings, titles, and brand details.", "Make supporting content and navigation easier to understand."],
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
            : ["Build stronger topic groups around the services or products people search for.", "Make sure important content is visible when pages load."],
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
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <div className="flex h-20 items-center justify-between">
                <button type="button" onClick={() => requestLeaveLockedPreview(() => navigate("/"))} className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
                </button>
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
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <div className="flex h-20 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
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
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <div className="flex h-20 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
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


  const searchConsoleSummary = searchConsoleSnapshot
    ? ` Search Console adds ${searchConsoleSnapshot.totalImpressions.toLocaleString()} impressions and ${searchConsoleSnapshot.queryCount} tracked queries over the last 28 days.`
    : "";
  const ga4Summary = ga4Snapshot
    ? ` GA4 adds ${ga4Snapshot.totalActiveUsers.toLocaleString()} active users and ${ga4Snapshot.totalSessions.toLocaleString()} sessions over the last 28 days.`
    : "";

  const summaryText =
    isGuest
      ? needsCreditTopUp
        ? "You've used all the report credits included in your current plan. This scan is still available in preview mode, but the full AI audit stays locked until you purchase more credits."
        : needsPlanPurchase
          ? "You don't have an active plan right now. This scan is available in preview mode, and you can purchase a plan to unlock the full AI audit, recommendations, and roadmap."
          : "Log in and purchase any plan to unlock the full AI audit, recommendations, and roadmap."
      : `${verticalProfile.summaryLead} ${
          (activeReport as any)?.ai_summary ??
          previewPayload?.summary ??
          rawScanData?.summary ??
          verticalProfile.summaryBody ??
          fallbackReportSummary
        }${searchConsoleSummary}${ga4Summary}`;

  const projectLabel = String(rawScanData?.rankio?.vertical ?? rawScanData?.industry ?? rawScanData?.vertical ?? verticalProfile.label);
  const reportStatusLabel = isGuest ? "Preview Report" : (activeReport as any)?.report_level === "full" ? "Full Report" : "Report";
  const reportPlanSlug = String((activeReport as any)?.access_tier_required ?? "").trim();
  const reportPlanLabel = reportStatusLabel === "Full Report" ? getPaymentPlanName(reportPlanSlug, "AI Visibility Report") : "Preview";
  const reportCreditUsedLabel =
    reportStatusLabel === "Full Report"
      ? (activeReport as any)?.is_cached
        ? "0"
        : "1"
      : "0";
  const activeReportGeneratedAt = (activeReport as any)?.generated_at as string | undefined;
  const activeReportGeneratedAtMs = activeReportGeneratedAt ? new Date(activeReportGeneratedAt).getTime() : NaN;
  const activeReportIsFresh = Number.isFinite(activeReportGeneratedAtMs) && Date.now() - activeReportGeneratedAtMs < REPORT_CACHE_MS;
  const rescanCreditNote = activeReportIsFresh
    ? `No credit used: this report is under ${REPORT_CACHE_HOURS}h old.`
    : "Uses 1 report credit when a new full report is generated.";
  const scoreComparisonLabel =
    previousReport && Number.isFinite(scoreDelta)
      ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs previous scan`
      : "First Recorded Scan";
  const reportDisplayTitle = isGuest ? "Your AI Visibility Preview" : verticalProfile.summaryTitle;
  const reportDisplaySummary = isGuest
    ? "Here's an initial view of your website's AI visibility signals, along with the areas that may benefit from further improvement."
    : summaryText;
  const savedUserName = String((user?.user_metadata?.full_name as string | undefined) ?? "").trim();
  const savedUserEmail = String(user?.email ?? "").trim();
  const callbackNameReadonly = Boolean(savedUserName);
  const callbackEmailReadonly = Boolean(savedUserEmail);

  const handleExport = async () => {
    if (typeof window === "undefined" || exportingPdf) return;

    const target = document.querySelector<HTMLElement>(".report-export-content");
    if (!target) {
      setRescanMessage("Unable to prepare the PDF export right now. Please refresh and try again.");
      return;
    }

    setExportingPdf(true);
    setRescanMessage("Preparing visual PDF export...");

    try {
      const blob = await buildVisualReportPdfBlob(target);
      downloadBlob(blob, pdfFileName(`Rankio AI Report ${displayHost}`));
      setRescanMessage("PDF downloaded successfully.");
    } catch (error) {
      console.error("visual pdf export failed", error);
      setRescanMessage("Unable to export the visual PDF right now. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleImplementationStrategy = () => {
    setCallbackForm({
      ...emptyCallbackForm,
      fullName: savedUserName,
      email: savedUserEmail,
    });
    setCallbackErrors({});
    setCallbackSubmitted(false);
    setCallbackNotice(null);
    setCallbackCaptchaToken("");
    setCallbackCaptchaError(null);
    setCallbackCaptchaKey((current) => current + 1);
    setCallbackOpen(true);
  };

  const updateCallbackField = (field: keyof CallbackForm, value: string) => {
    setCallbackForm((current) => ({ ...current, [field]: value }));
    if (callbackErrors[field]) {
      setCallbackErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleSubmitCallbackRequest = async () => {
    const errors = validateCallbackForm(callbackForm);
    setCallbackErrors(errors);
    setCallbackNotice(null);
    if (Object.keys(errors).length > 0) return;

    if (isCaptchaEnabled() && !callbackCaptchaToken) {
      setCallbackCaptchaError("Please complete the CAPTCHA verification.");
      setCallbackNotice("Please complete the CAPTCHA and try again.");
      return;
    }

    setCallbackCaptchaError(null);
    setCallbackSubmitting(true);
    const result = await submitCallbackRequest({
      fullName: callbackForm.fullName,
      email: callbackForm.email,
      country: callbackForm.country,
      phone: callbackForm.phone,
      company: callbackForm.company,
      requirements: callbackForm.requirements,
      websiteUrl: display,
      reportId: String(activeReport?.id ?? reportId ?? ""),
      scanScope: scanScope.label,
      sourceUrl: typeof window !== "undefined" ? window.location.href : "",
      captchaToken: callbackCaptchaToken,
    });
    setCallbackSubmitting(false);

    if (result.error) {
      setCallbackNotice(result.error);
      setCallbackCaptchaToken("");
      setCallbackCaptchaKey((current) => current + 1);
      return;
    }

    setCallbackSubmitted(true);
    setCallbackNotice("Thanks, we received your request. Our team will contact you shortly.");
    setCallbackCaptchaToken("");
    setCallbackCaptchaError(null);
    setCallbackCaptchaKey((current) => current + 1);
  };

  const startRescan = async () => {
    if (!user || !activeReport || rescanning) return;
    setRescanMessage(null);
    setRecentReportTarget(null);
    setRecentReportDialogOpen(false);

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
        setRescanMessage(
          `This website was already scanned within the last ${REPORT_CACHE_HOURS} hours. We're showing the latest report instead of running the same scan again.`
        );
        setRecentReportTarget(String(latestReport.id) !== String(activeReport?.id ?? "") ? latestReport : null);
        setRecentReportDialogOpen(true);
        if (String(latestReport.id) !== String(activeReport?.id ?? "")) {
          return;
        }
        return;
      }
    }

    const generatedAtRaw = (activeReport as any)?.generated_at as string | undefined;
    const generatedAtMs = generatedAtRaw ? new Date(generatedAtRaw).getTime() : NaN;
    const isFresh = Number.isFinite(generatedAtMs) && Date.now() - generatedAtMs < REPORT_CACHE_MS;

    if (isFresh) {
      setRescanMessage(
        `This website was already scanned within the last ${REPORT_CACHE_HOURS} hours. This is the latest report, so we won't run the same scan again.`
      );
      setRecentReportTarget(null);
      setRecentReportDialogOpen(true);
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
    setScanComplete(false);
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
      if (data.cached) {
        setRescanMessage(
          `This website was already scanned within the last ${REPORT_CACHE_HOURS} hours. We're showing the latest report instead of running the same scan again.`
        );
        setRecentReportTarget(data);
        setRecentReportDialogOpen(true);
        return;
      }
      setScanComplete(true);
      await new Promise((resolve) => window.setTimeout(resolve, SCAN_COMPLETE_DELAY_MS));
      navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from, report: data } });
    }
  };

  const handleRescan = async () => {
    if (isScanStateStale(lastActiveAtRef.current)) {
      setStalePromptOpen(true);
      return;
    }

    await startRescan();
  };

  const handleRefreshRescan = () => {
    window.location.reload();
  };

  const handleStopScan = () => {
    void cancelScan(scanJobIdRef.current, { accessToken: session?.access_token });
    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setRescanning(false);
    setScanComplete(false);
    setScanningModalOpen(false);
  };

  return (
    <>
      <div className="rankio-report-page min-h-screen bg-[#0b1022] text-white">
        <header data-report-sticky-header className="report-screen-chrome sticky top-0 z-50 border-b border-border/40 bg-white backdrop-blur-md">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex h-20 items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2">
                  <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
                </Link>
              </div>

              <div className="flex items-center gap-2">{headerRight}</div>
            </div>
          </div>

          {user && (
            <div className="border-t border-white/10 bg-[#0b1022]">
              <div className="container mx-auto max-w-7xl px-4 md:px-6">
                <div className="flex min-h-12 items-center justify-between gap-4 overflow-x-auto py-2">
                  <div className="flex min-w-0 shrink-0 items-center gap-3 whitespace-nowrap">
                  {user && (
                    <button
                      type="button"
                      onClick={() => requestLeaveLockedPreview(() => navigate("/dashboard"))}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Dashboard
                    </button>
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
                      disabled={exportingPdf}
                      className="gap-2"
                    >
                      {exportingPdf ? "Preparing PDF..." : "Export to PDF"}
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
          )}
        </header>

        <main className="report-print-area container mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <section className="report-print-cover">
            <div>
              <p className="report-print-kicker">Rankio AI Visibility Report</p>
              <h1>{reportDisplayTitle}</h1>
              <p className="report-print-summary">{reportDisplaySummary}</p>
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
              <div className="sticky top-[7.5rem] rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-[24px] font-semibold tracking-tight text-white">Rankio Intelligence</p>
                <p className="mt-1 text-sm text-white/45">v2.4 Ready</p>

                <nav className="mt-8 space-y-2">
                  {[
                    { id: "executive-summary", label: "Executive Summary", icon: BarChart3 },
                    { id: "ai-audit", label: isGuest ? "AI Visibility Audit" : "AI Audit", icon: Bot },
                    { id: "implementation-plan", label: isGuest ? "Findings & Recommendations" : "Evidence & Fixes", icon: ShieldCheck },
                    { id: "roadmap", label: isGuest ? "Improvement Roadmap" : "Roadmap", icon: Rocket },
                  ].map((item) => {
                    const isLockedGuestTab = isGuest && item.id !== "executive-summary";

                    const button = (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isLockedGuestTab}
                        onClick={() => {
                          if (isLockedGuestTab) return;
                          setActiveSection(item.id);
                          scrollToReportSection(item.id);
                        }}
                        className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-sm transition-all ${
                          activeSection === item.id
                            ? "border-white/15 bg-accent text-white shadow-[0_10px_24px_hsl(var(--accent)/0.25)]"
                            : isLockedGuestTab
                              ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/35 opacity-55"
                              : "border-white/8 bg-white/0 text-white/70 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );

                    if (!isLockedGuestTab) {
                      return button;
                    }

                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <span className="block cursor-not-allowed">
                            {button}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Premium Feature
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <div className="report-export-content space-y-8">
              <section id="executive-summary" className="report-section rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.18)] md:p-8">
                <div className="mb-6 overflow-hidden rounded-[22px] border border-amber-400/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(255,255,255,0.05)_52%,rgba(0,0,0,0.12))] p-5 text-sm text-amber-100 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.18em] text-amber-200">Report Info</p>
                          {isUnlockPending ? <p className="mt-1 text-xs text-amber-100/75">Unlocking report...</p> : null}
                        </div>
                        <span className="rounded-full border border-amber-300/25 bg-black/15 px-3 py-1 text-xs font-semibold text-amber-50">
                          {scanScope.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-amber-50/80">{scanScope.description}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Website", value: displayHost },
                      {
                        label: scanScope.label === "Landing Page" ? "Scanned Page" : "Scanned Site",
                        value: scanScope.targetLabel,
                        className: "sm:col-span-2",
                      },
                      { label: "Report Type", value: reportLevelValue === "full" ? "Full Report" : "Preview Report" },
                      {
                        label: "Plan",
                        value:
                          reportAccessTier && reportAccessTier !== "unknown"
                            ? getPaymentPlanName(reportAccessTier, "AI Visibility Report")
                            : reportPlanLabel,
                      },
                      { label: "Credit Used", value: reportCreditUsedLabel },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl border border-amber-300/20 bg-black/15 px-4 py-3 ${item.className ?? ""}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">{item.label}</p>
                        <p className="mt-1 break-words font-semibold text-amber-50">{item.value}</p>
                      </div>
                    ))}
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
                        <div className="text-[32px] font-semibold leading-none text-white md:text-[38px]">{overallScore}/100</div>
                        <div className="mt-2 max-w-[132px] text-[13px] leading-4 text-white/70">{isGuest ? "Current Preview Score" : verticalProfile.projectedLabel}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/80">
                        {isGuest ? "Initial Assessment" : maturityLabel(overallScore)}
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
                    {!isGuest ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_hsl(var(--accent)/0.24)]">
                          Report Customized For: {verticalProfile.audience}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/75">
                          Industry: {projectLabel}
                        </span>
                      </div>
                    ) : null}

                    <div>
                      <h1 className="text-[34px] font-semibold tracking-tight text-white md:text-[54px] md:leading-[1.02]">
                        {reportDisplayTitle}
                      </h1>
                      <p className={`mt-5 max-w-3xl text-[16px] leading-8 md:text-[18px] ${isGuest ? "text-[#f1cf7f]" : "text-white/65"}`}>
                        {reportDisplaySummary}
                      </p>
                    </div>

                    <div className="max-w-xl rounded-[16px] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-center gap-3 text-white/75">
                        <Globe className="h-5 w-5 text-white/55" />
                        <span className="truncate text-[15px]">{display}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Improvement Opportunity</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          An estimate of how the score could improve after the most important recommendations are fixed.
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Website Assessment</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          <span className="font-semibold text-white/90">{maturityLabel(overallScore)}:</span> {maturityDescription(overallScore)}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Report Focus</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          This report is written for {verticalProfile.audience.toLowerCase()} so the recommendations match that team&apos;s priorities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isGuest ? (
                  <div className="report-pdf-exclude mt-8 rounded-[24px] border border-accent/35 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.24),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Preview Analysis
                        </div>
                        <h2 className="text-[24px] font-semibold text-white">Unlock Your Complete AI Visibility Report</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
                          This preview provides an initial overview of your website. Unlock the full report to explore detailed findings, supporting explanations, prioritized recommendations, and an actionable improvement roadmap.
                        </p>
                      </div>
                      {user ? (
                        <Button asChild>
                          <Link
                            to="/dashboard/credits?tab=plans"
                            state={{
                              from: `${location.pathname}${location.search}`,
                              reason: "report_unlock",
                              reportId: String(activeReport?.id ?? ""),
                            }}
                          >
                            Unlock Full Report
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setAuthOpen(true)}
                        >
                          Unlock Full Report
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
                            <span className="mt-1 block text-[11px] text-white/35">{maturityShortDescription(label)}</span>
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
                      label: "AI Bot Access",
                      value: aiBotAccess.value,
                      detail: aiBotAccess.detail,
                      tone: aiBotAccess.tone,
                    },
                    {
                      label: "Broken Links",
                      value: `${crawlerBrokenLinks.length}`,
                      detail: crawlerBrokenLinks.length > 0 ? "Internal link issues were found and should be repaired." : "No broken internal links were detected in the reviewed pages.",
                      tone: "rose" as const,
                    },
                    {
                      label: "Brand Trust Signal",
                      value: `${clampScore(entityEnrichment?.confidence ?? 0, 0)}/100`,
                      detail: entityEnrichment?.brandName ? `Brand identity detected for ${entityEnrichment.brandName}.` : "No strong external brand proof was detected.",
                      tone: "emerald" as const,
                    },
                    {
                      label: "Report Confidence",
                      value: "Evidence-backed",
                      detail: "The report combines performance data with AI visibility evidence from discovered key pages.",
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

                {!isGuest ? (
                  <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Search Console</p>
                        <h3 className="mt-2 text-[20px] font-semibold text-white">Verified query data</h3>
                      </div>
                      {searchConsoleLoading ? <p className="text-sm text-white/45">Loading...</p> : null}
                    </div>

                    {searchConsoleSnapshot ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Impressions</p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {searchConsoleSnapshot.totalImpressions.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Clicks</p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {searchConsoleSnapshot.totalClicks.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Avg. Position</p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {searchConsoleSnapshot.averagePosition ? searchConsoleSnapshot.averagePosition.toFixed(1) : "—"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-white/55">
                        Connect Search Console in dashboard integrations to show real query and landing-page performance here.
                      </p>
                    )}
                  </div>
                ) : null}

                {!isGuest ? (
                  <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Google Analytics 4</p>
                        <h3 className="mt-2 text-[20px] font-semibold text-white">Verified engagement data</h3>
                      </div>
                      {ga4Loading ? <p className="text-sm text-white/45">Loading...</p> : null}
                    </div>

                    {ga4Snapshot ? (
                      <div className="mt-5 space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Active Users</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {ga4Snapshot.totalActiveUsers.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Sessions</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {ga4Snapshot.totalSessions.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Engagement Rate</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {ga4Snapshot.engagementRate ? `${ga4Snapshot.engagementRate.toFixed(1)}%` : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/45">New Users</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {ga4Snapshot.totalNewUsers.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {ga4Snapshot.topPages?.length ? (
                          <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Top landing pages</p>
                            <div className="mt-3 space-y-3">
                              {ga4Snapshot.topPages.slice(0, 3).map((page: any) => (
                                <div key={page.page} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{page.page}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">
                                      {page.activeUsers.toLocaleString()} users · {page.sessions.toLocaleString()} sessions
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-white">{page.pageViews.toLocaleString()} views</p>
                                    <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                                      {page.engagementRate ? `${page.engagementRate.toFixed(1)}% engagement` : "No engagement data"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-white/55">
                        Connect Google Analytics in dashboard integrations to show verified audience and engagement data here.
                      </p>
                    )}
                  </div>
                ) : null}

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
                        <span>Evidence coverage</span>
                        <span className="font-semibold text-white">Key signals</span>
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
                      Based on the current scan, we've identified a clear path to dominate the AI search ecosystem and
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

                <div className="report-pdf-exclude mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(122,116,239,0.15)_0%,rgba(255,255,255,0.03)_100%)] p-6 md:p-8">
                  <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 text-[#d8cbff]">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-sm font-semibold uppercase tracking-[0.22em]">Want Rankio Experts To Implement These Fixes?</span>
                      </div>
                      <h3 className="mt-4 text-[24px] font-semibold leading-tight tracking-tight text-white md:text-[32px]">
                        Let our team turn this roadmap into a live implementation plan.
                      </h3>
                      <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/60">
                        Skip the learning curve. Our team can deploy the structural optimizations that move your score toward
                        the target threshold faster.
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:justify-self-end">
                      <Button
                        onClick={handleImplementationStrategy}
                        size="lg"
                        className="w-full justify-center"
                      >
                        Request call back
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full justify-center"
                        onClick={openTawkChat}
                      >
                        Live chat
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
              )}
            </div>
          </div>
        </main>

        <div className="report-screen-chrome">
          <Footer
            variant="app"
            onNavigate={(target) => requestLeaveLockedPreview(() => navigate(target))}
          />
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
                  Unlock full AI visibility report
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
                    to="/dashboard/credits?tab=plans"
                    state={{
                      from: `${location.pathname}${location.search}`,
                      reason: "report_unlock",
                      reportId: String(activeReport?.id ?? ""),
                    }}
                  >
                    Unlock Full Report
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUpgradeOpen(false)}
                >
                  Continue Preview
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leavePreviewOpen} onOpenChange={setLeavePreviewOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#11162a] p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:max-w-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(123,123,246,0.28),transparent_42%)]" />
            <div className="relative">
              <DialogHeader>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-[0_16px_36px_hsl(var(--accent)/0.36)]">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
                  Leave preview report?
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm leading-7 text-white/65">
                  Your full AI report is still locked. Unlock now to view the complete audit, fixes, roadmap, and export-ready recommendations.
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
                <Button onClick={handleUnlockNow}>
                  Unlock Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleLeaveAnyway}>
                  Leave Anyway
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={callbackOpen} onOpenChange={setCallbackOpen}>
        <DialogContent
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:max-w-2xl"
        >
          <div className="relative overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,rgba(111,116,239,0.12),rgba(255,255,255,0))]" />
            <div className="relative">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950">
                    Request a call back
                  </DialogTitle>
                  <DialogDescription className="pt-2 text-sm leading-7 text-slate-600">
                    Share your contact details and what you need help with. We'll connect this request to the current report.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
                <div className="space-y-2">
                  <Label htmlFor="callback-name" className="text-sm font-semibold text-slate-700">Name*</Label>
                  <Input
                    id="callback-name"
                    value={callbackForm.fullName}
                    readOnly={callbackNameReadonly}
                    onChange={(event) => updateCallbackField("fullName", event.target.value)}
                    className={`h-11 border-slate-200 bg-white text-slate-950 focus-visible:ring-accent/30 ${
                      callbackNameReadonly ? "cursor-not-allowed bg-slate-50 text-slate-700" : ""
                    }`}
                    aria-invalid={Boolean(callbackErrors.fullName)}
                  />
                  {callbackErrors.fullName ? <p className="text-xs text-rose-600">{callbackErrors.fullName}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback-email" className="text-sm font-semibold text-slate-700">Email*</Label>
                  <Input
                    id="callback-email"
                    type="email"
                    value={callbackForm.email}
                    readOnly={callbackEmailReadonly}
                    onChange={(event) => updateCallbackField("email", event.target.value)}
                    className={`h-11 border-slate-200 bg-white text-slate-950 focus-visible:ring-accent/30 ${
                      callbackEmailReadonly ? "cursor-not-allowed bg-slate-50 text-slate-700" : ""
                    }`}
                    aria-invalid={Boolean(callbackErrors.email)}
                  />
                  {callbackErrors.email ? <p className="text-xs text-rose-600">{callbackErrors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback-country" className="text-sm font-semibold text-slate-700">Country*</Label>
                  <select
                    id="callback-country"
                    value={callbackForm.country}
                    onChange={(event) => updateCallbackField("country", event.target.value)}
                    className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={Boolean(callbackErrors.country)}
                  >
                    <option value="">Select country</option>
                    {countryOptions.map((country) => (
                      <option key={country.code} value={country.label}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  {callbackErrors.country ? <p className="text-xs text-rose-600">{callbackErrors.country}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback-phone" className="text-sm font-semibold text-slate-700">Phone number*</Label>
                  <Input
                    id="callback-phone"
                    value={callbackForm.phone}
                    onChange={(event) => updateCallbackField("phone", event.target.value)}
                    placeholder="98765 43210"
                    className="h-11 border-slate-200 bg-white text-slate-950 focus-visible:ring-accent/30"
                    aria-invalid={Boolean(callbackErrors.phone)}
                  />
                  {callbackErrors.phone ? <p className="text-xs text-rose-600">{callbackErrors.phone}</p> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="callback-company" className="text-sm font-semibold text-slate-700">Company <span className="font-normal text-slate-400">(optional)</span></Label>
                  <Input
                    id="callback-company"
                    value={callbackForm.company}
                    onChange={(event) => updateCallbackField("company", event.target.value)}
                    placeholder="Company name"
                    className="h-11 border-slate-200 bg-white text-slate-950 focus-visible:ring-accent/30"
                    aria-invalid={Boolean(callbackErrors.company)}
                  />
                  {callbackErrors.company ? <p className="text-xs text-rose-600">{callbackErrors.company}</p> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="callback-requirements" className="text-sm font-semibold text-slate-700">Requirements*</Label>
                  <Textarea
                    id="callback-requirements"
                    value={callbackForm.requirements}
                    onChange={(event) => updateCallbackField("requirements", event.target.value)}
                    placeholder="Tell us what you want help implementing from this report."
                    className="min-h-28 border-slate-200 bg-white text-slate-950 focus-visible:ring-accent/30"
                    aria-invalid={Boolean(callbackErrors.requirements)}
                  />
                  {callbackErrors.requirements ? <p className="text-xs text-rose-600">{callbackErrors.requirements}</p> : null}
                </div>

                <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-xs leading-6 text-slate-700 sm:col-span-2">
                  Report context included: {displayHost} · {scanScope.label}
                </div>

                <TurnstileWidget
                  key={callbackCaptchaKey}
                  value={callbackCaptchaToken}
                  onChange={(token) => {
                    setCallbackCaptchaToken(token);
                    if (token) setCallbackCaptchaError(null);
                  }}
                  error={callbackCaptchaError}
                  className="sm:col-span-2"
                />
              </div>

              {callbackNotice ? (
                <div className={`mx-6 rounded-2xl border px-4 py-3 text-sm leading-6 sm:mx-8 ${
                  callbackNotice.startsWith("Thanks") || callbackNotice.startsWith("Your request was saved")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  {callbackNotice}
                </div>
              ) : null}

              <DialogFooter className="mt-6 gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:px-8">
                <Button variant="outline" onClick={() => setCallbackOpen(false)} disabled={callbackSubmitting}>
                  Close
                </Button>
                <Button onClick={handleSubmitCallbackRequest} disabled={callbackSubmitting || callbackSubmitted}>
                  {callbackSubmitting ? "Submitting..." : callbackSubmitted ? "Request submitted" : "Submit request"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recentReportDialogOpen} onOpenChange={setRecentReportDialogOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#11162a] p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:max-w-lg">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_42%)]" />
            <div className="relative">
              <DialogHeader>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
                  Recent report already available
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm leading-7 text-white/70">
                  {rescanMessage ??
                    `This website was already scanned within the last ${REPORT_CACHE_HOURS} hours. We're showing the latest report instead of running the same scan again.`}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                No new scan was started, so no extra report credit was used.
              </div>

              <DialogFooter className="mt-6 gap-3 sm:justify-start">
                {recentReportTarget?.id && (
                  <Button
                    onClick={() => {
                      const target = recentReportTarget;
                      setRecentReportDialogOpen(false);
                      const from = `${location.pathname}${location.search}`;
                      navigate(`/report?reportId=${encodeURIComponent(String(target.id))}`, {
                        state: { from, report: target },
                      });
                    }}
                  >
                    View Latest Report
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={() => setRecentReportDialogOpen(false)}>
                  {recentReportTarget?.id ? "Stay Here" : "Got It"}
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
        isComplete={scanComplete}
        onStopScan={handleStopScan}
      />

      <AlertDialog open={stalePromptOpen} onOpenChange={setStalePromptOpen}>
        <AlertDialogContent className="border border-white/10 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh before re-scanning?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This page has been idle for a while. Refreshing will re-sync the report state before we start the next scan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setStalePromptOpen(false);
                void startRescan();
              }}
            >
              Scan anyway
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRefreshRescan}>Refresh page</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} redirectTo={`${location.pathname}${location.search}`} />
    </>
  );
}


