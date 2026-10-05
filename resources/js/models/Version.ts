import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";

export interface IVersion extends IModel {
  id: number;
  app_id: number;
  name: string;
  changelog: string;
  status: "draft" | "review" | "published" | "cancelled";
  update_type: "optional" | "force";
  file_id: string;
  api_key: string;
  latest_id: number | null;
  default_bundle_version: string | null;
  created_at: string;
  updated_at: string;
}

const VersionModel = createModel<IVersion>("version", [
  { name: "id", type: "number" },
  { name: "app_id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "changelog", type: "string" },
  { name: "status", type: "enum", enum: ["draft", "review", "published", "cancelled"] },
  { name: "update_type", type: "enum", enum: ["optional", "force"] },
  { name: "file_id", type: "string" },
  { name: "api_key", type: "string", required: true },
  { name: "latest_id", type: "number" },
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
