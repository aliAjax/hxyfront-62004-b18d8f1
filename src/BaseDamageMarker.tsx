import { useState } from 'react';
import { BaseDamageMark, DamageType, DAMAGE_TYPES, SEVERITY_LEVELS } from './types';
import SnowboardDiagram from './SnowboardDiagram';
import DamageMarkModal from './DamageMarkModal';

interface BaseDamageMarkerProps {
  marks: BaseDamageMark[];
  onChange: (marks: BaseDamageMark[]) => void;
  readOnly?: boolean;
}

let markCounter = 0;
const generateMarkId = () => {
  markCounter += 1;
  return `DM-${Date.now()}-${markCounter}`;
};

export default function BaseDamageMarker({ marks, onChange, readOnly = false }: BaseDamageMarkerProps) {
  const [activeType, setActiveType] = useState<DamageType | null>(null);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingMark, setEditingMark] = useState<BaseDamageMark | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);

  const isModalOpen = !!pendingPosition || !!editingMark;

  const handleTypeSelect = (type: DamageType) => {
    if (readOnly) return;
    setActiveType((prev) => (prev === type ? null : type));
    setEditingMark(null);
  };

  const handleBoardClick = (x: number, y: number) => {
    if (readOnly || !activeType) return;
    setPendingPosition({ x, y });
  };

  const handleMarkClick = (mark: BaseDamageMark) => {
    setSelectedMarkId(mark.id);
    if (!readOnly) {
      setEditingMark(mark);
      setActiveType(null);
    }
  };

  const handleModalSave = (data: Omit<BaseDamageMark, 'id' | 'x' | 'y' | 'type'> & { type?: DamageType }) => {
    if (editingMark) {
      const updated = marks.map((m) =>
        m.id === editingMark.id
          ? { ...m, ...data }
          : m
      );
      onChange(updated);
      setEditingMark(null);
    } else if (pendingPosition && data.type) {
      const newMark: BaseDamageMark = {
        id: generateMarkId(),
        type: data.type,
        x: pendingPosition.x,
        y: pendingPosition.y,
        locationNote: data.locationNote,
        length: data.length,
        severity: data.severity,
        repairMethod: data.repairMethod,
      };
      onChange([...marks, newMark]);
      setPendingPosition(null);
      setActiveType(null);
    }
  };

  const handleModalClose = () => {
    setPendingPosition(null);
    setEditingMark(null);
  };

  const handleDeleteMark = () => {
    if (!editingMark) return;
    onChange(marks.filter((m) => m.id !== editingMark.id));
    setEditingMark(null);
    setSelectedMarkId(null);
  };

  const getTypeCount = (type: DamageType) => marks.filter((m) => m.type === type).length;
  const getSeverityLabel = (sev: string) => SEVERITY_LEVELS.find((s) => s.value === sev)?.label ?? sev;

  return (
    <section className="panel damage-marker-panel">
      <div className="heading">
        <div>
          <p>可视化标记</p>
          <h2>底板损伤标记区</h2>
        </div>
        {!readOnly && (
          <div className="damage-summary-mini">
            <span>共 {marks.length} 处损伤</span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="damage-type-chips">
          {DAMAGE_TYPES.map((type) => (
            <button
              key={type.value}
              className={`damage-type-chip ${activeType === type.value ? 'active' : ''}`}
              onClick={() => handleTypeSelect(type.value)}
              style={{
                borderColor: activeType === type.value ? type.color : undefined,
                background: activeType === type.value ? type.color + '15' : undefined,
              }}
            >
              <span className="damage-type-icon" style={{ color: type.color }}>{type.icon}</span>
              <span>{type.label}</span>
              <span className="damage-type-count">{getTypeCount(type.value)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="marker-content">
        <SnowboardDiagram
          marks={marks}
          activeType={activeType}
          onBoardClick={handleBoardClick}
          onMarkClick={handleMarkClick}
          selectedMarkId={selectedMarkId}
        />

        <div className="marks-list-panel">
          <div className="marks-list-header">
            <h3>标记列表</h3>
            <span className="marks-count">{marks.length} 条</span>
          </div>

          {marks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎿</div>
              <p className="empty-title">暂无损伤标记</p>
              <p className="empty-desc">
                {readOnly ? '该工单暂无底板损伤记录' : '先选择损伤类型，再点击雪板添加标记'}
              </p>
            </div>
          ) : (
            <div className="marks-list">
              {marks.map((mark, idx) => {
                const info = DAMAGE_TYPES.find((t) => t.value === mark.type)!;
                const isSelected = mark.id === selectedMarkId;
                return (
                  <div
                    key={mark.id}
                    className={`mark-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMarkId(mark.id);
                      if (!readOnly) setEditingMark(mark);
                    }}
                    style={{
                      cursor: readOnly ? 'default' : 'pointer',
                      borderLeftColor: info.color,
                    }}
                  >
                    <div className="mark-card-header">
                      <div className="mark-card-title">
                        <span className="mark-card-index">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="mark-card-type" style={{ background: info.color + '20', color: info.color }}>
                          {info.icon} {info.label}
                        </span>
                      </div>
                      <span
                        className={`severity-badge severity-${mark.severity}`}
                      >
                        {getSeverityLabel(mark.severity)}
                      </span>
                    </div>
                    <div className="mark-card-body">
                      <p><b>位置：</b>{mark.locationNote}</p>
                      <p><b>长度：</b>{mark.length} cm</p>
                      <p><b>修补：</b>{mark.repairMethod}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DamageMarkModal
        isOpen={isModalOpen}
        isEditing={!!editingMark}
        damageType={activeType}
        initialData={editingMark}
        onSave={handleModalSave}
        onClose={handleModalClose}
        onDelete={editingMark ? handleDeleteMark : undefined}
      />
    </section>
  );
}
