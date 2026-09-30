import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ReactElement } from "react";

import User from "@/models/User";
import Role, { IRole } from "@/models/Role";
import Domain, { IDomain } from "@/models/Domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";

interface InviteDialogProps {
  onInvited: () => void;
  /** Optional custom trigger element (Base UI `render`). Defaults to a plain button. */
  triggerRender?: ReactElement;
}

interface InviteFormValues {
  name: string;
  email: string;
}

export default function InviteDialog({ onInvited, triggerRender }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [domains, setDomains] = useState<IDomain[]>([]);
  const [role, setRole] = useState<string>("");
  const [roleError, setRoleError] = useState<string>();
  const [domainId, setDomainId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>();
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setError, reset, formState } =
    useForm<InviteFormValues>();

  useEffect(() => {
    if (!open) return;

    Role.all().then((response) => {
      if (response.success && response.data) setRoles(response.data.items);
    });

    Domain.all().then((response) => {
      if (response.success && response.data) setDomains(response.data.items);
    });
  }, [open]);

  const resetState = () => {
    setRole("");
    setRoleError(undefined);
    setDomainId(null);
    setSubmitting(false);
    setInviteLink(undefined);
    setCopied(false);
    reset();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: InviteFormValues) => {
    if (!role) {
      setRoleError("Role is required.");
      return;
    }

    setSubmitting(true);

    const response = await User.invite({
      name: data.name,
      email: data.email,
      role,
      domain_id: domainId,
    });

    if (response.success) {
      setInviteLink((response.data as { link?: string } | undefined)?.link);
      onInvited();
      setSubmitting(false);
      return;
    }

    Object.keys(response.errors || {}).forEach((key) => {
      setError(key as keyof InviteFormValues, {
        type: "manual",
        message: response.errors![key],
      });
    });
    setError("root", { type: "error", message: response.message });
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerRender}>
        <Button>
          <UserPlus />
          Invite User
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            Create an account for a user and share the registration link with
            them to set their own password.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="flex flex-col gap-4">
            <Alert>User invited successfully.</Alert>

            <Field>
              <FieldLabel htmlFor="invite-link">Registration link</FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-2">
                  <Input
                    id="invite-link"
                    readOnly
                    value={inviteLink}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                  >
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <FieldDescription>
                  The user will receive the registration code by email. Share
                  this link so they can open the registration page.
                </FieldDescription>
              </FieldContent>
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetState}>
                Invite another
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
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
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  autoFocus
                  aria-invalid={!!formState.errors.name}
                  {...register("name", { required: "Name is required." })}
                />
                <FieldError>{formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@company.com"
                  autoComplete="email"
                  aria-invalid={!!formState.errors.email}
                  {...register("email", { required: "Email is required." })}
                />
                <FieldError>{formState.errors.email?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Role</FieldLabel>
              <FieldContent>
                <Combobox
                  value={role}
                  onValueChange={(value) => {
                    setRole(typeof value === "string" ? value : "");
                    setRoleError(undefined);
                  }}
                >
                  <ComboboxInput placeholder="Select a role..." />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxEmpty>No roles found</ComboboxEmpty>
                      {roles.map((item) => (
                        <ComboboxItem key={item.id} value={item.name}>
                          {item.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <FieldError>{roleError}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Domain (optional)</FieldLabel>
              <FieldContent>
                <Combobox
                  value={domainId}
                  onValueChange={(value) =>
                    setDomainId(typeof value === "number" ? value : null)
                  }
                >
                  <ComboboxInput
                    placeholder="Select a domain..."
                    showClear
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxEmpty>No domains found</ComboboxEmpty>
                      {domains.map((item) => (
                        <ComboboxItem key={item.id} value={item.id}>
                          {item.name}
                          {item.description ? (
                            <span className="truncate text-[0.625rem] text-muted-foreground">
                              {item.description}
                            </span>
                          ) : null}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </FieldContent>
            </Field>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Send invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}