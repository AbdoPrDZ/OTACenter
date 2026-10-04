import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Boxes, FileUp, Plus } from "lucide-react";

import Bundle, { IBundle } from "@/models/Bundle";
import App from "@/models/App";
import Version from "@/models/Version";
import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ConfirmDelete from "@/components/ConfirmDelete";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

import { selectFile } from "@/utils/bootstrap";
import { can } from "@/utils/permissions";

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

function useVersionName(appId: number, versionId: number) {
  const [name, setName] = useState<string>();

  useEffect(() => {
    if (!Number.isInteger(appId) || !Number.isInteger(versionId)) return;
    Version.show(appId, versionId).then((response) => {
      if (response.success && response.data) setName(response.data.name);
    });
  }, [appId, versionId]);

  return name;
}

export default function BundleTab() {
  const { id, versionId, bundleId } = useParams();
  const appId = Number(id);
  const version = Number(versionId);

  if (!Number.isInteger(appId))
    return <ErrorAndRedirect message="Invalid app ID." route="/dashboard/apps" />;
  if (!Number.isInteger(version))
    return <ErrorAndRedirect message="Invalid version ID." route={`/dashboard/apps/${appId}`} />;

  // The static `.../bundles/add` route carries no `:bundleId` param at all.
  if (!bundleId || bundleId === "add") return <BundleCreate appId={appId} versionId={version} />;

  const parsed = Number(bundleId);
  if (!Number.isInteger(parsed))
    return (
      <ErrorAndRedirect
        message="Invalid bundle ID."
        route={`/dashboard/apps/${appId}/versions/${version}`}
      />
    );

  return <BundleShow appId={appId} versionId={version} bundleId={parsed} />;
}

function ZipField({
  file,
  onPick,
  current,
  hint,
}: {
  file?: File;
  onPick: (file?: File) => void;
  current?: string;
  hint?: string;
}) {
  return (
    <Field>
      <FieldLabel>ZIP file</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2">
          <Input readOnly value={file?.name ?? current ?? "No file chosen"} className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const files = await selectFile(".zip, application/zip");
              if (files?.[0]) onPick(files[0]);
            }}
          >
            <FileUp /> Choose ZIP
          </Button>
        </div>
        {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      </FieldContent>
    </Field>
  );
}

function BundleCreate({ appId, versionId }: { appId: number; versionId: number }) {
  const navigate = useNavigate();
  const toast = useToast();
  const appName = useAppName(appId);
  const versionName = useVersionName(appId, versionId);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    if (file) formData.append("file", file);

    const response = await Bundle.store(appId, versionId, formData);

    if (response.success) {
      toast.success("Bundle created");
      navigate(
        `/dashboard/apps/${appId}/versions/${versionId}/bundles/${
          (response.data as IBundle)?.id
        }`,
      );
      return;
    }

    setNameError(response.errors?.name);
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Add bundle"
        description="Upload a distributable ZIP build for this version."
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: appName ?? "App", to: `/dashboard/apps/${appId}` },
          { label: versionName ?? "Version", to: `/dashboard/apps/${appId}/versions/${versionId}` },
          { label: "Add bundle" },
        ]}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <Field>
            <FieldLabel htmlFor="bundle-name">Bundle version name</FieldLabel>
            <FieldContent>
              <Input
                id="bundle-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(undefined);
                }}
                placeholder="1.0.0"
                aria-invalid={!!nameError}
              />
              <FieldError>{nameError}</FieldError>
            </FieldContent>
          </Field>

          <ZipField file={file} onPick={setFile} />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/apps/${appId}/versions/${versionId}`)}
            >
              Cancel
            </Button>
            <Button loading={submitting} onClick={submit}>
              <Plus /> Create bundle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const toast = useToast();
  const appName = useAppName(appId);
  const versionName = useVersionName(appId, versionId);
  const [bundle, setBundle] = useState<IBundle>();
  const [file, setFile] = useState<File>();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const versionPath = `/dashboard/apps/${appId}/versions/${versionId}`;

  useEffect(() => {
    Bundle.show(appId, versionId, bundleId).then((response) => {
      if (response.success && response.data) {
        setBundle(response.data);
        setName(response.data.name ?? "");
      } else if (!response.success && response.status === 404) {
        navigate(versionPath);
      }
    });
  }, [appId, versionId, bundleId, navigate, versionPath]);

  if (!bundle) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  const save = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    if (file) formData.append("file", file);

    const response = await Bundle.updateForVersion(appId, versionId, bundleId, formData);

    if (response.success) {
      toast.success("Changes saved");
      setSubmitting(false);
      return;
    }

    toast.error("Could not save", response.message);
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title={bundle.name ?? `Bundle #${bundle.id}`}
        description={bundle.file_id}
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: appName ?? "App", to: `/dashboard/apps/${appId}` },
          { label: versionName ?? "Version", to: versionPath },
          { label: bundle.name ?? `Bundle #${bundle.id}` },
        ]}
        icon={<Boxes className="size-5" />}
        actions={
          can({ permission: "bundle.delete" }) ? (
            <ConfirmDelete
              title={`Delete ${bundle.name ?? "bundle"}?`}
              onConfirm={() => Bundle.destroy(appId, versionId, bundleId)}
              onDeleted={() => navigate(versionPath)}
            />
          ) : null
        }
      />

      {can({ permission: "bundle.update" }) ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="bundle-name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="bundle-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError(undefined);
                  }}
                  aria-invalid={!!nameError}
                />
                <FieldError>{nameError}</FieldError>
              </FieldContent>
            </Field>

            <ZipField
              file={file}
              onPick={setFile}
              current={bundle.file_id}
              hint="Leave empty to keep the current file."
            />

            <div className="flex justify-end">
              <Button loading={submitting} onClick={save}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{bundle.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono">{bundle.file_id}</span>
            </div>
            {bundle.url ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">URL</span>
                <a
                  href={bundle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {bundle.url}
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
