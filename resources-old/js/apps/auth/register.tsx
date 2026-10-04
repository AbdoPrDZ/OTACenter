import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff, UserPlus } from "lucide-react";

import Request from "@/utils/http";

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

  const { register, handleSubmit, setError, formState } =
    useForm<RegisterFormValues>();
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
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">Invalid invite link</CardTitle>
            <CardDescription>
              This link is missing the invitation token. Ask the person who
              invited you to resend it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => (window.location.href = "/auth/login")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Complete your registration</CardTitle>
          <CardDescription>
            You've been invited to OTACenter. Choose a password to activate your
            account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {formState.errors.root && (
              <Alert variant="destructive">
                {formState.errors.root.message}
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="code">Registration code</FieldLabel>
              <FieldContent>
                <Input
                  id="code"
                  placeholder="AB12CD34"
                  autoCapitalize="characters"
                  aria-invalid={!!formState.errors.code}
                  {...register("code", {
                    required: "Registration code is required.",
                  })}
                />
                <FieldDescription>
                  Enter the code you received by email.
                </FieldDescription>
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
                  autoFocus
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
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    aria-invalid={!!formState.errors.password}
                    {...register("password", {
                      required: "Password is required.",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters.",
                      },
                    })}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{formState.errors.password?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="password_confirmation">
                Confirm password
              </FieldLabel>
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
                <FieldError>
                  {formState.errors.password_confirmation?.message}
                </FieldError>
              </FieldContent>
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner className="size-3.5" /> : <UserPlus />}
              Activate account
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
