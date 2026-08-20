import type { ReactNode } from "react";
import { Link } from "react-router";
import darkLogo from "../../assets/ec37bb065d49c41d8d194954cdc4226b5e7e1837.png";
import { Footer } from "./footer";

type LegalPageLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </header>

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
