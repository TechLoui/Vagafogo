import { Outlet } from "react-router-dom";
import { RouteSeo } from "./RouteSeo";
import { ScrollToTop } from "./ScrollToTop";
import logo from "../assets/logo.jpg";

export function PageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F7FAEF] px-4"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="mx-auto h-16 w-16 rounded-full border-2 border-[#8B4F23]/20 object-cover shadow-md"
        />
        <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-[#8B4F23]/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#8B4F23]" />
        </div>
        <p className="mt-3 text-sm font-medium text-[#8B4F23]">Carregando Vagafogo…</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <>
      <RouteSeo />
      <ScrollToTop />
      <Outlet />
    </>
  );
}
