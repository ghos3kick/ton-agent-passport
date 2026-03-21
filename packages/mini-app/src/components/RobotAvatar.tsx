interface RobotAvatarProps {
  address: string;
  size?: number;
  className?: string;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
];

function hashAddress(address: string): number[] {
  const clean = address.replace(/[^a-zA-Z0-9]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 8; i++) {
    let val = 0;
    const chunk = clean.slice(i * 4, i * 4 + 4);
    for (let j = 0; j < chunk.length; j++) {
      val += chunk.charCodeAt(j);
    }
    bytes.push(val % 256);
  }
  return bytes;
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

const RobotAvatar = ({ address, size = 40, className }: RobotAvatarProps) => {
  const hash = hashAddress(address || '');

  const headShape = hash[0] % 4;
  const eyeStyle = hash[1] % 5;
  const mouthStyle = hash[2] % 5;
  const antennaStyle = hash[3] % 4;
  const primaryColor = COLORS[hash[4] % COLORS.length];
  const accentIdx = (hash[5] % (COLORS.length - 1) + (hash[4] % COLORS.length) + 1) % COLORS.length;
  const accentColor = COLORS[accentIdx];
  const pattern = hash[6] % 4;
  const accessories = hash[7] % 4;

  const s = size;
  const cx = s / 2;
  const cy = s * 0.54;            // shift down to fit antennas
  const headR = s * 0.28;         // smaller head → fits with ears & antennas
  const eyeY = cy - headR * 0.15;
  const eyeSpacing = headR * 0.4;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Background */}
      <rect
        width={s}
        height={s}
        rx={s * 0.2}
        fill={primaryColor + '15'}
      />

      {/* Antenna */}
      {antennaStyle === 1 && (
        <>
          <line x1={cx} y1={cy - headR - 2} x2={cx} y2={cy - headR - headR * 0.5}
            stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={cx} cy={cy - headR - headR * 0.5} r={2} fill={accentColor} />
        </>
      )}
      {antennaStyle === 2 && (
        <>
          <line x1={cx - 4} y1={cy - headR - 2} x2={cx - 6} y2={cy - headR - headR * 0.45}
            stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={cx - 6} cy={cy - headR - headR * 0.45} r={1.5} fill={accentColor} />
          <line x1={cx + 4} y1={cy - headR - 2} x2={cx + 6} y2={cy - headR - headR * 0.45}
            stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={cx + 6} cy={cy - headR - headR * 0.45} r={1.5} fill={accentColor} />
        </>
      )}
      {antennaStyle === 3 && (
        <>
          <line x1={cx} y1={cy - headR - 2} x2={cx} y2={cy - headR - headR * 0.55}
            stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
          <rect x={cx - 4} y={cy - headR - headR * 0.55 - 3} width={8} height={6}
            rx={1.5} fill={accentColor} />
        </>
      )}

      {/* Head */}
      {headShape === 0 && (
        <circle cx={cx} cy={cy} r={headR} fill={primaryColor + '25'} stroke={primaryColor} strokeWidth={1.5} />
      )}
      {headShape === 1 && (
        <rect x={cx - headR} y={cy - headR} width={headR * 2} height={headR * 2}
          rx={headR * 0.25} fill={primaryColor + '25'} stroke={primaryColor} strokeWidth={1.5} />
      )}
      {headShape === 2 && (
        <polygon
          points={hexPoints(cx, cy, headR)}
          fill={primaryColor + '25'} stroke={primaryColor} strokeWidth={1.5}
        />
      )}
      {headShape === 3 && (
        <rect x={cx - headR} y={cy - headR * 0.85} width={headR * 2} height={headR * 1.7}
          rx={headR * 0.4} fill={primaryColor + '25'} stroke={primaryColor} strokeWidth={1.5} />
      )}

      {/* Pattern on head */}
      {pattern === 1 && (
        <>
          <line x1={cx - headR * 0.5} y1={cy - headR * 0.5} x2={cx - headR * 0.5} y2={cy + headR * 0.5}
            stroke={primaryColor} strokeWidth={0.5} opacity={0.3} />
          <line x1={cx + headR * 0.5} y1={cy - headR * 0.5} x2={cx + headR * 0.5} y2={cy + headR * 0.5}
            stroke={primaryColor} strokeWidth={0.5} opacity={0.3} />
        </>
      )}
      {pattern === 2 && (
        <>
          <circle cx={cx - headR * 0.3} cy={cy + headR * 0.3} r={1} fill={primaryColor} opacity={0.3} />
          <circle cx={cx + headR * 0.3} cy={cy + headR * 0.3} r={1} fill={primaryColor} opacity={0.3} />
          <circle cx={cx} cy={cy + headR * 0.5} r={1} fill={primaryColor} opacity={0.3} />
        </>
      )}

      {/* Eyes */}
      {eyeStyle === 0 && (
        <>
          <circle cx={cx - eyeSpacing} cy={eyeY} r={headR * 0.1} fill={accentColor} />
          <circle cx={cx + eyeSpacing} cy={eyeY} r={headR * 0.1} fill={accentColor} />
        </>
      )}
      {eyeStyle === 1 && (
        <>
          <circle cx={cx - eyeSpacing} cy={eyeY} r={headR * 0.15} fill="none"
            stroke={accentColor} strokeWidth={1.5} />
          <circle cx={cx + eyeSpacing} cy={eyeY} r={headR * 0.15} fill="none"
            stroke={accentColor} strokeWidth={1.5} />
          <circle cx={cx - eyeSpacing} cy={eyeY} r={headR * 0.05} fill={accentColor} />
          <circle cx={cx + eyeSpacing} cy={eyeY} r={headR * 0.05} fill={accentColor} />
        </>
      )}
      {eyeStyle === 2 && (
        <>
          <rect x={cx - eyeSpacing - headR * 0.1} y={eyeY - headR * 0.1}
            width={headR * 0.2} height={headR * 0.2} fill={accentColor} />
          <rect x={cx + eyeSpacing - headR * 0.1} y={eyeY - headR * 0.1}
            width={headR * 0.2} height={headR * 0.2} fill={accentColor} />
        </>
      )}
      {eyeStyle === 3 && (
        <>
          <line x1={cx - eyeSpacing - headR * 0.12} y1={eyeY}
            x2={cx - eyeSpacing + headR * 0.12} y2={eyeY}
            stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
          <line x1={cx + eyeSpacing - headR * 0.12} y1={eyeY}
            x2={cx + eyeSpacing + headR * 0.12} y2={eyeY}
            stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {eyeStyle === 4 && (
        <rect x={cx - eyeSpacing - headR * 0.1} y={eyeY - headR * 0.08}
          width={eyeSpacing * 2 + headR * 0.2} height={headR * 0.16}
          rx={headR * 0.08} fill={accentColor + '40'} stroke={accentColor} strokeWidth={1} />
      )}

      {/* Mouth */}
      {mouthStyle === 0 && (
        <path d={`M${cx - headR * 0.2} ${cy + headR * 0.3} Q${cx} ${cy + headR * 0.5} ${cx + headR * 0.2} ${cy + headR * 0.3}`}
          fill="none" stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
      )}
      {mouthStyle === 1 && (
        <line x1={cx - headR * 0.2} y1={cy + headR * 0.35} x2={cx + headR * 0.2} y2={cy + headR * 0.35}
          stroke={accentColor} strokeWidth={1.5} strokeLinecap="round" />
      )}
      {mouthStyle === 2 && (
        <>
          <circle cx={cx - headR * 0.1} cy={cy + headR * 0.35} r={1} fill={accentColor} />
          <circle cx={cx + headR * 0.1} cy={cy + headR * 0.35} r={1} fill={accentColor} />
        </>
      )}
      {mouthStyle === 3 && (
        <polyline
          points={`${cx - headR * 0.2},${cy + headR * 0.3} ${cx - headR * 0.1},${cy + headR * 0.4} ${cx},${cy + headR * 0.3} ${cx + headR * 0.1},${cy + headR * 0.4} ${cx + headR * 0.2},${cy + headR * 0.3}`}
          fill="none" stroke={accentColor} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Ears / Accessories */}
      {(accessories === 1 || accessories === 3) && (
        <circle cx={cx - headR - 3} cy={cy} r={headR * 0.15}
          fill={accentColor + '40'} stroke={accentColor} strokeWidth={1} />
      )}
      {(accessories === 2 || accessories === 3) && (
        <circle cx={cx + headR + 3} cy={cy} r={headR * 0.15}
          fill={accentColor + '40'} stroke={accentColor} strokeWidth={1} />
      )}
    </svg>
  );
};

export default RobotAvatar;
