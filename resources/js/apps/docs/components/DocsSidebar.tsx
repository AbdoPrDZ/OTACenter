import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocsTreeNode } from "@/types/docs";
import { DOCS_TREE } from "../manifest";

function hrefFor(slug: string): string {
  return slug === "index" ? "/" : `/${slug}`;
}

function PageLink({
  node,
  depth,
  onNavigate,
}: {
  node: Extract<DocsTreeNode, { type: "page" }>;
  depth: number;
  onNavigate?: () => void;
}) {
  const isIndex = node.slug === "index";

  return (
    <NavLink
      to={hrefFor(node.slug)}
      end={isIndex}
      onClick={onNavigate}
      style={{ paddingLeft: 10 + depth * 14 }}
      className={({ isActive }) =>
        cn(
          "block truncate rounded-md py-1.5 pr-2 text-xs font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )
      }
    >
      {node.title}
    </NavLink>
  );
}

function GroupNode({
  node,
  depth,
  onNavigate,
}: {
  node: Extract<DocsTreeNode, { type: "group" }>;
  depth: number;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: 10 + depth * 14 };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5" style={pad}>
        {node.slug ? (
          <NavLink
            to={hrefFor(node.slug)}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "min-w-0 flex-1 truncate rounded-md py-1.5 pr-1 text-[0.6875rem] font-semibold tracking-wide uppercase transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground/90 hover:text-foreground",
              )
            }
          >
            {node.label}
          </NavLink>
        ) : (
          <span className="min-w-0 flex-1 truncate py-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground/90 uppercase">
            {node.label}
          </span>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? `Collapse ${node.label}` : `Expand ${node.label}`}
          aria-expanded={open}
          className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
      </div>

      {open ? (
        <div
          className="flex flex-col gap-0.5 border-l border-border/60"
          style={{ marginLeft: 10 + depth * 14 }}
        >
          {node.children.map((child, index) => (
            <SidebarNode
              key={child.type === "page" ? child.slug : `${child.label}-${index}`}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNode({
  node,
  depth,
  onNavigate,
}: {
  node: DocsTreeNode;
  depth: number;
  onNavigate?: () => void;
}) {
  return node.type === "page" ? (
    <PageLink node={node} depth={depth} onNavigate={onNavigate} />
  ) : (
    <GroupNode node={node} depth={depth} onNavigate={onNavigate} />
  );
}

export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-4">
      {DOCS_TREE.map((node, index) => (
        <SidebarNode
          key={node.type === "page" ? node.slug : `${node.label}-${index}`}
          node={node}
          depth={0}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
