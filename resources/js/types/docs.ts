import type { ComponentType } from "react";

/** Frontmatter supported by every docs MDX page. */
export interface DocsFrontmatter {
  title?: string;
  description?: string;
  /** Sort order among siblings (lower first). */
  order?: number;
}

export interface MdxModule {
  default: ComponentType<{ components?: Record<string, unknown> }>;
  frontmatter: DocsFrontmatter;
}

/** A single documentation page. */
export interface DocsPageNode {
  type: "page";
  /** Path relative to the docs root, without extension ("index" is the home). */
  slug: string;
  title: string;
  description?: string;
  order: number;
}

/** A section that contains pages and/or further sections. */
export interface DocsGroupNode {
  type: "group";
  label: string;
  /** Short subtitle shown under the section title in the sidebar. */
  description?: string;
  /** Slug of the section's index page, when it has one. */
  slug?: string;
  order: number;
  children: DocsTreeNode[];
}

export type DocsTreeNode = DocsPageNode | DocsGroupNode;
