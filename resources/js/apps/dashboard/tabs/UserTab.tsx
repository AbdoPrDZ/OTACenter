import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FlaskConical, KeyRound, Link2, Smartphone, Unlink } from "lucide-react";

import User, { IUser } from "@/models/User";
import Domain, { IDomain } from "@/models/Domain";
import Permission, { IPermission } from "@/models/Permission";
import Role, { IRole } from "@/models/Role";
import DeviceLink, { IDeviceLinkCode, ILinkedDevice } from "@/models/DeviceLink";

import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ActivityList from "@/components/ActivityList";
import { UserStats } from "@/components/StatisticsViews";
import { Avatar, Spinner } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/select-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { can } from "@/utils/permissions";

export default function UserTab() {
  const { id } = useParams();
  const userId = Number(id);

  if (!userId)
    return <ErrorAndRedirect message="Invalid user ID." route="/dashboard/users" />;

  return <UserShow userId={userId} />;
}

function UserShow({ userId }: { userId: number }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<IUser>();
  const [bound, setBound] = useState<IDomain[]>([]);
  const [all, setAll] = useState<IDomain[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    User.find(userId).then((response) => {
      if (response.success && response.data) setUser(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/users");
    });
  }, [userId, navigate]);

  const refresh = useCallback(() => {
    Domain.indexByUser(userId, { pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setBound(response.data.items);
    });
  }, [userId]);

  useEffect(() => {
    refresh();
    Domain.all({ pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setAll(response.data.items);
    });
  }, [refresh]);

  if (!user) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  const available = all.filter(
    (domain) => !bound.some((existing) => existing.id === domain.id),
  );

  const bind = async () => {
    if (selectedIds.length === 0) return;
    setBinding(true);
    await Promise.all(selectedIds.map((id) => Domain.bindUser(userId, Number(id))));
    setBinding(false);
    setSelectedIds([]);
    toast.success("Domains bound");
    refresh();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={user.name}
        description={user.login}
        breadcrumbs={[
          { label: "Users", to: "/dashboard/users" },
          { label: user.name },
        ]}
        icon={<Avatar src={user.image_url} name={user.name} size={40} className="rounded-xl" />}
      />

      <Tabs defaultValue="domains">
        <TabsList>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          {can({ permission: "role.view" }) && can({ permission: "permission.view" }) ? (
            <TabsTrigger value="security">Security</TabsTrigger>
          ) : null}
          {can({ roles: ["super-admin", "admin"] }) ? (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          ) : null}
          {can({ permission: "log.view" }) ? (
            <TabsTrigger value="activity">Activity</TabsTrigger>
          ) : null}
          {can({ permission: "device.link" }) ? (
            <TabsTrigger value="demo">Demo access</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="domains" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain bindings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {bound.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No domains bound to this user yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bound.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium">{domain.name}</span>
                        {domain.description ? (
                          <span className="truncate text-[0.625rem] text-muted-foreground">
                            {domain.description}
                          </span>
                        ) : null}
                      </div>
                      {can({ permission: "domain.unassign_user" }) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={async () => {
                            const response = await Domain.unbindUser(userId, domain.id);
                            if (response.success) {
                              toast.success("Domain unbound");
                              refresh();
                            }
                          }}
                        >
                          <Unlink /> Unbind
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {can({ permission: "domain.assign_user" }) && available.length > 0 ? (
                <div className="flex items-start gap-2">
                  <MultiSelect
                    className="flex-1"
                    options={available.map((domain) => ({
                      value: domain.id,
                      label: domain.name,
                      description: domain.description,
                    }))}
                    values={selectedIds}
                    onValuesChange={setSelectedIds}
                    placeholder="Select domains to bind..."
                    searchPlaceholder="Search domains..."
                  />
                  <Button
                    size="sm"
                    disabled={binding || selectedIds.length === 0}
                    loading={binding}
                    onClick={bind}
                  >
                    <Link2 /> Bind
                  </Button>
                </div>
              ) : all.length > 0 ? (
                <p className="py-1 text-center text-xs text-muted-foreground">
                  This user is bound to all available domains.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="mt-4">
          <DemoAccessSection userId={userId} />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecuritySection userId={userId} />
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <UserStats userId={userId} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityList url={`/user/${userId}/log`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Link codes and linked devices. A device receives demo releases once it is
 * linked to a user who belongs to a domain that allows demos.
 */
function DemoAccessSection({ userId }: { userId: number }) {
  const toast = useToast();
  const [code, setCode] = useState<IDeviceLinkCode>();
  const [creating, setCreating] = useState(false);
  const [devices, setDevices] = useState<ILinkedDevice[]>();
  const [unlinking, setUnlinking] = useState<number>();

  const loadDevices = useCallback(() => {
    DeviceLink.devices(userId).then((response) => {
      if (response.success) setDevices(response.data ?? []);
    });
  }, [userId]);

  useEffect(loadDevices, [loadDevices]);

  const createCode = async () => {
    setCreating(true);
    const response = await DeviceLink.createForUser(userId, { expires_in_minutes: 30 });
    setCreating(false);

    if (response.success && response.data) setCode(response.data);
    else toast.error("Could not create a code", response.message);
  };

  const unlink = async (device: ILinkedDevice) => {
    setUnlinking(device.id);
    const response = await DeviceLink.unlink(device.id);
    setUnlinking(undefined);

    if (response.success) {
      toast.success("Device unlinked");
      loadDevices();
    } else {
      toast.error("Could not unlink the device", response.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="size-4" /> Link a device
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Create a one-time code and enter it in the app (demo access screen). The device is then
            linked to this user and receives demo releases of every app bound to a domain of theirs
            that allows demos.
          </p>

          {code ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="font-mono text-2xl tracking-[0.3em]">
                {code.code.slice(0, 4)}-{code.code.slice(4)}
              </span>
              <span className="text-xs text-muted-foreground">
                Single use · expires {new Date(code.expires_at).toLocaleTimeString()}
              </span>
            </div>
          ) : null}

          <div>
            <Button size="sm" loading={creating} onClick={createCode}>
              <FlaskConical /> {code ? "Create another code" : "Create link code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked devices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {!devices ? (
            <Spinner className="mx-auto size-4 text-muted-foreground" />
          ) : devices.length === 0 ? (
            <span className="text-muted-foreground">No device is linked to this user.</span>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Smartphone className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {[device.manufacturer, device.model].filter(Boolean).join(" ") || "Unknown device"}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{device.did}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={unlinking === device.id}
                  onClick={() => unlink(device)}
                >
                  <Unlink /> Unlink
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySection({ userId }: { userId: number }) {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [permissions, setPermissions] = useState<IPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<IPermission[]>([]);

  useEffect(() => {
    Role.all({ pagination: { page: 1, pageSize: 100 } }).then((response) => {
      if (response.success && response.data) setRoles(response.data.items);
    });
    User.indexRoles(userId, { pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data)
        setUserRoleIds(response.data.items.map((role) => role.id));
    });
    Permission.all({ pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setPermissions(response.data.items);
    });
    User.indexPermissions(userId, { pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setUserPermissions(response.data.items);
    });
  }, [userId]);

  const refreshRoles = useCallback(async () => {
    const response = await User.indexRoles(userId, { pagination: { page: 1, pageSize: 200 } });
    if (response.success && response.data)
      setUserRoleIds(response.data.items.map((role) => role.id));
  }, [userId]);

  const refreshPermissions = useCallback(async () => {
    const response = await User.indexPermissions(userId, { pagination: { page: 1, pageSize: 200 } });
    if (response.success && response.data) setUserPermissions(response.data.items);
  }, [userId]);

  const toggleRole = async (role: IRole, checked: boolean) => {
    setUserRoleIds((ids) => (checked ? [...ids, role.id] : ids.filter((id) => id !== role.id)));
    if (checked) await Role.attachUser(role.id, userId);
    else await Role.detachUser(role.id, userId);
    await refreshRoles();
  };

  const togglePermission = async (permission: IPermission, checked: boolean) => {
    setUserPermissions((items) =>
      checked
        ? [...items, { ...permission, direct: true }]
        : items.filter((p) => p.id !== permission.id),
    );
    if (checked) await User.attachPermission(userId, permission.id);
    else await User.detachPermission(userId, permission.id);
    await refreshPermissions();
  };

  const userPermissionIds = userPermissions.map((permission) => permission.id);
  const directPermissionIds = new Set(
    userPermissions.filter((permission) => permission.direct).map((permission) => permission.id),
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, IPermission[]>();
    for (const permission of permissions) {
      const key = permission.name.split(".")[0];
      const list = groups.get(key) ?? [];
      list.push(permission);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [permissions]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No roles available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40"
                >
                  <Checkbox
                    checked={userRoleIds.includes(role.id)}
                    onCheckedChange={(checked) => toggleRole(role, checked)}
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No permissions available.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map(([model, list]) => (
                <div key={model} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold capitalize">{model}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((permission) => {
                      const checked = userPermissionIds.includes(permission.id);
                      const viaRole = checked && !directPermissionIds.has(permission.id);

                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-2 text-xs ${
                            viaRole ? "cursor-default opacity-70" : "cursor-pointer"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={viaRole}
                            onCheckedChange={(value) => togglePermission(permission, value)}
                          />
                          <span className="font-medium">{permission.name}</span>
                          {viaRole ? (
                            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">
                              via role
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
