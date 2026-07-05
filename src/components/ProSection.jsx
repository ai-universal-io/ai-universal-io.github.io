const TIERS = [
  {
    name: 'Explorer',
    price: 'Free',
    period: 'forever',
    tag: null,
    features: [
      'All AI profiles & comparisons',
      '"Find My AI" quiz',
      '12 starter prompts',
      'Standard AI cards',
      'Community poll access',
    ],
    cta: 'You have it →',
    href: '#explore',
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    tag: '🔥 Most popular',
    features: [
      '500+ prompt vault, updated weekly',
      'Gold & Obsidian card editions',
      'New-model alerts before anyone',
      'Personal AI stack consultation',
      'Ad-free experience',
      'Pro badge on your cards',
    ],
    cta: 'Join the waitlist',
    href: '#newsletter-anchor',
  },
  {
    name: 'Creator',
    price: '$19',
    period: '/month',
    tag: 'For teams & influencers',
    features: [
      'Everything in Pro',
      'White-label AI comparison widget',
      'Custom-branded AI cards for your audience',
      'Affiliate revenue sharing',
      '5 team seats',
    ],
    cta: 'Contact us',
    href: 'mailto:hello@ai-universe.example.com?subject=Creator plan',
  },
]

export default function ProSection() {
  return (
    <section id="pro" className="pro">
      <h2 className="section-title">💎 Go <span className="hero-gradient">Pro</span></h2>
      <p className="section-sub">Support AI Universe and unlock the full arsenal.</p>

      <div className="pro-grid">
        {TIERS.map((t) => (
          <div key={t.name} className={`pro-card ${t.tag?.includes('popular') ? 'featured' : ''}`}>
            {t.tag && <span className="pro-tag">{t.tag}</span>}
            <h3>{t.name}</h3>
            <p className="pro-price">
              {t.price}<span>{t.period !== 'forever' ? t.period : ''}</span>
            </p>
            <ul>
              {t.features.map((f) => <li key={f}>✓ {f}</li>)}
            </ul>
            <a className={t.tag?.includes('popular') ? 'btn-primary' : 'btn-ghost'} href={t.href}>
              {t.cta}
            </a>
          </div>
        ))}
      </div>
      <p className="pro-note">Paid tiers are in waitlist mode — join via the newsletter below and get founding-member pricing locked forever.</p>
    </section>
  )
}
