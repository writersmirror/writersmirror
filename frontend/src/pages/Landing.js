import React from "react";
import { Link } from "react-router-dom";
import { Book, Dice5, PenLine, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <div className="drafting-grid">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-24">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter uppercase font-heading text-ink mb-6">
            Plotto Navigator
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-ink-muted font-body mb-8 max-w-2xl">
            Explore 1,852 plot conflicts from William Wallace Cook's Plotto (1928).
            Browse by category, build stories with the A-B-C clause system, and
            navigate parent and child conflicts to craft your narrative.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/browse"
              data-testid="landing-browse"
              className="flex items-center gap-2 px-6 py-3 bg-terra text-white font-body font-medium rounded-sm hover:bg-terra/90 transition-colors"
            >
              <Book size={18} /> Browse Conflicts
            </Link>
            <Link
              to="/dice"
              data-testid="landing-dice"
              className="flex items-center gap-2 px-6 py-3 border border-line-strong text-ink font-body font-medium rounded-sm hover:border-terra hover:text-terra transition-colors"
            >
              <Dice5 size={18} /> Roll the Dice
            </Link>
            <Link
              to="/builder"
              data-testid="landing-builder"
              className="flex items-center gap-2 px-6 py-3 border border-line-strong text-ink font-body font-medium rounded-sm hover:border-terra hover:text-terra transition-colors"
            >
              <PenLine size={18} /> Story Studio
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Book}
          title="Browse 1,852 Conflicts"
          description="Search and filter through Cook's complete plot system by category, classification, and masterplot heading."
          link="/browse"
          testId="feature-browse"
        />
        <FeatureCard
          icon={PenLine}
          title="Build Stories"
          description="Use the A-B-C clause system to construct your plot step by step, with parent and child conflict navigation."
          link="/builder"
          testId="feature-builder"
        />
        <FeatureCard
          icon={Dice5}
          title="Roll the Dice"
          description="Get a random plot suggestion with a coherent opening conflict. Send it straight to the Story Studio."
          link="/dice"
          testId="feature-dice"
        />
      </div>

      {/* About section */}
      <div className="max-w-3xl mx-auto px-6 py-12 border-t border-line">
        <h2 className="text-xl font-heading text-ink mb-4">About Plotto</h2>
        <p className="text-sm leading-relaxed text-ink-muted font-body mb-3">
          Plotto: The Master Book of All Plots was published in 1928 by William Wallace Cook,
          a prolific writer of pulp fiction. It is a combinatorial system for generating plot
          structures: a Masterplot combines an A clause (protagonist), a B clause (predicate),
          and a C clause (conclusion). Conflicts are the building blocks — numbered situations
          that can be chained together via lead-ups (past) and carry-ons (future).
        </p>
        <p className="text-sm leading-relaxed text-ink-muted font-body">
          This tool makes that system navigable and approachable for modern writers.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, link, testId }) {
  return (
    <Link
      to={link}
      data-testid={testId}
      className="bg-surface border border-line-strong rounded-sm shadow-sm hover:shadow-md hover:border-terra hover:-translate-y-0.5 transition-all p-6 group"
    >
      <Icon size={24} className="text-terra mb-3" />
      <h3 className="text-sm font-heading uppercase tracking-wide text-ink mb-2">{title}</h3>
      <p className="text-xs leading-relaxed text-ink-muted mb-3">{description}</p>
      <span className="text-xs text-terra group-hover:underline flex items-center gap-1">
        Explore <ArrowRight size={12} />
      </span>
    </Link>
  );
}
