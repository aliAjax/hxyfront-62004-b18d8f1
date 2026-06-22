import { WorkOrder, Technician, WorkOrderAssignment, DAMAGE_TYPES, SEVERITY_LEVELS, STATUS_CONFIG, isQualityCheckCompleted } from './types';

interface WorkOrderCardProps {
  order: WorkOrder;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onViewHistory: (order: WorkOrder) => void;
  onOpenQuote?: (order: WorkOrder) => void;
  onOpenQa?: (order: WorkOrder) => void;
  onOpenPhaseEditor?: (order: WorkOrder) => void;
  assignment?: WorkOrderAssignment;
  technician?: Technician;
}

const getDamageTypeLabel = (type: string) =>
  DAMAGE_TYPES.find((t) => t.value === type)?.label ?? type;

const getSeverityLabel = (sev: string) =>
  SEVERITY_LEVELS.find((s) => s.value === sev)?.label ?? sev;

const isOverdue = (estimatedDelivery: string) => {
  const today = new Date();
  const delivery = new Date(estimatedDelivery);
  today.setHours(0, 0, 0, 0);
  delivery.setHours(0, 0, 0, 0);
  return delivery < today;
};

const getDaysUntilDelivery = (estimatedDelivery: string) => {
  const today = new Date();
  const delivery = new Date(estimatedDelivery);
  today.setHours(0, 0, 0, 0);
  delivery.setHours(0, 0, 0, 0);
  const diffTime = delivery.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function WorkOrderCard({ order, onDragStart, onDragEnd, onViewHistory, onOpenQuote, onOpenQa, onOpenPhaseEditor, assignment, technician }: WorkOrderCardProps) {
  const hasMarks = order.damageMarks && order.damageMarks.length > 0;
  const statusInfo = STATUS_CONFIG.find((s) => s.value === order.status);
  const overdue = isOverdue(order.estimatedDelivery);
  const daysUntil = getDaysUntilDelivery(order.estimatedDelivery);
  const hasQuote = order.quoteSummary && order.quoteSummary.finalTotal > 0;
  const qaCompleted = isQualityCheckCompleted(order.qualityChecklist);
  const hasQa = order.qualityChecklist !== undefined;

  return (
    <article
      className="kanban-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', order.id);
        onDragStart(order.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card-header">
        <h3 className="kanban-card-id">{order.id}</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasQa && (
            <span
              className="kanban-card-qa-badge"
              title={qaCompleted ? '质检已完成' : '质检进行中'}
              style={{
                backgroundColor: qaCompleted ? '#dcfce7' : '#fef3c7',
                color: qaCompleted ? '#166534' : '#92400e',
              }}
            >
              {qaCompleted ? '✓ 质检完成' : '⏳ 质检中'}
            </span>
          )}
          <span
            className="kanban-card-status"
            style={{
              backgroundColor: (statusInfo?.color ?? '#64748b') + '15',
              color: statusInfo?.color ?? '#64748b',
            }}
          >
            {statusInfo?.icon} {statusInfo?.label}
          </span>
        </div>
      </div>

      <div className="kanban-card-board">
        <span className="kanban-card-brand">{order.brand}</span>
        <span className="kanban-card-size">{order.length}cm</span>
        <span className="kanban-card-type">{order.boardType}</span>
      </div>

      <div className="kanban-card-params">
        <div className="param-item">
          <span className="param-label">侧刃</span>
          <span className="param-value">{order.sideEdgeAngle}</span>
        </div>
        <div className="param-item">
          <span className="param-label">底刃</span>
          <span className="param-value">{order.baseEdgeAngle}</span>
        </div>
        <div className="param-item">
          <span className="param-label">蜡型</span>
          <span className="param-value">{order.waxType}</span>
        </div>
      </div>

      {order.baseDamage && order.baseDamage !== '无' && (
        <div className="kanban-card-damage">
          <span className="damage-icon">⚠</span>
          <span className="damage-text">{order.baseDamage}</span>
          {order.repairLocation && (
            <span className="damage-location">· {order.repairLocation}</span>
          )}
        </div>
      )}

      {hasMarks && (
        <div className="kanban-card-marks">
          {order.damageMarks.map((mark) => {
            const typeInfo = DAMAGE_TYPES.find((t) => t.value === mark.type);
            return (
              <span
                key={mark.id}
                className="mark-tag"
                style={{
                  background: (typeInfo?.color ?? '#64748b') + '12',
                  color: typeInfo?.color ?? '#64748b',
                  borderColor: (typeInfo?.color ?? '#64748b') + '30',
                }}
                title={`${mark.locationNote} · ${mark.length}cm · ${getSeverityLabel(mark.severity)} · ${mark.repairMethod}`}
              >
                {typeInfo?.icon} {getDamageTypeLabel(mark.type)}
                <em>{mark.length}cm</em>
              </span>
            );
          })}
        </div>
      )}

      <div className="kanban-card-delivery">
        <span className={`delivery-icon ${overdue ? 'overdue' : ''}`}>
          {overdue ? '⏰' : '📅'}
        </span>
        <span className={`delivery-text ${overdue ? 'overdue' : ''}`}>
          {overdue ? `已逾期 ${Math.abs(daysUntil)} 天` : daysUntil === 0 ? '今日交付' : `预计 ${daysUntil} 天后交付`}
        </span>
        <span className="delivery-date">{order.estimatedDelivery}</span>
      </div>

      {order.riskWarning && (
        <div className="kanban-card-risk">
          <span className="risk-icon">🚨</span>
          <span className="risk-text">{order.riskWarning}</span>
        </div>
      )}

      {order.customerPreference && (
        <div className="kanban-card-preference">
          <span className="preference-label">客户偏好：</span>
          <span className="preference-value">{order.customerPreference}</span>
        </div>
      )}

      {technician && assignment && (
        <div className="kanban-card-assignment">
          <div className="assignment-avatar" style={{ background: technician.avatarColor }}>
            {technician.name.charAt(0)}
          </div>
          <div className="assignment-info">
            <span className="assignment-tech-name">{technician.name}</span>
            <span className="assignment-meta">
              {assignment.priority >= 3 ? '🚨 紧急' : assignment.priority === 2 ? '⚡ 较高' : '📋 普通'}
              {' · '}预计 {assignment.estimatedMinutes}分钟
            </span>
          </div>
        </div>
      )}

      {!technician && order.status !== 'delivered' && (
        <div className="kanban-card-unassigned">
          <span>⚠️ 未分配技师</span>
        </div>
      )}

      {hasQuote && order.quoteSummary && (
        <div className="quote-summary-card">
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

      <div className="kanban-card-footer">
        <span className="card-date">创建于 {order.createdAt}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {onOpenPhaseEditor && (
            <button
              className="card-history-btn phase-editor-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPhaseEditor(order);
              }}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                color: 'white',
                border: 'none',
              }}
            >
              ⚙️ 流程编辑
            </button>
          )}
          {onOpenQuote && (
            <button
              className="card-history-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuote(order);
              }}
            >
              🧮 报价
            </button>
          )}
          {onOpenQa && (
            <button
              className={`card-history-btn ${qaCompleted ? 'qa-completed-btn' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenQa(order);
              }}
            >
              ✅ 质检
            </button>
          )}
          <button
            className="card-history-btn"
            onClick={() => onViewHistory(order)}
          >
            📋 历史
          </button>
        </div>
      </div>
    </article>
  );
}
