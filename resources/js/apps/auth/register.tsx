import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, UserPlus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/form";

import Request from "@/utils/http";
import AuthShell from "@/apps/auth/AuthShell";

interface RegisterFormValues {
  code: string;
  name: string;
  login: string;
  password: string;
  password_confirmation: string;
}

export default function Register() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const { register, handleSubmit, setError, formState } = useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);

    const response = await Request.post({
      url: "/auth/register",
      data,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.success) {
      window.location.href = "/auth/login";
      return;
    }

    Object.keys(response.errors || {}).forEach((key) => {
      setError(key as keyof RegisterFormValues, {
        type: "manual",
        message: response.errors![key],
      });
    });

    if (response.message) {
      setError("root", { type: "error", message: response.message });
    }

    setLoading(false);
  };

  if (!token) {
    return (
      <AuthShell
        title="Invalid invite link"
        description="This link is missing its invitation token."
      >
        <Alert variant="warning">
          Ask the person who invited you to resend the invitation.
        </Alert>
        <Button
          className="mt-4 w-full"
          onClick={() => (window.location.href = "/auth/login")}
        >
          Go to sign in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Complete your registration"
      description="You've been invited to OTACenter. Choose a password to activate your account."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formState.errors.root ? (
          <Alert variant="destructive">{formState.errors.root.message}</Alert>
        ) : null}

        <Field>
          <FieldLabel htmlFor="code">Registration code</FieldLabel>
          <FieldContent>
            <Input
              id="code"
              placeholder="AB12CD34"
              autoCapitalize="characters"
              aria-invalid={!!formState.errors.code}
              {...register("code", { required: "Registration code is required." })}
            />
            <FieldDescription>Enter the code you received by email.</FieldDescription>
            <FieldError>{formState.errors.code?.message}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <FieldContent>
            <Input
              id="name"
              placeholder="Jane Doe"
              autoComplete="name"
              aria-invalid={!!formState.errors.name}
              {...register("name", { required: "Name is required." })}
            />
            <FieldError>{formState.errors.name?.message}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="login">Email</FieldLabel>
          <FieldContent>
            <Input
              id="login"
              type="email"
              placeholder="jane@company.com"
              autoComplete="email"
              aria-invalid={!!formState.errors.login}
              {...register("login", { required: "Email is required." })}
            />
            <FieldError>{formState.errors.login?.message}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={!!formState.errors.password}
                {...register("password", {
                  required: "Password is required.",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters.",
                  },
                })}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <FieldError>{formState.errors.password?.message}</FieldError>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="password_confirmation">Confirm password</FieldLabel>
          <FieldContent>
            <Input
              id="password_confirmation"
              type="password"
              placeholder="Repeat the password"
              autoComplete="new-password"
              aria-invalid={!!formState.errors.password_confirmation}
              {...register("password_confirmation", {
                required: "Please confirm your password.",
              })}
            />
            <FieldError>{formState.errors.password_confirmation?.message}</FieldError>
          </FieldContent>
        </Field>

        <Button type="submit" className="w-full" loading={loading}>
          {!loading ? <UserPlus /> : null}
          Activate account
        </Button>
      </form>
    </AuthShell>
  );
}
