import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Permission, { IPermission } from "@/models/Permission";
import Role from "@/models/Role";
import User from "@/models/User";

import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ModelDataTable from "@/components/ModelDataTable";
import { can } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PermissionTab() {
  const { id } = useParams();
  const permissionId = Number(id);

  if (!permissionId)
    return <ErrorAndRedirect message="Invalid permission ID." route="/dashboard/permissions" />;

  return <PermissionShow permissionId={permissionId} />;
}

/* ------------------------------------------------------------------ */
/* Show                                                               */
/* ------------------------------------------------------------------ */

function PermissionShow({ permissionId }: { permissionId: number }) {
  const navigate = useNavigate();
  const [permission, setPermission] = useState<IPermission>();

  useEffect(() => {
    Permission.find(permissionId).then((response) => {
      if (response.success && response.data) setPermission(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/permissions");
    });
  }, [permissionId, navigate]);

  if (!permission) return <Spinner className="mx-auto mt-16 size-6" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">{permission.name}</h1>
          <p className="text-xs text-muted-foreground">{permission.guard_name}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/permissions")}>
          Back
        </Button>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          {can({ permission: "role.view" }) && (
            <TabsTrigger value="roles">Roles</TabsTrigger>
          )}
          {can({ permission: "user.view" }) && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="roles" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelDataTable
                model={Role}
                url={`/permission/${permissionId}/role`}
                onRowClick={(row) => navigate(`/dashboard/roles/${row.id}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelDataTable
                model={User}
                url={`/permission/${permissionId}/user`}
                onRowClick={(row) => navigate(`/dashboard/users/${row.id}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
