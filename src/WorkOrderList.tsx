import { WorkOrder, DAMAGE_TYPES, SEVERITY_LEVELS } from './types';

interface WorkOrderListProps {
  orders: WorkOrder[];
  onEditOrder: (order: WorkOrder) => void;
  onToggleStatus: (orderId: string) => void;
  editingOrderId: string | null;
}

const statusMap = {
  pending: { label: '待维护', color: 'var(--accent)' },
  completed: { label: '已完工', color: 'var(--secondary)' },
};

const getDamageTypeLabel = (type: string) =>
  DAMAGE_TYPES.find((t) => t.value === type)?.label ?? type;

const getSeverityLabel = (sev: string) =>
  SEVERITY_LEVELS.find((s) => s.value === sev)?.label ?? sev;

export default function WorkOrderList({ orders, onEditOrder, onToggleStatus, editingOrderId }: WorkOrderListProps) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>历史记录</p>
          <h2>近期工单</h2>
        </div>
        <button>导出摘要</button>
      </div>
      <div className="records">
        {orders.map((order, index) => {
          const status = statusMap[order.status];
          const isEditing = order.id === editingOrderId;
          const hasMarks = order.damageMarks && order.damageMarks.length > 0;

          return (
            <article
              key={order.id}
              className={isEditing ? 'editing' : ''}
              style={isEditing ? { boxShadow: '0 0 0 2px var(--primary), 0 4px 16px rgba(31, 41, 55, 0.08)' } : undefined}
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <div className="record-content">
                <div className="record-header">
                  <h3>{order.id}</h3>
                  <span
                    className="status-tag"
                    style={{ backgroundColor: status.color + '20', color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="record-main">
                  {order.brand} · {order.length}cm · {order.boardType}
                </p>
                <p className="record-detail">
                  侧刃{order.sideEdgeAngle}，底刃{order.baseEdgeAngle} · {order.waxType}
                </p>
                {order.baseDamage && (
                  <p className="record-note">
                    损伤：{order.baseDamage}（{order.repairLocation || '位置待确认'}）
                  </p>
                )}

                {hasMarks && (
                  <div className="damage-summary">
                    <div className="damage-summary-header">
                      <span className="damage-summary-title">底板标记</span>
                      <span className="damage-summary-count">{order.damageMarks.length} 处</span>
                    </div>
                    <div className="damage-summary-tags">
                      {order.damageMarks.map((mark, idx) => {
                        const typeInfo = DAMAGE_TYPES.find((t) => t.value === mark.type);
                        return (
                          <span
                            key={mark.id}
                            className="damage-summary-tag"
                            style={{
                              background: (typeInfo?.color ?? '#64748b') + '15',
                              color: typeInfo?.color ?? '#64748b',
                              borderColor: (typeInfo?.color ?? '#64748b') + '40',
                            }}
                            title={`${mark.locationNote} · ${mark.length}cm · ${getSeverityLabel(mark.severity)} · ${mark.repairMethod}`}
                          >
                            {typeInfo?.icon} {getDamageTypeLabel(mark.type)}
                            <em>{mark.length}cm</em>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {order.customerPreference && (
                  <p className="record-note">偏好：{order.customerPreference}</p>
                )}

                <div className="record-actions">
                  <button
                    className="secondary small-btn"
                    onClick={() => onEditOrder(order)}
                    disabled={isEditing}
                  >
                    {isEditing ? '编辑中...' : '编辑工单'}
                  </button>
                  <button
                    className={`small-btn ${order.status === 'completed' ? 'secondary' : 'primary'}`}
                    onClick={() => onToggleStatus(order.id)}
                  >
                    {order.status === 'pending' ? '标记完工' : '恢复待维护'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
