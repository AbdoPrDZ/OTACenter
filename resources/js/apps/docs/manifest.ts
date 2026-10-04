import type {
  DocsGroupNode,
  DocsTreeNode,
  MdxModule,
} from "@/types/docs";

/**
 * Every MDX page under ./content, compiled at build time. The sidebar tree is
 * derived from the folder structure: each directory is a section, its
 * `index.mdx` is the section landing page, and further subfolders nest.
 */
const pages = import.meta.glob("./content/**/*.mdx", {
  eager: true,
}) as Record<string, MdxModule>;

interface Entry {
  slug: string;
  dir: string;
  isIndex: boolean;
  title: string;
  description?: string;
  order: number;
}

function humanize(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const entries: Entry[] = Object.entries(pages).map(([path, module]) => {
  const slug = path.replace(/^\.\/content\//, "").replace(/\.mdx$/, "");
  const frontmatter = module.frontmatter ?? {};
  const isIndex = slug === "index" || slug.endsWith("/index");
  const slash = slug.lastIndexOf("/");
  const dir = isIndex ? slug.replace(/\/?index$/, "") : slash === -1 ? "" : slug.slice(0, slash);
  const name = slug.split("/").filter(Boolean).pop() ?? "Introduction";

  return {
    slug,
    dir,
    isIndex,
    title: frontmatter.title ?? humanize(name),
    description: frontmatter.description,
    order: frontmatter.order ?? 999,
  };
});

const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));

function indexEntryFor(dir: string): Entry | undefined {
  return bySlug.get(dir === "" ? "index" : `${dir}/index`);
}

function parentDir(dir: string): string {
  const slash = dir.lastIndexOf("/");
  return slash === -1 ? "" : dir.slice(0, slash);
}

function isDirectChild(parent: string, dir: string): boolean {
  return dir !== "" && parentDir(dir) === parent;
}

function sortNodes(nodes: DocsTreeNode[]): DocsTreeNode[] {
  return nodes.sort(
    (a, b) =>
      a.order - b.order ||
      labelOf(a).localeCompare(labelOf(b)),
  );
}

function labelOf(node: DocsTreeNode): string {
  return node.type === "page" ? node.title : node.label;
}

function build(dir: string): DocsTreeNode[] {
  const nodes: DocsTreeNode[] = [];

  for (const entry of entries) {
    if (entry.dir === dir && !entry.isIndex) {
      nodes.push({
        type: "page",
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        order: entry.order,
      });
    }
  }

  const childDirs = Array.from(
    new Set(entries.filter((entry) => isDirectChild(dir, entry.dir)).map((entry) => entry.dir)),
  );

  for (const child of childDirs) {
    const index = indexEntryFor(child);
    const group: DocsGroupNode = {
      type: "group",
      label: index?.title ?? humanize(child.split("/").pop() ?? child),
      description: index?.description,
      slug: child,
      order: index?.order ?? 999,
      children: sortNodes(build(child)),
    };
    nodes.push(group);
  }

  return sortNodes(nodes);
}

const rootIndex = indexEntryFor("");
const tree = build("");

if (rootIndex) {
  tree.unshift({
    type: "page",
    slug: "index",
    title: rootIndex.title,
    description: rootIndex.description,
    order: rootIndex.order,
  });
}

/** The sidebar tree, depth-first. */
export const DOCS_TREE: DocsTreeNode[] = tree;

export interface DocMeta {
  slug: string;
  title: string;
  description?: string;
}

/** Metadata for the page at `slug` (or the section index), if any. */
export function getDocMeta(slug: string): DocMeta | undefined {
  const normalized = slug === "" ? "index" : slug;
  const entry = bySlug.get(normalized) ?? bySlug.get(`${normalized}/index`);
  if (!entry) return undefined;
  return { slug: entry.slug, title: entry.title, description: entry.description };
}

/** Resolve a slug to its MDX module (`content/<slug>.mdx` or `<slug>/index.mdx`). */
export function loadDoc(slug: string): (() => Promise<MdxModule>) | undefined {
  const candidates =
    slug === "" || slug === "index"
      ? ["./content/index.mdx"]
      : [`./content/${slug}.mdx`, `./content/${slug}/index.mdx`];

  for (const key of candidates) {
    const module = pages[key];
    if (module) return () => Promise.resolve(module);
  }

  return undefined;
}
