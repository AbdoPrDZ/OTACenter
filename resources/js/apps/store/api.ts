import Request from "@/utils/http";

export interface IStoreDomain {
  id: number;
  name: string;
  apps_count?: number;
}

export interface IStoreApp {
  id: number;
  name: string;
  package_name: string;
  summary: string | null;
  logo_url: string | null;
  domains: { id: number; name: string }[];
  version: string | null;
  updated_at: string | null;
}

export interface IStoreVersion {
  id: number;
  name: string;
  changelog: string | null;
  size: number | null;
  created_at: string | null;
}

export interface IStoreAppDetail extends IStoreApp {
  description: string | null;
  screenshots: string[];
  versions: IStoreVersion[];
  download_url: string;
}

export interface StoreList {
  items: IStoreApp[];
  itemsCount: number;
  pagesCount: number;
  page: number;
}

export interface StoreQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  domain?: number;
}

/** Public catalogue — no session, the endpoint whitelists its own fields. */
export function fetchStoreApps(query: StoreQuery = {}) {
  return Request.get<StoreList>({ url: "/public/apps", params: query });
}

export function fetchStoreDomains() {
  return Request.get<{ items: IStoreDomain[] }>({ url: "/public/domains" });
}

export function fetchStoreApp(id: number) {
  return Request.get<IStoreAppDetail>({ url: `/public/apps/${id}`, dataField: "item" });
}

export function formatBytes(bytes?: number | null): string | null {
  if (bytes == null) return null;

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export function formatDate(value?: string | null): string | null {
  if (!value) return null;

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
