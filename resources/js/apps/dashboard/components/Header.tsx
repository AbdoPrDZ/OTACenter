import UserMenu from "@/apps/dashboard/components/UserMenu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Route } from "@/types/router";

export default function Header(props: { route: Route }) {
  return (
    <header className="hidden h-14 shrink-0 items-center gap-2 border-b px-4 md:flex">
      <SidebarTrigger />
      <Separator orientation="vertical" />
      <h1 className="text-xs/relaxed font-semibold tracking-tight">
        {props.route.title}
      </h1>
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}