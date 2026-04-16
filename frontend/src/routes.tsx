import { createBrowserRouter } from "react-router-dom"
import { Home } from "./pages/home"
import { LoginAdmin } from "./pages/LoginAdmin"
import { Admin } from "./pages/Admin"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { Reserva } from "./pages/Reserva"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />
  },
  {
    path: "/reservar",
    element: <Reserva />
  },
  {
    path: "/login",
    element: <LoginAdmin />
  },
   {
    path: "/admin",
    element:  <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
  }
])
