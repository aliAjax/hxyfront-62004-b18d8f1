import { BaseDamageMark, DamageType, DAMAGE_TYPES } from './types';

interface SnowboardDiagramProps {
  marks: BaseDamageMark[];
  activeType: DamageType | null;
  onBoardClick: (x: number, y: number) => void;
  onMarkClick: (mark: BaseDamageMark) => void;
  selectedMarkId: string | null;
}

export default function SnowboardDiagram({
  marks,
  activeType,
  onBoardClick,
  onMarkClick,
  selectedMarkId,
}: SnowboardDiagramProps) {
  const getDamageTypeInfo = (type: DamageType) => {
    return DAMAGE_TYPES.find((t) => t.value === type) ?? DAMAGE_TYPES[0];
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (x >= 10 && x <= 90 && y >= 3 && y <= 97) {
      onBoardClick(x, y);
    }
  };

  const activeTypeInfo = activeType ? getDamageTypeInfo(activeType) : null;

  return (
    <div className="diagram-wrapper">
      <svg
        viewBox="0 0 400 900"
        className="snowboard-svg"
        onClick={handleClick}
        style={{ cursor: activeType ? 'crosshair' : 'default' }}
      >
        <defs>
          <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        <path
          d="M 200 15 
             C 290 15, 340 60, 345 150 
             L 350 450 
             C 352 550, 352 650, 350 750 
             L 345 840 
             C 340 880, 290 885, 200 885 
             C 110 885, 60 880, 55 840 
             L 50 750 
             C 48 650, 48 550, 50 450 
             L 55 150 
             C 60 60, 110 15, 200 15 Z"
          fill="url(#boardGradient)"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <path
          d="M 200 15 
             C 290 15, 340 60, 345 150 
             L 350 450 
             C 352 550, 352 650, 350 750 
             L 345 840 
             C 340 880, 290 885, 200 885 
             C 110 885, 60 880, 55 840 
             L 50 750 
             C 48 650, 48 550, 50 450 
             L 55 150 
             C 60 60, 110 15, 200 15 Z"
          fill="none"
          stroke="url(#edgeGradient)"
          strokeWidth="6"
          opacity="0.5"
        />

        <line x1="200" y1="80" x2="200" y2="820" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />

        <text x="200" y="60" textAnchor="middle" fontSize="13" fill="#94a3b8" fontWeight="600">板头</text>
        <text x="200" y="450" textAnchor="middle" fontSize="13" fill="#94a3b8" fontWeight="600">板腰</text>
        <text x="200" y="855" textAnchor="middle" fontSize="13" fill="#94a3b8" fontWeight="600">板尾</text>

        <ellipse cx="125" cy="260" rx="22" ry="14" fill="#cbd5e1" opacity="0.4" />
        <ellipse cx="275" cy="260" rx="22" ry="14" fill="#cbd5e1" opacity="0.4" />
        <ellipse cx="125" cy="640" rx="22" ry="14" fill="#cbd5e1" opacity="0.4" />
        <ellipse cx="275" cy="640" rx="22" ry="14" fill="#cbd5e1" opacity="0.4" />

        {marks.map((mark) => {
          const info = getDamageTypeInfo(mark.type);
          const cx = (mark.x / 100) * 400;
          const cy = (mark.y / 100) * 900;
          const isSelected = mark.id === selectedMarkId;

          return (
            <g
              key={mark.id}
              onClick={(e) => {
                e.stopPropagation();
                onMarkClick(mark);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 22 : 18}
                fill={info.color + '25'}
                stroke={isSelected ? '#0369a1' : info.color}
                strokeWidth={isSelected ? 3 : 2}
              />
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fontSize="16"
                fill={info.color}
                fontWeight="700"
                style={{ pointerEvents: 'none' }}
              >
                {info.icon}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="diagram-hints">
        {activeTypeInfo ? (
          <div className="hint-active" style={{ color: activeTypeInfo.color, borderColor: activeTypeInfo.color }}>
            <span>{activeTypeInfo.icon}</span>
            正在添加「{activeTypeInfo.label}」- 点击雪板底板选择位置
          </div>
        ) : (
          <div className="hint-idle">先在上方选择损伤类型，然后点击雪板添加标记</div>
        )}
      </div>
    </div>
  );
}
