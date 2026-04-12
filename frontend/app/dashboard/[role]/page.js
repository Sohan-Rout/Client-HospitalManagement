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

export default function RoleDashboardPage({ params }) {
  return <DashboardPage role={params.role} />;
}
