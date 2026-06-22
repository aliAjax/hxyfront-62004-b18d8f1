import { useState, useMemo } from 'react';
import {
  WorkOrder,
  WorkOrderPhase,
  PHASE_STEP_INDICATORS,
  PHASE_ORDER,
  getPhaseConfig,
  canEditField,
  isFieldRequired,
  validatePhaseCompletion,
  FIELD_LABELS,
  BOARD_TYPES,
  WAX_TYPES,
  REPAIR_LOCATIONS,
  DAMAGE_TYPES,
  SEVERITY_LEVELS,
  REPAIR_METHODS,
  EditableField,
  FieldChangeRecord,
  BaseDamageMark,
  getNextPhase,
} from './types';
import BaseDamageMarker from './BaseDamageMarker';
import QuoteEstimator from './QuoteEstimator';
import QualityChecklistPanel from './QualityChecklistPanel';
import RejectModal from './RejectModal';

interface PhaseEditorProps {
  order: WorkOrder;
  onUpdateFields: (orderId: string, updates: Partial<WorkOrder>, operator?: string) => WorkOrder | undefined;
  onTransitionNext: (orderId: string, operator?: string, note?: string) => WorkOrder | undefined;
  onRejectToPhase: (orderId: string, targetPhase: WorkOrderPhase, reason: string, operator?: string) => WorkOrder | undefined;
  onApplyQuote: (summary: any) => void;
  onUpdateQualityChecklist: (checklist: any) => void;
  onCreateQualityChecklist: () => void;
  onClose?: () => void;
}

export default function PhaseEditor({
  order,
  onUpdateFields,
  onTransitionNext,
  onRejectToPhase,
  onApplyQuote,
  onUpdateQualityChecklist,
  onCreateQualityChecklist,
  onClose,
}: PhaseEditorProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [localEdits, setLocalEdits] = useState<Partial<WorkOrder>>({});

  const currentPhase = order.status as WorkOrderPhase;
  const phaseConfig = getPhaseConfig(currentPhase);
  const nextPhase = getNextPhase(currentPhase);

  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);

  const validation = useMemo(() => {
    const combined = { ...order, ...localEdits };
    return validatePhaseCompletion(combined, currentPhase);
  }, [order, localEdits, currentPhase]);

  const handleFieldChange = (field: EditableField, value: unknown) => {
    if (!canEditField(currentPhase, field)) return;
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdits = () => {
    if (Object.keys(localEdits).length === 0) return;
    const result = onUpdateFields(order.id, localEdits);
    if (result) {
      setLocalEdits({});
    }
  };

  const handleTransitionNext = () => {
    if (Object.keys(localEdits).length > 0) {
      const confirmSave = window.confirm('您有未保存的修改，是否先保存再推进？');
      if (confirmSave) {
        handleSaveEdits();
      }
    }

    const note = window.prompt('请输入推进备注（可选）：');
    if (note === null) return;

    const result = onTransitionNext(order.id, undefined, note || undefined);
    if (result && nextPhase === 'customer_delivered' && onClose) {
      onClose();
    }
  };

  const handleReject = (targetPhase: WorkOrderPhase, reason: string) => {
    onRejectToPhase(order.id, targetPhase, reason);
    setShowRejectModal(false);
  };

  const renderFieldEditor = (field: EditableField) => {
    const isEditable = canEditField(currentPhase, field);
    const isRequired = isFieldRequired(currentPhase, field);
    const value = localEdits[field as keyof WorkOrder] ?? order[field as keyof WorkOrder];
    const label = FIELD_LABELS[field] || field;

    if (!isEditable) {
      return (
        <div key={field} className="phase-field disabled">
          <label>{label}{isRequired && <span className="required"> *</span>}</label>
          <div className="field-value readonly">
            {value !== undefined && value !== null && value !== '' ? String(value) : '-'}
          </div>
        </div>
      );
    }

    const hasError = validation.errors.some((e) => e.includes(label));

    switch (field) {
      case 'brand':
        return (
          <div key={field} className={`phase-field ${hasError ? 'error' : ''}`}>
            <label>{label}{isRequired && <span className="required"> *</span>}</label>
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="请输入品牌"
            />
            {hasError && <span className="error-text">{label}为必填项</span>}
          </div>
        );

      case 'length':
        return (
          <div key={field} className={`phase-field ${hasError ? 'error' : ''}`}>
            <label>{label}{isRequired && <span className="required"> *</span>}</label>
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="请输入长度（cm）"
            />
            {hasError && <span className="error-text">{label}为必填项</span>}
          </div>
        );

      case 'boardType':
        return (
          <div key={field} className={`phase-field ${hasError ? 'error' : ''}`}>
            <label>{label}{isRequired && <span className="required"> *</span>}</label>
            <select
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            >
              <option value="">请选择板型</option>
              {BOARD_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {hasError && <span className="error-text">{label}为必填项</span>}
          </div>
        );

      case 'sideEdgeAngle':
      case 'baseEdgeAngle':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="如 88°"
            />
          </div>
        );

      case 'waxType':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <select
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            >
              <option value="">请选择蜡型</option>
              {WAX_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        );

      case 'baseDamage':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <textarea
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="请描述底板损伤情况"
              rows={3}
            />
          </div>
        );

      case 'repairLocation':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <select
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            >
              <option value="">请选择修补位置</option>
              {REPAIR_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        );

      case 'customerPreference':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <textarea
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="如：中等咬雪、不要太锐等"
              rows={2}
            />
          </div>
        );

      case 'riskWarning':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <textarea
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder="如：修复难度较高、可能影响性能等"
              rows={2}
            />
          </div>
        );

      case 'estimatedDelivery':
        return (
          <div key={field} className="phase-field">
            <label>{label}</label>
            <input
              type="date"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderFieldChangeRecord = (record: FieldChangeRecord) => {
    const fieldLabel = FIELD_LABELS[record.field] || record.field;
    return (
      <div key={record.id} className="change-record">
        <div className="change-header">
          <span className="change-field">{fieldLabel}</span>
          <span className="change-time">{record.changedAt}</span>
          {record.changedBy && <span className="change-operator">· {record.changedBy}</span>}
        </div>
        <div className="change-values">
          <span className="old-value">{JSON.stringify(record.oldValue)}</span>
          <span className="change-arrow">→</span>
          <span className="new-value">{JSON.stringify(record.newValue)}</span>
        </div>
        {record.note && <div className="change-note">{record.note}</div>}
      </div>
    );
  };

  const editableFields = phaseConfig.editableFields;
  const readonlyFields: EditableField[] = (['brand', 'length', 'boardType', 'sideEdgeAngle', 'baseEdgeAngle', 'waxType', 'baseDamage', 'repairLocation', 'customerPreference', 'riskWarning', 'estimatedDelivery'] as EditableField[])
    .filter((f) => !editableFields.includes(f));

  const hasUnsavedChanges = Object.keys(localEdits).length > 0;

  return (
    <div className="phase-editor">
      <div className="phase-editor-header">
        <div>
          <h2>工单流程编辑器</h2>
          <p className="modal-subtitle">{order.id} · {order.brand} {order.length}cm</p>
        </div>
        {onClose && (
          <button className="modal-close" onClick={onClose}>×</button>
        )}
      </div>

      <div className="phase-progress">
        {PHASE_STEP_INDICATORS.map((step, index) => {
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;
          const isRejected = order.rejectHistory?.some(
            (r) => r.toPhase === step.phase || r.fromPhase === step.phase
          );

          return (
            <div
              key={step.phase}
              className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isRejected ? 'rejected' : ''}`}
            >
              <div className="step-icon" style={{ backgroundColor: step.color }}>
                {isCompleted ? '✓' : step.icon}
              </div>
              <span className="step-label">{step.label}</span>
              {index < PHASE_STEP_INDICATORS.length - 1 && (
                <div className="step-connector" style={{ backgroundColor: isCompleted ? step.color : '#e2e8f0' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="phase-current-info">
        <div className="current-phase-badge" style={{ backgroundColor: phaseConfig.label === '接板登记' ? '#0ea5e9' : phaseConfig.label === '损伤评估' ? '#f97316' : phaseConfig.label === '调校报价' ? '#8b5cf6' : phaseConfig.label === '技师施工' ? '#dc2626' : phaseConfig.label === '质检确认' ? '#7c3aed' : '#14b8a6' }}>
          当前阶段：{phaseConfig.label}
        </div>
        {order.rejectHistory && order.rejectHistory.length > 0 && (
          <div className="reject-badge">
            🔄 已退回 {order.rejectHistory.length} 次
          </div>
        )}
      </div>

      <div className="phase-content">
        <div className="phase-main">
          <h3 className="section-title">字段编辑</h3>
          <div className="phase-fields-grid">
            {editableFields.filter((f) => f !== 'damageMarks' && f !== 'quoteSummary' && f !== 'qualityChecklist').map((field) => renderFieldEditor(field))}
          </div>

          {editableFields.includes('damageMarks') && (
            <div className="phase-section">
              <h4 className="subsection-title">损伤标记</h4>
              <BaseDamageMarker
                marks={order.damageMarks}
                onChange={(marks: BaseDamageMark[]) => handleFieldChange('damageMarks', marks)}
              />
            </div>
          )}

          {editableFields.includes('quoteSummary') && currentPhase === 'tuning_quote' && (
            <div className="phase-section">
              <h4 className="subsection-title">报价明细</h4>
              <QuoteEstimator
                initialBoardType={order.boardType}
                initialLength={order.length}
                initialWaxType={order.waxType}
                initialDamageCount={order.damageMarks?.length || 0}
                onApplyQuote={onApplyQuote}
                applyButtonText="保存报价"
              />
            </div>
          )}

          {editableFields.includes('qualityChecklist') && currentPhase === 'quality_check' && (
            <div className="phase-section">
              <h4 className="subsection-title">质检清单</h4>
              <QualityChecklistPanel
                checklist={order.qualityChecklist}
                workOrderId={order.id}
                workOrderStatus={order.status}
                onUpdateChecklist={onUpdateQualityChecklist}
                onCreateChecklist={onCreateQualityChecklist}
              />
            </div>
          )}

          {readonlyFields.length > 0 && (
            <div className="readonly-section">
              <h4 className="subsection-title">历史信息（只读）</h4>
              <div className="phase-fields-grid">
                {readonlyFields.map((field) => renderFieldEditor(field))}
              </div>
            </div>
          )}

          {order.quoteSummary && !editableFields.includes('quoteSummary') && (
            <div className="readonly-section">
              <h4 className="subsection-title">报价信息</h4>
              <div className="quote-summary-display">
                <div className="quote-row">
                  <span>人工费：</span>
                  <span>¥{order.quoteSummary.labor}</span>
                </div>
                <div className="quote-row">
                  <span>材料费：</span>
                  <span>¥{order.quoteSummary.material}</span>
                </div>
                {order.quoteSummary.rush > 0 && (
                  <div className="quote-row">
                    <span>加急费：</span>
                    <span>¥{order.quoteSummary.rush}</span>
                  </div>
                )}
                <div className="quote-row total">
                  <span>总计：</span>
                  <span>¥{order.quoteSummary.finalTotal}</span>
                </div>
                {order.quoteSummary.remark && (
                  <div className="quote-remark">备注：{order.quoteSummary.remark}</div>
                )}
              </div>
            </div>
          )}

          {hasUnsavedChanges && (
            <div className="unsaved-warning">
              ⚠️ 您有未保存的修改，请及时保存
            </div>
          )}
        </div>

        <div className="phase-sidebar">
          <div className="sidebar-section">
            <h4 className="sidebar-title">阶段操作</h4>
            <div className="action-buttons">
              {hasUnsavedChanges && (
                <button className="primary save-btn" onClick={handleSaveEdits}>
                  💾 保存修改
                </button>
              )}

              {phaseConfig.canTransitionForward && nextPhase && (
                <button
                  className={`primary next-btn ${!validation.valid ? 'disabled' : ''}`}
                  onClick={handleTransitionNext}
                  disabled={!validation.valid}
                >
                  ➡️ 推进至 {getPhaseConfig(nextPhase).label}
                </button>
              )}

              {phaseConfig.canReject && (
                <button
                  className="danger reject-btn"
                  onClick={() => setShowRejectModal(true)}
                >
                  ⬅️ 异常退回
                </button>
              )}
            </div>

            {!validation.valid && validation.errors.length > 0 && (
              <div className="validation-errors">
                <h5>⚠️ 完成本阶段还需：</h5>
                <ul>
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h4 className="sidebar-title">操作说明</h4>
            <div className="phase-description">
              {currentPhase === 'board_received' && (
                <p>登记客户信息和雪板基本信息，确认接板状态。填写完整后可推进至损伤评估阶段。</p>
              )}
              {currentPhase === 'damage_assessment' && (
                <p>全面检查雪板损伤情况，在底板图上标记损伤位置，评估修复难度和风险。</p>
              )}
              {currentPhase === 'tuning_quote' && (
                <p>根据损伤情况和客户需求制定调校方案，生成详细报价并与客户确认。</p>
              )}
              {currentPhase === 'technician_work' && (
                <p>技师按照方案进行施工，包括修刃、打蜡、底板修补等工作。</p>
              )}
              {currentPhase === 'quality_check' && (
                <p>按照质检清单逐项检查施工质量，确认所有项目达标后方可交付。</p>
              )}
              {currentPhase === 'customer_delivered' && (
                <p>工单已完成交付，客户已取走雪板。可查看完整历史记录。</p>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h4 className="sidebar-title">字段变更历史</h4>
            {order.fieldChangeHistory && order.fieldChangeHistory.length > 0 ? (
              <div className="change-records">
                {order.fieldChangeHistory.slice().reverse().slice(0, 10).map(renderFieldChangeRecord)}
              </div>
            ) : (
              <p className="empty-text">暂无变更记录</p>
            )}
          </div>

          {order.rejectHistory && order.rejectHistory.length > 0 && (
            <div className="sidebar-section">
              <h4 className="sidebar-title">退回记录</h4>
              <div className="reject-records">
                {order.rejectHistory.slice().reverse().map((reject) => (
                  <div key={reject.id} className="reject-record">
                    <div className="reject-header">
                      <span className="reject-phase">
                        {getPhaseConfig(reject.fromPhase).label} → {getPhaseConfig(reject.toPhase).label}
                      </span>
                      <span className="reject-time">{reject.rejectedAt}</span>
                    </div>
                    <div className="reject-reason">{reject.reason}</div>
                    {reject.rejectedBy && <div className="reject-operator">操作人：{reject.rejectedBy}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RejectModal
        isOpen={showRejectModal}
        currentPhase={currentPhase}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
      />
    </div>
  );
}
