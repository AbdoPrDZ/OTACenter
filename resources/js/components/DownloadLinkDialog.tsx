import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Ban, Check, Copy, Download, Link2, QrCode } from "lucide-react";

import DownloadLink, {
  DOWNLOAD_LINK_EXPIRY_DAYS,
  IDownloadLink,
  DownloadLinkStatus,
} from "@/models/DownloadLink";
import User, { IUser } from "@/models/User";
import { IApp } from "@/models/App";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldLabel, Input } from "@/components/ui/form";
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { SelectMenu, SelectOption } from "@/components/ui/select-menu";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { can } from "@/utils/permissions";

const NEVER = "never";

const EXPIRY_OPTIONS: SelectOption[] = [
  ...DOWNLOAD_LINK_EXPIRY_DAYS.map((days) => ({
    value: String(days),
    label: days === 1 ? "1 day" : days === 365 ? "1 year" : `${days} days`,
  })),
  { value: NEVER, label: "Never expires" },
];

const STATUS_VARIANT: Record<DownloadLinkStatus, "success" | "warning" | "destructive"> = {
  active: "success",
  expired: "warning",
  revoked: "destructive",
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

/**
 * Generates and manages download links for an app: a URL carrying a token, and
 * the same URL as a QR code. Works for public and private apps — the token is
 * the grant — and every download through a link is counted for its user.
 */
export default function DownloadLinkDialog({
  app,
  open,
  onOpenChange,
}: {
  app: IApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const currentUser = User.current;
  const canPickUser = can({ permission: "user.view" });

  const [links, setLinks] = useState<IDownloadLink[]>();
  const [users, setUsers] = useState<IUser[]>([]);
  const [userId, setUserId] = useState<number | null>(currentUser?.id ?? null);
  const [expiry, setExpiry] = useState<string>("30");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<IDownloadLink | null>(null);

  const loadLinks = useCallback(() => {
    DownloadLink.allForApp(app.id).then((response) => {
      if (response.success && response.data) setLinks(response.data.items);
      else setLinks([]);
    });
  }, [app.id]);

  useEffect(() => {
    if (!open) return;

    loadLinks();

    if (canPickUser) {
      User.all({ pagination: { page: 1, pageSize: 200 } }).then((response) => {
        if (response.success && response.data) setUsers(response.data.items);
      });
    }
  }, [open, loadLinks, canPickUser]);

  const userOptions = useMemo<SelectOption[]>(() => {
    const options = users.map((user) => ({
      value: user.id,
      label: user.id === currentUser?.id ? `${user.name} (you)` : user.name,
      description: user.login,
    }));

    if (currentUser && !options.some((option) => option.value === currentUser.id))
      options.unshift({ value: currentUser.id, label: `${currentUser.name} (you)`, description: currentUser.login });

    return options;
  }, [users, currentUser]);

  const create = async () => {
    setCreating(true);

    const response = await DownloadLink.create(app.id, {
      user_id: userId,
      label: label.trim() || null,
      expires_in_days: expiry === NEVER ? null : Number(expiry),
    });

    setCreating(false);

    if (!response.success || !response.data) {
      toast.error("Could not create the link", response.message);
      return;
    }

    toast.success("Download link created");
    setLabel("");
    setSelected(response.data);
    loadLinks();
  };

  const revoke = async (link: IDownloadLink) => {
    const response = await DownloadLink.revoke(app.id, link.id);

    if (!response.success) {
      toast.error("Could not revoke the link", response.message);
      return;
    }

    toast.success("Download link revoked");
    if (selected?.id === link.id) setSelected(response.data ?? null);
    loadLinks();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>Download links — {app.name}</ModalTitle>
          <ModalDescription>
            A link (or its QR code) downloads the current published version, for public and private
            apps alike. Every download through it is counted for the link&apos;s user.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            {canPickUser ? (
              <Field>
                <FieldLabel htmlFor="download-link-user">Count downloads for</FieldLabel>
                <FieldContent>
                  <SelectMenu
                    id="download-link-user"
                    options={userOptions}
                    value={userId}
                    onValueChange={(value) => setUserId(value === null ? currentUser?.id ?? null : Number(value))}
                    placeholder="Select a user"
                    searchPlaceholder="Search users…"
                  />
                </FieldContent>
              </Field>
            ) : (
              <FieldDescription>Downloads through this link are counted for you.</FieldDescription>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="download-link-expiry">Expires after</FieldLabel>
                <FieldContent>
                  <SelectMenu
                    id="download-link-expiry"
                    options={EXPIRY_OPTIONS}
                    value={expiry}
                    onValueChange={(value) => setExpiry(value === null ? "30" : String(value))}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="download-link-label">Label (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="download-link-label"
                    value={label}
                    maxLength={100}
                    placeholder="e.g. QA team"
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>

            <div>
              <Button onClick={create} loading={creating}>
                <Link2 /> Generate link
              </Button>
            </div>
          </div>

          <LinkPreview link={selected} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Links
          </h3>

          {links === undefined ? (
            <Spinner className="mx-auto my-4 size-5 text-muted-foreground" />
          ) : links.length === 0 ? (
            <EmptyState className="py-6" title="No links yet" description="Generate one above." />
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  selected={selected?.id === link.id}
                  onShow={() => setSelected(link)}
                  onRevoke={() => revoke(link)}
                />
              ))}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

function LinkRow({
  link,
  selected,
  onShow,
  onRevoke,
}: {
  link: IDownloadLink;
  selected: boolean;
  onShow: () => void;
  onRevoke: () => void;
}) {
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 " +
        (selected ? "border-primary/60 bg-primary/5" : "border-border bg-muted/20")
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium">
          {link.label || `Link #${link.id}`}
          <span className="font-normal text-muted-foreground"> · for {link.user?.name ?? "deleted user"}</span>
        </span>
        <span className="text-[0.625rem] text-muted-foreground">
          {link.downloads_count.toLocaleString()} download{link.downloads_count === 1 ? "" : "s"} ·
          expires {link.expires_at ? formatDate(link.expires_at) : "never"} · last used {formatDate(link.last_used_at)}
        </span>
      </div>

      <Badge variant={STATUS_VARIANT[link.status]} size="sm">
        {link.status}
      </Badge>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Show QR code" onClick={onShow}>
          <QrCode />
        </Button>
        <CopyButton value={link.url} />
        {link.status === "active" ? (
          <Button variant="ghost" size="icon-sm" aria-label="Revoke link" onClick={onRevoke}>
            <Ban className="text-destructive" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** The selected link's QR code, its URL, and copy / save-as-PNG actions. */
function LinkPreview({ link }: { link: IDownloadLink | null }) {
  const [qr, setQr] = useState<string>();

  useEffect(() => {
    setQr(undefined);
    if (!link) return;

    let cancelled = false;

    QRCode.toDataURL(link.url, { width: 480, margin: 1, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQr(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [link]);

  if (!link) {
    return (
      <div className="flex size-48 flex-col items-center justify-center gap-2 self-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
        <QrCode className="size-6" />
        Generate or pick a link to see its QR code.
      </div>
    );
  }

  const inactive = link.status !== "active";

  return (
    <div className="flex w-48 flex-col items-center gap-2 self-center">
      <div className="relative rounded-xl bg-white p-2">
        {qr ? (
          <img src={qr} alt={`QR code for ${link.label || `link #${link.id}`}`} className="size-44" />
        ) : (
          <div className="flex size-44 items-center justify-center">
            <Spinner className="size-5 text-neutral-500" />
          </div>
        )}
        {inactive ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-xs font-medium text-white">
            Link {link.status}
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-1">
        <Input readOnly value={link.url} className="h-8 text-[0.625rem]" onFocus={(event) => event.target.select()} />
        <CopyButton value={link.url} />
      </div>

      {qr ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const anchor = document.createElement("a");
            anchor.href = qr;
            anchor.download = `download-link-${link.app_id}-${link.id}.png`;
            anchor.click();
          }}
        >
          <Download /> Save QR code
        </Button>
      ) : null}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={copy}>
      {copied ? <Check className="text-success" /> : <Copy />}
    </Button>
  );
}
