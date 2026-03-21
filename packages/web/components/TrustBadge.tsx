'use client';

interface TrustBadgeProps {
  score?: number;
  level?: string;
  txCount: number;
}

const levelColors: Record<string, string> = {
  elite: '#10b981',
  verified: '#3b82f6',
  trusted: '#8b5cf6',
  new: '#f59e0b',
  none: '#475569',
  revoked: '#ef4444',
};

export function TrustBadge({ score, level }: TrustBadgeProps) {
  if (score == null || !level) {
    return <span className="text-xs text-ap-text-muted">—</span>;
  }

  const color = levelColors[level] || levelColors.none;
  const size = 32;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
