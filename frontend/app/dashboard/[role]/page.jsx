import DashboardPage from "../../../components/dashboard-page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { role: "patient" },
    { role: "doctor" },
    { role: "admin" },
    { role: "super_admin" },
    { role: "nurse" },
    { role: "receptionist" },
    { role: "staff" }
  ];
}

export default async function RoleDashboardPage({ params }) {
  const { role } = await params;

  if (!role) {
    return <div>Invalid role</div>;
  }

  return <DashboardPage role={role} />;
}
