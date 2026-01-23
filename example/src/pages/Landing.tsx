import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/sections/Hero";
import { Roadmap } from "../components/sections/Roadmap";
import { Changelog } from "../components/sections/Changelog";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Roadmap />
        <Changelog />
      </main>
      <Footer />
    </div>
  );
}
