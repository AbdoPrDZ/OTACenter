import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import App, { IApp } from "@/models/App";
import DashboardRouter from "@/apps/dashboard/router";
import ModelDataTable from "@/components/ModelDataTable";
import DomainTags from "@/components/DomainTags";
import ConfirmDelete from "@/components/ConfirmDelete";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function AppsTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IApp>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
      { field: "package_name", headerName: "Package", flex: 1, minWidth: 180 },
      { field: "summary", headerName: "Summary", flex: 1.4, minWidth: 180 },
      {
        field: "latest_id",
        headerName: "Status",
        flex: 0.6,
        minWidth: 100,
        renderCell: ({ row }) =>
          row.latest_id ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          ),
      },
      {
        field: "domains",
        headerName: "Domains",
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => <DomainTags domains={row.domains ?? []} max={2} />,
      },
    ],
    [],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Apps"
        description="Manage the mobile & desktop applications published by the center."
        actions={
          can({ permission: "app.create" }) ? (
            <Button onClick={() => navigate(DashboardRouter.getPath("app.add")!)}>
              <Plus /> Add app
            </Button>
          ) : null
        }
      />

      <ModelDataTable
        model={App}
        columns={columns}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/apps/${row.id}`)}
        actions={
          can({ permission: "app.delete" })
            ? (row) => (
                <ConfirmDelete
                  title={`Delete ${row.name}?`}
                  description="This permanently deletes the app and all of its versions, bundles and screenshots."
                  onConfirm={() => App.delete(row.id)}
                  onDeleted={() => setRequestKey((key) => key + 1)}
                />
              )
            : undefined
        }
      />
    </div>
  );
}
