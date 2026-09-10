import { AdminMainContentHeader } from "../components/AdminMainContent.tsx";
import AdminDashboard from "../components/AdminDashboard.tsx";

export function Admin() {
  return (
    <main id="conteudo-principal" tabIndex={-1}>
      <AdminMainContentHeader />
      <AdminDashboard />
    </main>
  );
}
