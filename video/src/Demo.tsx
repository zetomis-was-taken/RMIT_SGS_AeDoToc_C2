import React from 'react'
import { AbsoluteFill, Html5Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import timing from '../public/vo/timing.json'

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] })

export const FPS = 30
const C = { canvas: '#f0f2f8', ink: '#111827', ash: '#6b7280', blue: '#2727e6', cyan: '#0ea5e9', red: '#dc2626', green: '#059669', rule: 'rgba(17,24,39,0.09)' }
const ease = Easing.bezier(0.16, 1, 0.3, 1)

const useIn = (delay = 0, dur = 18) => {
  const f = useCurrentFrame()
  return interpolate(f - delay, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
}
const Rise: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, children, style }) => {
  const p = useIn(delay)
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)`, ...style }}>{children}</div>
}

/* ---------- shared chrome ---------- */
const Backdrop: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <div style={{ position: 'absolute', width: 1400, height: 1400, borderRadius: '50%', left: -300 + Math.sin(f / 90) * 40, top: -700, background: 'radial-gradient(circle, rgba(39,39,230,0.12), transparent 60%)' }} />
      <div style={{ position: 'absolute', width: 1200, height: 1200, borderRadius: '50%', right: -400, bottom: -600 + Math.cos(f / 110) * 40, background: 'radial-gradient(circle, rgba(14,165,233,0.12), transparent 60%)' }} />
    </AbsoluteFill>
  )
}

const Chapter: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div style={{ position: 'absolute', left: 64, top: 48, display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, fontWeight: 600, color: C.ink, zIndex: 10 }}>
    <span style={{ width: 40, height: 40, borderRadius: 999, background: C.blue, color: 'white', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700 }}>{n}</span>
    <span style={{ letterSpacing: '-0.01em' }}>{label}</span>
  </div>
)

const Caption: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame()
  const words = text.split(' ')
  const shown = Math.ceil(interpolate(f, [4, frames * 0.92], [0, words.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  // show a sliding window of ~12 words so the caption stays on two lines
  const start = Math.max(0, Math.floor((shown - 1) / 12) * 12)
  const o = interpolate(f, [0, 6, frames - 4, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20, opacity: o }}>
      <div style={{ maxWidth: 1300, padding: '14px 28px', borderRadius: 16, background: 'rgba(17,24,39,0.82)', backdropFilter: 'blur(8px)', color: 'white', fontSize: 34, fontWeight: 500, lineHeight: 1.35, textAlign: 'center' }}>
        {words.slice(start, start + 12).map((w, i) => (
          <span key={i} style={{ opacity: start + i < shown ? 1 : 0.28 }}>{w} </span>
        ))}
      </div>
    </div>
  )
}

/* ---------- screenshot with camera move ---------- */
type Shot = { src: string; at: number; fx?: number; fy?: number; s?: number; label?: string; tone?: 'red' | 'green' | 'blue' }
const Screen: React.FC<{ shots: Shot[]; frames: number }> = ({ shots, frames }) => {
  const f = useCurrentFrame()
  const enter = useIn(0, 20)
  const idx = shots.reduce((k, s, i) => (f >= s.at ? i : k), 0)
  const cur = shots[idx]
  const local = f - cur.at
  const end = idx < shots.length - 1 ? shots[idx + 1].at : frames
  const z = interpolate(local, [0, Math.max(24, (end - cur.at) * 0.55)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  const s = 1 + ((cur.s ?? 1.08) - 1) * z
  const W = 1600, H = 900
  const fx = cur.fx ?? 0.5, fy = cur.fy ?? 0.5
  // translate so focus moves toward centre, clamped to keep the image filling the frame
  const tx = Math.max(-(s - 1) * W / 2, Math.min((s - 1) * W / 2, (0.5 - fx) * W * (s - 1) * 1.6))
  const ty = Math.max(-(s - 1) * H / 2, Math.min((s - 1) * H / 2, (0.5 - fy) * H * (s - 1) * 1.6))
  const tones = { red: C.red, green: C.green, blue: C.blue }
  const lp = interpolate(local, [6, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: W, height: H + 44, borderRadius: 18, overflow: 'hidden', background: 'white', boxShadow: '0 30px 80px -20px rgba(39,39,230,0.28), 0 8px 24px rgba(17,24,39,0.08)', opacity: enter, transform: `translateY(${(1 - enter) * 40}px) scale(${(0.96 + enter * 0.04) * 0.82})`, marginTop: 24 }}>
        <div style={{ height: 44, background: '#f8f9fc', borderBottom: `1px solid ${C.rule}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
          <span style={{ marginLeft: 18, fontSize: 15, color: C.ash, background: 'white', border: `1px solid ${C.rule}`, borderRadius: 8, padding: '4px 14px' }}>localhost:3000</span>
        </div>
        <div style={{ width: W, height: H, overflow: 'hidden', position: 'relative' }}>
          {shots.map((sh, i) => (
            <Img key={sh.src} src={staticFile(`shots/${sh.src}.png`)} style={{ position: 'absolute', inset: 0, width: W, height: H, opacity: i === idx ? 1 : 0, transform: i === idx ? `translate(${tx}px, ${ty}px) scale(${s})` : undefined }} />
          ))}
        </div>
      </div>
      {cur.label && (
        <div style={{ position: 'absolute', right: 96, top: 100, padding: '12px 22px', borderRadius: 999, background: tones[cur.tone ?? 'blue'], color: 'white', fontSize: 26, fontWeight: 700, letterSpacing: '0.01em', opacity: lp, transform: `translateY(${(1 - lp) * -14}px)`, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.3)' }}>
          {cur.label}
        </div>
      )}
    </AbsoluteFill>
  )
}

/* ---------- motion-graphic scenes ---------- */
const Doc: React.FC<{ x: number; y: number; r: number; o: number }> = ({ x, y, r, o }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 70, height: 90, borderRadius: 10, background: 'white', border: `2px solid ${C.blue}`, transform: `rotate(${r}deg)`, opacity: o, boxShadow: '0 8px 20px rgba(39,39,230,0.15)', padding: 12 }}>
    {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 6, borderRadius: 3, background: i ? '#c7cbe0' : C.blue, marginBottom: 9, width: i === 3 ? '60%' : '100%' }} />)}
  </div>
)

const Paperwork: React.FC = () => {
  const f = useCurrentFrame()
  const offices = ['Housing', 'Tax', 'Health']
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Rise style={{ position: 'absolute', top: 170, fontSize: 84, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink }}>Same paperwork. <span style={{ color: C.blue }}>Every office.</span></Rise>
      <div style={{ position: 'relative', width: 1400, height: 420, marginTop: 160 }}>
        <Rise delay={8} style={{ position: 'absolute', left: 0, top: 120, width: 200, textAlign: 'center' }}>
          <div style={{ width: 130, height: 130, margin: '0 auto', borderRadius: 999, background: C.blue, display: 'grid', placeItems: 'center', color: 'white', fontSize: 60 }}>☺</div>
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 700, color: C.ink }}>Citizen</div>
        </Rise>
        {offices.map((o, i) => {
          const p = useIn(14 + i * 10)
          return (
            <div key={o} style={{ position: 'absolute', left: 560 + i * 290, top: 100, width: 230, height: 200, borderRadius: 20, background: 'white', border: `1px solid ${C.rule}`, boxShadow: '0 10px 30px rgba(17,24,39,0.08)', opacity: p, transform: `translateY(${(1 - p) * 30}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 46 }}>🏛</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>{o} office</div>
            </div>
          )
        })}
        {offices.map((_, i) =>
          [0, 1, 2].map(k => {
            const t = (f - 30 - i * 14 - k * 22) / 40
            if (t < 0 || t > 1) return null
            const x0 = 160, x1 = 640 + i * 290
            const e = Easing.inOut(Easing.cubic)(t)
            return <Doc key={`${i}${k}`} x={x0 + (x1 - x0) * e} y={150 - Math.sin(t * Math.PI) * 140} r={(1 - t) * -15 + k * 6} o={t < 0.9 ? 1 : (1 - t) * 10} />
          })
        )}
      </div>
    </AbsoluteFill>
  )
}

const Key: React.FC<{ label: string; color: string; delay: number }> = ({ label, color, delay }) => {
  const { fps } = useVideoConfig()
  const f = useCurrentFrame()
  const sp = spring({ frame: f - delay, fps, config: { damping: 14 } })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 30px', borderRadius: 999, background: 'white', border: `2px solid ${color}`, transform: `scale(${sp})`, boxShadow: '0 10px 30px -10px rgba(39,39,230,0.35)' }}>
      <span style={{ width: 22, height: 22, borderRadius: 99, background: color }} />
      <span style={{ fontSize: 34, fontWeight: 700, color: C.ink }}>{label}</span>
    </div>
  )
}

const TitleCard: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 34 }}>
    <Rise><div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.18em', color: C.blue, textTransform: 'uppercase', textAlign: 'center' }}>We built</div></Rise>
    <Rise delay={6}><div style={{ fontSize: 132, fontWeight: 800, letterSpacing: '-0.045em', color: C.ink, lineHeight: 1 }}>Citizen Consent <span style={{ color: C.blue }}>Quorum</span></div></Rise>
    <Rise delay={14}><div style={{ fontSize: 38, color: C.ash, fontWeight: 500, textAlign: 'center' }}>Cross-agency data sharing where a record opens only when all three approve.</div></Rise>
    <div style={{ display: 'flex', gap: 28, marginTop: 30, alignItems: 'center' }}>
      <Key label="Officer" color={C.blue} delay={130} />
      <span style={{ fontSize: 44, color: C.ash }}>+</span>
      <Key label="Supervisor" color={C.cyan} delay={150} />
      <span style={{ fontSize: 44, color: C.ash }}>+</span>
      <Key label="Citizen" color={C.green} delay={172} />
    </div>
  </AbsoluteFill>
)

const Threat: React.FC<{ who: string; can: string; delay: number }> = ({ who, can, delay }) => {
  const p = useIn(delay)
  const f = useCurrentFrame()
  const glow = 0.5 + 0.5 * Math.sin((f - delay) / 8)
  return (
    <div style={{ width: 640, padding: 44, borderRadius: 28, background: 'white', border: `2px solid rgba(220,38,38,${0.25 + glow * 0.4})`, boxShadow: `0 20px 60px -20px rgba(220,38,38,${0.25 + glow * 0.25})`, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Insider</div>
      <div style={{ fontSize: 60, fontWeight: 800, color: C.ink, letterSpacing: '-0.03em', marginTop: 10 }}>{who}</div>
      <div style={{ fontSize: 32, color: C.ash, marginTop: 14, lineHeight: 1.3 }}>{can}</div>
    </div>
  )
}

const Insiders: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 60 }}>
    <Rise><div style={{ fontSize: 88, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink }}>Sharing means trusting <span style={{ color: C.red }}>their admins.</span></div></Rise>
    <div style={{ display: 'flex', gap: 50 }}>
      <Threat who="System admin" can="Can rewrite the access rules, including their own." delay={90} />
      <Threat who="Database admin" can="Can read every citizen record, straight from the tables." delay={170} />
    </div>
  </AbsoluteFill>
)

const ShareLittle: React.FC = () => {
  const f = useCurrentFrame()
  const w = interpolate(f, [10, 70], [1200, 90], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 70 }}>
      <Rise><div style={{ fontSize: 88, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink }}>So agencies share <span style={{ color: C.blue }}>almost nothing.</span></div></Rise>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, width: 200, textAlign: 'right' }}>Agency A</div>
        <div style={{ width: 1200, display: 'flex', justifyContent: 'center' }}><div style={{ width: w, height: 26, borderRadius: 99, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} /></div>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, width: 200 }}>Agency B</div>
      </div>
      <Rise delay={60}><div style={{ fontSize: 36, color: C.ash }}>Citizens re-submit the same paperwork, again and again.</div></Rise>
    </AbsoluteFill>
  )
}

const DBA_LINES = [
  { t: 'DBA> SELECT * FROM citizens;', c: '#e5e7eb' },
  { t: '', c: '' },
  { t: "id:          'cz-hoa'", c: '#9ca3af' },
  { t: "full_name:   'tide:v1:w/ij8Z1M8rFdVOfzgCfQn7QpYrpmMnN9OqSlbhWgoc6dD…'", c: '#fca5a5' },
  { t: "national_id: 'tide:v1:aceuqm3sXkSDwqmvtUMxU71Nur+yeBJlazgRfIHty…'", c: '#fca5a5' },
  { t: "income:      'tide:v1:RCnVnO5fo9rO3eGDSJGbRCwLtRDl72iCf8Ejs9Rnk…'", c: '#fca5a5' },
  { t: "address:     'tide:v1:rlGerAMy7KNAWllvvBJOJ4SgvcItuUNK4vIgtQvbk…'", c: '#fca5a5' },
  { t: "health:      'tide:v1:8EekXtL+P1/Ya+xVri34ZyOo1xXNF7bMO4m5LVLfl…'", c: '#fca5a5' },
]
const Terminal: React.FC = () => {
  const f = useCurrentFrame()
  const enter = useIn(0, 18)
  const stamp = spring({ frame: f - 95, fps: FPS, config: { damping: 12 } })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 1500, borderRadius: 20, overflow: 'hidden', background: '#0b1020', boxShadow: '0 30px 80px -20px rgba(17,24,39,0.5)', opacity: enter, transform: `translateY(${(1 - enter) * 40}px)`, marginTop: -40 }}>
        <div style={{ height: 46, background: '#151b2e', display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
          <span style={{ marginLeft: 18, fontSize: 17, color: '#9ca3af', fontFamily: 'monospace' }}>node scripts/dba-read.mjs</span>
        </div>
        <div style={{ padding: '30px 40px 40px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 30, lineHeight: 1.65, minHeight: 470 }}>
          {DBA_LINES.map((l, i) => {
            const at = i === 0 ? 6 : 26 + i * 7
            const chars = i === 0 ? Math.floor(interpolate(f, [6, 26], [0, l.t.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) : f >= at ? l.t.length : 0
            return <div key={i} style={{ color: l.c, whiteSpace: 'pre', height: '1.65em' }}>{l.t.slice(0, chars)}</div>
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 150, top: 120, padding: '16px 30px', borderRadius: 999, background: C.red, color: 'white', fontSize: 30, fontWeight: 800, transform: `scale(${stamp}) rotate(-3deg)` }}>Ciphertext only</div>
    </AbsoluteFill>
  )
}

const Interstitial: React.FC<{ text: string }> = ({ text }) => {
  const p = useIn(0, 14)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: C.blue }}>
      <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: '-0.045em', color: 'white', opacity: p, transform: `scale(${0.94 + p * 0.06})` }}>{text}</div>
    </AbsoluteFill>
  )
}

const Steps: React.FC<{ marks: number[] }> = ({ marks }) => {
  const f = useCurrentFrame()
  const items = ['Officer asks', 'Supervisor approves', 'Citizen approves']
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', justifyContent: 'center', gap: 18, zIndex: 12 }}>
      {items.map((t, i) => {
        const on = f >= marks[i]
        const final = i === 2 && on
        return (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderRadius: 999, background: on ? (final ? C.green : C.blue) : 'white', color: on ? 'white' : C.ash, border: `1px solid ${on ? 'transparent' : C.rule}`, fontSize: 24, fontWeight: 700, boxShadow: '0 8px 24px -10px rgba(17,24,39,0.25)' }}>
            <span>{on ? '✓' : i + 1}</span>{t}
          </div>
        )
      })}
    </div>
  )
}

const Orks: React.FC = () => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const split = interpolate(f, [40, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  const xs = [-520, 0, 520]
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Rise style={{ position: 'absolute', top: 150, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.18em', color: C.blue, textTransform: 'uppercase' }}>TideCloak underneath</div>
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink, marginTop: 12 }}>No one ever holds a whole key.</div>
      </Rise>
      <div style={{ position: 'relative', width: 1600, height: 500, marginTop: 160 }}>
        {xs.map((x, i) => {
          const sp = spring({ frame: f - 60 - i * 8, fps, config: { damping: 15 } })
          return (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: 800 + x - 34 * (1 - split) - 34 + 34 * (1 - split), top: 80 + split * 130, width: 68, height: 68, borderRadius: 16, background: [C.blue, C.cyan, C.green][i], transform: `translateX(${-x * (1 - split)}px) rotate(${split * 45}deg)`, boxShadow: '0 10px 30px -8px rgba(39,39,230,0.5)' }} />
              <div style={{ position: 'absolute', left: 800 + x - 170, top: 300, width: 340, padding: '26px 0', borderRadius: 24, background: 'white', border: `1px solid ${C.rule}`, textAlign: 'center', boxShadow: '0 16px 40px -16px rgba(17,24,39,0.2)', transform: `scale(${sp})` }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.ink }}>ORK {i + 1}</div>
                <div style={{ fontSize: 22, color: C.ash, marginTop: 6 }}>independent node · 1 share</div>
              </div>
            </React.Fragment>
          )
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, color: C.ink, opacity: 1 - split }}>🔑 realm key</div>
      </div>
      <Rise delay={120} style={{ position: 'absolute', bottom: 190, display: 'flex', gap: 22 }}>
        {['Quorum-approved policy changes', 'Field encryption', 'DPoP-bound tokens'].map(t => (
          <span key={t} style={{ padding: '10px 22px', borderRadius: 999, background: 'rgba(39,39,230,0.08)', color: C.blue, fontSize: 24, fontWeight: 700 }}>{t}</span>
        ))}
      </Rise>
    </AbsoluteFill>
  )
}

const Outro: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 26 }}>
    <Rise><div style={{ display: 'flex', gap: 22, fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink }}>
      <span>Citizens approve once.</span><span style={{ color: C.blue }}>Agencies share.</span><span style={{ color: C.green }}>Insiders can't cheat.</span>
    </div></Rise>
    <Rise delay={40} style={{ marginTop: 50, textAlign: 'center' }}>
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: '-0.045em', color: C.ink }}>Citizen Consent <span style={{ color: C.blue }}>Quorum</span></div>
      <div style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 26px', borderRadius: 999, background: C.blue, color: 'white', fontSize: 28, fontWeight: 700 }}>Built with TideCloak</div>
      <div style={{ marginTop: 22, fontSize: 24, color: C.ash }}>RMIT GenAI Hackathon 2026 · Tide UNLOCKED</div>
    </Rise>
  </AbsoluteFill>
)

/* ---------- timeline ---------- */
const PAD = 0.7
type Beat = { vo: number; chapter?: [number, string]; extra?: number; caption?: boolean; render: (frames: number) => React.ReactNode }
const BEATS: Beat[] = [
  { vo: 1, chapter: [1, 'The possibility'], extra: 0.4, render: () => <Paperwork /> },
  { vo: 2, chapter: [1, 'The possibility'], render: () => <TitleCard /> },
  { vo: 3, chapter: [1, 'The possibility'], extra: 1.6, render: fr => <Screen frames={fr} shots={[{ src: '01-landing', at: 0, fx: 0.74, fy: 0.45, s: 1.25 }, { src: '02-vault-1', at: 18, fx: 0.74, fy: 0.45, s: 1.35 }, { src: '02-vault-2', at: 36, fx: 0.74, fy: 0.45, s: 1.45 }, { src: '02-vault-3', at: 56, fx: 0.74, fy: 0.45, s: 1.6, label: 'Three approvals → open', tone: 'green' }]} /> },
  { vo: 4, chapter: [2, 'The constraint'], render: () => <Insiders /> },
  { vo: 5, chapter: [2, 'The constraint'], render: () => <ShareLittle /> },
  { vo: 6, chapter: [3, 'The prototype'], render: fr => <Screen frames={fr} shots={[{ src: '10-a1-before', at: 0, label: 'Attack 1 · wrong officer', tone: 'red' }, { src: '11-a1-denied', at: 95, fx: 0.86, fy: 0.16, s: 1.9, label: 'OUT_OF_SCOPE', tone: 'red' }]} /> },
  { vo: 7, chapter: [3, 'The prototype'], render: fr => <Screen frames={fr} shots={[{ src: '20-a2-policy', at: 0, label: 'Attack 2 · admin self-grant', tone: 'red' }, { src: '21-a2-proposed', at: 70, fx: 0.86, fy: 0.15, s: 1.6 }, { src: '22-a2-blocked', at: 140, fx: 0.86, fy: 0.18, s: 1.9, label: 'SELF_APPROVAL_BLOCKED', tone: 'red' }]} /> },
  { vo: 8, chapter: [3, 'The prototype'], render: () => <Terminal /> },
  { vo: 9, extra: 0.3, caption: false, render: () => <Interstitial text="Now, the real flow." /> },
  { vo: 10, chapter: [3, 'The prototype'], render: fr => <><Screen frames={fr} shots={[{ src: '41-b1-requested', at: 0, fx: 0.78, fy: 0.45, s: 1.3 }, { src: '51-b2-approved', at: 80, fx: 0.62, fy: 0.42, s: 1.35 }, { src: '61-b3-granted', at: 165, fx: 0.62, fy: 0.42, s: 1.35 }]} /><Steps marks={[0, 80, 165]} /></> },
  { vo: 11, chapter: [3, 'The prototype'], render: fr => <Screen frames={fr} shots={[{ src: '70-b4-open', at: 0, fx: 0.33, fy: 0.62, s: 1.6, label: 'Only the fields this purpose needs', tone: 'green' }]} /> },
  { vo: 12, chapter: [3, 'The prototype'], render: () => <Orks /> },
  { vo: 13, chapter: [4, 'What changes'], render: fr => <Screen frames={fr} shots={[{ src: '90-b5-result', at: 0, fx: 0.32, fy: 0.84, s: 1.8, label: 'One fact, never the file', tone: 'green' }]} /> },
  { vo: 14, chapter: [4, 'What changes'], render: fr => <Screen frames={fr} shots={[{ src: '95-audit-denied', at: 0, s: 1.1 }, { src: '96-audit-verified', at: 60, fx: 0.75, fy: 0.25, s: 1.4, label: 'Hash chain intact', tone: 'green' }]} /> },
  { vo: 15, extra: 3, caption: false, render: () => <Outro /> },
]

const scenes = timing.scenes as { scene: number; duration: number; text: string }[]
const LAYOUT = (() => {
  let from = 0
  return BEATS.map(b => {
    const s = scenes[b.vo - 1]
    const frames = Math.ceil((s.duration + PAD + (b.extra ?? 0)) * FPS)
    const r = { ...b, from, frames, text: s.text }
    from += frames
    return r
  })
})()
export const TOTAL = LAYOUT.reduce((n, b) => n + b.frames, 0)

const Fade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [0, 8, frames - 8, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

export const Demo: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, background: C.canvas }}>
    <Backdrop />
    {LAYOUT.map((b, i) => (
      <Sequence key={i} from={b.from} durationInFrames={b.frames} name={`${b.vo}. ${b.text.slice(0, 28)}`}>
        <Fade frames={b.frames}>
          {b.render(b.frames)}
          {b.chapter && <Chapter n={b.chapter[0]} label={b.chapter[1]} />}
        </Fade>
        {b.caption !== false && <Caption text={b.text} frames={b.frames} />}
        <Sequence from={6}><Html5Audio src={staticFile(`vo/scene-${String(b.vo).padStart(2, '0')}.wav`)} /></Sequence>
      </Sequence>
    ))}
  </AbsoluteFill>
)
