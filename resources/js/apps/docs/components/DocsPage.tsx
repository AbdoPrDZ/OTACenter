import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MDXProvider } from "@mdx-js/react";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import type { MdxModule } from "@/types/docs";

import DocsToc from "./DocsToc";
import { getDocMeta, loadDoc } from "../manifest";
import { mdxComponents } from "./mdx-components";

const cache = new Map<string, MdxModule>();

export default function DocsPage() {
  const params = useParams();
  const slug = (params["*"] ?? "").replace(/\/+$/, "") || "index";
  const meta = getDocMeta(slug);

  const articleRef = useRef<HTMLElement>(null);
  // Each loaded module (or "missing" result) is tagged with the slug it belongs
  // to. On navigation the component re-renders with the new slug before the new
  // module arrives; without the tag it would render the previous page's content
  // under the new slug, and the "On this page" list would scan that stale page.
  const [loaded, setLoaded] = useState<{ slug: string; module: MdxModule } | null>(null);
  const [missingSlug, setMissingSlug] = useState<string | null>(null);
  const mod = loaded?.slug === slug ? loaded.module : null;
  const missing = missingSlug === slug;

  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0 });

    const cached = cache.get(slug);
    if (cached) {
      setLoaded({ slug, module: cached });
      return;
    }

    const loader = loadDoc(slug);
    if (!loader) {
      setMissingSlug(slug);
      return;
    }

    loader()
      .then((module) => {
        if (cancelled) return;
        cache.set(slug, module);
        setLoaded({ slug, module });
      })
      .catch(() => {
        if (!cancelled) setMissingSlug(slug);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    document.title = meta
      ? `OTACenter — ${meta.title}`
      : "OTACenter — Documentation";
  }, [meta]);

  // After the MDX renders, jump to any #hash in the URL (the target element
  // does not exist yet when the browser first tries to scroll).
  useEffect(() => {
    if (!mod) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [mod, slug]);

  if (missing) {
    return (
      <EmptyState
        className="border-0 py-20"
        icon={FileQuestion}
        title="Page not found"
        description={`No documentation exists at “${slug}”.`}
        action={
          <a href="/docs">
            <Button variant="outline" size="sm">
              Back to docs
            </Button>
          </a>
        }
      />
    );
  }

  if (!mod) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  const Body = mod.default;

  return (
    <div className="flex items-start gap-10">
      <article ref={articleRef} className="min-w-0 max-w-4xl flex-1">
        {mod.frontmatter?.description ? (
          <p className="mb-6 text-sm/relaxed text-muted-foreground">
            {mod.frontmatter.description}
          </p>
        ) : null}
        <MDXProvider components={mdxComponents}>
          <Body />
        </MDXProvider>
      </article>

      <DocsToc key={slug} containerRef={articleRef} contentKey={slug} />
    </div>
  );
}
