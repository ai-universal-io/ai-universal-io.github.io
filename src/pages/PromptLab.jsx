import { useMemo, useState } from 'react'

/*
 * PROMPT LAB — "Grammarly for AI prompts". 100% in-browser:
 * a rule-based prompt linter (8 scored dimensions), an auto-rewriter
 * that upgrades weak prompts, a token/cost estimator across model APIs,
 * a guided builder, and a localStorage prompt vault.
 */

const SAVE_KEY = 'ai-universe-prompt-vault'

// Approximate API pricing per 1M tokens (input / output), USD
const MODEL_PRICES = [
  { model: 'GPT-4o (OpenAI)', input: 2.5, output: 10 },
  { model: 'Claude Sonnet (Anthropic)', input: 3, output: 15 },
  { model: 'Claude Haiku (Anthropic)', input: 0.8, output: 4 },
  { model: 'Gemini 2.5 Flash (Google)', input: 0.15, output: 0.6 },
  { model: 'DeepSeek-V3', input: 0.27, output: 1.1 },
  { model: 'Mistral Large', input: 2, output: 6 },
]

const estimateTokens = (text) => Math.max(1, Math.round(text.trim().length / 4))

const ACTION_VERBS = ['write', 'create', 'generate', 'list', 'explain', 'summarize', 'analyze', 'compare', 'rewrite', 'translate', 'design', 'plan', 'review', 'draft', 'suggest', 'build', 'make', 'convert', 'extract', 'classify', 'improve', 'fix', 'describe', 'outline', 'brainstorm']
const VAGUE_WORDS = ['good', 'nice', 'some', 'stuff', 'things', 'better', 'great', 'cool', 'best', 'etc', 'anything', 'something', 'whatever']
const FORMAT_WORDS = ['list', 'table', 'json', 'markdown', 'bullet', 'steps', 'format', 'sections', 'headings', 'csv', 'numbered', 'paragraph', 'word limit', 'words']

// ---- The linter: returns dimension scores, issues, and grade ----
function analyzePrompt(text) {
  const t = text.toLowerCase()
  const words = text.trim().split(/\s+/).filter(Boolean)
  const issues = []
  const wins = []
  const dims = {}

  if (!words.length) return null

  // 1. Role assignment
  const hasRole = /\b(you are|act as|as an? |imagine you|role of|expert)\b/.test(t)
  dims['Role'] = hasRole ? 100 : 15
  hasRole
    ? wins.push('Assigns the AI a role — answers will be more expert.')
    : issues.push({ sev: 'high', msg: 'No role assigned. Start with "You are an expert [role]" — it measurably improves quality.' })

  // 2. Clear task verb
  const hasVerb = ACTION_VERBS.some((v) => t.includes(v))
  dims['Clear task'] = hasVerb ? 100 : 25
  hasVerb
    ? wins.push('Contains a clear action verb — the AI knows what to do.')
    : issues.push({ sev: 'high', msg: 'No clear action verb (write / list / explain / summarize…). The AI has to guess your intent.' })

  // 3. Specificity (numbers, quantities, concrete details)
  const numbers = (text.match(/\d+/g) || []).length
  const specScore = Math.min(100, 30 + numbers * 25 + (words.length > 20 ? 20 : 0))
  dims['Specificity'] = specScore
  if (specScore < 60) issues.push({ sev: 'med', msg: 'Add concrete numbers: "give 5 examples", "under 200 words", "for a team of 3". Vague asks get vague answers.' })
  else wins.push('Includes concrete quantities — output will match your expectations.')

  // 4. Context
  const hasContext = /\b(context|background|i am|i'm|my |we are|our |for my|working on|given)\b/.test(t) || words.length > 35
  dims['Context'] = hasContext ? 90 : 30
  hasContext
    ? wins.push('Provides context about you / your situation.')
    : issues.push({ sev: 'med', msg: 'No context. Tell the AI who you are and why you need this — "I\'m a beginner", "this is for a client pitch".' })

  // 5. Output format
  const hasFormat = FORMAT_WORDS.some((w) => t.includes(w))
  dims['Format'] = hasFormat ? 100 : 30
  hasFormat
    ? wins.push('Specifies the output format.')
    : issues.push({ sev: 'med', msg: 'No output format. Add "answer as a bullet list / table / step-by-step guide" to control the shape of the response.' })

  // 6. Audience / tone
  const hasTone = /\b(tone|audience|for (a|an) |style|formal|casual|friendly|professional|simple|beginner|expert level|kid|student|manager)\b/.test(t)
  dims['Audience'] = hasTone ? 100 : 40
  hasTone
    ? wins.push('Defines audience or tone.')
    : issues.push({ sev: 'low', msg: 'No audience/tone. "Explain for a beginner" vs "for a CTO" produces very different answers.' })

  // 7. Constraints
  const hasConstraints = /\b(don't|do not|avoid|must|only|never|limit|maximum|at most|without|exclude)\b/.test(t)
  dims['Constraints'] = hasConstraints ? 100 : 45
  hasConstraints
    ? wins.push('Sets constraints — fewer unwanted tangents.')
    : issues.push({ sev: 'low', msg: 'No constraints. Add what to avoid: "no jargon", "don\'t exceed 3 paragraphs".' })

  // 8. Precision (vague-word penalty + length sanity)
  const vagueFound = VAGUE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(t))
  let precision = 100 - vagueFound.length * 18
  if (words.length < 6) { precision -= 30; issues.push({ sev: 'high', msg: `Only ${words.length} words — one-liners get generic answers. Aim for 25–80 words.` }) }
  dims['Precision'] = Math.max(5, precision)
  if (vagueFound.length) issues.push({ sev: 'med', msg: `Vague words found: ${vagueFound.map((w) => `"${w}"`).join(', ')}. Replace with measurable criteria.` })

  const total = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length)
  const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 68 ? 'B' : total >= 55 ? 'C' : 'D'

  return { dims, issues, wins, total, grade, words: words.length }
}

// ---- The auto-rewriter: upgrades a weak prompt with the missing pieces ----
function improvePrompt(text, analysis) {
  if (!analysis) return ''
  const parts = []
  const t = text.toLowerCase()

  if (analysis.dims['Role'] < 50) parts.push('You are an expert [your topic] specialist with 10+ years of experience.')
  parts.push(text.trim().replace(/\s+/g, ' '))
  if (analysis.dims['Context'] < 50) parts.push('Context: I am [who you are] and I need this for [purpose].')
  if (analysis.dims['Specificity'] < 60) parts.push('Be specific: include [N] concrete examples with real numbers where possible.')
  if (analysis.dims['Format'] < 50) parts.push('Format the answer as [a numbered list / a table / step-by-step instructions].')
  if (analysis.dims['Audience'] < 60) parts.push('Write it for [your audience] in a [professional / friendly / simple] tone.')
  if (analysis.dims['Constraints'] < 60) parts.push('Keep it under [200] words and avoid [jargon / generic advice].')
  if (!/\bask me\b/.test(t)) parts.push('If anything is unclear, ask me clarifying questions before answering.')

  return parts.join('\n')
}

const loadVault = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]') } catch { return [] }
}

const SEV_ICON = { high: '🔴', med: '🟡', low: '🔵' }

export default function PromptLab() {
  const [tab, setTab] = useState('analyze')
  const [input, setInput] = useState('')
  const [outputTokens, setOutputTokens] = useState(500)
  const [copied, setCopied] = useState('')
  const [vault, setVault] = useState(loadVault)

  // Builder fields
  const [b, setB] = useState({ role: '', task: '', context: '', audience: '', format: 'a clear numbered list', constraints: '', examples: '' })

  const analysis = useMemo(() => analyzePrompt(input), [input])
  const improved = useMemo(() => (analysis && analysis.total < 90 ? improvePrompt(input, analysis) : ''), [input, analysis])
  const tokens = estimateTokens(input)

  const builtPrompt = useMemo(() => {
    const p = []
    if (b.role) p.push(`You are ${b.role}.`)
    if (b.task) p.push(b.task)
    if (b.context) p.push(`Context: ${b.context}`)
    if (b.audience) p.push(`Write it for ${b.audience}.`)
    if (b.format) p.push(`Format the answer as ${b.format}.`)
    if (b.constraints) p.push(`Constraints: ${b.constraints}`)
    if (b.examples) p.push(`Example of what I want: ${b.examples}`)
    p.push('If anything is unclear, ask me clarifying questions before answering.')
    return p.join('\n')
  }, [b])

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch { /* ignore */ }
  }

  const saveToVault = (text) => {
    if (!text.trim()) return
    const item = { id: String(vault.length + 1) + '-' + text.slice(0, 8), title: text.trim().slice(0, 60), text: text.trim() }
    const next = [item, ...vault].slice(0, 50)
    setVault(next)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const removeFromVault = (id) => {
    const next = vault.filter((v) => v.id !== id)
    setVault(next)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const gradeColor = analysis ? (analysis.total >= 80 ? '#22c55e' : analysis.total >= 55 ? '#facc15' : '#f87171') : '#666'

  return (
    <div className="lab-page">
      <header className="lab-top">
        <a href="#/" className="galaxy-back">← AI Universe</a>
        <span className="galaxy-title">🧪 Prompt Lab</span>
        <span className="lab-sub-hint">Grade → Fix → Estimate cost → Save. All private, in your browser.</span>
      </header>

      <div className="lab-tabs">
        {[['analyze', '🔬 Analyze & Fix'], ['build', '🏗️ Build a prompt'], ['vault', `🗄️ My vault (${vault.length})`]].map(([k, label]) => (
          <button key={k} type="button" className={`filter-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {/* ------------ ANALYZE ------------ */}
      {tab === 'analyze' && (
        <div className="lab-layout">
          <div className="lab-col">
            <label className="cs-field">
              <span>Paste your prompt — it's graded live as you type</span>
              <textarea
                className="lab-textarea"
                rows={7}
                placeholder='e.g. "write something good about my startup"  ← try this weak one'
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>

            {analysis && (
              <>
                <div className="lab-scorebox">
                  <div className="lab-grade" style={{ borderColor: gradeColor, color: gradeColor }}>
                    <span className="lab-grade-letter">{analysis.grade}</span>
                    <span className="lab-grade-num">{analysis.total}/100</span>
                  </div>
                  <div className="lab-dims">
                    {Object.entries(analysis.dims).map(([k, v]) => (
                      <div key={k} className="stat-row">
                        <span className="stat-label">{k}</span>
                        <div className="stat-track"><div className="stat-fill" style={{ width: `${v}%`, background: v >= 70 ? '#22c55e' : v >= 45 ? '#facc15' : '#f87171' }} /></div>
                        <span className="stat-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lab-issues">
                  {analysis.issues.map((i, idx) => (
                    <p key={idx} className="lab-issue">{SEV_ICON[i.sev]} {i.msg}</p>
                  ))}
                  {analysis.wins.map((w, idx) => (
                    <p key={`w${idx}`} className="lab-win">✅ {w}</p>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="lab-col">
            {improved && (
              <div className="lab-improved">
                <div className="lab-improved-head">
                  <h3>✨ Upgraded prompt</h3>
                  <div className="lab-improved-actions">
                    <button type="button" className="btn-more" onClick={() => copy(improved, 'imp')}>{copied === 'imp' ? '✓ Copied' : '📋 Copy'}</button>
                    <button type="button" className="btn-more" onClick={() => saveToVault(improved)}>💾 Save</button>
                  </div>
                </div>
                <pre className="lab-pre">{improved}</pre>
                <p className="lab-note">Fill the [brackets] with your details — they mark what your original prompt was missing.</p>
              </div>
            )}

            {analysis && (
              <div className="lab-cost">
                <h3>💰 What this prompt costs (API)</h3>
                <p className="lab-note">
                  ~<strong>{tokens}</strong> input tokens · expected reply:{' '}
                  <input
                    type="range" min="100" max="4000" step="100"
                    value={outputTokens}
                    onChange={(e) => setOutputTokens(+e.target.value)}
                  /> <strong>{outputTokens}</strong> tokens
                </p>
                <div className="lab-table-wrap">
                  <table className="lab-table">
                    <thead><tr><th>Model</th><th>Per call</th><th>Per 1,000 calls</th></tr></thead>
                    <tbody>
                      {MODEL_PRICES.map((m) => {
                        const cost = (tokens * m.input + outputTokens * m.output) / 1_000_000
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
                <p className="lab-note">Approximate public list prices; tokens estimated at ~4 chars each.</p>
              </div>
            )}

            {!analysis && (
              <div className="lab-empty">
                <p>🔬</p>
                <p>Paste a prompt on the left to get your grade, fixes, an upgraded version, and its API cost across 6 models.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------ BUILD ------------ */}
      {tab === 'build' && (
        <div className="lab-layout">
          <div className="lab-col">
            {[
              ['role', 'The AI should act as…', 'an expert resume writer'],
              ['task', 'What do you want? *', 'Rewrite my resume summary to sound senior-level'],
              ['context', 'Context / background', "I'm a developer with 4 years' experience applying to fintech companies"],
              ['audience', 'Who is it for?', 'recruiters who skim in 10 seconds'],
              ['constraints', 'Rules & limits', 'max 80 words, no buzzwords like "passionate"'],
              ['examples', 'Example of what you want', '"Backend engineer who cut API latency 40%…"'],
            ].map(([key, label, ph]) => (
              <label key={key} className="cs-field">
                <span>{label}</span>
                <textarea
                  className="lab-textarea small"
                  rows={2}
                  placeholder={ph}
                  value={b[key]}
                  onChange={(e) => setB({ ...b, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="cs-field">
              <span>Output format</span>
              <select className="vs-select lab-select" value={b.format} onChange={(e) => setB({ ...b, format: e.target.value })}>
                {['a clear numbered list', 'a table', 'step-by-step instructions', 'short paragraphs with headings', 'valid JSON', 'a single paragraph', 'bullet points'].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="lab-col">
            <div className="lab-improved">
              <div className="lab-improved-head">
                <h3>📝 Your prompt</h3>
                <div className="lab-improved-actions">
                  <button type="button" className="btn-more" onClick={() => copy(builtPrompt, 'built')}>{copied === 'built' ? '✓ Copied' : '📋 Copy'}</button>
                  <button type="button" className="btn-more" onClick={() => saveToVault(builtPrompt)}>💾 Save</button>
                </div>
              </div>
              <pre className="lab-pre">{builtPrompt}</pre>
              {b.task && (() => {
                const a = analyzePrompt(builtPrompt)
                return <p className="lab-note">Live grade: <strong style={{ color: a.total >= 80 ? '#22c55e' : '#facc15' }}>{a.grade} ({a.total}/100)</strong> — built prompts score high by design.</p>
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ------------ VAULT ------------ */}
      {tab === 'vault' && (
        <div className="lab-vault">
          {vault.length === 0 && (
            <div className="lab-empty"><p>🗄️</p><p>No saved prompts yet. Save upgraded or built prompts and they'll live here — private, on your device.</p></div>
          )}
          {vault.map((v) => (
            <div key={v.id} className="lab-vault-item">
              <p className="lab-vault-title">{v.title}…</p>
              <pre className="lab-pre small">{v.text}</pre>
              <div className="lab-improved-actions">
                <button type="button" className="btn-more" onClick={() => copy(v.text, v.id)}>{copied === v.id ? '✓ Copied' : '📋 Copy'}</button>
                <button type="button" className="btn-more" onClick={() => { setInput(v.text); setTab('analyze') }}>🔬 Analyze</button>
                <button type="button" className="btn-more" onClick={() => removeFromVault(v.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
