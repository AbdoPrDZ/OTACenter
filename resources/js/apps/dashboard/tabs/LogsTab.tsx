import PageHeader from "@/components/PageHeader";
import ActivityList from "@/components/ActivityList";

export default function LogsTab() {
  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Activity"
        description="Audit log of events across applications, versions and users."
      />

      <ActivityList />
    </div>
  );
}
