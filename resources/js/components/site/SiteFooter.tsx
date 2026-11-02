import { Scale } from "lucide-react";

import { Logo } from "@/components/Logo";
import GithubIcon from "./GithubIcon";
import {
  AUTHOR,
  AUTHOR_URL,
  copyrightYears,
  ISSUES_URL,
  LICENSE_NAME,
  LICENSE_URL,
  RELEASES_URL,
  REPO_URL,
} from "./site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/store", label: "App Store" },
      { href: "/docs", label: "Documentation" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: RELEASES_URL, label: "Releases", external: true },
      { href: ISSUES_URL, label: "Report an issue", external: true },
    ],
  },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Logo markClassName="size-10" />
          <p className="max-w-xs text-xs/relaxed text-muted-foreground">
            Self-hosted over-the-air distribution for your apps — publish builds, scope who gets them, and
            follow every download.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <GithubIcon className="size-3.5" /> Star on GitHub
          </a>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} className="flex flex-col gap-2.5" aria-label={column.title}>
            <h2 className="text-[0.6875rem] font-semibold tracking-widest text-foreground uppercase">
              {column.title}
            </h2>
            {column.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...("external" in link ? { target: "_blank", rel: "noreferrer" } : {})}
                className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {copyrightYears()}{" "}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-primary">
              {AUTHOR}
            </a>
            . OTACenter is free software.
          </p>
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Scale className="size-3.5" /> Licensed under {LICENSE_NAME}
          </a>
        </div>
      </div>
    </footer>
  );
}
