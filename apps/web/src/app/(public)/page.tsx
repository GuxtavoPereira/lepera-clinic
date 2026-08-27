import { Hero } from "@/components/hero";
import { Features } from "@/components/features";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      <Hero />
      <Features />
    </div>
  );
}