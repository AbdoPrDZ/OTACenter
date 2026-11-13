import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";

export interface IBundle extends IModel {
  id: number;
  version_id: number;
  name?: string;
  status?: "draft" | "review" | "published" | "cancelled";
  update_type: "optional" | "force";
  file_id: string;
  url?: string;
  is_demo: boolean;
  promoted_at?: string | null;
  /** Platforms an Expo bundle ships for; empty for an ota-client archive. */
  platforms: ("android" | "ios")[];
  expo_update_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IBundleAsset {
  id: number;
  platform: "android" | "ios";
  source_path: string;
  content_type: string;
  file_extension: string | null;
  is_launch_asset: boolean;
  size: number;
  hash: string;
}

const BundleModel = createModel<IBundle>("bundle", [
  { name: "id", type: "number" },
  { name: "version_id", type: "number" },
  { name: "name", type: "string" },
  { name: "status", type: "enum", enum: ["draft", "review", "published", "cancelled"] },
  { name: "update_type", type: "enum", enum: ["optional", "force"] },
  { name: "file_id", type: "string" },
  { name: "url", type: "string" },
  { name: "is_demo", type: "boolean" },
  { name: "promoted_at", type: "date" },
  { name: "platforms", type: "array" },
  { name: "expo_update_id", type: "string" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class Bundle extends BundleModel {

  static endpointFor(appId: number, versionId: number): string {
    return `/app/${appId}/version/${versionId}/bundle`;
  }

  static async allForVersion(appId: number, versionId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IBundle>>> {
    return this.all({ ...props, url: this.endpointFor(appId, versionId) });
  }

  static async store(appId: number, versionId: number, data: Partial<IBundle> | FormData, multiPart: boolean = true) {
    if (data instanceof FormData) data.append("_method", "POST");
    else data = { _method: "POST", ...data } as Partial<IBundle>;

    return Request.post({
      url: this.endpointFor(appId, versionId),
      data: data,
      dataField: "item",
      dataEncoding: async (data) => await this.decode(data),
      headers: multiPart
        ? {
            ...window.axios.defaults.headers.common,
            "Content-Type": "multipart/form-data",
          }
        : {},
    });
  }

  static async show(appId: number, versionId: number, bundleId: number) {
    return Request.get({
      url: `${this.endpointFor(appId, versionId)}/${bundleId}`,
      dataField: "item",
      dataEncoding: async (data) => await this.decode(data),
    });
  }

  static async updateForVersion(appId: number, versionId: number, bundleId: number, data: Partial<IBundle> | FormData, multiPart: boolean = true) {
    if (data instanceof FormData) data.append("_method", "PUT");
    else data = { _method: "PUT", ...data } as Partial<IBundle>;

    return Request.post({
      url: `${this.endpointFor(appId, versionId)}/${bundleId}`,
      data: data,
      dataField: "item",
      dataEncoding: async (data) => await this.decode(data),
      headers: multiPart
        ? {
            ...window.axios.defaults.headers.common,
            "Content-Type": "multipart/form-data",
          }
        : {},
    });
  }

  static async activate(appId: number, versionId: number, bundleId: number) {
    return Request.post({
      url: `${this.endpointFor(appId, versionId)}/${bundleId}/activate`,
      dataField: "item",
      dataEncoding: async (data) => await Bundle.decode(data),
    });
  }

  /** Publish to demo-eligible devices only. */
  static async activateDemo(appId: number, versionId: number, bundleId: number) {
    return Request.post({ url: `${this.endpointFor(appId, versionId)}/${bundleId}/activate-demo` });
  }

  /** Make a demo bundle the public release. */
  static async promote(appId: number, versionId: number, bundleId: number) {
    return Request.post({ url: `${this.endpointFor(appId, versionId)}/${bundleId}/promote` });
  }

  /** Stop serving the version's demo bundle. */
  static async withdrawDemo(appId: number, versionId: number) {
    return Request.delete({ url: `${this.endpointFor(appId, versionId)}/demo` });
  }

  static async assets(appId: number, versionId: number, bundleId: number) {
    return Request.get<IBundleAsset[]>({
      url: `${this.endpointFor(appId, versionId)}/${bundleId}/assets`,
      dataField: "items",
    });
  }

  static async destroy(appId: number, versionId: number, bundleId: number) {
    return Request.delete({ url: `${this.endpointFor(appId, versionId)}/${bundleId}` });
  }

  static getDataTableColumns(): DataTableColumn<IBundle>[] {
    return [
      {
        field: "id",
        headerName: "ID",
        flex: 0.3,
        minWidth: 30,
      },
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "url",
        headerName: "URL",
        flex: 1.5,
        minWidth: 220,
      },
    ];
  }
}
