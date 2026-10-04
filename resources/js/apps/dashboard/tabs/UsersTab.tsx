import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import User, { IUser } from "@/models/User";
import ModelDataTable from "@/components/ModelDataTable";
import DomainTags from "@/components/DomainTags";
import InviteDialog from "@/components/InviteDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";
import { UserPlus } from "lucide-react";

export default function UsersTab() {
  const navigate = useNavigate();
  const [requestKey, setRequestKey] = useState(0);

  const columns = useMemo<DataTableColumn<IUser>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
      { field: "login", headerName: "Login", flex: 1, minWidth: 200 },
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
        title="Users"
        description="Users come from your LDAP directory and are bound to domains."
        actions={
          can({ permission: "user.invite" }) ? (
            <InviteDialog
              onInvited={() => setRequestKey((key) => key + 1)}
              trigger={
                <Button>
                  <UserPlus /> Invite user
                </Button>
              }
            />
          ) : null
        }
      />

      <ModelDataTable
        model={User}
        columns={columns}
        requestKey={requestKey}
        onRowClick={(row) => navigate(`/dashboard/users/${row.id}`)}
      />
    </div>
  );
}
