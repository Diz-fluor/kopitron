import { LEGAL, LEGAL_DATE } from '../data/legal.js'

/* Условия и конфиденциальность: текст из src/data/legal.js */
export default function LegalBody({ doc }) {
  const d = LEGAL[doc] ?? LEGAL.terms
  return (
    <div className="legal">
      <h1 className="title">{d.title}</h1>
      <p className="lead">{d.lead}</p>
      {d.sections.map(([h, parts]) => (
        <section key={h} className="legal__sec">
          <h2>{h}</h2>
          {parts.map((part, i) => (Array.isArray(part)
            ? <ul key={i}>{part.map((li) => <li key={li}>{li}</li>)}</ul>
            : <p key={i}>{part}</p>))}
        </section>
      ))}
      <p className="muted small-note">Действует с {LEGAL_DATE}</p>
    </div>
  )
}

