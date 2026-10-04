import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";

export interface IAppScreenshot extends IModel {
  id: number;
  app_id: number;
  file_id: string;
  name: string;
  disk: string;
  created_at: string;
  updated_at: string;
}

const AppScreenshotModel = createModel<IAppScreenshot>("screenshot", [
  { name: "id", type: "number" },
  { name: "app_id", type: "number" },
  { name: "file_id", type: "string" },
  { name: "name", type: "string" },
  { name: "disk", type: "string" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class AppScreenshot extends AppScreenshotModel {

  static endpointFor(appId: number): string {
    return `/app/${appId}/screenshot`;
  }

  static async allForApp(appId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IAppScreenshot>>> {
    return this.all({ ...props, url: this.endpointFor(appId) });
  }

  static async store(appId: number, data: Partial<IAppScreenshot> | FormData, multiPart: boolean = true) {
    if (data instanceof FormData) data.append("_method", "POST");
    else data = { _method: "POST", ...data } as Partial<IAppScreenshot>;

    return Request.post({
      url: this.endpointFor(appId),
      data: data,
      dataField: "item",
      headers: multiPart
        ? {
            ...window.axios.defaults.headers.common,
            "Content-Type": "multipart/form-data",
          }
        : {},
    });
  }

  static async destroy(appId: number, screenshotId: number) {
    return Request.delete({ url: `${this.endpointFor(appId)}/${screenshotId}` });
  }

  static getUrl(name: string): string {
    return `${window.location.origin}/files/${name}`;
  }

  static getDataTableColumns(): DataTableColumn<IAppScreenshot>[] {
    return [
      {
        field: "id",
        headerName: "ID",
        flex: 0.3,
        minWidth: 30,
      },
      {
        field: "name",
        headerName: "File",
        flex: 1.8,
        minWidth: 220,
      },
    ];
  }
}
