import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import App, { IApp } from "@/models/App";
import Version, { IVersion } from "@/models/Version";
import AppScreenshot, { IAppScreenshot } from "@/models/AppScreenshot";
import Domain, { IDomain } from "@/models/Domain";
import ModelDataTable from "@/components/ModelDataTable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import ImagePicker from "@/components/ImagePicker";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { pickImage } from "@/utils/bootstrap";
import { AppStats } from "@/components/StatisticsViews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Plus, Trash2, Upload, Link2, Unlink, Loader2 } from "lucide-react";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import { can, isPrivilegedRole } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

export default function AppTab() {
  const params = useParams();
  const { id } = params;

  console.log("Location", window.location.href, "AppTab params:", params);

  if (Number(id)) return <AppShow appId={Number(id)} />;
  else if (id === "add") return <AppCreate />;
  else return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;
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
      navigate(`/dashboard/apps/${(response.data as IApp)?.id}`);
      return;
    }

    if (response.errors?.package_name)
      setError("package_name", { type: "manual", message: response.errors.package_name });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold tracking-tight">Add App</h1>
        <p className="text-xs text-muted-foreground">
          Publish a new application to the center.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {formState.errors.root && (
            <Alert variant="destructive">{formState.errors.root.message}</Alert>
          )}

          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <FieldContent>
              <Input id="name" placeholder="My App" {...register("name")} />
              <FieldError>{formState.errors.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="package_name">Package Name</FieldLabel>
            <FieldContent>
              <Input
                id="package_name"
                placeholder="com.example.myapp"
                {...register("package_name")}
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
              <Textarea
                id="description"
                placeholder="Full description"
                {...register("description")}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Logo</FieldLabel>
            <FieldContent>
              <ImagePicker image={logo} onChange={setLogo} disabled={!privileged} />
            </FieldContent>
          </Field>

          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? <Spinner className="size-3.5" /> : <Plus />}
            Create App
          </Button>
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

  if (!app) return <Spinner className="mx-auto mt-16 size-6" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {app.logo_url ? (
            <img
              src={app.logo_url}
              alt={app.name}
              className="size-10 rounded-md object-cover ring-1 ring-foreground/10"
            />
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">{app.name}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{app.package_name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/apps")}>
          Back
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {can({ roles: ["super-admin", "admin"] }) && (
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-3">
          <div className="flex w-full flex-col gap-4">
            {can({ permission: "app.update" }) && (
              <AppEditForm app={app} onSaved={refresh} />
            )}

            <ScreenshotsSection appId={appId} reload={reload} onChanged={refresh} />

            <VersionsSection appId={appId} latestId={app.latest_id ?? null} />

            <DomainsSection appId={appId} reload={reload} onChanged={refresh} />
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="mt-3">
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
  latest_id: number | null;
}

function AppEditForm({ app, onSaved }: { app: IApp; onSaved: () => void }) {
  const { register, handleSubmit, reset, setError, formState } =
    useForm<EditAppFormValues>({
      defaultValues: {
        name: app.name,
        package_name: app.package_name,
        summary: app.summary,
        description: app.description,
        latest_id: app.latest_id ?? null,
      },
    });
  const [logo, setLogo] = useState<File>();
  const [versions, setVersions] = useState<IVersion[]>([]);
  const [latestId, setLatestId] = useState<number | null>(app.latest_id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  useEffect(() => {
    Version.allForApp(app.id).then((response) => {
      if (response.success && response.data) setVersions(response.data.items);
    });
  }, [app.id]);

  useEffect(() => {
    reset({
      name: app.name,
      package_name: app.package_name,
      summary: app.summary,
      description: app.description,
      latest_id: app.latest_id ?? null,
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
        <CardTitle>Edit App</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formState.errors.root && (
          <Alert variant="destructive">{formState.errors.root.message}</Alert>
        )}

        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <FieldContent>
            <Input id="name" {...register("name")} />
            <FieldError>{formState.errors.name?.message}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="package_name">Package Name</FieldLabel>
          <FieldContent>
            <Input id="package_name" {...register("package_name")} />
            <FieldError>{formState.errors.package_name?.message}</FieldError>
          </FieldContent>
        </Field>

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
          <FieldLabel>Latest Version</FieldLabel>
          <FieldContent>
            <Combobox
              value={latestId}
              onValueChange={(value) => setLatestId(value as number | null)}
            >
              <ComboboxTrigger className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-input/20 px-2 text-xs/relaxed text-left">
                <ComboboxValue placeholder="No latest version" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No matching versions</ComboboxEmpty>
                  {versions.map((version) => (
                    <ComboboxItem key={version.id} value={version.id}>
                      {version.name}
                      <span className="truncate text-[0.625rem] text-muted-foreground">
                        {version.status}
                      </span>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Logo</FieldLabel>
          <FieldContent>
            <ImagePicker
              image={logo}
              onChange={setLogo}
              value={app.logo_url}
              disabled={!privileged}
            />
          </FieldContent>
        </Field>

        <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
          {submitting ? <Spinner className="size-3.5" /> : null}
          Save changes
        </Button>
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
  const [screenshots, setScreenshots] = useState<IAppScreenshot[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    AppScreenshot.allForApp(appId).then((response) => {
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

    if (response.success) onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshots</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className="group relative size-20 overflow-hidden rounded-md ring-1 ring-foreground/10"
            >
              <img
                src={AppScreenshot.getUrl(screenshot.name)}
                alt={screenshot.name}
                className="size-full object-cover"
              />
              {can({ permission: "screenshot.delete" }) && (
                <button
                  type="button"
                  aria-label="Delete screenshot"
                  className="absolute top-0 right-0 hidden size-6 items-center justify-center bg-background/80 text-destructive group-hover:flex"
                  onClick={async () => {
                    const response = await AppScreenshot.destroy(appId, screenshot.id);
                    if (response.success) onChanged();
                  }}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {can({ permission: "screenshot.create" }) && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={upload}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload screenshot
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

function VersionsSection({ appId, latestId }: { appId: number; latestId: number | null }) {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<IVersion>[]>(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.3,
      minWidth: 40,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "changelog",
      headerName: "Changelog",
      flex: 1.5,
      minWidth: 220,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.6,
      minWidth: 100,
      renderCell: ({ row }) =>
        latestId === row.id ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.625rem] text-primary uppercase">
            Latest
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{row.status}</span>
        ),
    },
  ], [latestId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Versions</CardTitle>
          {can({ permission: "version.create" }) && (
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard/apps/${appId}/versions/add`)}
            >
              <Plus />
              Add Version
            </Button>
          )}
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
  const [bound, setBound] = useState<IDomain[]>([]);
  const [all, setAll] = useState<IDomain[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [binding, setBinding] = useState(false);
  const chipsAnchor = useComboboxAnchor();

  useEffect(() => {
    Domain.indexByApp(appId).then((response) => {
      if (response.success && response.data) setBound(response.data.items);
    });

    Domain.all().then((response) => {
      if (response.success && response.data) setAll(response.data.items);
    });
  }, [appId, reload]);

  const available = all.filter(
    (domain) => !bound.some((existing) => existing.id === domain.id)
  );

  const selected = available.filter((domain) => selectedIds.includes(domain.id));

  const bind = async () => {
    if (selectedIds.length === 0) return;

    setBinding(true);

    await Promise.all(selectedIds.map((id) => Domain.bindApp(appId, id)));

    setBinding(false);
    setSelectedIds([]);
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {bound.map((domain) => (
            <div
              key={domain.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-xs font-medium">{domain.name}</span>
              {can({ permission: "domain.unassign_app" }) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    const response = await Domain.unbindApp(appId, domain.id);
                    if (response.success) onChanged();
                  }}
                >
                  <Unlink />
                  Unbind
                </Button>
              )}
            </div>
          ))}
        </div>

        {can({ permission: "domain.assign_app" }) && available.length > 0 ? (
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
                      {domain.description ? (
                        <span className="truncate text-[0.625rem] text-muted-foreground">
                          {domain.description}
                        </span>
                      ) : null}
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
            This app is bound to all available domains.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
