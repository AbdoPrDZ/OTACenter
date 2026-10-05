import { useMemo } from "react";

import Log, { ILog } from "@/models/Log";
import ModelDataTable from "@/components/ModelDataTable";
import { Badge } from "@/components/ui/badge";
import { DataTableColumn } from "@/types/model";

export default function ActivityList({ url }: { url?: string }) {
  const columns = useMemo<DataTableColumn<ILog>[]>(
    () => [
      { field: "created_at", headerName: "When", flex: 0.8, minWidth: 130 },
      {
        field: "event",
        headerName: "Event",
        flex: 1,
        minWidth: 170,
        renderCell: ({ row }) => <Badge variant="outline">{row.event}</Badge>,
      },
      {
        field: "message",
        headerName: "Message",
        flex: 2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.message || "—"}</span>
        ),
      },
      {
        field: "holders",
        headerName: "Related",
        flex: 1.5,
        minWidth: 180,
        renderCell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {(row.holders ?? []).map((holder, index) => (
              <span
                key={`${holder.type}-${holder.id}-${index}`}
                className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium text-muted-foreground"
              >
                {holder.type}
                {holder.label ? `: ${holder.label}` : ` #${holder.id}`}
              </span>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <ModelDataTable
      model={Log}
      url={url}
      columns={columns}
      emptyMessage="No activity yet."
    />
  );
}
