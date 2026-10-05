import { DataTableColumn, FetchAllProps, IModel, ItemsResponse } from "@/types/model";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";
import { Response } from "@/types/http";

export interface IDomain extends IModel {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

const DomainModel = createModel<IDomain>("domain", [
  { name: "id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "description", type: "string" },
  { name: "is_public", type: "boolean" },
  { name: "image_url", type: "string" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class Domain extends DomainModel {
  static getDataTableColumns(): DataTableColumn<IDomain>[] {
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
        field: "description",
        headerName: "Description",
        flex: 1.8,
        minWidth: 200,
      },
    ];
  }

  static async indexByApp(appId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IDomain>>> {
    return this.all({ ...props, url: `/app/${appId}/domain` });
  }

  static async indexByUser(userId: number, props?: FetchAllProps): Promise<Response<ItemsResponse<IDomain>>> {
    return this.all({ ...props, url: `/user/${userId}/domain` });
  }

  static async bindApp(appId: number, domainId: number) {
    return Request.post({ url: `/app/${appId}/domain/${domainId}` });
  }

  static async unbindApp(appId: number, domainId: number) {
    return Request.delete({ url: `/app/${appId}/domain/${domainId}` });
  }

  static async bindUser(userId: number, domainId: number) {
    return Request.post({ url: `/user/${userId}/domain/${domainId}` });
  }

  static async unbindUser(userId: number, domainId: number) {
    return Request.delete({ url: `/user/${userId}/domain/${domainId}` });
  }
}
