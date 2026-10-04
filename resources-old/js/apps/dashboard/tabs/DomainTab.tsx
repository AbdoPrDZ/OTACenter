import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import Domain, { IDomain } from "@/models/Domain";

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
import ImagePicker from "@/components/ImagePicker";
import { DomainStats } from "@/components/StatisticsViews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Trash2 } from "lucide-react";
import { can, isPrivilegedRole } from "@/utils/permissions";

export default function DomainTab() {
  const params = useParams();
  const { id } = params;

  console.log("Location", window.location.href, "DomainTab params:", params);

  if (id) return <DomainShow domainId={Number(id)} />;

  return <DomainCreate />;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

interface DomainFormValues {
  name: string;
  description: string;
}

function DomainCreate() {
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState } = useForm<DomainFormValues>();
  const [image, setImage] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  const onSubmit = async (data: DomainFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    if (image) formData.append("image", image);

    const response = await Domain.create(formData);

    if (response.success) {
      navigate(`/dashboard/domains/${(response.data as IDomain)?.id}`);
      return;
    }

    if (response.errors?.name)
      setError("name", { type: "manual", message: response.errors.name });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold tracking-tight">Add Domain</h1>
        <p className="text-xs text-muted-foreground">
          Create a new organizational domain.
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
              <Input id="name" placeholder="IT Department" {...register("name")} />
              <FieldError>{formState.errors.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <FieldContent>
              <Textarea
                id="description"
                placeholder="Short description of the domain"
                {...register("description")}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Image</FieldLabel>
            <FieldContent>
              <ImagePicker image={image} onChange={setImage} disabled={!privileged} />
            </FieldContent>
          </Field>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <Spinner className="size-3.5" /> : <Plus />}
            Create Domain
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Show / Edit                                                        */
/* ------------------------------------------------------------------ */

function DomainShow({ domainId }: { domainId: number }) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState<IDomain>();

  const [reload, setReload] = useState(0);
  const refresh = () => setReload((value) => value + 1);

  useEffect(() => {
    Domain.find(domainId).then((response) => {
      if (response.success && response.data) setDomain(response.data);
      else if (!response.success && response.status === 404) navigate("/dashboard/domains");
    });
  }, [domainId, reload, navigate]);

  if (!domain) return <Spinner className="mx-auto mt-16 size-6" />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {domain.image_url ? (
            <img
              src={domain.image_url}
              alt={domain.name}
              className="size-10 rounded-md object-cover ring-1 ring-foreground/10"
            />
          ) : null}
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{domain.name}</h1>
            <p className="text-xs text-muted-foreground">Domain details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can({ permission: "domain.delete" }) && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" className="text-destructive" />}
              >
                <Trash2 />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {domain.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the domain and all of its bindings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const response = await Domain.delete(domain.id);
                      if (response.success) navigate("/dashboard/domains");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant="outline" onClick={() => navigate("/dashboard/domains")}>
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
          {can({ permission: "domain.update" }) ? (
            <DomainEditForm domain={domain} onSaved={refresh} />
          ) : null}
        </TabsContent>

        <TabsContent value="statistics" className="mt-3">
          <DomainStats domainId={domainId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DomainEditForm({ domain, onSaved }: { domain: IDomain; onSaved: () => void }) {
  const { register, handleSubmit, reset, setError, formState } =
    useForm<DomainFormValues>({
      defaultValues: {
        name: domain.name,
        description: domain.description,
      },
    });
  const [image, setImage] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const privileged = isPrivilegedRole();

  useEffect(() => {
    reset({
      name: domain.name,
      description: domain.description,
    });
  }, [domain, reset]);

  const onSubmit = async (data: DomainFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    if (image) formData.append("image", image);

    const response = await Domain.update(domain.id, formData);

    if (response.success) {
      onSaved();
      setSubmitting(false);
      return;
    }

    if (response.errors?.name)
      setError("name", { type: "manual", message: response.errors.name });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Domain</CardTitle>
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
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <FieldContent>
            <Textarea id="description" {...register("description")} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImagePicker
              image={image}
              onChange={setImage}
              value={domain.image_url}
              disabled={!privileged}
            />
          </FieldContent>
        </Field>

        <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
          {submitting ? <Spinner className="size-3.5" /> : <Save />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
