import { useNavigate } from "react-router-dom";

import Permission from "@/models/Permission";
import ModelDataTable from "@/components/ModelDataTable";
import PageHeader from "@/components/PageHeader";

export default function PermissionsTab() {
  const navigate = useNavigate();

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Permissions"
        description="Fine-grained actions granted to roles and users. Permissions are seeded."
      />
      <ModelDataTable
        model={Permission}
        onRowClick={(row) => navigate(`/dashboard/permissions/${row.id}`)}
      />
    </div>
  );
}
