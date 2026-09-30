import { useNavigate } from "react-router-dom";

import App, { IApp } from "@/models/App";
import ModelDataTable from "@/components/ModelDataTable";
import DomainTags from "@/components/DomainTags";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTableColumn } from "@/types/model";
import { can } from "@/utils/permissions";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export default function AppsTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IApp>[]>(() => [
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
      field: "package_name",
      headerName: "Package Name",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1.4,
      minWidth: 160,
    },
    {
      field: "latest_id",
      headerName: "Status",
      flex: 0.6,
      minWidth: 90,
      renderCell: ({ row }) => (
        <span
          className={
            row.latest_id
              ? "rounded bg-primary/10 px-1.5 py-0.5 text-[0.625rem] text-primary uppercase"
              : "rounded bg-muted px-1.5 py-0.5 text-[0.625rem] uppercase"
          }
        >
          {row.latest_id ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      field: "domains",
      headerName: "Domains",
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => <DomainTags domains={row.domains ?? []} />,
    },
  ], []);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Apps</h1>
          <p className="text-xs text-muted-foreground">
            Manage the mobile & desktop applications published by the center.
          </p>
        </div>
        {can({ permission: "app.create" }) && (
          <Button onClick={() => navigate("/dashboard/apps/add")}>
            <Plus />
            Add App
          </Button>
        )}
      </div>

      <ModelDataTable
        model={App}
        columns={columns}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/apps/${row.id}`)}
        actions={can({ permission: "app.delete" })
          ? (row) => (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="sm" className="text-destructive" />}
            >
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {row.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the app and all of its versions,
                  bundles and screenshots.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const response = await App.delete(row.id);
                    if (response.success) setRequestKey((key) => key + 1);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      : undefined}
      />
    </div>
  );
}
