import { WorkOrder, Technician, WorkOrderAssignment, DAMAGE_TYPES, SEVERITY_LEVELS, STATUS_CONFIG, isQualityCheckCompleted } from './types';

interface WorkOrderListProps {
  orders: WorkOrder[];
  onEditOrder: (order: WorkOrder) => void;
  onToggleStatus: (orderId: string) => void;
  editingOrderId: string | null;
  onOpenQuote?: (order: WorkOrder) => void;
  onOpenQa?: (order: WorkOrder) => void;
  onOpenPhaseEditor?: (order: WorkOrder) => void;
  assignments?: WorkOrderAssignment[];
  technicians?: Technician[];
  selectedOrderIds: string[];
  onToggleSelect: (orderId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExportSummary: () => void;
}

const getStatusInfo = (status: string) => {
  const config = STATUS_CONFIG.find((s) => s.value === status);
  return {
    label: config?.label ?? status,
    color: config?.color ?? '#64748b',
  };
};

const getDamageTypeLabel = (type: string) =>
  DAMAGE_TYPES.find((t) => t.value === type)?.label ?? type;

const getSeverityLabel = (sev: string) =>
  SEVERITY_LEVELS.find((s) => s.value === sev)?.label ?? sev;

export default function WorkOrderList({ orders, onEditOrder, onToggleStatus, editingOrderId, onOpenQuote, onOpenQa, onOpenPhaseEditor, assignments = [], technicians = [], selectedOrderIds, onToggleSelect, onSelectAll, onClearSelection, onExportSummary }: WorkOrderListProps) {
  const allSelected = orders.length > 0 && selectedOrderIds.length === orders.length;
  const someSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < orders.length;

  const handleExportClick = () => {
    if (selectedOrderIds.length === 0) {
      alert('请先选择要导出的工单');
      return;
    }
    onExportSummary();
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>历史记录</p>
          <h2>近期工单</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedOrderIds.length > 0 && (
            <span style={{ fontSize: 13, color: '#64748b' }}>
              已选 {selectedOrderIds.length} 项
            </span>
          )}
          <button
            onClick={onSelectAll}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #94a3b8',
              background: 'transparent',
              color: '#475569',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
          {selectedOrderIds.length > 0 && (
            <button
              onClick={onClearSelection}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #64748b',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              清空选择
            </button>
          )}
          <button
            onClick={handleExportClick}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: selectedOrderIds.length > 0 ? '#0ea5e9' : '#cbd5e1',
              color: 'white',
              cursor: selectedOrderIds.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 13,
            }}
          >
            📤 导出摘要
          </button>
        </div>
      </div>
      <div className="records">
        {orders.map((order, index) => {
          const status = getStatusInfo(order.status);
          const isEditing = order.id === editingOrderId;
          const hasMarks = order.damageMarks && order.damageMarks.length > 0;
          const assignment = assignments.find((a) => a.workOrderId === order.id);
          const technician = assignment ? technicians.find((t) => t.id === assignment.technicianId) : undefined;

          const isSelected = selectedOrderIds.includes(order.id);

          return (
            <article
              key={order.id}
              className={isEditing ? 'editing' : ''}
              style={{
                ...(isEditing ? { boxShadow: '0 0 0 2px var(--primary), 0 4px 16px rgba(31, 41, 55, 0.08)' } : undefined),
                ...(isSelected ? { boxShadow: '0 0 0 2px #0ea5e9, 0 4px 16px rgba(14, 165, 233, 0.15)' } : undefined),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(order.id)}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    accentColor: '#0ea5e9',
                  }}
                />
                <b>{String(index + 1).padStart(2, '0')}</b>
              </div>
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

                {technician && assignment && (
                  <div className="record-assignment">
                    <div className="record-assignment-avatar" style={{ background: technician.avatarColor }}>
                      {technician.name.charAt(0)}
                    </div>
                    <div className="record-assignment-info">
                      <strong>{technician.name}</strong>
                      <span>
                        {assignment.priority >= 3 ? '🚨 紧急' : assignment.priority === 2 ? '⚡ 较高优先级' : '📋 普通优先级'}
                        {' · '}预计 {assignment.estimatedMinutes}分钟
                        {assignment.note && ` · 📝 ${assignment.note}`}
                      </span>
                    </div>
                  </div>
                )}

                {!technician && order.status !== 'customer_delivered' && (
                  <p className="record-note unassigned-note">
                    ⚠️ 该工单尚未分配技师，请前往排班与分配模块进行分配
                  </p>
                )}

                {order.quoteSummary && order.quoteSummary.finalTotal > 0 && (
                  <div className="quote-summary-card" style={{ marginTop: 10 }}>
                    <div className="quote-summary-header">
                      <span className="quote-summary-title">💰 报价</span>
                      <span className="quote-summary-price">¥{order.quoteSummary.finalTotal}</span>
                    </div>
                    <div className="quote-summary-detail">
                      人工 ¥{order.quoteSummary.labor} · 材料 ¥{order.quoteSummary.material}
                      {order.quoteSummary.rush > 0 && ` · 加急 ¥${order.quoteSummary.rush}`}
                    </div>
                    {order.quoteSummary.remark && (
                      <div className="quote-summary-remark">{order.quoteSummary.remark}</div>
                    )}
                  </div>
                )}

                <div className="record-actions">
                  {onOpenPhaseEditor && (
                    <button
                      className="small-btn"
                      onClick={() => onOpenPhaseEditor(order)}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      ⚙️ 流程编辑
                    </button>
                  )}
                  <button
                    className="secondary small-btn"
                    onClick={() => onEditOrder(order)}
                    disabled={isEditing}
                  >
                    {isEditing ? '编辑中...' : '编辑工单'}
                  </button>
                  {onOpenQuote && (
                    <button
                      className="secondary small-btn"
                      onClick={() => onOpenQuote(order)}
                    >
                      🧮 报价
                    </button>
                  )}
                  {onOpenQa && (
                    <button
                      className={`secondary small-btn ${isQualityCheckCompleted(order.qualityChecklist) ? 'qa-completed-btn' : ''}`}
                      onClick={() => onOpenQa(order)}
                    >
                      ✅ 质检
                    </button>
                  )}
                  <button
                    className={`small-btn ${order.status === 'customer_delivered' ? 'secondary' : 'primary'}`}
                    onClick={() => onToggleStatus(order.id)}
                  >
                    {order.status === 'customer_delivered' ? '重新开始' : '推进状态'}
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
