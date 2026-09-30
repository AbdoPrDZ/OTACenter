import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import Version, { IVersion } from "@/models/Version";
import Bundle, { IBundle } from "@/models/Bundle";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { selectFile } from "@/utils/bootstrap";
import { VersionStats } from "@/components/StatisticsViews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableColumn } from "@/types/model";

import { Plus, Trash2 } from "lucide-react";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import { can, isPrivilegedRole } from "@/utils/permissions";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";

export default function VersionTab() {
  const { id, versionId } = useParams();
  const appId = Number(id);

  console.log("Location", window.location.href, "VersionTab params:", { id, versionId });

  if (!appId)return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;
  else if (Number(versionId)) return <VersionShow appId={appId} versionId={Number(versionId)} />;
  else if (versionId === "add") return <VersionCreate appId={appId} />;
  else return <ErrorAndRedirect message="Invalid version ID." route={`/dashboard/apps/${appId}`} />;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

interface VersionFormValues {
  name: string;
  changelog: string;
  api_key: string;
  latest_id: number | null;
}

function VersionCreate({ appId }: { appId: number }) {
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState } = useForm<VersionFormValues>();
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  const onSubmit = async (data: VersionFormValues) => {
    if (!file) {
      setError("root", { type: "error", message: "Please choose an APK file." });
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("changelog", data.changelog);
    formData.append("api_key", data.api_key);
    formData.append("file", file);

    const response = await Version.store(appId, formData);

    if (response.success) {
      navigate(`/dashboard/apps/${appId}/versions/${(response.data as IVersion)?.id}`);
      return;
    }

    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Add Version</h1>
          <p className="text-xs text-muted-foreground">
            Attach a new build of the application.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/dashboard/apps/${appId}`)}>
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {formState.errors.root && (
            <Alert variant="destructive">{formState.errors.root.message}</Alert>
          )}

          <Field>
            <FieldLabel htmlFor="version-name">Version name</FieldLabel>
            <FieldContent>
              <Input id="version-name" placeholder="v1.0.0" {...register("name", { required: "Version name is required." })} />
              {formState.errors.name && (
                <FieldError>{formState.errors.name.message}</FieldError>
              )}
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="version-api-key">API key</FieldLabel>
            <FieldContent>
              <Input id="version-api-key" placeholder="API key" disabled={!privileged} {...register("api_key", { required: "API key is required." })} />
              {formState.errors.api_key && (
                <FieldError>{formState.errors.api_key.message}</FieldError>
              )}
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="version-file">File</FieldLabel>
            <FieldContent>
              <div className="flex items-center gap-2">
                <Input
                  value={file?.name ?? ""}
                  placeholder="No file chosen"
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!privileged}
                  onClick={async () => {
                    const files = await selectFile(".apk, application/vnd.android.package-archive");
                    setFile(files?.[0]);
                  }}
                >
                  {file ? "Change" : "Choose APK"}
                </Button>
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="version-changelog">Changelog</FieldLabel>
            <FieldContent>
              <Textarea id="version-changelog" {...register("changelog")} />
            </FieldContent>
          </Field>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <Spinner className="size-3.5" /> : <Plus />}
            Add Version
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Show / Edit                                                         */
/* ------------------------------------------------------------------ */

function VersionShow({ appId, versionId }: { appId: number; versionId: number }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState<IVersion>();

  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    Version.show(appId, versionId).then((response) => {
      if (response.success && response.data) setVersion(response.data);
      else if (!response.success && response.status === 404) navigate(`/dashboard/apps/${appId}`);
    });
  }, [appId, versionId, reload, navigate]);

  if (!version) return <Spinner className="mx-auto mt-16 size-6" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{version.name}</h1>
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[0.625rem] uppercase">
                {version.status}
              </span>
              {version.latest_id ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.625rem] text-primary uppercase">
                  Published
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {can({ permission: "version.delete" }) && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="ghost" size="icon-sm" className="text-destructive" />}
              >
                <Trash2 />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {version.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the version and all of its bundles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const response = await Version.destroy(appId, version.id);
                      if (response.success) navigate(`/dashboard/apps/${appId}`);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant="outline" onClick={() => navigate(`/dashboard/apps/${appId}`)}>
            Back
          </Button>
        </div>
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
            {can({ permission: "version.update" }) && (
              <VersionEditForm appId={appId} version={version} onSaved={refresh} />
            )}

            <BundlesSection
              appId={appId}
              versionId={version.id}
              latestId={version.latest_id ?? null}
              requestKey={reload}
            />
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="mt-3">
          <VersionStats versionId={version.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VersionEditForm({ appId, version, onSaved }: { appId: number; version: IVersion; onSaved: () => void }) {
  const { register, handleSubmit, reset, setError, formState } =
    useForm<VersionFormValues>({
      defaultValues: {
        name: version.name,
        changelog: version.changelog,
        api_key: version.api_key,
        latest_id: version.latest_id ?? null,
      },
    });
  const [file, setFile] = useState<File>();
  const [bundles, setBundles] = useState<IBundle[]>([]);
  const [latestId, setLatestId] = useState<number | null>(version.latest_id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  useEffect(() => {
    Bundle.allForVersion(appId, version.id).then((response) => {
      if (response.success && response.data) setBundles(response.data.items);
    });
  }, [appId, version.id]);

  useEffect(() => {
    reset({
      name: version.name,
      changelog: version.changelog,
      api_key: version.api_key,
      latest_id: version.latest_id ?? null,
    });
    setLatestId(version.latest_id ?? null);
  }, [version, reset]);

  const onSubmit = async (data: VersionFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("changelog", data.changelog);
    formData.append("api_key", data.api_key);
    formData.append("latest_id", latestId != null ? String(latestId) : "");
    if (file) formData.append("file", file);

    const response = await Version.updateForApp(appId, version.id, formData);

    setSubmitting(false);

    if (response.success) {
      setFile(undefined);
      onSaved();
      return;
    }

    setError("root", { type: "error", message: response.message });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Version</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formState.errors.root && (
          <Alert variant="destructive">{formState.errors.root.message}</Alert>
        )}

        <Field>
          <FieldLabel htmlFor="version-name">Version name</FieldLabel>
          <FieldContent>
            <Input id="version-name" {...register("name", { required: "Version name is required." })} />
            {formState.errors.name && (
              <FieldError>{formState.errors.name.message}</FieldError>
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="version-api-key">API key</FieldLabel>
          <FieldContent>
            <Input id="version-api-key" disabled={!privileged} {...register("api_key", { required: "API key is required." })} />
            {formState.errors.api_key && (
              <FieldError>{formState.errors.api_key.message}</FieldError>
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Latest Bundle</FieldLabel>
          <FieldContent>
            <Combobox
              value={latestId}
              onValueChange={(value) => setLatestId(value as number | null)}
            >
              <ComboboxTrigger className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-input/20 px-2 text-xs/relaxed text-left">
                <ComboboxValue placeholder="No latest bundle" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No matching bundles</ComboboxEmpty>
                  {bundles.map((bundle) => (
                    <ComboboxItem key={bundle.id} value={bundle.id}>
                      {bundle.name}
                      <span className="truncate text-[0.625rem] text-muted-foreground">
                        {bundle.status}
                      </span>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="version-file">File</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-2">
              <Input
                value={file?.name ?? ""}
                placeholder="Leave empty to keep the current file"
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!privileged}
                onClick={async () => {
                  const files = await selectFile(".apk, application/vnd.android.package-archive");
                  setFile(files?.[0]);
                }}
              >
                {file ? "Change" : "Choose APK"}
              </Button>
            </div>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="version-changelog">Changelog</FieldLabel>
          <FieldContent>
            <Textarea id="version-changelog" {...register("changelog")} />
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
/* Bundles                                                             */
/* ------------------------------------------------------------------ */

function BundlesSection({
  appId,
  versionId,
  latestId,
  requestKey,
}: {
  appId: number;
  versionId: number;
  latestId: number | null;
  requestKey: number;
}) {
  const navigate = useNavigate();

  const columns = useMemo<DataTableColumn<IBundle>[]>(() => [
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
            className="truncate text-xs text-muted-foreground underline underline-offset-4"
          >
            {row.url}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      field: "active",
      headerName: "Status",
      flex: 0.4,
      minWidth: 80,
      renderCell: ({ row }) =>
        latestId === row.id ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.625rem] text-primary uppercase">
            Latest
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ], [latestId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Bundles</CardTitle>
          {can({ permission: "bundle.create" }) && (
            <Button
              size="sm"
              onClick={() =>
                navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/add`)
              }
            >
              <Plus />
              Add Bundle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ModelDataTable
          model={Bundle}
          url={Bundle.endpointFor(appId, versionId)}
          columns={columns}
          enableSearch={false}
          requestKey={requestKey}
          onRowClick={(row) =>
            navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/${row.id}`)
          }
        />
      </CardContent>
    </Card>
  );
}
