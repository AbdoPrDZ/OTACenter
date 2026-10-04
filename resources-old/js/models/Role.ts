import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";
import User, { IUser } from "./User";
import Permission, { IPermission } from "./Permission";

export interface IRole extends IModel {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

const RoleModel = createModel<IRole>("role", [
  { name: "id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "guard_name", type: "string" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class Role extends RoleModel {
  static getDataTableColumns(): DataTableColumn<IRole>[] {
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
        minWidth: 180,
      },
      {
        field: "guard_name",
        headerName: "Guard",
        flex: 1,
        minWidth: 120,
      },
    ];
  }

  static async indexUsers(roleId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IUser>>> {
    const { pagination, sort, filter } = props || {};

    return Request.get<ItemsResponse<IUser>>({
      url: `/role/${roleId}/user`,
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

  static async attachUser(roleId: number, userId: number) {
    return Request.post({ url: `/role/${roleId}/user/${userId}` });
  }

  static async detachUser(roleId: number, userId: number) {
    return Request.delete({ url: `/role/${roleId}/user/${userId}` });
  }

  static async indexPermissions(roleId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IPermission>>> {
    return Permission.all({ ...props, url: `/role/${roleId}/permission` });
  }
}
