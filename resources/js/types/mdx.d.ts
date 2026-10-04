declare module "*.mdx" {
  import type { ComponentType } from "react";

  import type { DocsFrontmatter } from "./docs";

  export const frontmatter: DocsFrontmatter;

  const MdxComponent: ComponentType<{ components?: Record<string, unknown> }>;

  export default MdxComponent;
}
