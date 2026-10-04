import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Image as ImageIcon, Link2, Plus, Trash2, Unlink, Upload } from "lucide-react";

import App, { IApp } from "@/models/App";
import Version, { IVersion } from "@/models/Version";
import AppScreenshot, { IAppScreenshot } from "@/models/AppScreenshot";
import Domain, { IDomain } from "@/models/Domain";
import ModelDataTable from "@/components/ModelDataTable";
import PageHeader from "@/components/PageHeader";
import ImagePicker from "@/components/ImagePicker";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ConfirmDelete from "@/components/ConfirmDelete";
import { AppStats } from "@/components/StatisticsViews";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { SelectMenu, MultiSelect } from "@/components/ui/select-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

import { pickImage } from "@/utils/bootstrap";
import { can, isPrivilegedRole } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function AppTab() {
  const { id } = useParams();

  if (!id) return <AppCreate />;

  const appId = Number(id);
  if (!Number.isInteger(appId))
    return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;

  return <AppShow appId={appId} />;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

interface AppFormValues {
  name: string;
  package_name: string;
  summary: string;
  description: string;
}

function AppCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, setError, formState } = useForm<AppFormValues>();
  const [logo, setLogo] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  const onSubmit = async (data: AppFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("package_name", data.package_name);
    formData.append("summary", data.summary);
    formData.append("description", data.description);
    if (logo) formData.append("logo", logo);

    const response = await App.create(formData);

    if (response.success) {
      toast.success("App created");
      navigate(`/dashboard/apps/${(response.data as IApp)?.id}`);
      return;
    }

    if (response.errors?.package_name)
      setError("package_name", { type: "manual", message: response.errors.package_name });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Add app"
        description="Publish a new application to the center."
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: "Add app" },
        ]}
      />

      <Card>
        <CardContent className="pt-5">
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {formState.errors.root ? (
              <Alert variant="destructive">{formState.errors.root.message}</Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input id="name" placeholder="My App" {...register("name", { required: "Name is required." })} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="package_name">Package name</FieldLabel>
              <FieldContent>
                <Input
                  id="package_name"
                  placeholder="com.example.myapp"
                  {...register("package_name", { required: "Package name is required." })}
                />
                <FieldError>{formState.errors.package_name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="summary">Summary</FieldLabel>
              <FieldContent>
                <Input id="summary" placeholder="Short description" {...register("summary")} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <FieldContent>
                <Textarea id="description" placeholder="Full description" {...register("description")} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Logo</FieldLabel>
              <FieldContent>
                <ImagePicker image={logo} onChange={setLogo} disabled={!privileged} />
              </FieldContent>
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard/apps")}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                <Plus /> Create app
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Show / Edit                                                        */
/* ------------------------------------------------------------------ */

function AppShow({ appId }: { appId: number }) {
  const navigate = useNavigate();
  const [app, setApp] = useState<IApp>();
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    App.find(appId).then((response) => {
      if (response.success && response.data) setApp(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/apps");
    });
  }, [appId, reload, navigate]);

  if (!app) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={app.name}
        description={app.package_name}
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: app.name },
        ]}
        icon={
          app.logo_url ? (
            <img src={app.logo_url} alt={app.name} className="size-10 rounded-xl object-cover" />
          ) : (
            <ImageIcon className="size-5" />
          )
        }
        actions={
          can({ permission: "app.delete" }) ? (
            <ConfirmDelete
              title={`Delete ${app.name}?`}
              description="This permanently deletes the app and all of its versions, bundles and screenshots."
              onConfirm={() => App.delete(app.id)}
              onDeleted={() => navigate("/dashboard/apps")}
            />
          ) : null
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {can({ roles: ["super-admin", "admin"] }) ? (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="flex w-full flex-col gap-4">
            {can({ permission: "app.update" }) ? (
              <AppEditForm app={app} onSaved={refresh} />
            ) : null}

            <ScreenshotsSection appId={appId} reload={reload} onChanged={refresh} />

            <VersionsSection appId={appId} latestId={app.latest_id ?? null} />

            <DomainsSection appId={appId} reload={reload} onChanged={refresh} />
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <AppStats appId={appId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edit                                                               */
/* ------------------------------------------------------------------ */

interface EditAppFormValues {
  name: string;
  package_name: string;
  summary: string;
  description: string;
}

function AppEditForm({ app, onSaved }: { app: IApp; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, reset, setError, formState } =
    useForm<EditAppFormValues>({
      defaultValues: {
        name: app.name,
        package_name: app.package_name,
        summary: app.summary,
        description: app.description,
      },
    });
  const [logo, setLogo] = useState<File>();
  const [versions, setVersions] = useState<IVersion[]>([]);
  const [latestId, setLatestId] = useState<number | null>(app.latest_id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  useEffect(() => {
    Version.allForApp(app.id, { pagination: { page: 1, pageSize: 100 } }).then((response) => {
      if (response.success && response.data) setVersions(response.data.items);
    });
  }, [app.id]);

  useEffect(() => {
    reset({
      name: app.name,
      package_name: app.package_name,
      summary: app.summary,
      description: app.description,
    });
    setLatestId(app.latest_id ?? null);
  }, [app, reset]);

  const onSubmit = async (data: EditAppFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("package_name", data.package_name);
    formData.append("summary", data.summary);
    formData.append("description", data.description);
    formData.append("latest_id", latestId != null ? String(latestId) : "");
    if (logo) formData.append("logo", logo);

    const response = await App.update(app.id, formData);

    if (response.success) {
      toast.success("Changes saved");
      onSaved();
      setSubmitting(false);
      return;
    }

    if (response.errors?.package_name)
      setError("package_name", { type: "manual", message: response.errors.package_name });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formState.errors.root ? (
            <Alert variant="destructive">{formState.errors.root.message}</Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 p-3">
            <ImagePicker
              image={logo}
              onChange={setLogo}
              value={app.logo_url}
              disabled={!privileged}
              width={72}
              height={72}
              borderRadius={14}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-xs font-medium">App logo</p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {privileged
                  ? "Shown in the app header and on devices. PNG, JPG or GIF; square works best."
                  : "Only privileged roles can change the logo."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input id="name" {...register("name")} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="package_name">Package name</FieldLabel>
              <FieldContent>
                <Input id="package_name" {...register("package_name")} />
                <FieldError>{formState.errors.package_name?.message}</FieldError>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="summary">Summary</FieldLabel>
            <FieldContent>
              <Input id="summary" {...register("summary")} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <FieldContent>
              <Textarea id="description" {...register("description")} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Latest version</FieldLabel>
            <FieldContent>
              <SelectMenu
                options={versions.map((version) => ({
                  value: version.id,
                  label: version.name,
                  description: version.status,
                }))}
                value={latestId}
                onValueChange={(value) =>
                  setLatestId(typeof value === "number" ? value : null)
                }
                placeholder="No latest version"
                searchPlaceholder="Search versions..."
                emptyText="No versions found."
                clearable
              />
            </FieldContent>
          </Field>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Screenshots                                                        */
/* ------------------------------------------------------------------ */

function ScreenshotsSection({
  appId,
  reload,
  onChanged,
}: {
  appId: number;
  reload: number;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [screenshots, setScreenshots] = useState<IAppScreenshot[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    AppScreenshot.allForApp(appId, { pagination: { page: 1, pageSize: 100 } }).then((response) => {
      if (response.success && response.data) setScreenshots(response.data.items);
    });
  }, [appId, reload]);

  const upload = async () => {
    const file = await pickImage();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await AppScreenshot.store(appId, formData);
    setUploading(false);

    if (response.success) {
      toast.success("Screenshot uploaded");
      onChanged();
    } else {
      toast.error("Upload failed", response.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Screenshots</CardTitle>
          {can({ permission: "screenshot.create" }) ? (
            <Button variant="outline" size="sm" onClick={upload} loading={uploading}>
              <Upload /> Upload
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {screenshots.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No screenshots yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="group relative aspect-9/16 overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={AppScreenshot.getUrl(screenshot.name)}
                  alt={screenshot.name}
                  className="size-full object-cover"
                />
                {can({ permission: "screenshot.delete" }) ? (
                  <ConfirmDelete
                    title="Delete screenshot?"
                    onConfirm={() => AppScreenshot.destroy(appId, screenshot.id)}
                    onDeleted={onChanged}
                    trigger={
                      <button
                        type="button"
                        aria-label="Delete screenshot"
                        className="absolute top-1.5 right-1.5 hidden size-7 items-center justify-center rounded-md bg-background/85 text-destructive shadow-sm backdrop-blur transition group-hover:flex hover:bg-background"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Versions                                                           */
/* ------------------------------------------------------------------ */

function VersionsSection({ appId, latestId }: { appId: number; latestId: number | null }) {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<IVersion>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
      { field: "changelog", headerName: "Changelog", flex: 1.5, minWidth: 200 },
      {
        field: "status",
        headerName: "Status",
        flex: 0.6,
        minWidth: 110,
        renderCell: ({ row }) =>
          latestId === row.id ? (
            <Badge variant="primary">Latest</Badge>
          ) : (
            <Badge variant="outline">{row.status}</Badge>
          ),
      },
    ],
    [latestId],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Versions</CardTitle>
          {can({ permission: "version.create" }) ? (
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard/apps/${appId}/versions/add`)}
            >
              <Plus /> Add version
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <ModelDataTable
          model={Version}
          url={Version.endpointFor(appId)}
          columns={columns}
          enableSearch={false}
          onRowClick={(row) => navigate(`/dashboard/apps/${appId}/versions/${row.id}`)}
        />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Domains                                                            */
/* ------------------------------------------------------------------ */

function DomainsSection({
  appId,
  reload,
  onChanged,
}: {
  appId: number;
  reload: number;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [bound, setBound] = useState<IDomain[]>([]);
  const [all, setAll] = useState<IDomain[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [binding, setBinding] = useState(false);

  const load = useCallback(() => {
    Domain.indexByApp(appId, { pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setBound(response.data.items);
    });
    Domain.all({ pagination: { page: 1, pageSize: 200 } }).then((response) => {
      if (response.success && response.data) setAll(response.data.items);
    });
  }, [appId]);

  useEffect(() => {
    load();
  }, [load, reload]);

  const available = all.filter(
    (domain) => !bound.some((existing) => existing.id === domain.id),
  );

  const bind = async () => {
    if (selectedIds.length === 0) return;
    setBinding(true);
    await Promise.all(selectedIds.map((id) => Domain.bindApp(appId, Number(id))));
    setBinding(false);
    setSelectedIds([]);
    toast.success("Domains bound");
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {bound.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No domains bound to this app.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {bound.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <span className="truncate text-xs font-medium">{domain.name}</span>
                {can({ permission: "domain.unassign_app" }) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={async () => {
                      const response = await Domain.unbindApp(appId, domain.id);
                      if (response.success) {
                        toast.success("Domain unbound");
                        load();
                        onChanged();
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

        {can({ permission: "domain.assign_app" }) && available.length > 0 ? (
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
        ) : null}
      </CardContent>
    </Card>
  );
}
