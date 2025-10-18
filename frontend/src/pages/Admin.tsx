import { AdminMainContentHeader } from "../components/AdminMainContent.tsx";
import AdminDashboard from "../components/AdminDashboard.tsx";

export function Admin() {
  return (
    <main>
      <AdminMainContentHeader />
      <AdminDashboard />
    </main>
  );
}