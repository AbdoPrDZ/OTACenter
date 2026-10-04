
export interface Route {
  name?: string;
  path: string;
  title?: string;
  params?: Record<string, string>;
}
