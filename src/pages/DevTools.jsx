import { useEffect, useMemo, useRef, useState } from 'react'

/*
 * DEV TOOLS — utilities for developers building with AI.
 * 100% frontend: nothing is sent anywhere, no API keys required.
 * The code generator only produces snippets (with YOUR_API_KEY placeholders).
 */

const PRICES = [
  { model: 'GPT-4o', input: 2.5, output: 10 },
  { model: 'Claude Sonnet', input: 3, output: 15 },
  { model: 'Claude Haiku', input: 0.8, output: 4 },
  { model: 'Gemini 2.5 Flash', input: 0.15, output: 0.6 },
  { model: 'DeepSeek-V3', input: 0.27, output: 1.1 },
  { model: 'Mistral Large', input: 2, output: 6 },
]

const PROVIDERS = {
  openai: { name: 'OpenAI', defaultModel: 'gpt-4o', url: 'https://api.openai.com/v1/chat/completions' },
  anthropic: { name: 'Anthropic (Claude)', defaultModel: 'claude-sonnet-5', url: 'https://api.anthropic.com/v1/messages' },
  gemini: { name: 'Google Gemini', defaultModel: 'gemini-2.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
  deepseek: { name: 'DeepSeek', defaultModel: 'deepseek-chat', url: 'https://api.deepseek.com/chat/completions' },
  mistral: { name: 'Mistral', defaultModel: 'mistral-large-latest', url: 'https://api.mistral.ai/v1/chat/completions' },
}

const SYSTEM_TEMPLATES = [
  {
    name: '🤖 Customer support bot',
    text: `You are a friendly customer support agent for {COMPANY}. Answer only questions about our products and policies. If you don't know the answer, say so and offer to connect the user with a human. Never invent order details, prices, or policies. Keep replies under 120 words. Always end by asking if there's anything else you can help with.`,
  },
  {
    name: '📦 JSON data extractor',
    text: `You are a data extraction engine. Extract the following fields from the user's text: {FIELD_1}, {FIELD_2}, {FIELD_3}. Respond with ONLY valid JSON matching this schema: {"field_1": string, "field_2": string|null, "field_3": number|null}. Use null for missing values. No markdown, no explanation, no code fences — raw JSON only.`,
  },
  {
    name: '🔍 Code reviewer',
    text: `You are a senior software engineer doing code review. For the code provided: 1) list bugs with severity (critical/major/minor) and line references, 2) flag security issues, 3) suggest performance improvements, 4) note style problems last. Be specific — quote the exact code. If the code is fine, say so briefly; do not invent problems.`,
  },
  {
    name: '📝 Text summarizer',
    text: `You are a summarization engine. Summarize the user's text into: 1) a one-sentence TL;DR, 2) 3-5 key bullet points, 3) any action items or deadlines mentioned. Preserve names, numbers, and dates exactly. Do not add information that is not in the source text. Match the language of the input text.`,
  },
  {
    name: '🏷️ Classifier',
    text: `You are a text classifier. Classify the user's message into exactly one of these categories: {CATEGORY_1}, {CATEGORY_2}, {CATEGORY_3}, OTHER. Respond with ONLY the category name in uppercase. If confidence is below 70%, respond with OTHER. No explanation.`,
  },
  {
    name: '🗄️ SQL assistant',
    text: `You are a SQL expert for {DATABASE_TYPE}. Given a schema and a question, write a correct, efficient query. Rules: use only tables/columns from the provided schema, prefer explicit JOINs, add a LIMIT unless aggregating, and explain the query in one sentence after the code block. If the question can't be answered from the schema, say what's missing.`,
  },
]

// ---- diff engine: LCS core reused at line level and inline (word/char) level ----
function lcsOps(a, b, ka, kb) {
  const n = a.length, m = b.length
  if (n * m > 4_000_000) return null
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { ops.push({ t: 'same', a: i + 1, b: j + 1 }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: 'del', a: i + 1 }); i++ }
    else { ops.push({ t: 'add', b: j + 1 }); j++ }
  }
  while (i < n) { ops.push({ t: 'del', a: i + 1 }); i++ }
  while (j < m) { ops.push({ t: 'add', b: j + 1 }); j++ }
  return ops
}

// Inline diff of a changed line pair at word or character granularity
function inlineDiff(oldLine, newLine, opts) {
  const tok = (s) => (opts.granularity === 'char' ? Array.from(s) : s.split(/(\s+)/).filter((x) => x !== ''))
  const a = tok(oldLine), b = tok(newLine)
  if (a.length * b.length > 80_000) return null
  const key = (t) => (opts.ignoreCase ? t.toLowerCase() : t)
  const ops = lcsOps(a, b, a.map(key), b.map(key))
  if (!ops) return null
  const segL = [], segR = []
  for (const op of ops) {
    if (op.t === 'same') { segL.push({ ch: false, text: a[op.a - 1] }); segR.push({ ch: false, text: b[op.b - 1] }) }
    else if (op.t === 'del') segL.push({ ch: true, text: a[op.a - 1] })
    else segR.push({ ch: true, text: b[op.b - 1] })
  }
  return { segL, segR }
}

// Full diff → aligned rows (for split & unified views), hunks, stats, similarity
function computeDiff(aText, bText, opts) {
  // entries keep original line numbers even when blank lines are filtered out
  const mkEntries = (t) => {
    let e = t.split('\n').map((text, i) => ({ text, n: i + 1 }))
    if (opts.ignoreBlank) e = e.filter((x) => x.text.trim() !== '')
    return e
  }
  const ea = mkEntries(aText), eb = mkEntries(bText)
  const norm = (s) => {
    let t = s
    if (opts.ignoreWs) t = t.trim().replace(/\s+/g, ' ')
    if (opts.ignoreCase) t = t.toLowerCase()
    return t
  }
  const ops = lcsOps(ea, eb, ea.map((x) => norm(x.text)), eb.map((x) => norm(x.text)))
  if (!ops) return { tooBig: true }

  const rows = []
  let k = 0
  while (k < ops.length) {
    if (ops[k].t === 'same') {
      const L = ea[ops[k].a - 1], R = eb[ops[k].b - 1]
      rows.push({ t: 'same', ln: L.n, rn: R.n, l: L.text, r: R.text })
      k++
      continue
    }
    const dels = [], adds = []
    while (k < ops.length && ops[k].t === 'del') dels.push(ops[k++])
    while (k < ops.length && ops[k].t === 'add') adds.push(ops[k++])
    for (let i = 0; i < Math.max(dels.length, adds.length); i++) {
      const d = dels[i] && ea[dels[i].a - 1]
      const ad = adds[i] && eb[adds[i].b - 1]
      if (d && ad) {
        const w = inlineDiff(d.text, ad.text, opts)
        rows.push({ t: 'change', ln: d.n, rn: ad.n, l: d.text, r: ad.text, segL: w?.segL, segR: w?.segR })
      } else if (d) rows.push({ t: 'del', ln: d.n, l: d.text })
      else rows.push({ t: 'add', rn: ad.n, r: ad.text })
    }
  }

  // hunks = groups of consecutive changed rows; mark the first row of each
  const hunks = []
  rows.forEach((r, i) => {
    if (r.t !== 'same' && (i === 0 || rows[i - 1].t === 'same')) {
      r.hunk = hunks.length
      hunks.push(i)
    }
  })

  const added = rows.filter((r) => r.t === 'add').length
  const removed = rows.filter((r) => r.t === 'del').length
  const modified = rows.filter((r) => r.t === 'change').length
  const same = rows.filter((r) => r.t === 'same').length
  const sim = ea.length + eb.length === 0 ? 100 : Math.round((200 * same) / (ea.length + eb.length))
  return { tooBig: false, rows, hunks, added, removed, modified, sim }
}

const DIFF_SESSION_KEY = 'ai-universe-diff-session'
function loadDiffSession() {
  try { return JSON.parse(localStorage.getItem(DIFF_SESSION_KEY) || '{}') } catch { return {} }
}

// ---- code generators ----
function genCode(provider, lang, cfg) {
  const { model, system, user, temperature, maxTokens } = cfg
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')

  if (provider === 'anthropic') {
    if (lang === 'curl') return `curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "${model}",
    "max_tokens": ${maxTokens},
    "temperature": ${temperature},
    "system": "${esc(system)}",
    "messages": [{"role": "user", "content": "${esc(user)}"}]
  }'`
    if (lang === 'python') return `import anthropic  # pip install anthropic

client = anthropic.Anthropic(api_key="YOUR_API_KEY")

message = client.messages.create(
    model="${model}",
    max_tokens=${maxTokens},
    temperature=${temperature},
    system="${esc(system)}",
    messages=[{"role": "user", "content": "${esc(user)}"}],
)
print(message.content[0].text)`
    return `// npm install @anthropic-ai/sdk
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: "YOUR_API_KEY" });

const message = await client.messages.create({
  model: "${model}",
  max_tokens: ${maxTokens},
  temperature: ${temperature},
  system: "${esc(system)}",
  messages: [{ role: "user", content: "${esc(user)}" }],
});
console.log(message.content[0].text);`
  }

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    if (lang === 'curl') return `curl "${url}" \\
  -H "x-goog-api-key: $YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "system_instruction": {"parts": [{"text": "${esc(system)}"}]},
    "contents": [{"parts": [{"text": "${esc(user)}"}]}],
    "generationConfig": {"temperature": ${temperature}, "maxOutputTokens": ${maxTokens}}
  }'`
    if (lang === 'python') return `import requests

resp = requests.post(
    "${url}",
    headers={"x-goog-api-key": "YOUR_API_KEY"},
    json={
        "system_instruction": {"parts": [{"text": "${esc(system)}"}]},
        "contents": [{"parts": [{"text": "${esc(user)}"}]}],
        "generationConfig": {"temperature": ${temperature}, "maxOutputTokens": ${maxTokens}},
    },
)
print(resp.json()["candidates"][0]["content"]["parts"][0]["text"])`
    return `const resp = await fetch(
  "${url}",
  {
    method: "POST",
    headers: { "x-goog-api-key": "YOUR_API_KEY", "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "${esc(system)}" }] },
      contents: [{ parts: [{ text: "${esc(user)}" }] }],
      generationConfig: { temperature: ${temperature}, maxOutputTokens: ${maxTokens} },
    }),
  }
);
const data = await resp.json();
console.log(data.candidates[0].content.parts[0].text);`
  }

  // OpenAI-compatible providers (OpenAI, DeepSeek, Mistral)
  const base = PROVIDERS[provider].url
  if (lang === 'curl') return `curl ${base} \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "temperature": ${temperature},
    "max_tokens": ${maxTokens},
    "messages": [
      {"role": "system", "content": "${esc(system)}"},
      {"role": "user", "content": "${esc(user)}"}
    ]
  }'`
  if (lang === 'python') return `import requests

resp = requests.post(
    "${base}",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "model": "${model}",
        "temperature": ${temperature},
        "max_tokens": ${maxTokens},
        "messages": [
            {"role": "system", "content": "${esc(system)}"},
            {"role": "user", "content": "${esc(user)}"},
        ],
    },
)
print(resp.json()["choices"][0]["message"]["content"])`
  return `const resp = await fetch("${base}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "${model}",
    temperature: ${temperature},
    max_tokens: ${maxTokens},
    messages: [
      { role: "system", content: "${esc(system)}" },
      { role: "user", content: "${esc(user)}" },
    ],
  }),
});
const data = await resp.json();
console.log(data.choices[0].message.content);`
}

export default function DevTools() {
  const [tab, setTab] = useState('code')
  const [copied, setCopied] = useState('')

  // code generator state
  const [provider, setProvider] = useState('anthropic')
  const [lang, setLang] = useState('javascript')
  const [model, setModel] = useState(PROVIDERS.anthropic.defaultModel)
  const [system, setSystem] = useState('You are a helpful assistant.')
  const [user, setUser] = useState('Hello! Explain what an API is in one paragraph.')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)

  // token counter state
  const [countText, setCountText] = useState('')
  const [outTokens, setOutTokens] = useState(500)

  // json tool state
  const [jsonIn, setJsonIn] = useState('')
  const [jsonOut, setJsonOut] = useState('')
  const [jsonMsg, setJsonMsg] = useState(null)

  // diff checker state (restored from the last session)
  const [diffA, setDiffA] = useState(() => loadDiffSession().a || '')
  const [diffB, setDiffB] = useState(() => loadDiffSession().b || '')
  const [viewMode, setViewMode] = useState(() => loadDiffSession().o?.viewMode || 'unified')
  const [granularity, setGranularity] = useState(() => loadDiffSession().o?.granularity || 'word')
  const [ignoreCase, setIgnoreCase] = useState(() => !!loadDiffSession().o?.ignoreCase)
  const [ignoreWs, setIgnoreWs] = useState(() => !!loadDiffSession().o?.ignoreWs)
  const [ignoreBlank, setIgnoreBlank] = useState(() => !!loadDiffSession().o?.ignoreBlank)
  const [wrap, setWrap] = useState(() => !!loadDiffSession().o?.wrap)
  const [collapseSame, setCollapseSame] = useState(() => loadDiffSession().o?.collapseSame !== false)
  const [expandedFolds, setExpandedFolds] = useState(() => new Set())
  const [curHunk, setCurHunk] = useState(0)
  const [feed, setFeed] = useState([])
  const diffViewRef = useRef(null)
  const prevStatsRef = useRef(null)
  const fileARef = useRef(null)
  const fileBRef = useRef(null)

  const diff = useMemo(() => {
    if (!diffA && !diffB) return null
    return computeDiff(diffA, diffB, { granularity, ignoreCase, ignoreWs, ignoreBlank })
  }, [diffA, diffB, granularity, ignoreCase, ignoreWs, ignoreBlank])

  // persist the diff session (texts capped at 200KB each) so a reload restores it
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DIFF_SESSION_KEY, JSON.stringify({
          a: diffA.slice(0, 200_000),
          b: diffB.slice(0, 200_000),
          o: { viewMode, granularity, ignoreCase, ignoreWs, ignoreBlank, wrap, collapseSame },
        }))
      } catch { /* storage full or unavailable */ }
    }, 400)
    return () => clearTimeout(t)
  }, [diffA, diffB, viewMode, granularity, ignoreCase, ignoreWs, ignoreBlank, wrap, collapseSame])

  // collapse folds back when the inputs change
  useEffect(() => { setExpandedFolds(new Set()) }, [diffA, diffB])

  // fold long runs of unchanged lines, keeping 3 lines of context around changes
  const displayRows = useMemo(() => {
    if (!diff || diff.tooBig) return []
    if (!collapseSame) return diff.rows
    const CTX = 3
    const rows = diff.rows
    const out = []
    let i = 0, foldId = 0
    while (i < rows.length) {
      if (rows[i].t !== 'same') { out.push(rows[i]); i++; continue }
      let j = i
      while (j < rows.length && rows[j].t === 'same') j++
      const run = j - i
      const head = i === 0 ? 0 : CTX
      const tail = j === rows.length ? 0 : CTX
      if (run > head + tail + 4) {
        for (let k2 = 0; k2 < head; k2++) out.push(rows[i + k2])
        const id = foldId++
        if (expandedFolds.has(id)) {
          for (let k2 = head; k2 < run - tail; k2++) out.push(rows[i + k2])
        } else {
          out.push({ t: 'fold', count: run - head - tail, id })
        }
        for (let k2 = run - tail; k2 < run; k2++) out.push(rows[i + k2])
      } else {
        for (let k2 = 0; k2 < run; k2++) out.push(rows[i + k2])
      }
      i = j
    }
    return out
  }, [diff, collapseSame, expandedFolds])

  const expandFold = (id) => setExpandedFolds((s) => new Set(s).add(id))

  const readFileInto = (file, side) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => (side === 'a' ? setDiffA(String(r.result)) : setDiffB(String(r.result)))
    r.readAsText(file)
  }
  const onDrop = (side) => (e) => {
    e.preventDefault()
    readFileInto(e.dataTransfer.files?.[0], side)
  }

  // ⚡ real-time change detection feed — logs every edit the moment it lands
  useEffect(() => {
    if (!diff || diff.tooBig) { prevStatsRef.current = null; return }
    const s = { added: diff.added, removed: diff.removed, modified: diff.modified, sim: diff.sim }
    const p = prevStatsRef.current
    prevStatsRef.current = s
    if (!p) return
    const parts = []
    if (s.added !== p.added) parts.push(`${s.added > p.added ? '+' : ''}${s.added - p.added} added line${Math.abs(s.added - p.added) > 1 ? 's' : ''}`)
    if (s.removed !== p.removed) parts.push(`${s.removed > p.removed ? '+' : ''}${s.removed - p.removed} removed line${Math.abs(s.removed - p.removed) > 1 ? 's' : ''}`)
    if (s.modified !== p.modified) parts.push(`${s.modified > p.modified ? '+' : ''}${s.modified - p.modified} modified line${Math.abs(s.modified - p.modified) > 1 ? 's' : ''}`)
    if (!parts.length) return
    const time = new Date().toLocaleTimeString()
    setFeed((f) => [{ time, text: parts.join(', '), sim: s.sim }, ...f].slice(0, 6))
  }, [diff])

  const jumpHunk = (dir) => {
    if (!diff?.hunks?.length) return
    const H = diff.hunks.length
    const next = ((curHunk + dir) % H + H) % H
    setCurHunk(next)
    diffViewRef.current?.querySelector(`[data-hunk="${next}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const unifiedDiffText = () => {
    if (!diff || diff.tooBig) return ''
    const out = []
    for (const r of diff.rows) {
      if (r.t === 'same') out.push(' ' + r.l)
      else if (r.t === 'del') out.push('-' + r.l)
      else if (r.t === 'add') out.push('+' + r.r)
      else { out.push('-' + r.l); out.push('+' + r.r) }
    }
    return out.join('\n')
  }

  const downloadDiff = () => {
    const blob = new Blob([unifiedDiffText()], { type: 'text/plain' })
    const aEl = document.createElement('a')
    aEl.href = URL.createObjectURL(blob)
    aEl.download = 'changes.diff'
    aEl.click()
    URL.revokeObjectURL(aEl.href)
  }

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch { /* ignore */ }
  }

  const pickProvider = (p) => {
    setProvider(p)
    setModel(PROVIDERS[p].defaultModel)
  }

  const code = useMemo(
    () => genCode(provider, lang, { model, system, user, temperature, maxTokens }),
    [provider, lang, model, system, user, temperature, maxTokens],
  )

  const tokens = Math.max(0, Math.round(countText.trim().length / 4))
  const words = countText.trim() ? countText.trim().split(/\s+/).length : 0

  const runJson = (mode) => {
    try {
      const parsed = JSON.parse(jsonIn)
      const out = mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)
      setJsonOut(out)
      const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0
      setJsonMsg({ ok: true, text: `✓ Valid JSON — ${Array.isArray(parsed) ? `array of ${parsed.length}` : `${keys} top-level keys`}, ${out.length.toLocaleString()} chars ${mode === 'minify' ? 'minified' : 'formatted'}` })
    } catch (e) {
      setJsonOut('')
      const m = /position (\d+)/.exec(e.message)
      let hint = ''
      if (m) {
        const pos = +m[1]
        const before = jsonIn.slice(0, pos)
        const line = before.split('\n').length
        hint = ` (around line ${line})`
      }
      setJsonMsg({ ok: false, text: `✕ ${e.message}${hint}` })
    }
  }

  return (
    <div className="lab-page">
      <header className="lab-top">
        <a href="#/" className="galaxy-back">← AI Universe</a>
        <span className="galaxy-title">🛠️ Dev Tools</span>
        <span className="lab-sub-hint">For builders. Everything runs locally — nothing leaves your browser, no API key needed.</span>
      </header>

      <div className="lab-tabs">
        {[['code', '🔌 API code generator'], ['tokens', '🧮 Token & cost counter'], ['json', '🧾 JSON validator'], ['diff', '🔀 Diff checker'], ['templates', '📋 System prompts']].map(([k, label]) => (
          <button key={k} type="button" className={`filter-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------- API CODE GENERATOR ---------- */}
      {tab === 'code' && (
        <div className="lab-layout">
          <div className="lab-col">
            <label className="cs-field">
              <span>Provider</span>
              <div className="dev-pills">
                {Object.entries(PROVIDERS).map(([k, p]) => (
                  <button key={k} type="button" className={`filter-btn ${provider === k ? 'active' : ''}`} onClick={() => pickProvider(k)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </label>
            <label className="cs-field">
              <span>Model</span>
              <input className="dev-input" value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
            <label className="cs-field">
              <span>System prompt</span>
              <textarea className="lab-textarea small" rows={3} value={system} onChange={(e) => setSystem(e.target.value)} />
            </label>
            <label className="cs-field">
              <span>User message</span>
              <textarea className="lab-textarea small" rows={3} value={user} onChange={(e) => setUser(e.target.value)} />
            </label>
            <div className="dev-sliders">
              <label className="cs-field">
                <span>Temperature: <strong>{temperature}</strong></span>
                <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(+e.target.value)} />
              </label>
              <label className="cs-field">
                <span>Max tokens: <strong>{maxTokens}</strong></span>
                <input type="range" min="128" max="8192" step="128" value={maxTokens} onChange={(e) => setMaxTokens(+e.target.value)} />
              </label>
            </div>
          </div>

          <div className="lab-col">
            <div className="lab-improved dev-code">
              <div className="lab-improved-head">
                <div className="dev-pills">
                  {[['curl', 'cURL'], ['python', 'Python'], ['javascript', 'JavaScript']].map(([k, label]) => (
                    <button key={k} type="button" className={`filter-btn ${lang === k ? 'active' : ''}`} onClick={() => setLang(k)}>
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-more" onClick={() => copy(code, 'code')}>
                  {copied === 'code' ? '✓ Copied' : '📋 Copy code'}
                </button>
              </div>
              <pre className="lab-pre dev-pre">{code}</pre>
              <p className="lab-note">Replace <code>YOUR_API_KEY</code> with your key from the provider's console. This page never asks for or stores keys.</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------- TOKEN COUNTER ---------- */}
      {tab === 'tokens' && (
        <div className="lab-layout">
          <div className="lab-col">
            <label className="cs-field">
              <span>Paste any text — counted locally, never uploaded</span>
              <textarea className="lab-textarea" rows={12} placeholder="Paste your prompt, document, or code…" value={countText} onChange={(e) => setCountText(e.target.value)} />
            </label>
          </div>
          <div className="lab-col">
            <div className="lab-cost">
              <h3>🧮 Counts</h3>
              <div className="dev-stats">
                <div className="dev-stat"><strong>{tokens.toLocaleString()}</strong><span>~tokens</span></div>
                <div className="dev-stat"><strong>{words.toLocaleString()}</strong><span>words</span></div>
                <div className="dev-stat"><strong>{countText.length.toLocaleString()}</strong><span>chars</span></div>
                <div className="dev-stat"><strong>{countText ? countText.split('\n').length : 0}</strong><span>lines</span></div>
              </div>
              <p className="lab-note">Estimated at ~4 characters per token (typical for English; code and other languages vary ±20%).</p>
            </div>
            <div className="lab-cost">
              <h3>💰 Cost if sent as input</h3>
              <p className="lab-note">
                Expected reply:{' '}
                <input type="range" min="100" max="4000" step="100" value={outTokens} onChange={(e) => setOutTokens(+e.target.value)} />{' '}
                <strong>{outTokens}</strong> tokens
              </p>
              <div className="lab-table-wrap">
                <table className="lab-table">
                  <thead><tr><th>Model</th><th>Per call</th><th>Per 1,000 calls</th></tr></thead>
                  <tbody>
                    {PRICES.map((m) => {
                      const cost = (tokens * m.input + outTokens * m.output) / 1_000_000
                      return (
                        <tr key={m.model}>
                          <td>{m.model}</td>
                          <td>${cost < 0.001 ? cost.toFixed(5) : cost.toFixed(4)}</td>
                          <td>${(cost * 1000).toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- JSON VALIDATOR ---------- */}
      {tab === 'json' && (
        <div className="lab-layout">
          <div className="lab-col">
            <label className="cs-field">
              <span>Input JSON (e.g. an LLM's raw response)</span>
              <textarea className="lab-textarea dev-mono" rows={14} placeholder='{"name": "test", "items": [1, 2, 3]}' value={jsonIn} onChange={(e) => setJsonIn(e.target.value)} />
            </label>
            <div className="cs-actions">
              <button type="button" className="btn-primary cs-btn" onClick={() => runJson('pretty')}>✓ Validate & format</button>
              <button type="button" className="btn-ghost cs-btn" onClick={() => runJson('minify')}>Minify</button>
            </div>
            {jsonMsg && <p className={jsonMsg.ok ? 'lab-win' : 'lab-issue'}>{jsonMsg.text}</p>}
          </div>
          <div className="lab-col">
            {jsonOut ? (
              <div className="lab-improved">
                <div className="lab-improved-head">
                  <h3>Output</h3>
                  <button type="button" className="btn-more" onClick={() => copy(jsonOut, 'json')}>{copied === 'json' ? '✓ Copied' : '📋 Copy'}</button>
                </div>
                <pre className="lab-pre dev-pre">{jsonOut}</pre>
              </div>
            ) : (
              <div className="lab-empty"><p>🧾</p><p>Validate LLM JSON output, find the exact line of a syntax error, and format or minify — without pasting your data into some random website.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ---------- DIFF CHECKER ---------- */}
      {tab === 'diff' && (
        <div className="diff-wrap">
          <div className="diff-inputs">
            <label className="cs-field">
              <span>
                Original
                <button type="button" className="diff-file-btn" onClick={() => fileARef.current?.click()}>📁 Open file</button>
                <input ref={fileARef} type="file" hidden onChange={(e) => { readFileInto(e.target.files?.[0], 'a'); e.target.value = '' }} />
              </span>
              <textarea
                className="lab-textarea dev-mono" rows={10}
                placeholder="Paste the old version or drag & drop a file here…"
                value={diffA}
                onChange={(e) => setDiffA(e.target.value)}
                onDrop={onDrop('a')} onDragOver={(e) => e.preventDefault()}
              />
            </label>
            <div className="diff-mid">
              <button type="button" className="btn-more" title="Swap sides" onClick={() => { setDiffA(diffB); setDiffB(diffA) }}>⇄</button>
            </div>
            <label className="cs-field">
              <span>
                Changed
                <button type="button" className="diff-file-btn" onClick={() => fileBRef.current?.click()}>📁 Open file</button>
                <input ref={fileBRef} type="file" hidden onChange={(e) => { readFileInto(e.target.files?.[0], 'b'); e.target.value = '' }} />
              </span>
              <textarea
                className="lab-textarea dev-mono" rows={10}
                placeholder="Paste the new version or drag & drop a file here…"
                value={diffB}
                onChange={(e) => setDiffB(e.target.value)}
                onDrop={onDrop('b')} onDragOver={(e) => e.preventDefault()}
              />
            </label>
          </div>

          {!diff && (
            <div className="lab-empty"><p>🔀</p><p>Compare two versions of anything — prompts, configs, code, model outputs. Changed words are highlighted inside changed lines. Compared locally, never uploaded.</p></div>
          )}

          {diff?.tooBig && (
            <p className="lab-issue">🔴 Input too large to diff in the browser (&gt;~2,000 lines per side). Split it into smaller chunks.</p>
          )}

          {diff && !diff.tooBig && (
            <>
              <div className="diff-bar">
                <div className="dev-pills">
                  {[['unified', '☰ Unified'], ['split', '◫ Split']].map(([k, label]) => (
                    <button key={k} type="button" className={`filter-btn ${viewMode === k ? 'active' : ''}`} onClick={() => setViewMode(k)}>{label}</button>
                  ))}
                </div>
                <div className="dev-pills">
                  {[['word', 'Word'], ['char', 'Character']].map(([k, label]) => (
                    <button key={k} type="button" className={`filter-btn ${granularity === k ? 'active' : ''}`} onClick={() => setGranularity(k)}>{label}</button>
                  ))}
                </div>
                <label className="diff-check"><input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} /> Ignore case</label>
                <label className="diff-check"><input type="checkbox" checked={ignoreWs} onChange={(e) => setIgnoreWs(e.target.checked)} /> Ignore whitespace</label>
                <label className="diff-check"><input type="checkbox" checked={ignoreBlank} onChange={(e) => setIgnoreBlank(e.target.checked)} /> Ignore blank lines</label>
                <label className="diff-check"><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap lines</label>
                <label className="diff-check"><input type="checkbox" checked={collapseSame} onChange={(e) => setCollapseSame(e.target.checked)} /> Collapse unchanged</label>
                <div className="diff-simwrap" title="Similarity between the two texts">
                  <div className="diff-simbar"><span style={{ width: `${diff.sim}%`, background: diff.sim > 70 ? '#4ade80' : diff.sim > 40 ? '#facc15' : '#f87171' }} /></div>
                  <span className="diff-simtext">{diff.sim}% similar</span>
                </div>
              </div>

              <div className="diff-bar">
                <h3 className="diff-stats-h">
                  <span className="diff-stat add">+{diff.added}</span>{' '}
                  <span className="diff-stat del">-{diff.removed}</span>{' '}
                  <span className="diff-stat mod">~{diff.modified}</span>{' '}
                  {diff.added + diff.removed + diff.modified === 0 ? 'identical ✓' : ''}
                </h3>
                {diff.hunks.length > 0 && (
                  <div className="diff-nav">
                    <button type="button" className="btn-more" onClick={() => jumpHunk(-1)}>▲ Prev</button>
                    <span>change {Math.min(curHunk + 1, diff.hunks.length)} / {diff.hunks.length}</span>
                    <button type="button" className="btn-more" onClick={() => jumpHunk(1)}>▼ Next</button>
                  </div>
                )}
                <div className="lab-improved-actions">
                  <button type="button" className="btn-more" onClick={() => copy(unifiedDiffText(), 'diff')}>{copied === 'diff' ? '✓ Copied' : '📋 Copy diff'}</button>
                  <button type="button" className="btn-more" onClick={downloadDiff}>⬇️ .diff file</button>
                </div>
              </div>

              <div className="diff-main">
                <div className="lab-improved diff-result" ref={diffViewRef}>
                  {viewMode === 'unified' ? (
                    <div className={`diff-view ${wrap ? 'wrap' : ''}`}>
                      {displayRows.map((r, idx) => {
                        if (r.t === 'fold') {
                          return (
                            <button key={`f${r.id}`} type="button" className="diff-fold" onClick={() => expandFold(r.id)}>
                              ⋯ {r.count} unchanged lines — click to expand ⋯
                            </button>
                          )
                        }
                        const hunkAttr = r.hunk !== undefined ? { 'data-hunk': r.hunk } : {}
                        if (r.t === 'change') {
                          return (
                            <div key={idx} {...hunkAttr}>
                              <div className="diff-line del">
                                <span className="diff-gut">{r.ln}</span><span className="diff-gut" />
                                <span className="diff-sign">-</span>
                                <span className="diff-text">{r.segL ? r.segL.map((s, si) => s.ch ? <mark key={si} className="del">{s.text}</mark> : <span key={si}>{s.text}</span>) : r.l}</span>
                              </div>
                              <div className="diff-line add">
                                <span className="diff-gut" /><span className="diff-gut">{r.rn}</span>
                                <span className="diff-sign">+</span>
                                <span className="diff-text">{r.segR ? r.segR.map((s, si) => s.ch ? <mark key={si} className="add">{s.text}</mark> : <span key={si}>{s.text}</span>) : r.r}</span>
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={idx} className={`diff-line ${r.t}`} {...hunkAttr}>
                            <span className="diff-gut">{r.ln || ''}</span>
                            <span className="diff-gut">{r.rn || ''}</span>
                            <span className="diff-sign">{r.t === 'add' ? '+' : r.t === 'del' ? '-' : ' '}</span>
                            <span className="diff-text">{(r.t === 'add' ? r.r : r.l) || ' '}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={`diff-view ${wrap ? 'wrap' : ''}`}>
                      {displayRows.map((r, idx) => {
                        if (r.t === 'fold') {
                          return (
                            <button key={`f${r.id}`} type="button" className="diff-fold" onClick={() => expandFold(r.id)}>
                              ⋯ {r.count} unchanged lines — click to expand ⋯
                            </button>
                          )
                        }
                        const hunkAttr = r.hunk !== undefined ? { 'data-hunk': r.hunk } : {}
                        return (
                          <div key={idx} className="sd-row" {...hunkAttr}>
                            <span className="diff-gut">{r.ln || ''}</span>
                            <span className={`sd-cell ${r.l !== undefined ? (r.t === 'same' ? '' : 'del') : 'empty'}`}>
                              {r.segL ? r.segL.map((s, si) => s.ch ? <mark key={si} className="del">{s.text}</mark> : <span key={si}>{s.text}</span>) : (r.l ?? '')}
                            </span>
                            <span className="diff-gut">{r.rn || ''}</span>
                            <span className={`sd-cell ${r.r !== undefined ? (r.t === 'same' ? '' : 'add') : 'empty'}`}>
                              {r.segR ? r.segR.map((s, si) => s.ch ? <mark key={si} className="add">{s.text}</mark> : <span key={si}>{s.text}</span>) : (r.r ?? '')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="diff-feed">
                  <h4>⚡ Live detection</h4>
                  {feed.length === 0 && <p className="lab-note">Edit either side — every change is detected and logged here the instant you type it.</p>}
                  {feed.map((f, i) => (
                    <p key={`${f.time}-${i}`} className={`diff-feed-item ${i === 0 ? 'fresh' : ''}`}>
                      <span className="diff-feed-time">{f.time}</span>
                      {f.text} <span className="diff-feed-sim">· {f.sim}%</span>
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- SYSTEM PROMPT TEMPLATES ---------- */}
      {tab === 'templates' && (
        <div className="lab-vault">
          <p className="section-sub" style={{ marginBottom: '0.5rem' }}>
            Production-ready system prompts. Replace the {'{PLACEHOLDERS}'} and ship.
          </p>
          {SYSTEM_TEMPLATES.map((tpl) => (
            <div key={tpl.name} className="lab-vault-item">
              <div className="lab-improved-head">
                <p className="lab-vault-title">{tpl.name}</p>
                <button type="button" className="btn-more" onClick={() => copy(tpl.text, tpl.name)}>
                  {copied === tpl.name ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <pre className="lab-pre small" style={{ maxHeight: 'none' }}>{tpl.text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
