import { useState } from 'react'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(() => !!localStorage.getItem('ai-universe-subscribed'))

  const submit = (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    // Front-end capture only — wire this to Mailchimp/Beehiiv/ConvertKit for real emails
    try { localStorage.setItem('ai-universe-subscribed', email) } catch { /* ignore */ }
    setDone(true)
  }

  return (
    <section className="newsletter">
      <div className="newsletter-box">
        {done ? (
          <>
            <h3>🎉 You’re in!</h3>
            <p>We’ll ping you when a new frontier model drops. No spam, ever.</p>
          </>
        ) : (
          <>
            <h3>⚡ Never miss a new AI model</h3>
            <p>Weekly 2-minute digest: new models, price drops & the best new prompts.</p>
            <form className="newsletter-form" onSubmit={submit}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <button type="submit" className="btn-primary">Subscribe free</button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
