'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export type Keys = { officer: boolean; supervisor: boolean; citizen: boolean }
// The "artwork" supplies the colour: one hue per party, nothing else in the UI is coloured.
export const KEY_COLORS = { officer: '#ff4d1c', supervisor: '#2f55ff', citizen: '#b6f03c' } as const
const ORDER: (keyof Keys)[] = ['officer', 'supervisor', 'citizen']
const SOCKET_X = [-0.75, 0, 0.75]

function Key({ id, index, inserted, reduced }: { id: keyof Keys; index: number; inserted: boolean; reduced: boolean }) {
  const g = useRef<THREE.Group>(null)
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    const t = clock.elapsedTime
    if (inserted) target.set(SOCKET_X[index], 1.02, 1.36)
    else {
      const a = reduced ? index * 2.1 : t * 0.45 + index * 2.1
      target.set(Math.cos(a) * 2.35, Math.sin(a * 1.3) * 0.35 + (index - 1) * 0.95, Math.sin(a) * 1.2 + 1.8)
    }
    g.current.position.lerp(target, reduced ? 1 : Math.min(1, dt * 4.5))
    g.current.rotation.y += (reduced ? 0 : dt * (inserted ? 0 : 1.4))
    if (inserted) g.current.rotation.y *= 0.85
  })
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 40]} />
        <meshStandardMaterial color={KEY_COLORS[id]} emissive={KEY_COLORS[id]} emissiveIntensity={inserted ? 0.9 : 0.25} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 16]} />
        <meshStandardMaterial color={KEY_COLORS[id]} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Vault({ keys, reduced }: { keys: Keys; reduced: boolean }) {
  const root = useRef<THREE.Group>(null)
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Mesh>(null)
  const open = keys.officer && keys.supervisor && keys.citizen
  useFrame(({ clock, pointer }, dt) => {
    const k = reduced ? 1 : Math.min(1, dt * 3.2)
    if (root.current) {
      const ty = (reduced ? -0.35 : Math.sin(clock.elapsedTime * 0.35) * 0.18 - 0.35) + pointer.x * 0.25
      root.current.rotation.y += (ty - root.current.rotation.y) * k
      root.current.rotation.x += ((reduced ? 0.1 : 0.1 - pointer.y * 0.12) - root.current.rotation.x) * k
    }
    const x = open ? 1.55 : 0.55
    if (left.current) left.current.position.x += (-x - left.current.position.x) * k
    if (right.current) right.current.position.x += (x - right.current.position.x) * k
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity += ((open ? 1 : 0) - (glow.current.material as THREE.MeshBasicMaterial).opacity) * k
  })
  return (
    <group ref={root}>
      <mesh><boxGeometry args={[2.6, 2.6, 2.4]} /><meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.25} /></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(2.6, 2.6, 2.4)]} /><lineBasicMaterial color="#777" /></lineSegments>
      {/* revealed face: the single fact that leaves the vault */}
      <mesh ref={glow} position={[0, -0.1, 1.205]}><planeGeometry args={[2.1, 1.8]} /><meshBasicMaterial color="#f4f4f0" transparent opacity={0} /></mesh>
      <mesh ref={left} position={[-0.55, -0.1, 1.27]}><boxGeometry args={[1.08, 1.8, 0.14]} /><meshStandardMaterial color="#2a2a2a" roughness={0.45} metalness={0.3} /></mesh>
      <mesh ref={right} position={[0.55, -0.1, 1.27]}><boxGeometry args={[1.08, 1.8, 0.14]} /><meshStandardMaterial color="#2a2a2a" roughness={0.45} metalness={0.3} /></mesh>
      {SOCKET_X.map((x, i) => (
        <mesh key={i} position={[x, 1.02, 1.215]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.24, 0.035, 12, 40]} /><meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} /></mesh>
      ))}
      {ORDER.map((id, i) => <Key key={id} id={id} index={i} inserted={keys[id]} reduced={reduced} />)}
    </group>
  )
}

export default function VaultScene({ keys, reduced }: { keys: Keys; reduced: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0.3, 9.4], fov: 34 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} aria-hidden>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 6]} intensity={2.6} />
      <directionalLight position={[-4, 3, 4]} intensity={1.4} />
      <directionalLight position={[-5, -2, 3]} intensity={0.6} />
      <Vault keys={keys} reduced={reduced} />
    </Canvas>
  )
}
