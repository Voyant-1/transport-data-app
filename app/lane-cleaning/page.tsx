"use client";

import Navbar from "@/components/Navbar";

export default function LaneCleaningPage() {
  return (
    <div className="page-wrapper">
      <Navbar activeLink="lane-cleaning" />

      <div className="content-area" style={{ maxWidth: "1000px", textAlign: "center" }}>
        <div className="dark-hero">
          <div className="card-emoji">🔧</div>
          <h1 className="hero-title">Lane Cleaning</h1>
          <p className="hero-desc">
            Upload transportation lane data to normalize, validate, and enrich city/state/ZIP combinations
            using postal code databases. Clean and standardize your transactional data for better analytics.
          </p>

          <div className="feature-grid">
            {[
              { icon: "📍", title: "ZIP Validation", desc: "Verify and correct postal codes" },
              { icon: "🏙️", title: "City/State Matching", desc: "Normalize city and state names" },
              { icon: "📊", title: "Lane Enrichment", desc: "Add mileage, region, and geo data" },
              { icon: "🧹", title: "Deduplication", desc: "Merge duplicate lane entries" },
            ].map((feature) => (
              <div key={feature.title} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="coming-soon-badge">
            Coming Soon — Feature Under Development
          </div>
        </div>
      </div>
    </div>
  );
}
