import { createBrowserRouter } from "react-router-dom"
import { Home } from "./pages/home"
import { Admin } from "./pages/Admin"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />
  },
  {
    path: "/admin",
    element: <Admin />
  },
  {
    path: "*",
    element: <Home />
  }
])
