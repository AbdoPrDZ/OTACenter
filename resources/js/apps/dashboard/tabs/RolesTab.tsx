import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Role, { IRole } from "@/models/Role";
import ModelDataTable from "@/components/ModelDataTable";
import { DataTableColumn } from "@/types/model";

export default function RolesTab() {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<IRole>[]>(() => [
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
  ], []);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Roles</h1>
          <p className="text-xs text-muted-foreground">
            View the roles used across the center and the users attached to them.
          </p>
        </div>
      </div>

      <ModelDataTable
        model={Role}
        columns={columns}
        onRowClick={(row) => navigate(`/dashboard/roles/${row.id}`)}
      />
    </div>
  );
}
