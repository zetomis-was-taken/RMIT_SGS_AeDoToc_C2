'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { KEY_COLORS, type Keys } from './vault'

const Scene = dynamic(() => import('./vault'), { ssr: false, loading: () => <div className="size-full" /> })

const PARTIES: { id: keyof Keys; label: string; sub: string }[] = [
  { id: 'officer', label: 'Officer asks', sub: 'assigned to the case' },
  { id: 'supervisor', label: 'Supervisor approves', sub: 'second pair of eyes' },
  { id: 'citizen', label: 'Citizen consents', sub: 'it is their data' },
]

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export function HeroVault() {
  const [keys, setKeys] = useState<Keys>({ officer: false, supervisor: false, citizen: false })
  const [gl, setGl] = useState(true)
  const [reduced, setReduced] = useState(false)
  useEffect(() => { setGl(webglOk()); setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  const n = Object.values(keys).filter(Boolean).length
  const open = n === 3

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[8px] bg-gradient-to-b from-white to-[#d2d2d2]">
        {gl ? <Scene keys={keys} reduced={reduced} /> : (
          <div className="flex size-full items-center justify-center text-[13px] text-white/60">3D preview unavailable. The controls below still work.</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className={`rounded-[8px] px-4 py-2 text-center text-[14px] font-semibold tracking-[-0.01em] ${open ? 'bg-white text-ink' : 'bg-ink text-white'}`} role="status" aria-live="polite">
            {open ? 'Open. Agency B learns one fact: income eligible: yes.' : `Sealed · ${n} of 3 approvals`}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PARTIES.map(p => (
          <button key={p.id} onClick={() => setKeys(k => ({ ...k, [p.id]: !k[p.id] }))} aria-pressed={keys[p.id]}
            className={`flex flex-col items-start gap-1 rounded-[8px] px-3 py-3 text-left transition-shadow hover:shadow-lift ${keys[p.id] ? 'bg-ink text-white' : 'bg-white'}`}>
            <span className="flex items-center gap-2 text-[14px] font-bold tracking-[-0.02em]">
              <span className="size-3 rounded-full" style={{ background: KEY_COLORS[p.id] }} />{p.label}{keys[p.id] && <Check className="size-4" />}
            </span>
            <span className={`text-[12px] ${keys[p.id] ? 'text-white/60' : 'text-ash'}`}>{p.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
