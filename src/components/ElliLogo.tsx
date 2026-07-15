interface Props {
  color: string;
  height?: number;
}

// Approximated dot grid for the Elli bolt mark (column, row, radius)
const DOTS: Array<[number, number, number]> = [
  // Each entry: [cx, cy, r] in a local coordinate system
  // The bolt shape widens left→right then tapers to a point on the right
  // Col 1
  [0, 12, 2.2],
  // Col 2
  [7, 5,  2.0], [7, 12, 2.8], [7, 19, 2.0],
  // Col 3
  [14, 0, 1.8], [14, 7, 3.2], [14, 14, 3.6], [14, 21, 3.0], [14, 27, 1.8],
  // Col 4
  [21, 3, 2.4], [21, 10, 4.2], [21, 17, 4.6], [21, 24, 3.8], [21, 30, 2.2],
  // Col 5
  [28, 6, 3.0], [28, 13, 4.8], [28, 20, 5.2], [28, 27, 4.2], [28, 33, 2.6],
  // Col 6
  [35, 9,  3.4], [35, 16, 5.0], [35, 23, 5.4], [35, 30, 4.0],
  // Col 7
  [42, 12, 3.6], [42, 19, 4.6], [42, 26, 3.8], [42, 33, 2.4],
  // Col 8
  [49, 15, 3.2], [49, 22, 4.0], [49, 29, 2.8],
  // Col 9
  [56, 18, 2.6], [56, 25, 3.0],
  // Col 10 (tip)
  [62, 21, 2.0],
];

export default function ElliLogo({ color, height = 36 }: Props) {
  // viewBox: wordmark ~78px wide, gap, bolt ~70px wide, total height ~44
  const vw = 160;
  const vh = 44;
  const scale = height / vh;

  return (
    <svg
      width={vw * scale}
      height={height}
      viewBox={`0 0 ${vw} ${vh}`}
      fill={color}
      style={{ display: 'block' }}
    >
      {/* ── Wordmark ── */}
      {/* E */}
      <rect x="0"  y="8"  width="5"  height="28" />
      <rect x="0"  y="8"  width="18" height="5"  />
      <rect x="0"  y="19.5" width="14" height="5"  />
      <rect x="0"  y="31" width="18" height="5"  />
      {/* l */}
      <rect x="23" y="8"  width="5"  height="28" />
      {/* l */}
      <rect x="33" y="8"  width="5"  height="28" />
      {/* i — dot + stem */}
      <circle cx="46" cy="10" r="4" />
      <rect x="43.5" y="18" width="5" height="18" />

      {/* ── Dot bolt mark (offset to x=58, y=3) ── */}
      {DOTS.map(([x, y, r], i) => (
        <circle key={i} cx={58 + x} cy={3 + y} r={r} />
      ))}
    </svg>
  );
}
