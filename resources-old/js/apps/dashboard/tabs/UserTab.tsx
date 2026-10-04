import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import User, { IUser } from "@/models/User";
import Domain, { IDomain } from "@/models/Domain";
import Permission, { IPermission } from "@/models/Permission";
import Role, { IRole } from "@/models/Role";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";

import { Link2, Loader2, Unlink } from "lucide-react";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import { can } from "@/utils/permissions";
import { UserStats } from "@/components/StatisticsViews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserTab() {
  const { id } = useParams();
  const userId = Number(id);

  if (!userId)
    return <ErrorAndRedirect message="Invalid user ID." route="/dashboard/users" />;

  return <UserShow userId={userId} />;
}

/* ------------------------------------------------------------------ */
/* Show                                                               */
/* ------------------------------------------------------------------ */

function UserShow({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<IUser>();
  const [bound, setBound] = useState<IDomain[]>([]);
  const [all, setAll] = useState<IDomain[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [binding, setBinding] = useState(false);
  const chipsAnchor = useComboboxAnchor();

  useEffect(() => {
    User.find(userId).then((response) => {
      if (response.success && response.data) setUser(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/users");
    });
  }, [userId, navigate]);

  useEffect(() => {
    Domain.indexByUser(userId).then((response) => {
      if (response.success && response.data) setBound(response.data.items);
    });

    Domain.all().then((response) => {
      if (response.success && response.data) setAll(response.data.items);
    });
  }, [userId]);

  const refresh = useCallback(() => {
    Domain.indexByUser(userId).then((response) => {
      if (response.success && response.data) setBound(response.data.items);
    });
  }, [userId]);

  if (!user) return <Spinner className="mx-auto mt-16 size-6" />;

  const available = all.filter(
    (domain) => !bound.some((existing) => existing.id === domain.id)
  );

  const selected = available.filter((domain) => selectedIds.includes(domain.id));

  const bind = async () => {
    if (selectedIds.length === 0) return;

    setBinding(true);

    await Promise.all(selectedIds.map((id) => Domain.bindUser(userId, id)));

    setBinding(false);
    setSelectedIds([]);
    refresh();
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {user.image_url ? (
            <img
              src={user.image_url}
              alt={user.name}
              className="size-10 rounded-full object-cover ring-1 ring-foreground/10"
            />
          ) : null}
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{user.name}</h1>
            <p className="text-xs text-muted-foreground">{user.login}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/users")}>
          Back
        </Button>
      </div>

      <Tabs defaultValue="domains">
        <TabsList>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          {can({ permission: "role.view" }) && can({ permission: "permission.view" }) && (
            <TabsTrigger value="security">Security</TabsTrigger>
          )}
          {can({ roles: ["super-admin", "admin"] }) && (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="domains" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle>Domains</CardTitle>
            </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {bound.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No domains bound to this user yet.
              </p>
            ) : (
              bound.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium">{domain.name}</span>
                    {domain.description ? (
                      <span className="truncate text-[0.625rem] text-muted-foreground">
                        {domain.description}
                      </span>
                    ) : null}
                  </div>
                  {can({ permission: "domain.unassign_user" }) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={async () => {
                        const response = await Domain.unbindUser(userId, domain.id);
                        if (response.success) refresh();
                      }}
                    >
                      <Unlink />
                      Unbind
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {available.length > 0 && can({ permission: "domain.assign_user" }) ? (
            <div className="flex items-start gap-2">
              <Combobox
                multiple
                value={selectedIds}
                onValueChange={(values) => setSelectedIds(values)}
              >
                <div ref={chipsAnchor} className="min-w-0 flex-1">
                  <ComboboxChips>
                    {selected.map((domain) => (
                      <ComboboxChip key={domain.id}>{domain.name}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Select domains to bind..." />
                  </ComboboxChips>
                </div>

                <ComboboxContent anchor={chipsAnchor}>
                  <ComboboxList>
                    <ComboboxEmpty>No matching domains</ComboboxEmpty>
                    {available.map((domain) => (
                      <ComboboxItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <Button
                type="button"
                size="sm"
                disabled={binding || selectedIds.length === 0}
                onClick={bind}
              >
                {binding ? <Loader2 className="animate-spin" /> : <Link2 />}
                Bind
              </Button>
            </div>
          ) : (
            <p className="py-1 text-center text-xs text-muted-foreground">
              This user is bound to all available domains.
            </p>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-3">
          <SecuritySection userId={userId} />
        </TabsContent>

        <TabsContent value="statistics" className="mt-3">
          <UserStats userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Security                                                           */
/* ------------------------------------------------------------------ */

function SecuritySection({ userId }: { userId: number }) {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [permissions, setPermissions] = useState<IPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<IPermission[]>([]);

  useEffect(() => {
    Role.all().then((response) => {
      if (response.success && response.data) setRoles(response.data.items);
    });

    User.indexRoles(userId).then((response) => {
      if (response.success && response.data) setUserRoleIds(response.data.items.map((role) => role.id));
    });

    Permission.all().then((response) => {
      if (response.success && response.data) setPermissions(response.data.items);
    });

    User.indexPermissions(userId).then((response) => {
      if (response.success && response.data) setUserPermissions(response.data.items);
    });
  }, [userId]);

  const refreshRoles = useCallback(async () => {
    const response = await User.indexRoles(userId);
    if (response.success && response.data) setUserRoleIds(response.data.items.map((role) => role.id));
  }, [userId]);

  const refreshPermissions = useCallback(async () => {
    const response = await User.indexPermissions(userId);
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
        : items.filter((p) => p.id !== permission.id)
    );

    if (checked) await User.attachPermission(userId, permission.id);
    else await User.detachPermission(userId, permission.id);

    await refreshPermissions();
  };

  const userPermissionIds = userPermissions.map((permission) => permission.id);
  const directPermissionIds = new Set(
    userPermissions.filter((permission) => permission.direct).map((permission) => permission.id)
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
    <div className="flex flex-col gap-3">
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
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium"
                >
                  <Checkbox
                    checked={userRoleIds.includes(role.id)}
                    onCheckedChange={(checked) => toggleRole(role, !!checked)}
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
            <p className="py-2 text-center text-xs text-muted-foreground">No permissions available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map(([model, list]) => (
                <div key={model} className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold capitalize">{model}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((permission) => {
                      const checked = userPermissionIds.includes(permission.id);
                      const viaRole = checked && !directPermissionIds.has(permission.id);

                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-2 text-xs ${viaRole ? "cursor-default opacity-70" : "cursor-pointer"}`}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={viaRole}
                            onCheckedChange={(checked) => togglePermission(permission, !!checked)}
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
