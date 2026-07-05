// ---- "Find My AI" quiz — each answer awards points to tool ids ----
export const QUIZ_QUESTIONS = [
  {
    q: 'What will you mostly use AI for?',
    options: [
      { label: '💻 Writing code & building apps', points: { claude: 3, copilot: 3, deepseek: 2, chatgpt: 1 } },
      { label: '✍️ Writing, emails & everyday help', points: { chatgpt: 3, claude: 2, gemini: 2, llama: 1 } },
      { label: '🔎 Research & fact-finding', points: { perplexity: 3, gemini: 2, grok: 2, chatgpt: 1 } },
      { label: '🎨 Images, art & video', points: { midjourney: 3, gemini: 2, grok: 1, chatgpt: 1 } },
    ],
  },
  {
    q: 'What is your budget?',
    options: [
      { label: '🆓 Free only', points: { deepseek: 3, llama: 3, gemini: 2, chatgpt: 1 } },
      { label: '💵 Up to $20/month', points: { chatgpt: 2, claude: 2, perplexity: 2, copilot: 2 } },
      { label: '💎 Whatever the best costs', points: { claude: 2, chatgpt: 2, grok: 2, midjourney: 2 } },
    ],
  },
  {
    q: 'What matters most to you?',
    options: [
      { label: '🧠 Deepest reasoning & quality', points: { claude: 3, chatgpt: 2, deepseek: 2, grok: 1 } },
      { label: '⚡ Speed of answers', points: { mistral: 3, gemini: 2, copilot: 2, llama: 1 } },
      { label: '📰 Up-to-the-minute info', points: { perplexity: 3, grok: 3, gemini: 1 } },
      { label: '🔓 Open source & privacy', points: { llama: 3, deepseek: 3, mistral: 2 } },
    ],
  },
  {
    q: 'Which ecosystem do you live in?',
    options: [
      { label: '🌐 Google (Gmail, Docs, Android)', points: { gemini: 3, chatgpt: 1 } },
      { label: '🐙 GitHub / VS Code', points: { copilot: 3, claude: 2 } },
      { label: '📱 WhatsApp / Instagram', points: { llama: 3, chatgpt: 1 } },
      { label: '🤷 No preference', points: { chatgpt: 2, claude: 2, perplexity: 1 } },
    ],
  },
]

// ---- Prompt library — copy-paste starters that keep users coming back ----
export const PROMPT_LIBRARY = [
  {
    category: '💼 Work & Career',
    prompts: [
      { title: 'Perfect email rewrite', text: 'Rewrite this email to be professional, warm and 50% shorter. Keep my key points intact: [paste email]', bestWith: 'ChatGPT / Claude' },
      { title: 'Resume booster', text: 'Rewrite these resume bullet points using strong action verbs and measurable results. Target role: [role]. Bullets: [paste]', bestWith: 'Claude' },
      { title: 'Meeting summarizer', text: 'Summarize this meeting transcript into: 1) key decisions, 2) action items with owners, 3) open questions. Transcript: [paste]', bestWith: 'Claude / Gemini' },
    ],
  },
  {
    category: '💻 Coding',
    prompts: [
      { title: 'Code review', text: 'Review this code for bugs, security issues and performance problems. Rate severity and suggest fixes: [paste code]', bestWith: 'Claude / Copilot' },
      { title: 'Explain like a senior dev', text: 'Explain what this code does, line by line, as if mentoring a junior developer. Then list 3 ways to improve it: [paste code]', bestWith: 'Claude' },
      { title: 'Debug detective', text: 'Here is my code and the error I get. Find the root cause, explain WHY it happens, then give the fix. Code: [paste] Error: [paste]', bestWith: 'ChatGPT / DeepSeek' },
    ],
  },
  {
    category: '🔎 Research & Study',
    prompts: [
      { title: 'Deep dive', text: 'Give me a structured deep-dive on [topic]: history, current state, key players, controversies, and what experts predict next. Cite sources.', bestWith: 'Perplexity' },
      { title: 'ELI5 → Expert', text: 'Explain [topic] three times: 1) to a 10-year-old, 2) to a college student, 3) to a domain expert.', bestWith: 'ChatGPT / Gemini' },
      { title: 'Study plan', text: 'Create a 30-day study plan to learn [skill] from scratch, 1 hour per day, with free resources and weekly milestones.', bestWith: 'ChatGPT' },
    ],
  },
  {
    category: '🎨 Creative',
    prompts: [
      { title: 'Cinematic image', text: 'Cinematic photo of [subject], golden hour lighting, shallow depth of field, shot on 85mm lens, hyper-detailed --ar 16:9', bestWith: 'Midjourney' },
      { title: 'Viral hook writer', text: 'Write 10 scroll-stopping hooks for a post about [topic]. Mix curiosity, controversy and value. Under 12 words each.', bestWith: 'ChatGPT / Grok' },
      { title: 'Brand name generator', text: 'Generate 20 brand names for [business idea]: short, memorable, .com-friendly. Group by vibe (playful / premium / techy).', bestWith: 'Claude / ChatGPT' },
    ],
  },
]

// ---- Poll seed data (blended with real localStorage votes) ----
export const POLL_SEED = {
  chatgpt: 412, claude: 386, gemini: 264, copilot: 143,
  perplexity: 121, grok: 98, deepseek: 87, mistral: 41, midjourney: 76, llama: 52,
}
