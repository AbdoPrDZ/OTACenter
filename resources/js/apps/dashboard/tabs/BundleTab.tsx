import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Boxes, FileUp, Plus } from "lucide-react";

import Bundle, { IBundle, IBundleAsset } from "@/models/Bundle";
import App from "@/models/App";
import Version, { IVersion } from "@/models/Version";
import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ConfirmDelete from "@/components/ConfirmDelete";
import { DemoReleaseCheckbox } from "@/components/ReleaseControls";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { Select } from "@/components/ui/form";
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

function useVersion(appId: number, versionId: number) {
  const [version, setVersion] = useState<IVersion>();

  useEffect(() => {
    if (!Number.isInteger(appId) || !Number.isInteger(versionId)) return;
    Version.show(appId, versionId).then((response) => {
      if (response.success && response.data) setVersion(response.data);
    });
  }, [appId, versionId]);

  return version;
}

const EXPO_ZIP_HINT =
  "Zip the output of `npx expo export` (the dist/ folder, with metadata.json). Add expoConfig.json from `npx expo config --json` so the runtime version is checked, or use the expo-ota-client CLI.";

function bytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function AssetsCard({ appId, versionId, bundleId }: { appId: number; versionId: number; bundleId: number }) {
  const [assets, setAssets] = useState<IBundleAsset[]>();

  useEffect(() => {
    Bundle.assets(appId, versionId, bundleId).then((response) => {
      if (response.success) setAssets(response.data ?? []);
    });
  }, [appId, versionId, bundleId]);

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Files</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs">
        {!assets ? (
          <Spinner className="mx-auto size-4 text-muted-foreground" />
        ) : assets.length === 0 ? (
          <span className="text-muted-foreground">No files.</span>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" size="sm">
                  {asset.platform}
                </Badge>
                {asset.is_launch_asset ? (
                  <Badge variant="primary" size="sm">
                    launch
                  </Badge>
                ) : null}
                <span className="truncate font-mono">{asset.source_path}</span>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {asset.content_type} · {bytes(asset.size)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
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

/** Archive types the server accepts for a bundle (`Bundle::validationRules`). */
const ARCHIVE_ACCEPT =
  ".zip, .tar, .gz, .tgz, application/zip, application/x-tar, application/gzip, application/x-gzip";
const ZIP_ACCEPT = ".zip, application/zip";

function ArchiveField({
  file,
  onPick,
  current,
  hint,
  zipOnly = false,
}: {
  file?: File;
  onPick: (file?: File) => void;
  current?: string;
  hint?: string;
  /** Expo exports must be a zip; ota-client bundles may also be .tar / .tar.gz. */
  zipOnly?: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{zipOnly ? "ZIP file" : "Archive (.zip, .tar, .tar.gz)"}</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2">
          <Input readOnly value={file?.name ?? current ?? "No file chosen"} className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const files = await selectFile(zipOnly ? ZIP_ACCEPT : ARCHIVE_ACCEPT);
              if (files?.[0]) onPick(files[0]);
            }}
          >
            <FileUp /> {zipOnly ? "Choose ZIP" : "Choose archive"}
          </Button>
        </div>
        {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      </FieldContent>
    </Field>
  );
}

function UpdateTypeField({
  value,
  onChange,
}: {
  value: "optional" | "force";
  onChange: (value: "optional" | "force") => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="update_type">Update type</FieldLabel>
      <FieldContent>
        <Select
          id="update_type"
          value={value}
          onChange={(event) => onChange(event.target.value as "optional" | "force")}
        >
          <option value="optional">Optional — the user may skip it</option>
          <option value="force">Force install — the user must install it</option>
        </Select>
        <p className="text-[0.6875rem] text-muted-foreground">
          Forced updates cannot be dismissed by the OTA client.
        </p>
      </FieldContent>
    </Field>
  );
}

function BundleCreate({ appId, versionId }: { appId: number; versionId: number }) {
  const navigate = useNavigate();
  const toast = useToast();
  const appName = useAppName(appId);
  const version = useVersion(appId, versionId);
  const versionName = version?.name;
  const isExpo = version?.client_type === "expo";
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [updateType, setUpdateType] = useState<"optional" | "force">("optional");
  const [file, setFile] = useState<File>();
  const [asDemo, setAsDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("update_type", updateType);
    if (file) formData.append("file", file);

    const response = await Bundle.store(appId, versionId, formData);

    if (response.success) {
      const created = response.data as IBundle;

      if (asDemo && created?.id) {
        const demo = await Bundle.activateDemo(appId, versionId, created.id);
        if (!demo.success) toast.error("Created, but not published as a demo", demo.message);
      }

      toast.success(asDemo ? "Bundle created and live as a demo" : "Bundle created");
      navigate(`/dashboard/apps/${appId}/versions/${versionId}/bundles/${created?.id}`);
      return;
    }

    setNameError(response.errors?.name);
    setFileError(response.errors?.file ?? response.errors?.runtime_version ?? (response.errors?.name ? undefined : response.message));
    setSubmitting(false);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Add bundle"
        description={
          isExpo
            ? "Upload an Expo export for this runtime version."
            : "Upload the bundle archive (.zip, .tar or .tar.gz) for this version."
        }
        breadcrumbs={[
          { label: "Apps", to: "/dashboard/apps" },
          { label: appName ?? "App", to: `/dashboard/apps/${appId}` },
          { label: versionName ?? "Version", to: `/dashboard/apps/${appId}/versions/${versionId}` },
          { label: "Add bundle" },
        ]}
      />

      <Card className="mx-auto w-full max-w-2xl">
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

          <ArchiveField
            file={file}
            onPick={(picked) => {
              setFile(picked);
              setFileError(undefined);
            }}
            zipOnly={isExpo}
            hint={isExpo ? EXPO_ZIP_HINT : undefined}
          />
          {fileError ? <p className="-mt-2 text-xs text-destructive">{fileError}</p> : null}

          <UpdateTypeField value={updateType} onChange={setUpdateType} />

          <DemoReleaseCheckbox checked={asDemo} onChange={setAsDemo} what="bundle" />

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
  const version = useVersion(appId, versionId);
  const versionName = version?.name;
  const [bundle, setBundle] = useState<IBundle>();
  const [file, setFile] = useState<File>();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [updateType, setUpdateType] = useState<"optional" | "force">("optional");
  const [submitting, setSubmitting] = useState(false);

  const versionPath = `/dashboard/apps/${appId}/versions/${versionId}`;

  useEffect(() => {
    Bundle.show(appId, versionId, bundleId).then((response) => {
      if (response.success && response.data) {
        setBundle(response.data);
        setName(response.data.name ?? "");
        setUpdateType(response.data.update_type ?? "optional");
      } else if (!response.success && response.status === 404) {
        navigate(versionPath);
      }
    });
  }, [appId, versionId, bundleId, navigate, versionPath]);

  if (!bundle) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  const isExpo = !!bundle.expo_update_id || (bundle.platforms ?? []).length > 0;

  const save = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("update_type", updateType);
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
    <div className="flex w-full flex-col gap-5">
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

      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-2">
        {bundle.is_demo ? <Badge variant="warning">Demo</Badge> : null}
        {bundle.promoted_at ? <Badge variant="success">Promoted</Badge> : null}
        {version?.latest_id === bundle.id ? <Badge variant="primary">Public</Badge> : null}
        {version?.demo_latest_id === bundle.id ? <Badge variant="warning">Demo live</Badge> : null}
        {(bundle.platforms ?? []).map((platform) => (
          <Badge key={platform} variant="outline">
            {platform}
          </Badge>
        ))}
        {bundle.expo_update_id ? (
          <span className="font-mono text-[0.6875rem] text-muted-foreground">update {bundle.expo_update_id}</span>
        ) : null}
      </div>

      {can({ permission: "bundle.update" }) ? (
        <Card className="mx-auto w-full max-w-2xl">
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

            {isExpo ? null : (
              <ArchiveField
                file={file}
                onPick={setFile}
                current={bundle.file_id}
                hint="Leave empty to keep the current file."
              />
            )}

            <UpdateTypeField value={updateType} onChange={setUpdateType} />

            <div className="flex justify-end">
              <Button loading={submitting} onClick={save}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto w-full max-w-2xl">
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Update type</span>
              <span>{bundle.update_type === "force" ? "Force install" : "Optional"}</span>
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

      {isExpo ? <AssetsCard appId={appId} versionId={versionId} bundleId={bundleId} /> : null}
    </div>
  );
}
