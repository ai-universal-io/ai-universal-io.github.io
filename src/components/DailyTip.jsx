const TIPS = [
  'Ask any AI to "think step by step" — accuracy jumps massively on hard problems.',
  'Claude reads entire books in one go — paste a whole PDF and ask for a summary.',
  'In ChatGPT, start with "You are an expert [role]" for dramatically better answers.',
  'Perplexity Pro mode asks YOU clarifying questions before answering. Use it for research.',
  'Gemini can watch YouTube videos — paste a link and ask for key takeaways.',
  'Tell the AI your audience ("explain for a 5th grader" / "for a CFO") — tone transforms.',
  'DeepSeek R1 shows its full reasoning chain — great for learning how to think.',
  'Ask for 3 different answers, then ask the AI to critique and merge them. Instant quality boost.',
  'Midjourney tip: add "--ar 9:16" for perfect Instagram story ratio.',
  'End prompts with "Ask me clarifying questions first" — the #1 underused trick.',
  'Copilot works best when you write a comment describing the function BEFORE coding it.',
  'Grok is best for "what is happening RIGHT NOW" questions — it reads live X posts.',
  'Paste your resume + a job description and ask Claude to tailor one to the other.',
  'Use AI to argue AGAINST your idea before a big decision. It finds holes you missed.',
]

export default function DailyTip() {
  const day = Math.floor(Date.now() / 86400000)
  const tip = TIPS[day % TIPS.length]

  return (
    <div className="daily-tip">
      <span className="daily-tip-badge">💡 Tip of the day</span>
      <p>{tip}</p>
      <span className="daily-tip-next">New tip every 24h — come back tomorrow!</span>
    </div>
  )
}
