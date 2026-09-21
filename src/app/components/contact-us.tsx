import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowRight, CreditCard, Handshake, Mail, MessageSquare, Wrench } from "lucide-react";
import { Header } from "./header";
import { Footer } from "./footer";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { submitContactMessage } from "../services/contact-service";
import { TurnstileWidget, isCaptchaEnabled } from "./turnstile-widget";

const helpTopics = [
  {
    icon: MessageSquare,
    title: "Report Support",
    description: "Questions about your AI Visibility Report, score, findings, or recommendations.",
  },
  {
    icon: CreditCard,
    title: "Billing & Payments",
    description: "Questions about purchases, payments, invoices, or refunds.",
  },
  {
    icon: Wrench,
    title: "Technical Support",
    description: "Having trouble submitting your website or accessing your report?",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    description: "Interested in agency partnerships, bulk reports, integrations, or other business opportunities?",
  },
];

const faqQuestions = [
  "What does a Rankio report include?",
  "How is the AI Visibility Score calculated?",
  "How much does a report cost?",
  "Can Rankio analyze Shopify websites?",
];

const contactReasons = [
  "Report Support",
  "Billing & Payment",
  "Technical Issue",
  "Partnership",
  "Agency / Bulk Reports",
  "General Enquiry",
] as const;

const initialFormState = {
  fullName: "",
  email: "",
  websiteUrl: "",
  reason: "Report Support",
  message: "",
};

type ContactFormErrors = Partial<Record<keyof typeof initialFormState, string>>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasNoDigits(value: string) {
  return !/\d/.test(value);
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function validateForm(form: typeof initialFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const websiteUrl = form.websiteUrl.trim();
  const reason = form.reason.trim();
  const message = form.message.trim();

  if (!fullName) errors.fullName = "Full name is required.";
  else if (fullName.length < 2) errors.fullName = "Full name must be at least 2 characters.";
  else if (fullName.length > 100) errors.fullName = "Full name must be 100 characters or fewer.";
  else if (!hasNoDigits(fullName)) errors.fullName = "Full name cannot contain numbers.";
  else if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(fullName)) errors.fullName = "Full name can only include letters, spaces, apostrophes, periods, and hyphens.";

  if (!email) errors.email = "Work email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid work email.";

  if (websiteUrl) {
    if (!normalizeWebsiteUrl(websiteUrl)) {
      errors.websiteUrl = "Enter a valid website URL.";
    }
  }

  if (!contactReasons.includes(reason as (typeof contactReasons)[number])) {
    errors.reason = "Please select a valid reason.";
  }

  if (!message) errors.message = "Message is required.";
  else if (message.length < 10) errors.message = "Message must be at least 10 characters.";
  else if (message.length > 2000) errors.message = "Message must be 2000 characters or fewer.";

  return errors;
}

export function ContactUs() {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  const updateField = <K extends keyof typeof initialFormState>(field: K, value: (typeof initialFormState)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      setNotice("Please fix the highlighted fields and try again.");
      return;
    }

    if (isCaptchaEnabled() && !captchaToken) {
      setCaptchaError("Please complete the CAPTCHA verification.");
      setStatus("error");
      setNotice("Please complete the CAPTCHA and try again.");
      return;
    }

    setCaptchaError(null);

    setSubmitting(true);
    setStatus("idle");
    setNotice("");

    const result = await submitContactMessage({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      website: normalizeWebsiteUrl(form.websiteUrl),
      reason: form.reason,
      message: form.message.trim(),
      captchaToken,
    });

    setSubmitting(false);

    if (result.error) {
      setStatus("error");
      setNotice(result.error);
      setCaptchaToken("");
      setCaptchaKey((current) => current + 1);
      return;
    }

    setStatus("success");
    setNotice("Thank you for contacting us. We typically respond within 1 business day.");
    setForm(initialFormState);
    setErrors({});
    setCaptchaToken("");
    setCaptchaError(null);
    setCaptchaKey((current) => current + 1);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f7fafc_100%)] text-slate-900">
      <Header />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]" />
        <div className="container relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                Let&apos;s Talk
              </span>{" "}
              <span className="text-[#242840]">Rankio</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Have a question about your AI Visibility Report, website analysis, pricing, or partnership
              opportunities? Our team is here to help.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-2xl font-semibold text-primary">How can we help?</CardTitle>
                  <CardDescription className="text-base">
                    Choose the best fit, and we&apos;ll point you to the right team as quickly as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  {helpTopics.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <div
                        key={topic.title}
                        className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-slate-900">{topic.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="grid gap-6 sm:grid-cols-1">
                <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-primary">Prefer email?</CardTitle>
                    <CardDescription>Write to us anytime and we&apos;ll route it to the right team.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <a
                      href="mailto:support@rankio.ai"
                      className="inline-flex items-center gap-2 text-base font-semibold text-primary transition-colors hover:text-primary/80"
                    >
                      <Mail className="size-4" />
                      support@rankio.ai
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold text-primary">Send us a message</CardTitle>
                <CardDescription className="text-base">
                  Tell us what you need, and we&apos;ll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {status !== "idle" && notice ? (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                        status === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                      aria-live="polite"
                    >
                      {notice}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name*</Label>
                    <Input
                      id="full-name"
                      name="fullName"
                      placeholder="John Smith"
                      pattern="^[A-Za-z][A-Za-z\\s'.-]*$"
                      title="Use letters, spaces, apostrophes, periods, and hyphens only. Numbers are not allowed."
                      autoComplete="name"
                      maxLength={100}
                      required
                      value={form.fullName}
                      onChange={(event) => {
                        updateField("fullName", event.target.value);
                        if (errors.fullName) setErrors((current) => ({ ...current, fullName: undefined }));
                      }}
                      aria-invalid={Boolean(errors.fullName)}
                    />
                    {errors.fullName ? <p className="text-sm text-rose-600">{errors.fullName}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work-email">Work Email*</Label>
                    <Input
                      id="work-email"
                      name="email"
                      type="email"
                      placeholder="john@company.com"
                      maxLength={320}
                      required
                      value={form.email}
                      onChange={(event) => {
                        updateField("email", event.target.value);
                        if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                      }}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? <p className="text-sm text-rose-600">{errors.email}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website-url">Website URL</Label>
                    <Input
                      id="website-url"
                      name="websiteUrl"
                      placeholder="https://yourwebsite.com"
                      maxLength={500}
                      value={form.websiteUrl}
                      onChange={(event) => {
                        updateField("websiteUrl", event.target.value);
                        if (errors.websiteUrl) setErrors((current) => ({ ...current, websiteUrl: undefined }));
                      }}
                      aria-invalid={Boolean(errors.websiteUrl)}
                    />
                    {errors.websiteUrl ? <p className="text-sm text-rose-600">{errors.websiteUrl}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Contact*</Label>
                    <Select value={form.reason} onValueChange={(value) => updateField("reason", value)}>
                      <SelectTrigger id="reason" className="h-11">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.reason ? <p className="text-sm text-rose-600">{errors.reason}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message*</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      className="min-h-36"
                      maxLength={2000}
                      required
                      value={form.message}
                      onChange={(event) => {
                        updateField("message", event.target.value);
                        if (errors.message) setErrors((current) => ({ ...current, message: undefined }));
                      }}
                      aria-invalid={Boolean(errors.message)}
                    />
                    {errors.message ? <p className="text-sm text-rose-600">{errors.message}</p> : null}
                  </div>

                  <TurnstileWidget
                    key={captchaKey}
                    value={captchaToken}
                    onChange={(token) => {
                      setCaptchaToken(token);
                      if (token) setCaptchaError(null);
                    }}
                    error={captchaError}
                  />

                  <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Message"}
                    <ArrowRight className="size-4" />
                  </Button>

                  <p className="text-sm leading-6 text-muted-foreground">
                    By submitting this form, you agree to our Privacy Policy.
                  </p>
                  <p className="text-sm font-medium text-slate-700">We typically respond within 1 business day.</p>
                </form>
              </CardContent>
            </Card>
          </div>

          <section className="mt-14">
            <Card className="border-white/70 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <CardContent className="px-6 py-8 md:px-8 md:py-10">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                    <span className="bg-gradient-to-r from-[#5d67dc] via-[#4046a9] to-[#242840] bg-clip-text text-transparent">
                      Can&apos;t find
                    </span>{" "}
                    <span className="text-[#242840]">what you&apos;re looking for?</span>
                  </h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                    You may find your answer faster in our FAQs.
                  </p>
                  <Link
                    to="/#faq"
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform transition-colors hover:-translate-y-0.5 hover:bg-primary/90"
                  >
                    View FAQs
                    <ArrowRight className="size-4" />
                  </Link>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {faqQuestions.map((question) => (
                    <div
                      key={question}
                      className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-5 py-4 text-sm font-medium leading-6 text-slate-800 shadow-sm"
                    >
                      {question}
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Other way to reach us:</p>
                  <a
                    href="mailto:support@rankio.ai"
                    className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    <Mail className="size-5" />
                    support@rankio.ai
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
