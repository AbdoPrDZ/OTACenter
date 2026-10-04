import { DataTableColumn, IModel } from "@/types/model";

import { createModel } from "@/utils/model";
import { IDomain } from "./Domain";
import { IVersion } from "./Version";

export interface IApp extends IModel {
  id: number;
  name: string;
  package_name: string;
  summary: string;
  description: string;
  logo_url?: string;
  domains?: IDomain[];
  latest_id?: number | null;
  latest?: IVersion | null;
  created_at: string;
  updated_at: string;
}

const AppModel = createModel<IApp>("app", [
  { name: "id", type: "number" },
  { name: "name", type: "string", required: true },
  { name: "package_name", type: "string", required: true },
  { name: "summary", type: "string", required: true },
  { name: "description", type: "string", required: true },
  { name: "logo_url", type: "string" },
  { name: "domains", type: "array" },
  { name: "latest_id", type: "number" },
  { name: "latest", type: "object" },
  { name: "created_at", type: "date" },
  { name: "updated_at", type: "date" },
], true);

export default class App extends AppModel {

  static getDataTableColumns(): DataTableColumn<IApp>[] {
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
        field: "package_name",
        headerName: "Package Name",
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
}
