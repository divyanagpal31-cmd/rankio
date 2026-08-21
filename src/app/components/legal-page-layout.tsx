import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

type LegalPageLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">{title}</h1>
          <div className="mt-6 space-y-6 text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
