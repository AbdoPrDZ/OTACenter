import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import Bundle, { IBundle } from "@/models/Bundle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { Loader2, Plus, Trash2 } from "lucide-react";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import { can, isPrivilegedRole } from "@/utils/permissions";

export default function BundleTab() {
  const { id, versionId, bundleId } = useParams();
  const appId = Number(id);
  const version = Number(versionId);

  if (!appId) return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;
  else if (!versionId) return <ErrorAndRedirect message="Invalid version ID." route={`/dashboard/apps/${appId}`} />;
  else if (Number(bundleId)) return <BundleShow appId={appId} versionId={version} bundleId={Number(bundleId)} />;
  else if (bundleId === "add") return <BundleCreate appId={appId} versionId={version} />;
  else return <ErrorAndRedirect message="Invalid bundle ID." route={`/dashboard/apps/${appId}/versions/${version}`} />;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

interface BundleFormValues {
  name: string;
}

function BundleCreate({ appId, versionId }: { appId: number; versionId: number }) {
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState } = useForm<BundleFormValues>();
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  const onSubmit = async (data: BundleFormValues) => {
    if (!file) {
      setError("root", { type: "error", message: "Please choose a ZIP bundle file." });
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("file", file);

    const response = await Bundle.store(appId, versionId, formData);

    if (response.success) {
      navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/${(response.data as IBundle)?.id}`);
      return;
    }

    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Add Bundle</h1>
          <p className="text-xs text-muted-foreground">
            Upload a new distributable bundle for this version.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/dashboard/apps/${appId}/versions/${versionId}`)}
        >
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {formState.errors.root && (
            <Alert variant="destructive">{formState.errors.root.message}</Alert>
          )}

          <Field>
            <FieldLabel htmlFor="bundle-name">Name</FieldLabel>
            <FieldContent>
              <Input
                id="bundle-name"
                placeholder="Bundle version name"
                {...register("name", { required: "Bundle name is required." })}
              />
              {formState.errors.name && (
                <FieldError>{formState.errors.name.message}</FieldError>
              )}
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="bundle-file">File</FieldLabel>
            <FieldContent>
              <div className="flex items-center gap-2">
                <Input value={file?.name ?? ""} placeholder="No file chosen" readOnly className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!privileged}
                  onClick={async () => {
                    const files = await selectFile(".zip, application/zip");
                    setFile(files?.[0]);
                  }}
                >
                  {file ? "Change" : "Choose ZIP"}
                </Button>
              </div>
            </FieldContent>
          </Field>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <Spinner className="size-3.5" /> : <Plus />}
            Add Bundle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Show / Edit                                                         */
/* ------------------------------------------------------------------ */

function BundleShow({
  appId,
  versionId,
  bundleId,
}: {
  appId: number;
  versionId: number;
  bundleId: number;
}) {
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<IBundle>();

  const [reload, setReload] = useState(0);

  useEffect(() => {
    Bundle.show(appId, versionId, bundleId).then((response) => {
      if (response.success && response.data) setBundle(response.data);
      else if (!response.success && response.status === 404)
        navigate(`/dashboard/apps/${appId}/versions/${versionId}`);
    });
  }, [appId, versionId, bundleId, reload, navigate]);

  if (!bundle) return <Spinner className="mx-auto mt-16 size-6" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            {bundle.name || bundle.file_id}
          </h1>
          {bundle.url ? (
            <a
              href={bundle.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-muted-foreground underline underline-offset-4"
            >
              {bundle.url}
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {can({ permission: "bundle.delete" }) && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="ghost" size="icon-sm" className="text-destructive" />}
              >
                <Trash2 />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this bundle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The bundle will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const response = await Bundle.destroy(appId, versionId, bundle.id);
                      if (response.success)
                        navigate(`/dashboard/apps/${appId}/versions/${versionId}`);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/apps/${appId}/versions/${versionId}`)}
          >
            Back
          </Button>
        </div>
      </div>

      {can({ permission: "bundle.update" }) ? (
        <BundleEditForm
          appId={appId}
          versionId={versionId}
          bundle={bundle}
          onSaved={() => setReload((value) => value + 1)}
        />
      ) : null}
    </div>
  );
}

function BundleEditForm({
  appId,
  versionId,
  bundle,
  onSaved,
}: {
  appId: number;
  versionId: number;
  bundle: IBundle;
  onSaved: () => void;
}) {
  const { register, handleSubmit, reset, setError, formState } =
    useForm<BundleFormValues>({
      defaultValues: {
        name: bundle.name ?? "",
      },
    });
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  useEffect(() => {
    reset({ name: bundle.name ?? "" });
  }, [bundle, reset]);

  const onSubmit = async (data: BundleFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    if (file) formData.append("file", file);

    const response = await Bundle.updateForVersion(appId, versionId, bundle.id, formData);

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
        <CardTitle>Edit Bundle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formState.errors.root && (
          <Alert variant="destructive">{formState.errors.root.message}</Alert>
        )}

        <Field>
          <FieldLabel htmlFor="bundle-name">Name</FieldLabel>
          <FieldContent>
            <Input
              id="bundle-name"
              placeholder="Bundle version name"
              {...register("name", { required: "Bundle name is required." })}
            />
            {formState.errors.name && (
              <FieldError>{formState.errors.name.message}</FieldError>
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="bundle-file">File</FieldLabel>
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
                  const files = await selectFile(".zip, application/zip");
                  setFile(files?.[0]);
                }}
              >
                {file ? "Change" : "Choose ZIP"}
              </Button>
            </div>
          </FieldContent>
        </Field>

        <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
