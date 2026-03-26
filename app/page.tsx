import Image from "next/image";
import Link from "next/link";

const CARDS = [
  {
    href: "/transport-data",
    icon: "/images/Carrier_Search2.png",
    alt: "Carrier Search",
    title: "Carrier Search",
    description: "Search FMCSA carrier data by name, DOT#, location, or ZIP radius",
  },
  {
    href: "/carrier-safety",
    icon: null,
    emoji: "🛡️",
    alt: "Carrier Safety Check",
    title: "Carrier Safety Check",
    description: "Bulk upload carriers to get safety scores, crash data, and OOS rates",
  },
  {
    href: "/lane-search",
    icon: null,
    emoji: "🗺️",
    alt: "Lane Search",
    title: "Lane Search",
    description: "Find carriers operating between origin and destination locations",
  },
  {
    href: "/lane-cleaning",
    icon: null,
    emoji: "🔧",
    alt: "Lane Cleaning",
    title: "Lane Cleaning",
    description: "Normalize and validate transportation lane data (Coming Soon)",
    comingSoon: true,
  },
];

export default function Home() {
  return (
    <div className="page-container">
      <div className="logo-container">
        <Image
          src="/images/Voyant_Logo_White1.png"
          alt="Voyant Logo"
          width={450}
          height={150}
          className="logo"
          priority
        />
      </div>

      <div className="card-grid">
        {CARDS.map((card) => (
          <div key={card.href} className={`card${card.comingSoon ? " coming-soon-card" : ""}`}>
            <Link href={card.href}>
              <div className="card-content">
                {card.icon ? (
                  <Image
                    src={card.icon}
                    alt={card.alt}
                    width={90}
                    height={90}
                    className="card-icon"
                  />
                ) : (
                  <div className="card-emoji">
                    {card.emoji}
                  </div>
                )}
                <h2>{card.title}</h2>
                <p className="card-description">
                  {card.description}
                </p>
                {card.comingSoon && (
                  <span className="card-coming-soon">
                    Coming Soon
                  </span>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
