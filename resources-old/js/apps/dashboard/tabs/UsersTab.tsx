import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import User, { IUser } from "@/models/User";
import ModelDataTable from "@/components/ModelDataTable";
import DomainTags from "@/components/DomainTags";
import InviteDialog from "@/components/InviteDialog";
import { DataTableColumn } from "@/types/model";
import { can } from "@/utils/permissions";

export default function UsersTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IUser>[]>(() => [
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
      field: "login",
      headerName: "Login",
      flex: 1,
      minWidth: 180,
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
          <h1 className="text-sm font-semibold tracking-tight">Users</h1>
          <p className="text-xs text-muted-foreground">
            Browse the LDAP directory users and manage their domain access.
          </p>
        </div>
        {can({ permission: "user.invite" }) && (
          <InviteDialog onInvited={() => setRequestKey((key) => key + 1)} />
        )}
      </div>

      <ModelDataTable
        model={User}
        columns={columns}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/users/${row.id}`)}
      />
    </div>
  );
}
