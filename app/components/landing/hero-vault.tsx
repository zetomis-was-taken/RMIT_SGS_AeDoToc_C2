'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Check, Lock, LockOpen } from 'lucide-react'
import { KEY_COLORS, type Keys } from './vault'

const Scene = dynamic(() => import('./vault'), { ssr: false, loading: () => <div className="size-full flex items-center justify-center text-xs text-gray-500">Loading 3D Vault…</div> })

const PARTIES: { id: keyof Keys; label: string; sub: string }[] = [
  { id: 'officer', label: 'Officer asks', sub: 'Assigned to case' },
  { id: 'supervisor', label: 'Supervisor approves', sub: 'Second pair of eyes' },
  { id: 'citizen', label: 'Citizen consents', sub: 'Owns the data' },
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
      {/* 3D Showcase frame */}
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white via-[#f7f8fd] to-[#e7ebf7] p-1 shadow-[0_16px_45px_rgba(17,24,39,0.12)] backdrop-blur-2xl">
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 size-64 rounded-full bg-[#2727e6]/10 blur-3xl" />
        
        <div className="relative size-full overflow-hidden rounded-xl">
          {gl ? <Scene keys={keys} reduced={reduced} /> : (
            <div className="flex size-full items-center justify-center text-[13px] text-gray-500">3D preview unavailable. The controls below still work.</div>
          )}

          {/* Floating glass status pill */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <div
              className={`rounded-full px-4 py-2 text-center text-[13px] font-semibold tracking-[-0.01em] backdrop-blur-xl transition-all duration-300 ${
                open
                  ? 'border border-emerald-200 bg-white/95 text-emerald-700 shadow-[0_6px_24px_rgba(16,185,129,0.18)]'
                  : 'border border-gray-200 bg-white/95 text-gray-700 shadow-[0_6px_24px_rgba(17,24,39,0.10)]'
              }`}
              role="status"
              aria-live="polite"
            >
              {open ? (
                <span className="flex items-center gap-2">
                  <LockOpen className="size-4 text-emerald-600" />
                  Vault Unlocked · Agency B learns: income eligible: yes
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="size-3.5 text-[#2727e6]" />
                  Cryptographic Vault Sealed · <span className="text-[#2727e6] font-bold">{n} of 3</span> approvals
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keys interactive controls */}
      <div className="grid grid-cols-3 gap-2.5">
        {PARTIES.map(p => {
          const isKeyActive = keys[p.id]
          const color = KEY_COLORS[p.id]
          return (
            <button
              key={p.id}
              onClick={() => setKeys(k => ({ ...k, [p.id]: !k[p.id] }))}
              aria-pressed={isKeyActive}
              className={`group flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                isKeyActive
                  ? 'border-blue-300 bg-blue-50 text-gray-900 shadow-[0_6px_20px_rgba(39,39,230,0.12)] -translate-y-0.5'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40 hover:-translate-y-0.5'
              }`}
            >
              <span className="flex w-full items-center justify-between text-[13px] font-bold tracking-tight">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full transition-transform duration-200 group-hover:scale-125"
                    style={{
                      backgroundColor: color,
                      boxShadow: isKeyActive ? `0 0 10px ${color}` : 'none'
                    }}
                  />
                  {p.label}
                </span>
                {isKeyActive && <Check className="size-3.5 text-[#2727e6] shrink-0" />}
              </span>
              <span className={`text-[11px] ${isKeyActive ? 'text-[#2727e6]' : 'text-gray-500'}`}>
                {p.sub}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
