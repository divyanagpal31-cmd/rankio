import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const faqs = [
  {
    question: "What is an AI Readiness Score?",
    answer:
      "An AI Readiness Score measures how well your website is structured for AI-driven search engines and assistants like ChatGPT, Perplexity, and Google's AI. It evaluates your SEO foundation, structured data implementation, and content clarity to determine how easily AI systems can understand, index, and recommend your content.",
  },
  {
    question: "How is Rankio different from traditional SEO tools?",
    answer:
      "Rankio combines SEO, AI discoverability, and UX clarity in one scan so teams can focus on the signals that affect modern visibility.",
  },
  {
    question: "Do I need technical knowledge to use Rankio?",
    answer:
      "No. Rankio is designed to be simple and guided, so you can review your results and recommendations without needing to understand the underlying technical details.",
  },
  {
    question: "How long does a website analysis take?",
    answer:
      "Most scans complete in a short time, and the flow shows progress if the analysis runs longer than expected.",
  },
  {
    question: "Can I use Rankio for multiple websites?",
    answer:
      "Yes. You can run reports for multiple websites and compare the results over time.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-white py-20 md:py-24">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
          <h2 className="text-[28px] font-bold tracking-tight text-[#2f357f] sm:text-[30px] md:text-[48px]">
            FAQs
          </h2>
          <p className="mt-4 text-[18px] leading-7 text-[#7b8a9f]">
            Everything you need to know about AI readiness and Rankio
          </p>
        </div>

        <Tabs defaultValue="general" className="mx-auto max-w-[860px]">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-1 gap-2 rounded-xl border border-[#dde2fb] bg-[linear-gradient(180deg,#f7f8ff_0%,#eef1ff_100%)] p-1 shadow-[0_12px_30px_rgba(91,95,214,0.08)] sm:grid-cols-3">
            <TabsTrigger
              value="general"
              className="rounded-md border border-transparent px-4 py-2 text-[14px] font-semibold text-[#5e6b84] transition-all duration-200 data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              General FAQs
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-md border border-transparent px-4 py-2 text-[14px] font-semibold text-[#5e6b84] transition-all duration-200 data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              Billing FAQs
            </TabsTrigger>
            <TabsTrigger
              value="technical"
              className="rounded-md border border-transparent px-4 py-2 text-[14px] font-semibold text-[#5e6b84] transition-all duration-200 data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              Technical FAQs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="outline-none">
            <Accordion
              type="single"
              collapsible
              defaultValue="item-1"
              className="mx-auto flex max-w-[780px] flex-col gap-3"
            >
              {faqs.map((faq, index) => {
                const isOpenByDefault = index === 0;

                return (
                  <AccordionItem
                    key={faq.question}
                    value={`item-${index + 1}`}
                    className="overflow-hidden rounded-[12px] border border-[#6f74ef] bg-white/95 shadow-[0_10px_26px_rgba(91,91,214,0.06)]"
                  >
                    <AccordionTrigger className="px-4 py-5 text-left text-[16px] font-semibold text-[#20263a] no-underline hover:no-underline sm:px-5 md:px-6 data-[state=open]:bg-[linear-gradient(90deg,rgba(235,237,255,0.72)_0%,rgba(255,255,255,0.96)_100%)]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent
                      className={`px-4 pb-5 text-[15px] leading-7 text-[#7b8a9f] sm:px-5 md:px-6 ${
                        isOpenByDefault ? "pr-8" : ""
                      }`}
                    >
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          <TabsContent value="billing" className="outline-none">
            <div className="mx-auto grid max-w-[780px] gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-[#6f74ef] bg-white p-5 shadow-[0_10px_26px_rgba(91,91,214,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f74ef]">Billing</p>
                <h3 className="mt-2 text-[18px] font-semibold text-[#20263a]">Payment questions</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#7b8a9f]">
                  Dummy content: add payment timing, invoices, refunds, and plan upgrade answers here.
                </p>
              </div>
              <div className="rounded-[16px] border border-[#6f74ef] bg-white p-5 shadow-[0_10px_26px_rgba(91,91,214,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f74ef]">Billing</p>
                <h3 className="mt-2 text-[18px] font-semibold text-[#20263a]">Subscription questions</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#7b8a9f]">
                  Dummy content: add plan changes, renewal behavior, and receipt delivery details here.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="outline-none">
            <div className="mx-auto grid max-w-[780px] gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-[#6f74ef] bg-white p-5 shadow-[0_10px_26px_rgba(91,91,214,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f74ef]">Technical</p>
                <h3 className="mt-2 text-[18px] font-semibold text-[#20263a]">Scan behavior</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#7b8a9f]">
                  Dummy content: explain crawl timing, retries, and stale scan handling here.
                </p>
              </div>
              <div className="rounded-[16px] border border-[#6f74ef] bg-white p-5 shadow-[0_10px_26px_rgba(91,91,214,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f74ef]">Technical</p>
                <h3 className="mt-2 text-[18px] font-semibold text-[#20263a]">Compatibility</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#7b8a9f]">
                  Dummy content: add browser support, mobile behavior, and report loading notes here.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-[16px] text-[#7b8a9f]">
          Still have questions?{" "}
          <a href="#contact" className="font-semibold text-[#6f74ef] hover:underline">
            Contact our support team
          </a>
        </p>
      </div>
    </section>
  );
}
