import { useState } from "react";
import { useForm } from "react-hook-form";

import User from "@/models/User";
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
import ImagePicker from "@/components/ImagePicker";

import { Save } from "lucide-react";

interface ProfileFormValues {
  name: string;
}

export default function SettingsTab() {
  const user = User.current;
  const { register, handleSubmit, setError, formState } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name ?? "" },
  });
  const [image, setImage] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const onSubmit = async (data: ProfileFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    if (image) formData.append("image", image);

    const response = await User.editProfile(formData);

    if (response.success) {
      setSubmitting(false);
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
        <h1 className="text-sm font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your account profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {formState.errors.root && (
            <Alert variant="destructive">{formState.errors.root.message}</Alert>
          )}

          <div className="flex items-center gap-3">
            {user.image_url ? (
              <img
                src={user.image_url}
                alt={user.name}
                className="size-12 rounded-full object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {(user.name || "U").slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.login}</span>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="name">Display name</FieldLabel>
            <FieldContent>
              <Input id="name" {...register("name")} />
              <FieldError>{formState.errors.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Avatar</FieldLabel>
            <FieldContent>
              <ImagePicker
                image={image}
                onChange={setImage}
                value={user.image_url}
                width={96}
                height={96}
                borderRadius={999}
              />
            </FieldContent>
          </Field>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <Spinner className="size-3.5" /> : <Save />}
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
