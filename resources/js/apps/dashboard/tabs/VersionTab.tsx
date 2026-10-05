import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FileUp, Plus, Rocket } from "lucide-react";

import Version, { IVersion } from "@/models/Version";
import Bundle, { IBundle } from "@/models/Bundle";
import App from "@/models/App";
import ModelDataTable from "@/components/ModelDataTable";
import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ConfirmDelete from "@/components/ConfirmDelete";
import { VersionStats } from "@/components/StatisticsViews";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

import { selectFile } from "@/utils/bootstrap";
import { can } from "@/utils/permissions";
import { DataTableColumn } from "@/types/model";

function useAppName(appId: number) {
  const [name, setName] = useState<string>();

  useEffect(() => {
    if (!Number.isInteger(appId)) return;
    App.find(appId).then((response) => {
      if (response.success && response.data) setName(response.data.name);
    });
  }, [appId]);

  return name;
}

export default function VersionTab() {
  const { id, versionId } = useParams();
  const appId = Number(id);

  if (!Number.isInteger(appId))
    return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;

  // The static `.../versions/add` route carries no `:versionId` param at all.
  if (!versionId || versionId === "add") return <VersionCreate appId={appId} />;

  const parsed = Number(versionId);
  if (!Number.isInteger(parsed))
    return <ErrorAndRedirect message="Invalid version ID." route={`/dashboard/apps/${appId}`} />;

  return <VersionShow appId={appId} versionId={parsed} />;
}

function FileField({
  label,
  file,
  onPick,
  current,
  hint,
}: {
  label: string;
  file?: File;
  onPick: (file?: File) => void;
  current?: string;
  hint?: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2">
          <Input readOnly value={file?.name ?? current ?? "No file chosen"} className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const files = await selectFile(".apk, application/vnd.android.package-archive");
              if (files?.[0]) onPick(files[0]);
            }}
          >
            <FileUp /> Choose APK
          </Button>
        </div>
        {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      </FieldContent>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

interface VersionFormValues {
  name: string;
  api_key: string;
  changelog: string;
}

function VersionCreate({ appId }: { appId: number }) {
  const navigate = useNavigate();
  const toast = useToast();
  const appName = useAppName(appId);
  const { register, handleSubmit, setError, formState } = useForm<VersionFormValues>();
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: VersionFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("api_key", data.api_key);
    formData.append("changelog", data.changelog);
    if (file) formData.append("file", file);

    const response = await Version.store(appId, formData);

    if (response.success) {
      toast.success("Version created");
      navigate(`/dashboard/apps/${appId}/versions/${(response.data as IVersion)?.id}`);
      return;
    }

    Object.keys(response.errors || {}).forEach((key) => {
      setError(key as keyof VersionFormValues, { type: "manual", message: response.errors![key] });
    });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Add version"
        description="Create a new version and attach its build."
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: appName ?? "App", to: `/dashboard/apps/${appId}` },
          { label: "Add version" },
        ]}
      />

      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formState.errors.root ? (
              <Alert variant="destructive">{formState.errors.root.message}</Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input id="name" placeholder="1.0.0" {...register("name", { required: "Name is required." })} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="api_key">API key</FieldLabel>
              <FieldContent>
                <Input id="api_key" placeholder="Version API key" {...register("api_key", { required: "API key is required." })} />
                <FieldError>{formState.errors.api_key?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="changelog">Changelog</FieldLabel>
              <FieldContent>
                <Textarea id="changelog" placeholder="What changed in this version?" {...register("changelog")} />
              </FieldContent>
            </Field>

            <FileField label="APK file" file={file} onPick={setFile} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate(`/dashboard/apps/${appId}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                <Plus /> Create version
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Show                                                               */
/* ------------------------------------------------------------------ */

function VersionShow({ appId, versionId }: { appId: number; versionId: number }) {
  const navigate = useNavigate();
  const appName = useAppName(appId);
  const [version, setVersion] = useState<IVersion>();
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    Version.show(appId, versionId).then((response) => {
      if (response.success && response.data) setVersion(response.data);
      else if (!response.success && response.status === 404)
        navigate(`/dashboard/apps/${appId}`);
    });
  }, [appId, versionId, reload, navigate]);

  if (!version) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={version.name}
        description={`Version ${version.id}${version.file_id ? ` · APK: ${version.file_id}` : ""}${version.latest_id ? " · published" : ""}`}
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: appName ?? "App", to: `/dashboard/apps/${appId}` },
          { label: version.name },
        ]}
        icon={<Rocket className="size-5" />}
        actions={
          can({ permission: "version.delete" }) ? (
            <ConfirmDelete
              title={`Delete version ${version.name}?`}
              description="This permanently deletes the version and its bundles."
              onConfirm={() => Version.destroy(appId, version.id)}
              onDeleted={() => navigate(`/dashboard/apps/${appId}`)}
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Status
              </span>
              <Badge variant={statusVariant(version.status)}>{version.status}</Badge>
              {version.latest_id ? <Badge variant="primary">Published</Badge> : null}
            </div>

            {can({ permission: "version.update" }) ? (
              <VersionEditForm appId={appId} version={version} onSaved={refresh} />
            ) : null}

            <BundlesSection
              appId={appId}
              versionId={versionId}
              version={version}
              reload={reload}
              onActivated={refresh}
            />
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <VersionStats versionId={versionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VersionEditForm({
  appId,
  version,
  onSaved,
}: {
  appId: number;
  version: IVersion;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { register, handleSubmit, setError, formState } = useForm<VersionFormValues>({
    defaultValues: {
      name: version.name,
      api_key: version.api_key,
      changelog: version.changelog,
    },
  });
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: VersionFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("api_key", data.api_key);
    formData.append("changelog", data.changelog);
    if (file) formData.append("file", file);

    const response = await Version.updateForApp(appId, version.id, formData);

    if (response.success) {
      toast.success("Changes saved");
      onSaved();
      setSubmitting(false);
      return;
    }

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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input id="name" {...register("name", { required: "Name is required." })} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="api_key">API key</FieldLabel>
              <FieldContent>
                <Input id="api_key" {...register("api_key", { required: "API key is required." })} />
                <FieldError>{formState.errors.api_key?.message}</FieldError>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="changelog">Changelog</FieldLabel>
            <FieldContent>
              <Textarea id="changelog" {...register("changelog")} />
            </FieldContent>
          </Field>

          <FileField
            label="Replace APK"
            file={file}
            onPick={setFile}
            current={version.file_id}
            hint="Leave empty to keep the current file."
          />

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
/* Bundles                                                            */
/* ------------------------------------------------------------------ */

function BundlesSection({
  appId,
  versionId,
  version,
  reload,
  onActivated,
}: {
  appId: number;
  versionId: number;
  version: IVersion;
  reload: number;
  onActivated: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [activating, setActivating] = useState<number>();

  const activate = async (bundle: IBundle) => {
    setActivating(bundle.id);

    const response = await Bundle.activate(appId, versionId, bundle.id);

    setActivating(undefined);

    if (response.success) {
      toast.success(`${bundle.name ?? "Bundle"} is now active`);
      onActivated();
      return;
    }

    toast.error("Could not activate bundle", response.message);
  };

  const columns = useMemo<DataTableColumn<IBundle>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 0.3, minWidth: 40 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
      {
        field: "url",
        headerName: "URL",
        flex: 1.5,
        minWidth: 220,
        renderCell: ({ row }) =>
          row.url ? (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="truncate text-primary hover:underline"
            >
              {row.url}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        field: "version_id",
        headerName: "State",
        flex: 0.6,
        minWidth: 110,
        renderCell: ({ row }) =>
          version.latest_id === row.id ? (
            <Badge variant="primary">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
    ],
    [version.latest_id],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Bundles</CardTitle>
          {can({ permission: "bundle.create" }) ? (
            <Button
              size="sm"
              onClick={() =>
                navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/add`)
              }
            >
              <Plus /> Add bundle
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <ModelDataTable
          model={Bundle}
          url={Bundle.endpointFor(appId, versionId)}
          columns={columns}
          requestKey={reload}
          enableSearch={false}
          onRowClick={(row) =>
            navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/${row.id}`)
          }
          actions={
            can({ permission: "bundle.publish" })
              ? (row) =>
                  version.latest_id === row.id ? null : (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={activating === row.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        activate(row);
                      }}
                    >
                      Activate
                    </Button>
                  )
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
