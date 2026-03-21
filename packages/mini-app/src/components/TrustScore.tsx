interface TrustScoreProps {
  score: number;
  level: string;
  breakdown: {
    existence: number;
    activity: number;
    age: number;
    capabilities: number;
  };
  animate?: boolean;
}

const levelColors: Record<string, string> = {
  elite: '#10b981',
  verified: '#3b82f6',
  trusted: '#8b5cf6',
  new: '#f59e0b',
  none: '#475569',
  revoked: '#ef4444',
};

function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="breakdown-item">
      <div className="breakdown-header">
        <span className="breakdown-label">{label}</span>
        <span className="breakdown-value">{value}/{max}</span>
      </div>
      <div className="breakdown-track">
        <div
          className="breakdown-fill"
          style={{
            width: `${(value / max) * 100}%`,
            background: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

export default function TrustScore({ score, level, breakdown, animate = true }: TrustScoreProps) {
  const color = levelColors[level] || levelColors.none;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="trust-score">
      <div className="trust-score-ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference - progress : circumference}
            transform="rotate(-90 70 70)"
            style={{
              transition: animate ? 'stroke-dashoffset 1.5s ease-out' : 'none',
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        <div className="trust-score-value" style={{ color }}>
          {score}
        </div>
      </div>

      <div className="trust-level-badge" style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        color,
      }}>
        {level.toUpperCase()}
      </div>

      <div className="trust-breakdown">
        <BreakdownBar label="Existence" value={breakdown.existence} max={10} color={color} />
        <BreakdownBar label="Activity" value={breakdown.activity} max={50} color={color} />
        <BreakdownBar label="Age" value={breakdown.age} max={30} color={color} />
        <BreakdownBar label="Capabilities" value={breakdown.capabilities} max={10} color={color} />
      </div>
    </div>
  );
}
