// Visible FAQ + feature overview. The Q&As mirror the FAQPage JSON-LD in
// index.html — Google requires schema content to be visible on the page.

const FAQS = [
  {
    q: 'Which AI is better, ChatGPT or Claude?',
    a: <>It depends on the task. Claude leads for complex coding, long-document analysis and nuanced writing, while ChatGPT is the strongest all-rounder with voice mode, image generation and the largest ecosystem. Use the <a href="#versus">head-to-head battle tool</a> to compare them stat by stat.</>,
  },
  {
    q: 'Which AI tools are completely free?',
    a: <>DeepSeek and Meta AI (Llama) offer frontier-level capability completely free, and Gemini has a generous free tier. ChatGPT, Claude, Perplexity and Grok all offer capable free plans with usage limits. Filter by <a href="#explore">Open Source</a> to see the free options.</>,
  },
  {
    q: 'How do I write better AI prompts?',
    a: <>Great prompts assign a role, state a clear task, give context, specify the output format, name the audience, and set constraints. The free <a href="#/lab">Prompt Lab</a> grades your prompt across these 8 dimensions and automatically rewrites it into a professional version.</>,
  },
  {
    q: 'What is the best AI for coding?',
    a: <>Claude is widely considered the strongest for real-world software engineering, with GitHub Copilot best for in-editor autocomplete and DeepSeek the best free option for code. Compare all three in the <a href="#explore">Coding category</a>.</>,
  },
  {
    q: 'How much does the ChatGPT or Claude API cost?',
    a: <>API pricing is per million tokens: GPT-4o costs about $2.50 input / $10 output, Claude Sonnet about $3 / $15, Gemini 2.5 Flash about $0.15 / $0.60, and DeepSeek about $0.27 / $1.10. The free <a href="#/dev">cost calculator</a> estimates the exact cost of your prompt across all major models.</>,
  },
  {
    q: "Is there a free online diff checker that doesn't upload my text?",
    a: <>Yes — the <a href="#/dev">AI Universe diff checker</a> runs entirely in your browser with real-time change detection, word-level highlighting, split view, file upload and unchanged-line folding. Nothing is ever uploaded to a server.</>,
  },
  {
    q: 'How do I count tokens in my prompt?',
    a: <>Paste your text into the free <a href="#/dev">token counter</a>: it estimates tokens (about 4 characters each), words, characters and lines locally, and shows what your prompt would cost across GPT-4o, Claude, Gemini, DeepSeek and Mistral APIs.</>,
  },
  {
    q: 'Are these AI tools private? Do you need an account?',
    a: <>Every tool on AI Universe runs 100% in your browser — no signup, no account, no API key, and no data ever leaves your device. Saved prompts and diff sessions are stored only in your own browser's local storage.</>,
  },
]

const FEATURES = [
  { href: '#explore', title: 'AI comparison', desc: 'ChatGPT, Claude, Gemini & 7 more — models, pricing, best use cases' },
  { href: '#/lab', title: 'Prompt grader & fixer', desc: 'Grade any prompt across 8 dimensions, auto-rewrite it professionally' },
  { href: '#/dev', title: 'API cost calculator', desc: 'Estimate prompt cost on GPT-4o, Claude, Gemini, DeepSeek, Mistral' },
  { href: '#/dev', title: 'Token counter', desc: 'Tokens, words, characters & lines — counted locally' },
  { href: '#/dev', title: 'Diff checker', desc: 'Real-time text compare with word-level highlights & file upload' },
  { href: '#/dev', title: 'API code generator', desc: 'Ready-to-run cURL, Python & JavaScript for 5 AI providers' },
  { href: '#cards', title: 'AI cards', desc: 'Personalized collectible cards to download & share' },
  { href: '#quiz', title: 'AI finder quiz', desc: 'Your perfect AI in 30 seconds' },
]

export default function SeoFaq() {
  return (
    <section id="faq" className="seo-section">
      <h2 className="section-title">🧰 Everything on AI Universe — free & private</h2>
      <p className="section-sub">Every tool runs in your browser. No signup, no API keys, no data collection.</p>

      <div className="seo-features">
        {FEATURES.map((f) => (
          <a key={f.title} href={f.href} className="seo-feature">
            <strong>{f.title}</strong>
            <span>{f.desc}</span>
          </a>
        ))}
      </div>

      <h2 className="section-title seo-faq-title">❓ Frequently asked questions</h2>
      <div className="seo-faq">
        {FAQS.map((f) => (
          <details key={f.q} className="seo-faq-item">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
