import { useState } from "react";
import { useForm } from "react-hook-form";

import User from "@/models/User";
import PageHeader from "@/components/PageHeader";
import ImagePicker from "@/components/ImagePicker";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

interface ProfileFormValues {
  name: string;
}

export default function SettingsTab() {
  const toast = useToast();
  const user = User.current;
  const { register, handleSubmit, setError, formState } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name ?? "" },
  });
  const [avatar, setAvatar] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const onSubmit = async (data: ProfileFormValues) => {
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    if (avatar) formData.append("image", avatar);

    const response = await User.editProfile(formData);

    if (response.success) {
      toast.success("Profile updated");
      setAvatar(undefined);
      setSubmitting(false);
      return;
    }

    Object.keys(response.errors || {}).forEach((key) => {
      setError(key as keyof ProfileFormValues, { type: "manual", message: response.errors![key] });
    });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title="Settings" description="Manage your profile and preferences." />

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formState.errors.root ? (
              <Alert variant="destructive">{formState.errors.root.message}</Alert>
            ) : null}

            <div className="flex items-center gap-4">
              <Avatar src={user.image_url} name={user.name} size={56} />
              <div className="flex flex-col gap-1">
                <ImagePicker image={avatar} onChange={setAvatar} width={96} height={96} />
                <p className="text-[0.6875rem] text-muted-foreground">
                  PNG, JPG or GIF. Square images look best.
                </p>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <FieldContent>
                <Input id="name" {...register("name", { required: "Name is required." })} />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="login">Login</FieldLabel>
              <FieldContent>
                <Input id="login" value={user.login} readOnly disabled />
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

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Use the theme switch in the top bar to choose light, dark or system.
            Your choice is remembered on this device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
