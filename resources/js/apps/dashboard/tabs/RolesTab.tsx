import { useNavigate } from "react-router-dom";

import Role from "@/models/Role";
import ModelDataTable from "@/components/ModelDataTable";
import PageHeader from "@/components/PageHeader";

export default function RolesTab() {
  const navigate = useNavigate();

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Roles"
        description="Roles group permissions and are attached to users. Roles are seeded, not created here."
      />
      <ModelDataTable
        model={Role}
        onRowClick={(row) => navigate(`/dashboard/roles/${row.id}`)}
      />
    </div>
  );
}
