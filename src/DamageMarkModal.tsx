import { useState, useEffect } from 'react';
import {
  BaseDamageMark,
  DamageType,
  DAMAGE_TYPES,
  SEVERITY_LEVELS,
  REPAIR_METHODS,
  SeverityLevel,
} from './types';

interface DamageMarkModalProps {
  isOpen: boolean;
  isEditing: boolean;
  damageType: DamageType | null;
  initialData: BaseDamageMark | null;
  onSave: (data: Omit<BaseDamageMark, 'id' | 'x' | 'y' | 'type'> & { type?: DamageType }) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export default function DamageMarkModal({
  isOpen,
  isEditing,
  damageType,
  initialData,
  onSave,
  onClose,
  onDelete,
}: DamageMarkModalProps) {
  const [locationNote, setLocationNote] = useState('');
  const [length, setLength] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('mild');
  const [repairMethod, setRepairMethod] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveType = initialData?.type ?? damageType;
  const typeInfo = DAMAGE_TYPES.find((t) => t.value === effectiveType);

  useEffect(() => {
    if (initialData) {
      setLocationNote(initialData.locationNote);
      setLength(initialData.length);
      setSeverity(initialData.severity);
      setRepairMethod(initialData.repairMethod);
    } else {
      setLocationNote('');
      setLength('');
      setSeverity('mild');
      setRepairMethod('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!locationNote.trim()) {
      newErrors.locationNote = '请填写位置说明';
    }
    if (!length.trim()) {
      newErrors.length = '请填写损伤长度';
    } else if (isNaN(Number(length)) || Number(length) <= 0) {
      newErrors.length = '请输入有效的正数';
    }
    if (!repairMethod.trim()) {
      newErrors.repairMethod = '请选择或填写修补方式';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      locationNote: locationNote.trim(),
      length: length.trim(),
      severity,
      repairMethod: repairMethod.trim(),
      type: initialData ? undefined : damageType!,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeftColor: typeInfo?.color }}>
          <div>
            <p style={{ margin: 0, color: typeInfo?.color, fontWeight: 700 }}>
              {typeInfo?.icon} {typeInfo?.label}
            </p>
            <h3 style={{ margin: '4px 0 0 0' }}>{isEditing ? '编辑损伤标记' : '新增损伤标记'}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <label className="form-field">
            <span>位置说明 <em className="required">*</em></span>
            <input
              type="text"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="如：板腰中部偏左、板尾右侧边缘等"
              style={{
                borderColor: errors.locationNote ? 'var(--error)' : undefined,
                boxShadow: errors.locationNote ? '0 0 0 3px color-mix(in srgb, var(--error) 12%, transparent)' : undefined,
              }}
            />
            {errors.locationNote && <small className="error-text">{errors.locationNote}</small>}
          </label>

          <div className="field-grid" style={{ marginTop: 14 }}>
            <label className="form-field">
              <span>长度(cm) <em className="required">*</em></span>
              <input
                type="text"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="如：3、12"
                style={{
                  borderColor: errors.length ? 'var(--error)' : undefined,
                  boxShadow: errors.length ? '0 0 0 3px color-mix(in srgb, var(--error) 12%, transparent)' : undefined,
                }}
              />
              {errors.length && <small className="error-text">{errors.length}</small>}
            </label>

            <label className="form-field">
              <span>严重程度</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as SeverityLevel)}>
                {SEVERITY_LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field" style={{ marginTop: 14 }}>
            <span>修补方式 <em className="required">*</em></span>
            <select
              value={repairMethod}
              onChange={(e) => setRepairMethod(e.target.value)}
              style={{
                borderColor: errors.repairMethod ? 'var(--error)' : undefined,
                boxShadow: errors.repairMethod ? '0 0 0 3px color-mix(in srgb, var(--error) 12%, transparent)' : undefined,
              }}
            >
              <option value="">请选择修补方式</option>
              {REPAIR_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.repairMethod && <small className="error-text">{errors.repairMethod}</small>}
          </label>

          {repairMethod === '其他' && (
            <label className="form-field" style={{ marginTop: 14 }}>
              <span>请说明具体修补方式</span>
              <input
                type="text"
                value={repairMethod === '其他' ? '' : repairMethod}
                onChange={(e) => setRepairMethod(e.target.value)}
                placeholder="请描述修补方式"
              />
            </label>
          )}
        </div>

        <div className="modal-footer">
          {isEditing && onDelete && (
            <button className="danger" onClick={onDelete}>
              删除标记
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button className="secondary" onClick={onClose}>
              取消
            </button>
            <button className="primary" onClick={handleSubmit}>
              {isEditing ? '保存修改' : '确认添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
