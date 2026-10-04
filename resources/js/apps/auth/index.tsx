import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/form";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/form";
import { ThemeProvider } from "@/components/ui/theme";
import { ToastProvider } from "@/components/ui/toast";

import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import Register from "@/apps/auth/register";
import AuthShell from "@/apps/auth/AuthShell";

import "@/utils/bootstrap";

interface FormValues {
  login: string;
  password: string;
}

function Login() {
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
    <AuthShell
      title="Sign in"
      description="Enter your credentials to access the dashboard."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formState.errors.root ? (
          <Alert variant="destructive">{formState.errors.root.message}</Alert>
        ) : null}

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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={!!formState.errors.password}
                {...register("password", { required: "Password is required." })}
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

        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium">
          <Checkbox checked={remember} onCheckedChange={setRemember} />
          Remember me
        </label>

        <Button type="submit" className="w-full" loading={loading}>
          {!loading ? <LogIn /> : null}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

function AuthApp() {
  const isRegister = window.location.pathname.startsWith("/register");

  return isRegister ? <Register /> : <Login />;
}

const root = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthApp />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
