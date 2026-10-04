import { useEffect, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function DocsToc({
  containerRef,
  contentKey,
}: {
  containerRef: RefObject<HTMLElement | null>;
  /** Changes when the active document changes, to rescan headings. */
  contentKey: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(container.querySelectorAll<HTMLElement>("h2, h3"));
    const items = nodes
      .map((node) => ({
        id: node.id,
        text: node.textContent ?? "",
        level: node.tagName === "H3" ? 3 : 2,
      }))
      .filter((item) => item.id && item.text);

    setHeadings(items);
    setActive(items[0]?.id);

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: [0, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [containerRef, contentKey]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-20 hidden w-52 shrink-0 xl:block">
      <p className="mb-2 text-[0.625rem] font-semibold tracking-widest text-muted-foreground/70 uppercase">
        On this page
      </p>
      <ul className="flex flex-col gap-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(heading.id);
                if (!target) return;
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${heading.id}`);
                setActive(heading.id);
              }}
              className={cn(
                "-ml-px block border-l-2 py-1 text-xs transition-colors",
                heading.level === 3 ? "pl-6" : "pl-3",
                active === heading.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
