import App from "@/components/App";

// The gallery sits in the layout, above the pages, so moving between views
// (/app, /app/all-libraries, …) keeps it mounted: no reload, no second deal.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <App />
      {children}
    </>
  );
}
