import { Radio } from "lucide-react";

import { Logo } from "@/components/Logo";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo markClassName="size-10" />
        </div>

        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="/" className="transition-colors hover:text-foreground">
            Home
          </a>
          <a href="/store" className="transition-colors hover:text-foreground">
            Store
          </a>
          <a href="/docs" className="transition-colors hover:text-foreground">
            Docs
          </a>
          <a href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </a>
        </nav>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="size-3.5" />
          © {year} OTACenter
        </p>
      </div>
    </footer>
  );
}
