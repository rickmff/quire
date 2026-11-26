import { ContactCard } from "@/components/prestigeui/contact-card";

export default function ContactCardDemo() {
  return (
    <ContactCard
      name="Maya Lindqvist"
      role="Head of Design"
      company="Northwind Studio"
      email="maya@northwind.studio"
      phone="+46 70 123 45 67"
      website="northwind.studio"
      location="Stockholm"
    />
  );
}
