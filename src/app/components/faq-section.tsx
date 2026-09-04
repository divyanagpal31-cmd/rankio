import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { billingFaqs, generalFaqs, technicalFaqs } from "../data/faq-content";

function renderFaqAccordion(items: { question: string; answer: string }[]) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="item-1"
      className="mx-auto flex max-w-[780px] flex-col gap-3"
    >
      {items.map((faq, index) => {
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
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="bg-white py-20 md:py-24">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
          <h2 className="text-[28px] font-bold tracking-tight text-[#2f357f] sm:text-[30px] md:text-[48px]">
            FAQs
          </h2>
          <p className="mt-4 text-[18px] leading-7 text-[#7b8a9f]">
            Everything you need to know about AI visibility and Rankio
          </p>
        </div>

        <Tabs defaultValue="general" className="mx-auto max-w-[860px]">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-[#dde2fb] bg-[linear-gradient(180deg,#f7f8ff_0%,#eef1ff_100%)] p-1 shadow-[0_12px_30px_rgba(91,95,214,0.08)] sm:gap-2">
            <TabsTrigger
              value="general"
              className="rounded-md border border-transparent px-1 py-2 text-[12px] font-semibold whitespace-nowrap text-[#5e6b84] transition-all duration-200 sm:px-4 sm:text-[14px] data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-md border border-transparent px-1 py-2 text-[12px] font-semibold whitespace-nowrap text-[#5e6b84] transition-all duration-200 sm:px-4 sm:text-[14px] data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="technical"
              className="rounded-md border border-transparent px-1 py-2 text-[12px] font-semibold whitespace-nowrap text-[#5e6b84] transition-all duration-200 sm:px-4 sm:text-[14px] data-[state=active]:border-[#5d67dc] data-[state=active]:bg-[#5d67dc] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_24px_rgba(91,95,214,0.28)]"
            >
              Technical
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="outline-none">
            {renderFaqAccordion(generalFaqs)}
          </TabsContent>

          <TabsContent value="billing" className="outline-none">
            {renderFaqAccordion(billingFaqs)}
          </TabsContent>

          <TabsContent value="technical" className="outline-none">
            {renderFaqAccordion(technicalFaqs)}
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-[16px] text-[#7b8a9f]">
          Still have questions?{" "}
          <a href="/contact" className="font-semibold text-[#6f74ef] hover:underline">
            Contact our support team
          </a>
        </p>
      </div>
    </section>
  );
}
