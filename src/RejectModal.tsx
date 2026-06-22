import { useState } from 'react';
import { WorkOrderPhase, PHASE_ORDER, getPhaseConfig } from './types';

interface RejectModalProps {
  isOpen: boolean;
  currentPhase: WorkOrderPhase;
  onClose: () => void;
  onReject: (targetPhase: WorkOrderPhase, reason: string) => void;
}

const REJECT_REASON_TEMPLATES = [
  '损伤评估不完整，需要重新检查',
  '报价与客户需求不符，需重新核算',
  '施工质量不达标，需返工处理',
  '质检发现问题，需返回上一阶段修复',
  '客户变更需求，需重新评估',
  '发现新的损伤，需补充评估',
];

export default function RejectModal({ isOpen, currentPhase, onClose, onReject }: RejectModalProps) {
  const [targetPhase, setTargetPhase] = useState<WorkOrderPhase | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const availablePhases = PHASE_ORDER.slice(0, currentIndex);

  const handleTemplateClick = (template: string) => {
    setReason(template);
  };

  const handleSubmit = () => {
    const newErrors: string[] = [];

    if (!targetPhase) {
      newErrors.push('请选择退回的目标阶段');
    }

    if (!reason.trim()) {
      newErrors.push('请填写退回原因');
    } else if (reason.trim().length < 5) {
      newErrors.push('退回原因至少需要5个字符');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onReject(targetPhase!, reason.trim());
    setTargetPhase(null);
    setReason('');
    setErrors([]);
  };

  const handleCancel = () => {
    setTargetPhase(null);
    setReason('');
    setErrors([]);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="modal-content reject-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ borderLeftColor: '#dc2626' }}>
          <div>
            <h3>⚠️ 异常退回</h3>
            <p className="modal-subtitle">
              将工单从「{getPhaseConfig(currentPhase).label}」退回到之前的阶段
            </p>
          </div>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>

        <div className="modal-body">
          {errors.length > 0 && (
            <div className="error-alert">
              <ul>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label>选择退回目标阶段 <span className="required">*</span></label>
            <div className="phase-options">
              {availablePhases.map((phase) => {
                const config = getPhaseConfig(phase);
                return (
                  <div
                    key={phase}
                    className={`phase-option ${targetPhase === phase ? 'selected' : ''}`}
                    onClick={() => setTargetPhase(phase)}
                  >
                    <div
                      className="phase-option-icon"
                      style={{
                        backgroundColor:
                          phase === 'board_received' ? '#0ea5e9' :
                          phase === 'damage_assessment' ? '#f97316' :
                          phase === 'tuning_quote' ? '#8b5cf6' :
                          phase === 'technician_work' ? '#dc2626' :
                          phase === 'quality_check' ? '#7c3aed' : '#14b8a6'
                      }}
                    >
                      {phase === 'board_received' ? '📋' :
                       phase === 'damage_assessment' ? '🔍' :
                       phase === 'tuning_quote' ? '🧮' :
                       phase === 'technician_work' ? '🔧' :
                       phase === 'quality_check' ? '✅' : '📦'}
                    </div>
                    <div className="phase-option-info">
                      <span className="phase-option-name">{config.label}</span>
                      <span className="phase-option-desc">
                        {phase === 'board_received' && '接板登记阶段'}
                        {phase === 'damage_assessment' && '损伤评估阶段'}
                        {phase === 'tuning_quote' && '调校报价阶段'}
                        {phase === 'technician_work' && '技师施工阶段'}
                        {phase === 'quality_check' && '质检确认阶段'}
                      </span>
                    </div>
                    <div className="phase-option-check">
                      {targetPhase === phase && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>退回原因 <span className="required">*</span></label>
            <div className="reason-templates">
              {REJECT_REASON_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="template-btn"
                  onClick={() => handleTemplateClick(template)}
                >
                  {template}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细描述退回原因，以便相关人员了解问题并进行整改..."
              rows={4}
              className="reason-textarea"
            />
            <div className="char-count">
              {reason.length}/500 字符（至少5个字符）
            </div>
          </div>

          <div className="warning-box">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <p><strong>退回操作将：</strong></p>
              <ul>
                <li>将工单状态重置到目标阶段</li>
                <li>在状态历史中记录退回原因</li>
                <li>统计指标将自动更新（退回次数、周期时间等）</li>
                <li>通知相关阶段负责人处理</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={handleCancel}>取消</button>
          <button
            className="danger"
            onClick={handleSubmit}
            disabled={!targetPhase || reason.trim().length < 5}
          >
            确认退回
          </button>
        </div>
      </div>
    </div>
  );
}
