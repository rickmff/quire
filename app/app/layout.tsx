import { preload } from "react-dom";
import { CATALOG_URL } from "@/lib/catalogUrl";
import App from "@/components/App";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  preload(CATALOG_URL, { as: "fetch", crossOrigin: "anonymous" });
  return (
    <>
      <App />
      {children}
    </>
  );
}
