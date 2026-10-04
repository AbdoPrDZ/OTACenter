import { FormHTMLAttributes, ReactNode, useState } from "react";

import { FieldValues, UseFormReturn } from "react-hook-form";
import Typography from "./ui/typography";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Alert } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import LazySkeleton from "./LazySkeleton";

export interface FormMessage {
  type?: "success" | "error" | "info" | "warning";
  content: string;
}

interface FormProps<T extends FieldValues = FieldValues> {
  children?: ReactNode;
  loading?: boolean;
  title?: string;
  formHook: UseFormReturn<T, any, any>;
  submitHandler: (data: T) => Promise<void>;
  confirm?: boolean;
}

export default function Form<T extends FieldValues = FieldValues>({
  children,
  loading,
  title,
  formHook,
  submitHandler,
  confirm,
  ...props
}: FormProps<T> & FormHTMLAttributes<HTMLFormElement>) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { handleSubmit, getValues, formState } = formHook;

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={handleSubmit(submitHandler)}
      {...props}
    >
      {title && (
        <LazySkeleton loading={loading === true} type="title">
          <Typography
            variant="h4"
            style={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            {title}
          </Typography>
        </LazySkeleton>
      )}

      {children}

      {confirm === true && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to submit?</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setSubmitting(true);
                  await submitHandler(getValues());
                  setSubmitting(false);
                  setConfirming(false);
                }}
                disabled={submitting}
              >
                {submitting && <Spinner className="size-5" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {formState.errors.root !== undefined && (
        <Alert variant="destructive" className="my-2">
          {formState.errors.root.message}
        </Alert>
      )}
    </form>
  );
}
