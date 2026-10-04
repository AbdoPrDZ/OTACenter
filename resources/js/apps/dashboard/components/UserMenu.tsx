import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import { Avatar } from "@/components/ui/feedback";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";

export default function UserMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const user = User.current;

  if (!user) return null;

  return (
    <Dropdown
      align="end"
      className={className}
      trigger={
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-accent"
        >
          <Avatar src={user.image_url} name={user.name} size={30} />
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
        </button>
      }
    >
      <DropdownLabel>
        <span className="block truncate normal-case">{user.name}</span>
        <span className="block truncate text-[0.625rem] font-normal text-muted-foreground normal-case">
          {user.login}
        </span>
      </DropdownLabel>
      <DropdownSeparator />
      <DropdownItem onClick={() => navigate(DashboardRouter.getPath("settings")!)}>
        <Settings /> Settings
      </DropdownItem>
      <DropdownItem variant="destructive" onClick={() => User.logout()}>
        <LogOut /> Sign out
      </DropdownItem>
    </Dropdown>
  );
}
