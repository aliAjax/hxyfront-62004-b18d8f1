import { useState } from 'react';
import { WorkOrder, STATUS_CONFIG, FIELD_LABELS, FieldChangeRecord } from './types';

interface StatusHistoryModalProps {
  order: WorkOrder | null;
  onClose: () => void;
}

const getStatusLabel = (status: string | null) => {
  if (!status) return '创建';
  return STATUS_CONFIG.find((s) => s.value === status)?.label ?? status;
};

const getStatusColor = (status: string | null) => {
  if (!status) return '#64748b';
  return STATUS_CONFIG.find((s) => s.value === status)?.color ?? '#64748b';
};

type TabType = 'status' | 'fields' | 'rejects';

export default function StatusHistoryModal({ order, onClose }: StatusHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status');

  if (!order) return null;

  const renderFieldChangeRecord = (record: FieldChangeRecord) => {
    const fieldLabel = FIELD_LABELS[record.field] || record.field;
    return (
      <div key={record.id} className="field-change-item">
        <div className="field-change-header">
          <span className="field-name">{fieldLabel}</span>
          <span className="field-time">{record.changedAt}</span>
        </div>
        <div className="field-change-values">
          <span className="old-value">{JSON.stringify(record.oldValue)}</span>
          <span className="change-arrow">→</span>
          <span className="new-value">{JSON.stringify(record.newValue)}</span>
        </div>
        {record.note && <div className="field-note">{record.note}</div>}
        {record.changedBy && <div className="field-operator">操作人：{record.changedBy}</div>}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px' }}
      >
        <div className="modal-header" style={{ borderLeftColor: 'var(--primary)' }}>
          <div>
            <h3>工单历史记录</h3>
            <p className="modal-subtitle">{order.id} · {order.brand} {order.length}cm</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            状态流转 ({order.statusHistory.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            字段变更 ({order.fieldChangeHistory?.length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === 'rejects' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejects')}
          >
            异常退回 ({order.rejectHistory?.length || 0})
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'status' && (
            <div className="history-timeline">
              {order.statusHistory.slice().reverse().map((record, index) => (
                <div key={record.id} className={`timeline-item ${record.isReject ? 'reject-item' : ''}`}>
                  <div className="timeline-dot-wrapper">
                    <div
                      className="timeline-dot"
                      style={{
                        backgroundColor: record.isReject ? '#dc2626' : getStatusColor(record.toStatus),
                      }}
                    >
                      {record.isReject && '↩'}
                    </div>
                    {index < order.statusHistory.length - 1 && (
                      <div className={`timeline-line ${record.isReject ? 'reject-line' : ''}`} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span
                        className={`timeline-status ${record.isReject ? 'reject-status' : ''}`}
                        style={{
                          backgroundColor: record.isReject
                            ? '#fef2f2'
                            : getStatusColor(record.toStatus) + '15',
                          color: record.isReject ? '#dc2626' : getStatusColor(record.toStatus),
                        }}
                      >
                        {record.isReject ? '⚠️ 异常退回' : getStatusLabel(record.toStatus)}
                      </span>
                      <span className="timeline-time">{record.timestamp}</span>
                    </div>
                    {record.fromStatus !== null && (
                      <div className="timeline-transition">
                        <span className="transition-label">从</span>
                        <span
                          className="transition-status"
                          style={{
                            backgroundColor: getStatusColor(record.fromStatus) + '10',
                            color: getStatusColor(record.fromStatus),
                          }}
                        >
                          {getStatusLabel(record.fromStatus)}
                        </span>
                        <span className="transition-arrow">→</span>
                        <span
                          className="transition-status"
                          style={{
                            backgroundColor: getStatusColor(record.toStatus) + '10',
                            color: getStatusColor(record.toStatus),
                          }}
                        >
                          {getStatusLabel(record.toStatus)}
                        </span>
                      </div>
                    )}
                    {record.note && (
                      <p className="timeline-note">{record.note}</p>
                    )}
                    {record.rejectReason && (
                      <div className="reject-reason-box">
                        <strong>退回原因：</strong>
                        <p>{record.rejectReason}</p>
                      </div>
                    )}
                    {record.fieldChanges && record.fieldChanges.length > 0 && (
                      <div className="timeline-field-changes">
                        <span className="field-changes-label">本次变更字段：</span>
                        {record.fieldChanges.map((fc, idx) => (
                          <span key={idx} className="field-change-tag">
                            {FIELD_LABELS[fc.field] || fc.field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="field-changes-list">
              {order.fieldChangeHistory && order.fieldChangeHistory.length > 0 ? (
                order.fieldChangeHistory.slice().reverse().map(renderFieldChangeRecord)
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>暂无字段变更记录</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rejects' && (
            <div className="rejects-list">
              {order.rejectHistory && order.rejectHistory.length > 0 ? (
                order.rejectHistory.slice().reverse().map((reject) => (
                  <div key={reject.id} className="reject-item-detail">
                    <div className="reject-detail-header">
                      <span className="reject-detail-icon">⚠️</span>
                      <div className="reject-detail-info">
                        <span className="reject-detail-phase">
                          {getStatusLabel(reject.fromPhase)} → {getStatusLabel(reject.toPhase)}
                        </span>
                        <span className="reject-detail-time">{reject.rejectedAt}</span>
                      </div>
                    </div>
                    <div className="reject-detail-reason">
                      <strong>退回原因：</strong>
                      <p>{reject.reason}</p>
                    </div>
                    {reject.rejectedBy && (
                      <div className="reject-detail-operator">
                        操作人：{reject.rejectedBy}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">✅</span>
                  <p>该工单无异常退回记录</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
