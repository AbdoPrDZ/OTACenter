import { useState } from "react";
import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { Response } from "@/types/http";

/**
 * Where a version or bundle stands in the release flow:
 *
 * - `public`   — the pointer every device follows (`latest_id`)
 * - `demo`     — the demo pointer, offered to demo-eligible devices only (`demo_latest_id`)
 * - `idle`     — neither; may still be flagged as a demo build
 */
export type ReleaseState = "public" | "demo" | "idle";

export function releaseState(id: number, latestId?: number | null, demoLatestId?: number | null): ReleaseState {
  if (latestId === id) return "public";
  if (demoLatestId === id) return "demo";
  return "idle";
}

export function ReleaseBadge({
  state,
  isDemo,
  fallback,
}: {
  state: ReleaseState;
  isDemo?: boolean;
  /** Label for an idle item (e.g. its status). */
  fallback?: string;
}) {
  if (state === "public") return <Badge variant="primary">Public</Badge>;
  if (state === "demo")
    return (
      <Badge variant="warning">
        <FlaskConical className="mr-1 inline size-3" /> Demo live
      </Badge>
    );
  if (isDemo) return <Badge variant="outline">Demo</Badge>;

  return <Badge variant="outline">{fallback ?? "Inactive"}</Badge>;
}

/** "Publish as a demo right away" toggle on the create forms. */
export function DemoReleaseCheckbox({
  checked,
  onChange,
  what,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  what: string;
}) {
  return (
    <Field>
      <FieldLabel>Demo release</FieldLabel>
      <FieldContent>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox checked={checked} onCheckedChange={onChange} aria-label="Publish as a demo" />
          <span className="text-muted-foreground">
            Publish this {what} as a demo: only members of domains that allow demos receive it, until
            you promote it to public.
          </span>
        </label>
      </FieldContent>
    </Field>
  );
}

/** Runs a release action with a loading state and toasts. */
export function useReleaseAction(onDone: () => void) {
  const toast = useToast();
  const [running, setRunning] = useState<string>();

  const run = async (key: string, action: () => Promise<Response<unknown>>, success: string) => {
    setRunning(key);
    const response = await action();
    setRunning(undefined);

    if (response.success) {
      toast.success(success);
      onDone();
      return;
    }

    toast.error("Action failed", response.message);
  };

  return { running, run };
}

/**
 * Row actions: publish to everyone, publish as a demo, or promote a live demo.
 * `rowKey` scopes the loading state to one row.
 */
export function ReleaseRowActions({
  rowKey,
  state,
  isDemo,
  running,
  onPublish,
  onDemo,
  onPromote,
}: {
  rowKey: string;
  state: ReleaseState;
  isDemo?: boolean;
  running?: string;
  onPublish: () => void;
  onDemo: () => void;
  onPromote: () => void;
}) {
  if (state === "public") return null;

  const stop = (handler: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    handler();
  };

  return (
    <div className="flex justify-end gap-1.5">
      {state === "demo" || isDemo ? (
        <Button size="sm" loading={running === `${rowKey}:promote`} onClick={stop(onPromote)}>
          Promote to public
        </Button>
      ) : (
        <Button size="sm" variant="outline" loading={running === `${rowKey}:publish`} onClick={stop(onPublish)}>
          Activate
        </Button>
      )}

      {state !== "demo" ? (
        <Button size="sm" variant="ghost" loading={running === `${rowKey}:demo`} onClick={stop(onDemo)}>
          <FlaskConical /> Demo
        </Button>
      ) : null}
    </div>
  );
}
