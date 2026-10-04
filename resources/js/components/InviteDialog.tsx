import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Check, Copy, UserPlus } from "lucide-react";

import User from "@/models/User";
import Role, { IRole } from "@/models/Role";
import Domain, { IDomain } from "@/models/Domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/form";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";

interface InviteDialogProps {
  onInvited: () => void;
  /** Optional custom trigger node; defaults to an "Invite user" button. */
  trigger?: ReactNode;
}

interface InviteFormValues {
  name: string;
  email: string;
}

export default function InviteDialog({ onInvited, trigger }: InviteDialogProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [domains, setDomains] = useState<IDomain[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string>();
  const [domainId, setDomainId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>();
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setError, reset, formState } =
    useForm<InviteFormValues>();

  useEffect(() => {
    if (!open) return;

    Role.all({ pagination: { page: 1, pageSize: 100 } }).then((response) => {
      if (response.success && response.data) setRoles(response.data.items);
    });

    Domain.all({ pagination: { page: 1, pageSize: 100 } }).then((response) => {
      if (response.success && response.data) setDomains(response.data.items);
    });
  }, [open]);

  const resetState = () => {
    setRole(null);
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
    toast.success("Link copied");
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
      toast.success("User invited", "Share the registration link with them.");
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
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <UserPlus /> Invite user
        </Button>
      )}

      <Modal open={open} onOpenChange={handleOpenChange}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Invite a new user</ModalTitle>
            <ModalDescription>
              Create an account and share the registration link so they can set
              their own password.
            </ModalDescription>
          </ModalHeader>

          {inviteLink ? (
            <div className="mt-4 flex flex-col gap-4">
              <Alert variant="success">User invited successfully.</Alert>

              <Field>
                <FieldLabel htmlFor="invite-link">Registration link</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Input id="invite-link" readOnly value={inviteLink} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={copyLink}>
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <FieldDescription>
                    The user receives the registration code by email. Share this
                    link so they can open the registration page.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetState}>
                  Invite another
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <form
              className="mt-4 flex flex-col gap-4"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {formState.errors.root ? (
                <Alert variant="destructive">{formState.errors.root.message}</Alert>
              ) : null}

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
                  <SelectMenu
                    options={roles.map((item) => ({
                      value: item.name,
                      label: item.name,
                    }))}
                    value={role}
                    onValueChange={(value) => {
                      setRole(typeof value === "string" ? value : null);
                      setRoleError(undefined);
                    }}
                    placeholder="Select a role..."
                    searchPlaceholder="Search roles..."
                    emptyText="No roles found."
                  />
                  <FieldError>{roleError}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Domain (optional)</FieldLabel>
                <FieldContent>
                  <SelectMenu
                    options={domains.map((item) => ({
                      value: item.id,
                      label: item.name,
                      description: item.description,
                    }))}
                    value={domainId}
                    onValueChange={(value) =>
                      setDomainId(typeof value === "number" ? value : null)
                    }
                    placeholder="Select a domain..."
                    searchPlaceholder="Search domains..."
                    emptyText="No domains found."
                    clearable
                  />
                </FieldContent>
              </Field>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  <UserPlus /> Send invite
                </Button>
              </div>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
