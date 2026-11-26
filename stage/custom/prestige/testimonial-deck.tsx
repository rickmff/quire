import { TestimonialDeck } from "@/components/prestigeui/testimonial-deck";

const items = [
  {
    quote: "We replaced three tools with this one and nobody on the team misses the old setup.",
    name: "Priya Nair",
    role: "Head of Ops",
    company: "Lumen",
    rating: 5,
  },
  {
    quote: "The first product I have used where the defaults are already the right answer.",
    name: "Diego Santos",
    role: "Designer",
    company: "Oddly",
    rating: 5,
  },
  {
    quote: "Setup took an afternoon. The team was using it before the end of the day.",
    name: "Hannah Becker",
    role: "CTO",
    company: "Fieldwork",
    rating: 4,
  },
];

export default function TestimonialDeckDemo() {
  return (
    <div className="w-full max-w-md">
      <TestimonialDeck items={items} />
    </div>
  );
}
