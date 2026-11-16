import App from "@/components/App";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <App />
      {children}
    </>
  );
}
