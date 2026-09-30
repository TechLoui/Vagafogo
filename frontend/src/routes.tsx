import { createBrowserRouter } from "react-router-dom";
import { AppLayout, PageLoader } from "./components/AppLayout";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        path: "/",
        lazy: async () => {
          const { Home } = await import("./pages/home");
          return { Component: Home };
        },
      },
      {
        path: "/brunch",
        lazy: async () => {
          const { Brunch } = await import("./pages/Brunch");
          return { Component: Brunch };
        },
      },
      {
        path: "/trilha",
        lazy: async () => {
          const { Trilha } = await import("./pages/Trilha");
          return { Component: Trilha };
        },
      },
      {
        path: "/historia",
        lazy: async () => {
          const { Historia } = await import("./pages/Historia");
          return { Component: Historia };
        },
      },
      {
        path: "/historia/pirenopolis",
        lazy: async () => {
          const { HistoriaPirenopolis } = await import("./pages/HistoriaPirenopolis");
          return { Component: HistoriaPirenopolis };
        },
      },
      {
        path: "/planeje-sua-visita",
        lazy: async () => {
          const { PlanejeVisita } = await import("./pages/PlanejeVisita");
          return { Component: PlanejeVisita };
        },
      },
      {
        path: "/educacao-ambiental",
        lazy: async () => {
          const { EducacaoAmbiental } = await import("./pages/EducacaoAmbiental");
          return { Component: EducacaoAmbiental };
        },
      },
      {
        path: "/reservar",
        lazy: async () => {
          const { Reserva } = await import("./pages/Reserva");
          return { Component: Reserva };
        },
      },
      {
        path: "/minha-reserva",
        lazy: async () => {
          const { MinhaReserva } = await import("./pages/MinhaReserva");
          return { Component: MinhaReserva };
        },
      },
      {
        path: "/formulario/:publicId",
        lazy: async () => {
          const { FormularioPublico } = await import("./pages/FormularioPublico");
          return { Component: FormularioPublico };
        },
      },
      {
        path: "/login",
        lazy: async () => {
          const { LoginAdmin } = await import("./pages/LoginAdmin");
          return { Component: LoginAdmin };
        },
      },
      {
        path: "/admin",
        lazy: async () => {
          const [{ Admin }, { ProtectedRoute }] = await Promise.all([
            import("./pages/Admin"),
            import("./components/ProtectedRoute"),
          ]);

          function ProtectedAdmin() {
            return (
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            );
          }

          return { Component: ProtectedAdmin };
        },
      },
      {
        path: "/CRM/login",
        lazy: async () => {
          const { CRMLogin } = await import("./pages/CRMLogin");
          return { Component: CRMLogin };
        },
      },
      {
        path: "/CRM",
        lazy: async () => {
          const [{ CRM }, { ProtectedRoute }] = await Promise.all([
            import("./pages/CRM"),
            import("./components/ProtectedRoute"),
          ]);

          function ProtectedCRM() {
            return (
              <ProtectedRoute redirectTo="/CRM/login">
                <CRM />
              </ProtectedRoute>
            );
          }

          return { Component: ProtectedCRM };
        },
      },
      {
        path: "/agente",
        lazy: async () => {
          const [{ Agente }, { ProtectedRoute }] = await Promise.all([
            import("./pages/Agente"),
            import("./components/ProtectedRoute"),
          ]);

          function ProtectedAgent() {
            return (
              <ProtectedRoute redirectTo="/CRM/login">
                <Agente />
              </ProtectedRoute>
            );
          }

          return { Component: ProtectedAgent };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { NotFound } = await import("./pages/NotFound");
          return { Component: NotFound };
        },
      },
    ],
  },
]);
