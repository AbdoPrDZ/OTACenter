import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link2, Unlink } from "lucide-react";

import Role, { IRole } from "@/models/Role";
import User, { IUser } from "@/models/User";
import Permission, { IPermission } from "@/models/Permission";

import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ModelDataTable from "@/components/ModelDataTable";
import { RoleStats } from "@/components/StatisticsViews";
import { Avatar, Spinner } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/select-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function RoleTab() {
  const { id } = useParams();
  const roleId = Number(id);

  if (!roleId)
    return <ErrorAndRedirect message="Invalid role ID." route="/dashboard/roles" />;

  return <RoleShow roleId={roleId} />;
}

const PERMISSION_COLUMNS: DataTableColumn<IPermission>[] = [
  { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
  { field: "name", headerName: "Permission", flex: 2, minWidth: 220 },
  { field: "guard_name", headerName: "Guard", flex: 1, minWidth: 120 },
];

function RoleShow({ roleId }: { roleId: number }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState<IRole>();
  const [attached, setAttached] = useState<IUser[]>([]);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    Role.find(roleId).then((response) => {
      if (response.success && response.data) setRole(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/roles");
    });
  }, [roleId, navigate]);

  const refresh = useCallback(() => {
    Role.indexUsers(roleId, { pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setAttached(response.data.items);
    });
  }, [roleId]);

  useEffect(() => {
    refresh();
    User.all({ pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setAllUsers(response.data.items);
    });
  }, [refresh]);

  if (!role) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  const available = allUsers.filter(
    (user) => !attached.some((existing) => existing.id === user.id),
  );

  const attach = async () => {
    if (selectedIds.length === 0) return;
    setAttaching(true);
    await Promise.all(selectedIds.map((id) => Role.attachUser(roleId, Number(id))));
    setAttaching(false);
    setSelectedIds([]);
    toast.success("Users attached");
    refresh();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={role.name}
        description={`Guard: ${role.guard_name}`}
        breadcrumbs={[
          { label: "Roles", to: "/dashboard/roles" },
          { label: role.name },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelDataTable
            model={Permission}
            url={`/role/${roleId}/permission`}
            columns={PERMISSION_COLUMNS}
            onRowClick={(row) => navigate(`/dashboard/permissions/${row.id}`)}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          {can({ roles: ["super-admin", "admin"] }) ? (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Attached users</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {attached.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No users attached to this role.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {attached.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      <Avatar src={user.image_url} name={user.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{user.name}</p>
                        <p className="truncate text-[0.625rem] text-muted-foreground">
                          {user.login}
                        </p>
                      </div>
                      {can({ permission: "role.detach" }) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={async () => {
                            const response = await Role.detachUser(roleId, user.id);
                            if (response.success) {
                              toast.success("User detached");
                              refresh();
                            }
                          }}
                        >
                          <Unlink /> Detach
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {can({ permission: "role.attach" }) && available.length > 0 ? (
                <div className="flex items-start gap-2">
                  <MultiSelect
                    className="flex-1"
                    options={available.map((user) => ({
                      value: user.id,
                      label: user.name,
                      description: user.login,
                    }))}
                    values={selectedIds}
                    onValuesChange={setSelectedIds}
                    placeholder="Select users to attach..."
                    searchPlaceholder="Search users..."
                  />
                  <Button
                    size="sm"
                    disabled={attaching || selectedIds.length === 0}
                    loading={attaching}
                    onClick={attach}
                  >
                    <Link2 /> Attach
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <RoleStats roleId={roleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
