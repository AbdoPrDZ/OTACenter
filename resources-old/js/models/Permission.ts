import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";
import Role, { IRole } from "./Role";
import User, { IUser } from "./User";

export interface IPermission extends IModel {
  id: number;
  name: string;
  guard_name: string;
  direct?: boolean;
  created_at: string;
  updated_at: string;
}

const PermissionModel = createModel<IPermission>("permission", [
  { name: "id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "guard_name", type: "string" },
  { name: "direct", type: "boolean" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class Permission extends PermissionModel {
  static getDataTableColumns(): DataTableColumn<IPermission>[] {
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
        flex: 2,
        minWidth: 200,
      },
      {
        field: "guard_name",
        headerName: "Guard",
        flex: 1,
        minWidth: 120,
      },
    ];
  }

  static async indexRoles(permissionId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IRole>>> {
    const { pagination, sort, filter } = props || {};

    return Request.get<ItemsResponse<IRole>>({
      url: `/permission/${permissionId}/role`,
      dataEncoding: async (data) => ({
        items: await Promise.all(data.items.map((raw: any) => Role.decode(raw))),
        itemsCount: data.itemsCount,
        pagesCount: data.pagesCount,
        page: data.page,
      }),
      params: {
        page: pagination ? pagination?.page : null,
        pageSize: pagination?.pageSize,
        search: filter?.quickFilterValues?.[0],
        sort: {
          ...sort?.reduce((acc, e) => ({ ...acc, [e.field]: e.sort }), {}),
        },
        filter: {
          ...filter?.items?.reduce(
            (acc, e) => ({
              ...acc,
              [e.field]: e.value,
            }),
            {}
          ),
        },
      },
    });
  }

  static async indexUsers(permissionId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IUser>>> {
    const { pagination, sort, filter } = props || {};

    return Request.get<ItemsResponse<IUser>>({
      url: `/permission/${permissionId}/user`,
      dataEncoding: async (data) => ({
        items: await Promise.all(data.items.map((raw: any) => User.decode(raw))),
        itemsCount: data.itemsCount,
        pagesCount: data.pagesCount,
        page: data.page,
      }),
      params: {
        page: pagination ? pagination?.page : null,
        pageSize: pagination?.pageSize,
        search: filter?.quickFilterValues?.[0],
        sort: {
          ...sort?.reduce((acc, e) => ({ ...acc, [e.field]: e.sort }), {}),
        },
        filter: {
          ...filter?.items?.reduce(
            (acc, e) => ({
              ...acc,
              [e.field]: e.value,
            }),
            {}
          ),
        },
      },
    });
  }
}
