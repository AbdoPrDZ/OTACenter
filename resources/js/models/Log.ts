import {
  DataTableColumn,
  FetchAllProps,
  IModel,
  ItemsResponse,
} from "@/types/model";
import { Response } from "@/types/http";

import { createModel } from "@/utils/model";

export interface ILogHolder {
  type: string;
  id: number;
  label: string | null;
}

export interface ILog extends IModel {
  id: number;
  event: string;
  message?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  holders: ILogHolder[];
}

const LogModel = createModel<ILog>("log", [
  { name: "id", type: "number" },
  { name: "event", type: "string" },
  { name: "message", type: "string" },
  { name: "meta", type: "object" },
  { name: "ip", type: "string" },
  { name: "holders", type: "array" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
]);

export default class Log extends LogModel {
  static async allForApp(
    appId: number,
    props?: FetchAllProps,
  ): Promise<Response<ItemsResponse<ILog>>> {
    return this.all({ ...props, url: `/app/${appId}/log` });
  }

  static async allForUser(
    userId: number,
    props?: FetchAllProps,
  ): Promise<Response<ItemsResponse<ILog>>> {
    return this.all({ ...props, url: `/user/${userId}/log` });
  }

  static getDataTableColumns(): DataTableColumn<ILog>[] {
    return [
      { field: "created_at", headerName: "When", flex: 0.8, minWidth: 130 },
      { field: "event", headerName: "Event", flex: 1, minWidth: 170 },
      { field: "message", headerName: "Message", flex: 2, minWidth: 200 },
      { field: "holders", headerName: "Related", flex: 1.5, minWidth: 180 },
    ];
  }
}
