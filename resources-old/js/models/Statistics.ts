import { Response } from "@/types/http";

import Request from "@/utils/http";

export interface GeneralStatistics {
  users: { total: number; with_domains: number; without_domains: number };
  roles: { total: number };
  domains: { total: number };
  apps: {
    total: number;
    with_versions: number;
    without_versions: number;
  };
  versions: {
    total: number;
    by_status: Record<string, number>;
    with_bundles: number;
    without_bundles: number;
  };
  bundles: { total: number; by_status: Record<string, number> };
}

export interface UserStatistics {
  item: { id: number; name: string; login: string; image_url?: string };
  statistics: {
    roles: { id: number; name: string }[];
    domains: { id: number; name: string }[];
    roles_count: number;
    domains_count: number;
  };
}

export interface RoleStatistics {
  item: { id: number; name: string; guard_name: string };
  statistics: {
    users: { id: number; name: string; login: string }[];
    users_count: number;
  };
}

export interface DomainStatistics {
  item: {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
  };
  statistics: {
    users: { id: number; name: string; login: string }[];
    apps: { id: number; name: string; status: string }[];
    users_count: number;
    apps_count: number;
  };
}

export interface AppStatistics {
  item: {
    id: number;
    name: string;
    package_name: string;
    status: string;
    logo_url?: string;
  };
  statistics: {
    versions: { id: number; name: string; status: string; bundles_count: number }[];
    versions_by_status: Record<string, number>;
    domains: { id: number; name: string }[];
    versions_count: number;
    bundles_count: number;
    domains_count: number;
  };
}

export interface VersionStatistics {
  item: { id: number; name: string; status: string; app_id: number; app_name?: string };
  statistics: {
    bundles: { id: number; name: string | null; url?: string }[];
    bundles_count: number;
    latest_bundle: { id: number; name: string | null } | null;
  };
}

export type StatisticsItem =
  | UserStatistics["item"]
  | RoleStatistics["item"]
  | DomainStatistics["item"]
  | AppStatistics["item"]
  | VersionStatistics["item"];

export default class Statistics {
  static async general(): Promise<Response<{ statistics: GeneralStatistics }>> {
    return Request.get({ url: "/statistics/general" });
  }

  static async byUser(id: number): Promise<Response<UserStatistics>> {
    return Request.get({ url: `/statistics/user/${id}` });
  }

  static async byRole(id: number): Promise<Response<RoleStatistics>> {
    return Request.get({ url: `/statistics/role/${id}` });
  }

  static async byDomain(id: number): Promise<Response<DomainStatistics>> {
    return Request.get({ url: `/statistics/domain/${id}` });
  }

  static async byApp(id: number): Promise<Response<AppStatistics>> {
    return Request.get({ url: `/statistics/app/${id}` });
  }

  static async byVersion(id: number): Promise<Response<VersionStatistics>> {
    return Request.get({ url: `/statistics/version/${id}` });
  }
}
