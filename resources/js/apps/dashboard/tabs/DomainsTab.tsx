import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import Domain, { IDomain } from "@/models/Domain";
import DashboardRouter from "@/apps/dashboard/router";
import ModelDataTable from "@/components/ModelDataTable";
import ConfirmDelete from "@/components/ConfirmDelete";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function DomainsTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IDomain>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
      { field: "description", headerName: "Description", flex: 1.8, minWidth: 220 },
    ],
    [],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Domains"
        description="Organizational groups that scope which users can access which apps."
        actions={
          can({ permission: "domain.create" }) ? (
            <Button onClick={() => navigate(DashboardRouter.getPath("domain.add")!)}>
              <Plus /> Add domain
            </Button>
          ) : null
        }
      />

      <ModelDataTable
        model={Domain}
        columns={columns}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/domains/${row.id}`)}
        actions={
          can({ permission: "domain.delete" })
            ? (row) => (
                <ConfirmDelete
                  title={`Delete ${row.name}?`}
                  description="This permanently deletes the domain and removes its bindings."
                  onConfirm={() => Domain.delete(row.id)}
                  onDeleted={() => setRequestKey((key) => key + 1)}
                />
              )
            : undefined
        }
      />
    </div>
  );
}
