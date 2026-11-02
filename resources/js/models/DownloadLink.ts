import { FetchAllProps, ItemsResponse } from "@/types/model";
import { Response } from "@/types/http";

import Request from "@/utils/http";

export type DownloadLinkStatus = "active" | "expired" | "revoked";

/** A shareable download link for an app (URL + QR code), counted for `user`. */
export interface IDownloadLink {
  id: number;
  app_id: number;
  label: string | null;
  /** Full download URL including the `?token=` — the value encoded in the QR code. */
  url: string;
  status: DownloadLinkStatus;
  user: { id: number; name: string; login: string } | null;
  creator: { id: number; name: string } | null;
  downloads_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateDownloadLinkData {
  /** Who downloads are counted for; defaults to the current user. */
  user_id?: number | null;
  label?: string | null;
  /** One of `DOWNLOAD_LINK_EXPIRY_DAYS`, or null for a link that never expires. */
  expires_in_days?: number | null;
}

/** Lifetimes accepted by the API (`DownloadLinkController::EXPIRY_DAYS`). */
export const DOWNLOAD_LINK_EXPIRY_DAYS = [1, 7, 30, 90, 365] as const;

export default class DownloadLink {
  static endpointFor(appId: number): string {
    return `/app/${appId}/download-link`;
  }

  static async allForApp(
    appId: number,
    props?: FetchAllProps,
  ): Promise<Response<ItemsResponse<IDownloadLink>>> {
    return Request.get({
      url: this.endpointFor(appId),
      params: {
        page: props?.pagination?.page ?? 1,
        pageSize: props?.pagination?.pageSize ?? 50,
      },
    });
  }

  static async create(appId: number, data: CreateDownloadLinkData): Promise<Response<IDownloadLink>> {
    return Request.post({ url: this.endpointFor(appId), data, dataField: "item" });
  }

  static async revoke(appId: number, linkId: number): Promise<Response<IDownloadLink>> {
    return Request.delete({ url: `${this.endpointFor(appId)}/${linkId}`, dataField: "item" });
  }
}
