import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Globe, Plus } from "lucide-react";

import Domain, { IDomain } from "@/models/Domain";
import PageHeader from "@/components/PageHeader";
import ErrorAndRedirect from "@/components/ErrorAndRedirect";
import ImagePicker from "@/components/ImagePicker";
import ConfirmDelete from "@/components/ConfirmDelete";
import { DomainStats } from "@/components/StatisticsViews";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Input, Textarea } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

import { can } from "@/utils/permissions";

export default function DomainTab() {
  const { id } = useParams();

  if (!id) return <DomainCreate />;

  const domainId = Number(id);
  if (!Number.isInteger(domainId))
    return <ErrorAndRedirect message="Invalid domain ID." route="/dashboard/domains" />;

  return <DomainShow domainId={domainId} />;
}

interface DomainFormValues {
  name: string;
  description: string;
  is_public: boolean;
}

function PublicField({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="is_public">Public</FieldLabel>
      <FieldContent>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label="Public domain" />
          <span className="text-muted-foreground">
            Show every app in this domain on the public store
          </span>
        </label>
      </FieldContent>
    </Field>
  );
}

function DomainCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, watch, setValue, setError, formState } = useForm<DomainFormValues>({
    defaultValues: { is_public: false },
  });
  const [image, setImage] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const isPublic = watch("is_public");

  const onSubmit = async (data: DomainFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("is_public", data.is_public ? "1" : "0");
    if (image) formData.append("image", image);

    const response = await Domain.create(formData);

    if (response.success) {
      toast.success("Domain created");
      navigate(`/dashboard/domains/${(response.data as IDomain)?.id}`);
      return;
    }

    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Add domain"
        description="Create an organizational group to scope access."
        breadcrumbs={[
          { label: "Domains", to: "/dashboard/domains" },
          { label: "Add domain" },
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
                <Input id="name" placeholder="Engineering" {...register("name", { required: "Name is required." })} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <FieldContent>
                <Textarea id="description" placeholder="What is this domain for?" {...register("description")} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Image</FieldLabel>
              <FieldContent>
                <ImagePicker image={image} onChange={setImage} />
              </FieldContent>
            </Field>

            <PublicField checked={isPublic} onCheckedChange={(value) => setValue("is_public", value)} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard/domains")}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                <Plus /> Create domain
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DomainShow({ domainId }: { domainId: number }) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState<IDomain>();
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    Domain.find(domainId).then((response) => {
      if (response.success && response.data) setDomain(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/domains");
    });
  }, [domainId, reload, navigate]);

  if (!domain) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={domain.name}
        description={domain.description}
        breadcrumbs={[
          { label: "Domains", to: "/dashboard/domains" },
          { label: domain.name },
        ]}
        icon={
          domain.image_url ? (
            <img src={domain.image_url} alt={domain.name} className="size-10 rounded-xl object-cover" />
          ) : (
            <Globe className="size-5" />
          )
        }
        actions={
          can({ permission: "domain.delete" }) ? (
            <ConfirmDelete
              title={`Delete ${domain.name}?`}
              description="This permanently deletes the domain and removes its bindings."
              onConfirm={() => Domain.delete(domain.id)}
              onDeleted={() => navigate("/dashboard/domains")}
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
          {can({ permission: "domain.update" }) ? (
            <DomainEditForm domain={domain} onSaved={refresh} />
          ) : (
            <Card>
              <CardContent className="flex flex-col gap-2 pt-5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{domain.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-right">{domain.description || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public</span>
                  <span>{domain.is_public ? "Yes" : "No"}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <DomainStats domainId={domainId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DomainEditForm({ domain, onSaved }: { domain: IDomain; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, reset, watch, setValue, setError, formState } = useForm<DomainFormValues>({
    defaultValues: {
      name: domain.name,
      description: domain.description,
      is_public: domain.is_public,
    },
  });
  const [image, setImage] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const isPublic = watch("is_public");

  useEffect(() => {
    reset({
      name: domain.name,
      description: domain.description,
      is_public: domain.is_public,
    });
  }, [domain, reset]);

  const onSubmit = async (data: DomainFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("is_public", data.is_public ? "1" : "0");
    if (image) formData.append("image", image);

    const response = await Domain.update(domain.id, formData);

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

          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <FieldContent>
              <Input id="name" {...register("name", { required: "Name is required." })} />
              <FieldError>{formState.errors.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <FieldContent>
              <Textarea id="description" {...register("description")} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Image</FieldLabel>
            <FieldContent>
              <ImagePicker image={image} onChange={setImage} value={domain.image_url} />
            </FieldContent>
          </Field>

          <PublicField checked={isPublic} onCheckedChange={(value) => setValue("is_public", value)} />

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
