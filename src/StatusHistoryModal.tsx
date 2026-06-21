import { WorkOrder, STATUS_CONFIG } from './types';

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

export default function StatusHistoryModal({ order, onClose }: StatusHistoryModalProps) {
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ borderLeftColor: 'var(--primary)' }}>
          <div>
            <h3>状态历史记录</h3>
            <p className="modal-subtitle">{order.id} · {order.brand} {order.length}cm</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="history-timeline">
            {order.statusHistory.slice().reverse().map((record, index) => (
              <div key={record.id} className="timeline-item">
                <div className="timeline-dot-wrapper">
                  <div
                    className="timeline-dot"
                    style={{ backgroundColor: getStatusColor(record.toStatus) }}
                  />
                  {index < order.statusHistory.length - 1 && (
                    <div className="timeline-line" />
                  )}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span
                      className="timeline-status"
                      style={{
                        backgroundColor: getStatusColor(record.toStatus) + '15',
                        color: getStatusColor(record.toStatus),
                      }}
                    >
                      {getStatusLabel(record.toStatus)}
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
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
