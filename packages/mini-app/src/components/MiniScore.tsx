interface MiniScoreProps {
  score: number;
  level: string;
}

const MiniScore = ({ score, level }: MiniScoreProps) => {
  const levelColors: Record<string, string> = {
    elite: '#10b981',
    verified: '#3b82f6',
    trusted: '#8b5cf6',
    new: '#f59e0b',
    none: '#475569',
    revoked: '#ef4444',
  };

  const color = levelColors[level] || levelColors.none;

  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="mini-score">
      <div className="mini-score-ring">
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
        <span className="mini-score-value" style={{ color }}>{score}</span>
      </div>
      <span className="mini-score-label">Trust</span>
    </div>
  );
};

export default MiniScore;
