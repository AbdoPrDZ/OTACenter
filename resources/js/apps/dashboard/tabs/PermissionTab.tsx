import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Permission, { IPermission } from "@/models/Permission";
import Role, { IRole } from "@/models/Role";
import User, { IUser } from "@/models/User";

import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ModelDataTable from "@/components/ModelDataTable";
import { Spinner } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function PermissionTab() {
  const { id } = useParams();
  const permissionId = Number(id);

  if (!permissionId)
    return <ErrorAndRedirect message="Invalid permission ID." route="/dashboard/permissions" />;

  return <PermissionShow permissionId={permissionId} />;
}

function PermissionShow({ permissionId }: { permissionId: number }) {
  const navigate = useNavigate();
  const [permission, setPermission] = useState<IPermission>();

  const roleColumns = useMemo<DataTableColumn<IRole>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Role", flex: 1, minWidth: 160 },
      { field: "guard_name", headerName: "Guard", flex: 1, minWidth: 120 },
    ],
    [],
  );

  const userColumns = useMemo<DataTableColumn<IUser>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
      { field: "login", headerName: "Login", flex: 1, minWidth: 180 },
    ],
    [],
  );

  useEffect(() => {
    Permission.find(permissionId).then((response) => {
      if (response.success && response.data) setPermission(response.data);
      else if (!response.success && response.status === 404)
        navigate("/dashboard/permissions");
    });
  }, [permissionId, navigate]);

  if (!permission) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={permission.name}
        description={`Guard: ${permission.guard_name}`}
        breadcrumbs={[
          { label: "Permissions", to: "/dashboard/permissions" },
          { label: permission.name },
        ]}
      />

      <Tabs defaultValue="roles">
        <TabsList>
          {can({ permission: "role.view" }) ? <TabsTrigger value="roles">Roles</TabsTrigger> : null}
          {can({ permission: "user.view" }) ? <TabsTrigger value="users">Users</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Granting roles</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelDataTable
                model={Role}
                url={`/permission/${permissionId}/role`}
                columns={roleColumns}
                onRowClick={(row) => navigate(`/dashboard/roles/${row.id}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Users with this permission</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelDataTable
                model={User}
                url={`/permission/${permissionId}/user`}
                columns={userColumns}
                onRowClick={(row) => navigate(`/dashboard/users/${row.id}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
