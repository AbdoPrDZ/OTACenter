import React, { useState } from "react";
import ReactDOM from "react-dom/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff, LogIn } from "lucide-react";

import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import Register from "@/apps/auth/register";

import "@/utils/bootstrap";

interface FormValues {
  login: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit, setError, formState } = useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    const response = await User.login({ ...data, remember });

    if (response.success) {
      window.location.href = DashboardRouter.getPath("home")!;
      return;
    }

    Object.keys(response.errors || {}).forEach((key) => {
      setError(key as keyof FormValues, {
        type: "manual",
        message: response.errors![key],
      });
    });

    if (response.message) {
      setError("root", { type: "error", message: response.message });
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Sign in to OTACenter</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard.
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
              <FieldLabel htmlFor="login">Login</FieldLabel>
              <FieldContent>
                <Input
                  id="login"
                  placeholder="jdoe@company.com"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!formState.errors.login}
                  {...register("login", { required: "Login is required." })}
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
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!formState.errors.password}
                    {...register("password", {
                      required: "Password is required.",
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

            <Label className="w-fit cursor-pointer gap-2">
              <Checkbox
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked)}
              />
              Remember me
            </Label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner className="size-3.5" /> : <LogIn />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

const root = document.getElementById("root") as HTMLElement;

function AuthApp() {
  const isRegister = window.location.pathname.startsWith("/register");

  return isRegister ? <Register /> : <Login />;
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AuthApp />
  </React.StrictMode>
);
