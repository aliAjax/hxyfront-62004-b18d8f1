import { useState, useEffect } from 'react';
import {
  WorkOrderFormData,
  emptyFormData,
  BOARD_TYPES,
  WAX_TYPES,
  REPAIR_LOCATIONS,
  EdgeAngleParam,
  CustomerHistoryRecord,
  WorkOrder,
} from './types';
import BaseDamageMarker from './BaseDamageMarker';

interface WorkOrderFormProps {
  onSubmit: (data: WorkOrderFormData, editingId?: string) => void;
  selectedEdgeParam: EdgeAngleParam | null;
  historyFill: CustomerHistoryRecord | null;
  editingOrder: WorkOrder | null;
  onCancelEdit?: () => void;
}

const DRAFT_KEY = 'work-order-draft';

const REQUIRED_FIELDS: Array<keyof WorkOrderFormData> = [
  'brand',
  'length',
  'boardType',
  'sideEdgeAngle',
  'baseEdgeAngle',
  'waxType',
];

const FIELD_LABELS: Record<keyof WorkOrderFormData, string> = {
  brand: '雪板品牌',
  length: '长度',
  boardType: '板型',
  sideEdgeAngle: '侧刃角',
  baseEdgeAngle: '底刃角',
  waxType: '打蜡类型',
  baseDamage: '底板损伤描述',
  repairLocation: '修补位置',
  customerPreference: '客户偏好',
  damageMarks: '损伤标记',
};

export default function WorkOrderForm({ onSubmit, selectedEdgeParam, historyFill, editingOrder, onCancelEdit }: WorkOrderFormProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>(emptyFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof WorkOrderFormData, string>>>({});
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (editingOrder) {
      const { id, status, createdAt, ...rest } = editingOrder;
      setFormData(rest);
      setErrors({});
    }
  }, [editingOrder]);

  useEffect(() => {
    if (!editingOrder) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          setFormData(JSON.parse(savedDraft));
        } catch {
          // ignore parse error
        }
      }
    }
  }, [editingOrder]);

  useEffect(() => {
    if (selectedEdgeParam && !editingOrder) {
      setFormData((prev) => ({
        ...prev,
        sideEdgeAngle: selectedEdgeParam.sideEdgeAngle,
        baseEdgeAngle: selectedEdgeParam.baseEdgeAngle,
        boardType: selectedEdgeParam.boardType,
      }));
    }
  }, [selectedEdgeParam, editingOrder]);

  useEffect(() => {
    if (historyFill && !editingOrder) {
      setFormData((prev) => ({
        ...prev,
        brand: historyFill.brand,
        length: historyFill.length,
        boardType: historyFill.boardType,
        sideEdgeAngle: historyFill.sideEdgeAngle,
        baseEdgeAngle: historyFill.baseEdgeAngle,
        waxType: historyFill.waxType,
        customerPreference: historyFill.deliveryNote,
      }));
    }
  }, [historyFill, editingOrder]);

  const handleChange = (field: keyof WorkOrderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setDraftSaved(false);
  };

  const handleMarksChange = (marks: typeof formData.damageMarks) => {
    setFormData((prev) => ({ ...prev, damageMarks: marks }));
    setDraftSaved(false);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof WorkOrderFormData, string>> = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!formData[field].trim()) {
        newErrors[field] = `${FIELD_LABELS[field]}为必填项`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(formData, editingOrder?.id);
    setFormData(emptyFormData);
    setErrors({});
    setDraftSaved(false);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleClear = () => {
    setFormData(emptyFormData);
    setErrors({});
    setDraftSaved(false);
    localStorage.removeItem(DRAFT_KEY);
    if (onCancelEdit) onCancelEdit();
  };

  const handleSaveDraft = () => {
    if (editingOrder) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const renderField = (field: keyof WorkOrderFormData, type: 'text' | 'select' | 'textarea', options?: string[]) => {
    const isRequired = REQUIRED_FIELDS.includes(field);
    const error = errors[field];

    if (type === 'textarea') {
      return (
        <label key={field} className={`form-field ${error ? 'has-error' : ''}`}>
          <span>
            {FIELD_LABELS[field]}
            {isRequired && <em className="required">*</em>}
          </span>
          <textarea
            value={formData[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={`请填写${FIELD_LABELS[field]}`}
            rows={3}
          />
          {error && <small className="error-text">{error}</small>}
        </label>
      );
    }

    if (type === 'select' && options) {
      return (
        <label key={field} className={`form-field ${error ? 'has-error' : ''}`}>
          <span>
            {FIELD_LABELS[field]}
            {isRequired && <em className="required">*</em>}
          </span>
          <select
            value={formData[field]}
            onChange={(e) => handleChange(field, e.target.value)}
          >
            <option value="">请选择{FIELD_LABELS[field]}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {error && <small className="error-text">{error}</small>}
        </label>
      );
    }

    return (
      <label key={field} className={`form-field ${error ? 'has-error' : ''}`}>
        <span>
          {FIELD_LABELS[field]}
          {isRequired && <em className="required">*</em>}
        </span>
        <input
          type="text"
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={`请填写${FIELD_LABELS[field]}`}
        />
        {error && <small className="error-text">{error}</small>}
      </label>
    );
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>专业字段</p>
          <h2>{editingOrder ? `编辑工单 ${editingOrder.id}` : '创建工单'}</h2>
          {editingOrder && (
            <span style={{ fontSize: 13, color: '#64748b' }}>
              状态：{editingOrder.status === 'pending' ? '待维护' : '已完工'} · 创建：{editingOrder.createdAt}
            </span>
          )}
        </div>
        <div className="form-actions-top">
          {draftSaved && <span className="draft-tip">草稿已保存</span>}
          {!editingOrder && (
            <button className="secondary" onClick={handleSaveDraft}>
              保存草稿
            </button>
          )}
          {editingOrder && onCancelEdit && (
            <button className="secondary" onClick={onCancelEdit}>
              取消编辑
            </button>
          )}
        </div>
      </div>

      <div className="field-grid">
        {renderField('brand', 'text')}
        {renderField('length', 'text')}
        {renderField('boardType', 'select', BOARD_TYPES)}
        {renderField('waxType', 'select', WAX_TYPES)}
        {renderField('sideEdgeAngle', 'text')}
        {renderField('baseEdgeAngle', 'text')}
      </div>

      <div className="field-grid">
        {renderField('baseDamage', 'textarea')}
      </div>

      <div className="field-grid">
        {renderField('repairLocation', 'select', REPAIR_LOCATIONS)}
        {renderField('customerPreference', 'text')}
      </div>

      <div style={{ marginTop: 8 }}>
        <BaseDamageMarker
          marks={formData.damageMarks}
          onChange={handleMarksChange}
        />
      </div>

      <div className="form-actions-bottom">
        <button className="secondary" onClick={handleClear}>
          {editingOrder ? '重置修改' : '清空表单'}
        </button>
        <button className="primary submit-btn" onClick={handleSubmit}>
          {editingOrder ? '保存修改' : '提交工单'}
        </button>
      </div>
    </section>
  );
}
