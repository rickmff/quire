import { ClassicNavbar } from "@/@components/uibrik/classic-navbar/classic-navbar";

export default function ClassicNavbarDemo() {
  return (
    <div className="w-full">
      <ClassicNavbar
        brand="Acme"
        links={["Product", "Features", "Pricing", "Customers", "Docs"]}
        primaryLabel="Get started"
        secondaryLabel="Sign in"
      />
    </div>
  );
}
