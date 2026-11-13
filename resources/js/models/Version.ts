import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";

export interface IVersion extends IModel {
  id: number;
  app_id: number;
  name: string;
  /** Which client consumes the version: the bare React Native `ota-client` or Expo (`expo-updates`). */
  client_type: "ota-client" | "expo";
  changelog: string;
  status: "draft" | "review" | "published" | "cancelled";
  update_type: "optional" | "force";
  file_id: string;
  api_key: string;
  latest_id: number | null;
  /** The demo bundle, offered only to demo-eligible devices. */
  demo_latest_id: number | null;
  is_demo: boolean;
  promoted_at?: string | null;
  default_bundle_version: string | null;
  created_at: string;
  updated_at: string;
}

const VersionModel = createModel<IVersion>("version", [
  { name: "id", type: "number" },
  { name: "app_id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "client_type", type: "enum", enum: ["ota-client", "expo"] },
  { name: "changelog", type: "string" },
  { name: "status", type: "enum", enum: ["draft", "review", "published", "cancelled"] },
  { name: "update_type", type: "enum", enum: ["optional", "force"] },
  { name: "file_id", type: "string" },
  { name: "api_key", type: "string", required: true },
  { name: "latest_id", type: "number" },
  { name: "demo_latest_id", type: "number" },
  { name: "is_demo", type: "boolean" },
  { name: "promoted_at", type: "date" },
  { name: "default_bundle_version", type: "string" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class Version extends VersionModel {

  static endpointFor(appId: number): string {
    return `/app/${appId}/version`;
  }

  static async allForApp(appId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IVersion>>> {
    return this.all({ ...props, url: this.endpointFor(appId) });
  }

  static async show(appId: number, versionId: number) {
    return Request.get({
      url: `${this.endpointFor(appId)}/${versionId}`,
      dataField: "item",
      dataEncoding: async (data) => await this.decode(data),
    });
  }

  static async store(appId: number, data: Partial<IVersion> | FormData, multiPart: boolean = true) {
    if (data instanceof FormData) data.append("_method", "POST");
    else data = { _method: "POST", ...data } as Partial<IVersion>;

    return Request.post({
      url: this.endpointFor(appId),
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

  static async updateForApp(appId: number, versionId: number, data: Partial<IVersion> | FormData, multiPart: boolean = true) {
    if (data instanceof FormData) data.append("_method", "PUT");
    else data = { _method: "PUT", ...data } as Partial<IVersion>;

    return Request.post({
      url: `${this.endpointFor(appId)}/${versionId}`,
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

  /** Make this version the app's public one. */
  static async activate(appId: number, versionId: number) {
    return Request.post({ url: `${this.endpointFor(appId)}/${versionId}/activate` });
  }

  /** Publish to demo-eligible devices only. */
  static async activateDemo(appId: number, versionId: number) {
    return Request.post({ url: `${this.endpointFor(appId)}/${versionId}/activate-demo` });
  }

  /** Make a demo version the public release. */
  static async promote(appId: number, versionId: number) {
    return Request.post({ url: `${this.endpointFor(appId)}/${versionId}/promote` });
  }

  /** Stop serving the app's demo version. */
  static async withdrawDemo(appId: number) {
    return Request.delete({ url: `${this.endpointFor(appId)}/demo` });
  }

  static async destroy(appId: number, versionId: number) {
    return Request.delete({ url: `${this.endpointFor(appId)}/${versionId}` });
  }

  static getDataTableColumns(): DataTableColumn<IVersion>[] {
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
        field: "changelog",
        headerName: "Changelog",
        flex: 1.8,
        minWidth: 200,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        minWidth: 100,
      },
    ];
  }
}
