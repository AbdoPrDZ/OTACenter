import { FieldValues } from "react-hook-form";

import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";
import { Response } from "@/types/http";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { IDomain } from "./Domain";
import Role, { IRole } from "./Role";
import Permission, { IPermission } from "./Permission";

export interface IUser extends IModel {
  id: number;
  name: string;
  login: string;
  image_url: string;
  domains?: IDomain[];
  roles?: string[];
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

const UserModel = createModel<IUser>("user", [
  { name: "id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "login", type: "string", required: true },
  { name: "image_url", type: "string" },
  { name: "domains", type: "array" },
  { name: "roles", type: "array" },
  { name: "permissions", type: "array" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class User extends UserModel {
  static async login(data: FieldValues) {
    return await Request.post({
      url: "/auth/login",
      data: data,
    });
  }

  static async indexRoles(userId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IRole>>> {
    return Role.all({ ...props, url: `/user/${userId}/role` });
  }

  static async indexPermissions(userId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IPermission>>> {
    return Permission.all({ ...props, url: `/user/${userId}/permission` });
  }

  static async attachPermission(userId: number, permissionId: number) {
    return Request.post({ url: `/user/${userId}/permission/${permissionId}` });
  }

  static async detachPermission(userId: number, permissionId: number) {
    return Request.delete({ url: `/user/${userId}/permission/${permissionId}` });
  }

  static async invite(data: {
    name: string;
    email: string;
    role: string;
    domain_id?: number | null;
  }) {
    return await Request.post({
      url: "/user/invite",
      data,
    });
  }

  private static _currentUser?: IUser;

  static get current() {
    return User._currentUser;
  }

  static getDataTableColumns(): DataTableColumn<IUser>[] {
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
        field: "login",
        headerName: "Login",
        flex: 1,
        minWidth: 180,
      },
    ];
  }

  static async auth() {
    const response = await Request.get({
      url: "/auth/me",
      dataField: "user",
      dataEncoding: async (data) => await this.decode(data),
    });

    if (response.success && response.data) {
      User._currentUser = response.data;
    }

    return response;
  }

  static async editProfile(data: FormData) {
    // A FormData has no own enumerable properties, so `{ _method: "PUT", ...data }`
    // silently dropped every entry and the server only ever received `_method`.
    // Append the override to the FormData itself instead.
    data.append("_method", "PUT");

    const response = await Request.post({
      url: "/auth/profile",
      data,
      dataField: "user",
      dataEncoding: async (value) => await this.decode(value),
      // Content-Type is deliberately left unset: the browser must add
      // multipart/form-data together with the boundary it generates.
    });

    if (response.success && response.data)
      User._currentUser = response.data;

    return response;
  }

  static async logout() {
    const response = await Request.delete({
      url: "/auth/logout",
    });

    if (response.success) window.location.href = '/auth/login';
  }

}
