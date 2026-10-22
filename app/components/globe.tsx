// Dot-matrix sphere in white on the iris column: the system's only graphic. Deterministic, no animation.
export function Globe({ size = 320 }: { size?: number }) {
  const dots: { x: number; y: number; r: number; big: boolean }[] = []
  const R = size / 2 - 6
  const rows = 28
  for (let i = 0; i < rows; i++) {
    const lat = Math.PI * (i / (rows - 1) - 0.5)
    const ring = Math.max(1, Math.round(rows * 1.5 * Math.cos(lat)))
    for (let j = 0; j < ring; j++) {
      const lon = (2 * Math.PI * j) / ring
      if (Math.cos(lat) * Math.cos(lon) < 0.02) continue // front hemisphere only
      const x = size / 2 + R * Math.cos(lat) * Math.sin(lon)
      const y = size / 2 - R * Math.sin(lat)
      dots.push({ x, y, r: 1.6, big: (i * 7 + j * 13) % 41 === 0 })
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="max-w-full">
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.big ? 4.2 : d.r} fill="#fff" />)}
    </svg>
  )
}
