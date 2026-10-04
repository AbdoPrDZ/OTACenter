import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Permission from "@/models/Permission";
import Role, { IRole } from "@/models/Role";
import User, { IUser } from "@/models/User";

import ModelDataTable from "@/components/ModelDataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RoleStats } from "@/components/StatisticsViews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RoleTab() {
  const { id } = useParams();
  const roleId = Number(id);

  if (!roleId)
    return <ErrorAndRedirect message="Invalid role ID." route="/dashboard/roles" />;

  return <RoleShow roleId={roleId} />;
}

/* ------------------------------------------------------------------ */
/* Show                                                               */
/* ------------------------------------------------------------------ */

function RoleShow({ roleId }: { roleId: number }) {
  const navigate = useNavigate();
  const [role, setRole] = useState<IRole>();
  const [attached, setAttached] = useState<IUser[]>([]);
  const [all, setAll] = useState<IUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [attaching, setAttaching] = useState(false);
  const chipsAnchor = useComboboxAnchor();

  useEffect(() => {
    Role.find(roleId).then((response) => {
      if (response.success && response.data) setRole(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/roles");
    });
  }, [roleId, navigate]);

  useEffect(() => {
    Role.indexUsers(roleId).then((response) => {
      if (response.success && response.data) setAttached(response.data.items);
    });

    User.all().then((response) => {
      if (response.success && response.data) setAll(response.data.items);
    });
  }, [roleId]);

  const refresh = useCallback(() => {
    Role.indexUsers(roleId).then((response) => {
      if (response.success && response.data) setAttached(response.data.items);
    });
  }, [roleId]);

  if (!role) return <Spinner className="mx-auto mt-16 size-6" />;

  const available = all.filter(
    (user) => !attached.some((existing) => existing.id === user.id)
  );

  const selected = available.filter((user) => selectedIds.includes(user.id));

  const attach = async () => {
    if (selectedIds.length === 0) return;

    setAttaching(true);

    await Promise.all(selectedIds.map((userId) => Role.attachUser(roleId, userId)));

    setAttaching(false);
    setSelectedIds([]);
    refresh();
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{role.name}</h1>
            <p className="text-xs text-muted-foreground">{role.guard_name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/roles")}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelDataTable
            model={Permission}
            url={`/role/${roleId}/permission`}
            onRowClick={(row) => navigate(`/dashboard/permissions/${row.id}`)}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          {can({ roles: ["super-admin", "admin"] }) && (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {attached.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No users attached to this role yet.
              </p>
            ) : (
              attached.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {user.image_url ? (
                      <img
                        src={user.image_url}
                        alt={user.name}
                        className="size-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.5rem] font-semibold text-primary-foreground">
                        {(user.name || "U").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium">{user.name}</span>
                      <span className="truncate text-[0.625rem] text-muted-foreground">
                        {user.login}
                      </span>
                    </div>
                  </div>
                  {can({ permission: "role.detach" }) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={async () => {
                        const response = await Role.detachUser(roleId, user.id);
                        if (response.success) refresh();
                      }}
                    >
                      <Unlink />
                      Detach
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {available.length > 0 && can({ permission: "role.attach" }) ? (
            <div className="flex items-start gap-2">
              <Combobox
                multiple
                value={selectedIds}
                onValueChange={(values) => setSelectedIds(values)}
              >
                <div ref={chipsAnchor} className="min-w-0 flex-1">
                  <ComboboxChips>
                    {selected.map((user) => (
                      <ComboboxChip key={user.id}>{user.name}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Select users to attach..." />
                  </ComboboxChips>
                </div>

                <ComboboxContent anchor={chipsAnchor}>
                  <ComboboxList>
                    <ComboboxEmpty>No matching users</ComboboxEmpty>
                    {available.map((user) => (
                      <ComboboxItem key={user.id} value={user.id}>
                        {user.name}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <Button
                type="button"
                size="sm"
                disabled={attaching || selectedIds.length === 0}
                onClick={attach}
              >
                {attaching ? <Loader2 className="animate-spin" /> : <Link2 />}
                Attach
              </Button>
            </div>
          ) : (
            <p className="py-1 text-center text-xs text-muted-foreground">
              Every user is already attached to this role.
            </p>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="mt-3">
          <RoleStats roleId={roleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
