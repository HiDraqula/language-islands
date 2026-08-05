import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Coffee, Plus, ShoppingBasket } from "lucide-react";
import { Header } from "@/components/header";

const islands = [
  { id: "daily-conversations", title: "Daily conversations", description: "Small talk, greetings and phrases for everyday moments.", count: 24, Icon: Coffee, tint: "#e7e0ca", accent: "#8a6c2e" },
  { id: "grocery-shopping", title: "Grocery shopping", description: "Find products, ask questions and feel at home at the market.", count: 18, Icon: ShoppingBasket, tint: "#dbe8df", accent: "#315f50" },
  { id: "work-and-study", title: "Work & study", description: "Useful language for university, meetings and new opportunities.", count: 31, Icon: BriefcaseBusiness, tint: "#f2dcd4", accent: "#a45c46" },
];

export default function Home() {
  return (
    <main className="shell">
      <Header />
      <div className="page">
        <section className="hero">
          <div>
            <span className="eyebrow">Your language world</span>
            <h1 className="display">Learn in little worlds that make sense.</h1>
            <p>Collect the phrases you actually need, organise them by context, and hear how they sound—one island at a time.</p>
          </div>
          <button className="primary-button" type="button"><Plus size={18} /> New island</button>
        </section>
        <div className="section-heading">
          <h2>Your islands</h2>
          <span className="count">{islands.length} islands · 73 phrases</span>
        </div>
        <section className="island-grid" aria-label="Language islands">
          {islands.map(({ id, title, description, count, Icon, tint, accent }) => (
            <article className="island-card" key={id} style={{ "--tint": tint, "--accent": accent } as React.CSSProperties}>
              <div className="island-icon"><Icon size={22} /></div>
              <h3 className="display">{title}</h3>
              <p>{description}</p>
              <div className="card-footer">
                <span>{count} phrases · English → German</span>
                <Link className="open-pill" href={`/islands/${id}`} aria-label={`Open ${title}`}><ArrowUpRight size={17} /></Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
