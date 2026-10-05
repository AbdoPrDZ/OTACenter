import {
  DataTableColumn,
  FetchAllProps,
  IModel,
  ItemsResponse,
} from "@/types/model";
import { Response } from "@/types/http";

import { createModel } from "@/utils/model";
import Request from "@/utils/http";

export interface IReviewUser {
  id: number;
  name: string;
  login: string;
  image_url: string | null;
}

export interface IReviewApp {
  id: number;
  name: string;
  package_name: string;
  logo_url: string | null;
}

export interface IReview extends IModel {
  id: number;
  app_id: number;
  user_id: number | null;
  rating: number;
  title?: string;
  comment?: string;
  status: "published" | "rejected";
  user?: IReviewUser | null;
  app?: IReviewApp | null;
}

const ReviewModel = createModel<IReview>("review", [
  { name: "id", type: "number" },
  { name: "app_id", type: "number" },
  { name: "user_id", type: "number" },
  { name: "rating", type: "number" },
  { name: "title", type: "string" },
  { name: "comment", type: "string" },
  { name: "status", type: "enum", enum: ["published", "rejected"] },
  { name: "user", type: "object" },
  { name: "app", type: "object" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
]);

export default class Review extends ReviewModel {
  static async allForApp(
    appId: number,
    props?: FetchAllProps,
  ): Promise<Response<ItemsResponse<IReview>>> {
    return this.all({ ...props, url: `/app/${appId}/review` });
  }

  static async mine(appId: number) {
    return Request.get<IReview | null>({
      url: `/app/${appId}/review/me`,
      dataField: "item",
      dataEncoding: async (data) => (data ? await Review.decode(data) : null),
    });
  }

  static async save(
    appId: number,
    data: { rating: number; title?: string; comment?: string },
  ) {
    return Request.post({
      url: `/app/${appId}/review`,
      data,
      dataField: "item",
      dataEncoding: async (value) => await Review.decode(value),
    });
  }

  static async moderate(
    appId: number,
    reviewId: number,
    status: "published" | "rejected",
  ) {
    return Request.post({
      url: `/app/${appId}/review/${reviewId}/moderate`,
      data: { status },
      dataField: "item",
      dataEncoding: async (value) => await Review.decode(value),
    });
  }

  static async destroy(appId: number, reviewId: number) {
    return Request.delete({ url: `/app/${appId}/review/${reviewId}` });
  }

  static getDataTableColumns(): DataTableColumn<IReview>[] {
    return [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "rating", headerName: "Rating", flex: 0.6, minWidth: 100 },
      { field: "comment", headerName: "Review", flex: 2, minWidth: 220 },
      { field: "status", headerName: "Status", flex: 0.6, minWidth: 100 },
      { field: "created_at", headerName: "Date", flex: 0.7, minWidth: 120 },
    ];
  }
}
