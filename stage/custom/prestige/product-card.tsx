import { ProductCard } from "@/components/prestigeui/product-card";

const photo = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="560" cy="300" r="180" fill="#fff" fill-opacity=".18"/><circle cx="260" cy="720" r="260" fill="#000" fill-opacity=".12"/></svg>`,
  )}`;

export default function ProductCardDemo() {
  return (
    <div className="w-72">
      <ProductCard
        name="Field Jacket"
        price="$148"
        compareAt="$190"
        detail="Waxed cotton, two colors"
        badge="New"
        href="#"
        variants={[
          {
            name: "Olive",
            color: "#556b2f",
            images: [
              { src: photo("#556b2f", "#a3b18a"), alt: "Olive jacket, front" },
              { src: photo("#3a4a20", "#556b2f"), alt: "Olive jacket, back" },
            ],
          },
          {
            name: "Graphite",
            color: "#3f3f46",
            images: [
              { src: photo("#3f3f46", "#a1a1aa"), alt: "Graphite jacket, front" },
              { src: photo("#18181b", "#52525b"), alt: "Graphite jacket, back" },
            ],
          },
        ]}
      />
    </div>
  );
}
