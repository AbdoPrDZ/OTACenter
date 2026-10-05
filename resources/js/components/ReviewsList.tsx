import { useMemo, useState } from "react";
import { Check, EyeOff, Trash2 } from "lucide-react";

import Review, { IReview } from "@/models/Review";
import ModelDataTable from "@/components/ModelDataTable";
import StarRating from "@/components/StarRating";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function ReviewsList({
  appId,
  showApp = false,
}: {
  appId?: number;
  showApp?: boolean;
}) {
  const toast = useToast();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IReview>[]>(() => {
    const cols: DataTableColumn<IReview>[] = [];

    if (showApp) {
      cols.push({
        field: "app",
        headerName: "App",
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) =>
          row.app ? (
            <span className="text-xs font-medium">{row.app.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      });
    }

    cols.push(
      {
        field: "rating",
        headerName: "Rating",
        flex: 0.7,
        minWidth: 110,
        renderCell: ({ row }) => <StarRating value={row.rating} />,
      },
      {
        field: "user",
        headerName: "User",
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) =>
          row.user ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar src={row.user.image_url ?? undefined} name={row.user.name} size={24} />
              <span className="truncate text-xs">{row.user.name}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Anonymous</span>
          ),
      },
      {
        field: "comment",
        headerName: "Review",
        flex: 2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            {row.title ? (
              <span className="truncate text-xs font-medium">{row.title}</span>
            ) : null}
            <span className="line-clamp-1 text-[0.6875rem] text-muted-foreground">
              {row.comment || "—"}
            </span>
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        minWidth: 100,
        renderCell: ({ row }) => (
          <Badge variant={row.status === "published" ? "success" : "outline"}>
            {row.status}
          </Badge>
        ),
      },
      {
        field: "created_at",
        headerName: "Date",
        flex: 0.7,
        minWidth: 120,
      },
    );

    return cols;
  }, [showApp]);

  const canModerate = can({ permission: "review.moderate" });
  const canDelete = can({ permission: "review.delete" });

  return (
    <ModelDataTable
      model={Review}
      url={appId ? `/app/${appId}/review` : undefined}
      columns={columns}
      requestKey={requestKey}
      emptyMessage="No reviews yet."
      actions={
        canModerate || canDelete
          ? (row) => (
              <div className="flex items-center justify-end gap-1">
                {canModerate ? (
                  row.status === "published" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const response = await Review.moderate(row.app_id, row.id, "rejected");
                        if (response.success) {
                          toast.success("Review hidden");
                          setRequestKey((key) => key + 1);
                        }
                      }}
                    >
                      <EyeOff /> Hide
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const response = await Review.moderate(row.app_id, row.id, "published");
                        if (response.success) {
                          toast.success("Review published");
                          setRequestKey((key) => key + 1);
                        }
                      }}
                    >
                      <Check /> Approve
                    </Button>
                  )
                ) : null}

                {canDelete ? (
                  <ConfirmDelete
                    title="Delete review?"
                    description="This permanently removes the review."
                    onConfirm={() => Review.destroy(row.app_id, row.id)}
                    onDeleted={() => setRequestKey((key) => key + 1)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete review"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                ) : null}
              </div>
            )
          : undefined
      }
    />
  );
}
