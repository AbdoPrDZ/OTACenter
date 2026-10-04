import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Permission, { IPermission } from "@/models/Permission";
import ModelDataTable from "@/components/ModelDataTable";
import { DataTableColumn } from "@/types/model";

export default function PermissionsTab() {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<IPermission>[]>(() => [
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
  ], []);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Permissions</h1>
          <p className="text-xs text-muted-foreground">
            View the permissions used across the center and the roles that grant them.
          </p>
        </div>
      </div>

      <ModelDataTable
        model={Permission}
        columns={columns}
        onRowClick={(row) => navigate(`/dashboard/permissions/${row.id}`)}
      />
    </div>
  );
}
