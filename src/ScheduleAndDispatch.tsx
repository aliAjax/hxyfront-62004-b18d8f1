import { useState, useMemo } from 'react';
import {
  WorkOrder,
  Technician,
  WorkOrderAssignment,
  AssignmentViewMode,
  TechnicianStatus,
  SKILL_LEVEL_CONFIG,
  TECHNICIAN_STATUS_CONFIG,
  STATUS_CONFIG,
  calculateEstimatedMinutes,
  calculateComplexityScore,
  SeverityLevel,
  SEVERITY_LEVELS,
} from './types';

interface ScheduleAndDispatchProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  assignments: WorkOrderAssignment[];
  onAssign: (assignment: WorkOrderAssignment) => void;
  onReassign: (assignmentId: string, newTechnicianId: string) => void;
  onUpdateTechnicianStatus: (technicianId: string, status: TechnicianStatus) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

const getComplexityLabel = (score: number): { label: string; color: string; bgColor: string } => {
  if (score >= 7) return { label: '极高', color: '#dc2626', bgColor: '#fee2e2' };
  if (score >= 5) return { label: '高', color: '#ea580c', bgColor: '#ffedd5' };
  if (score >= 3) return { label: '中', color: '#ca8a04', bgColor: '#fef9c3' };
  return { label: '低', color: '#16a34a', bgColor: '#dcfce7' };
};

const getOverdueStatus = (order: WorkOrder): { isOverdue: boolean; isUrgent: boolean } => {
  const today = new Date();
  const delivery = new Date(order.estimatedDelivery);
  today.setHours(0, 0, 0, 0);
  delivery.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isOverdue: diffDays < 0,
    isUrgent: diffDays <= 1 && diffDays >= 0,
  };
};

export default function ScheduleAndDispatch({
  workOrders,
  technicians,
  assignments,
  onAssign,
  onReassign,
  onUpdateTechnicianStatus,
  onRemoveAssignment,
}: ScheduleAndDispatchProps) {
  const [viewMode, setViewMode] = useState<AssignmentViewMode>('board');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [reassigningAssignmentId, setReassigningAssignmentId] = useState<string | null>(null);
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [assignmentPriority, setAssignmentPriority] = useState<number>(1);

  const pendingOrders = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.workOrderId));
    return workOrders
      .filter((o) => o.status !== 'delivered' && !assignedIds.has(o.id))
      .sort((a, b) => {
        const aOverdue = getOverdueStatus(a);
        const bOverdue = getOverdueStatus(b);
        if (aOverdue.isOverdue && !bOverdue.isOverdue) return -1;
        if (!aOverdue.isOverdue && bOverdue.isOverdue) return 1;
        if (aOverdue.isUrgent && !bOverdue.isUrgent) return -1;
        if (!aOverdue.isUrgent && bOverdue.isUrgent) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [workOrders, assignments]);

  const technicianWorkload = useMemo(() => {
    return technicians.map((tech) => {
      const techAssignments = assignments.filter((a) => a.technicianId === tech.id);
      const totalMinutes = techAssignments.reduce((sum, a) => sum + a.estimatedMinutes, 0);
      const effectiveCapacity = tech.dailyCapacityMinutes * SKILL_LEVEL_CONFIG[tech.skillLevel].capacityMultiplier;
      const loadPercent = Math.min(100, Math.round((totalMinutes / effectiveCapacity) * 100));
      const isOverloaded = totalMinutes > effectiveCapacity;
      return {
        technician: tech,
        assignments: techAssignments,
        totalMinutes,
        effectiveCapacity,
        loadPercent,
        isOverloaded,
      };
    });
  }, [technicians, assignments]);

  const queueOrders = useMemo(() => {
    return [...assignments]
      .map((a) => {
        const order = workOrders.find((o) => o.id === a.workOrderId);
        const tech = technicians.find((t) => t.id === a.technicianId);
        return { assignment: a, order, tech };
      })
      .filter((item): item is { assignment: WorkOrderAssignment; order: WorkOrder; tech: Technician } => !!item.order && !!item.tech)
      .sort((a, b) => {
        if (a.assignment.priority !== b.assignment.priority) return b.assignment.priority - a.assignment.priority;
        return new Date(a.assignment.assignedAt).getTime() - new Date(b.assignment.assignedAt).getTime();
      });
  }, [assignments, workOrders, technicians]);

  const handleAssignOrder = (orderId: string, technicianId: string) => {
    const order = workOrders.find((o) => o.id === orderId);
    if (!order) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const techCurrentAssignments = assignments.filter((a) => a.technicianId === technicianId);
    const maxQueuePos = techCurrentAssignments.length > 0 
      ? Math.max(...techCurrentAssignments.map((a) => a.queuePosition))
      : 0;

    const newAssignment: WorkOrderAssignment = {
      id: `ASM-${orderId}-${Date.now()}`,
      workOrderId: orderId,
      technicianId,
      assignedAt: timestamp,
      estimatedMinutes: calculateEstimatedMinutes(order),
      complexityScore: calculateComplexityScore(order),
      priority: assignmentPriority,
      queuePosition: maxQueuePos + 1,
      note: assignmentNote || undefined,
    };

    onAssign(newAssignment);
    setAssigningOrderId(null);
    setAssignmentNote('');
    setAssignmentPriority(1);
  };

  const handleReassign = (assignmentId: string, newTechnicianId: string) => {
    onReassign(assignmentId, newTechnicianId);
    setReassigningAssignmentId(null);
  };

  const getOrderById = (id: string) => workOrders.find((o) => o.id === id);
  const getTechById = (id: string) => technicians.find((t) => t.id === id);
  const getAssignmentByOrderId = (orderId: string) => assignments.find((a) => a.workOrderId === orderId);

  const WorkOrderMiniCard = ({ order, compact = false }: { order: WorkOrder; compact?: boolean }) => {
    const statusConfig = STATUS_CONFIG.find((s) => s.value === order.status);
    const overdue = getOverdueStatus(order);
    const complexity = getComplexityLabel(calculateComplexityScore(order));
    const estMinutes = calculateEstimatedMinutes(order);

    return (
      <div
        className={`dispatch-mini-card ${overdue.isOverdue ? 'overdue' : ''} ${overdue.isUrgent ? 'urgent' : ''}`}
      >
        <div className="mini-card-header">
          <span className="mini-card-id">{order.id}</span>
          <span className="status-tag" style={{ background: statusConfig?.color + '20', color: statusConfig?.color }}>
            {statusConfig?.icon} {statusConfig?.label}
          </span>
        </div>
        <div className="mini-card-body">
          <div className="mini-card-brand">
            <strong>{order.brand}</strong>
            <span className="mini-card-size">{order.length}cm</span>
            <span className="mini-card-type">{order.boardType}</span>
          </div>
          {!compact && order.damageMarks.length > 0 && (
            <div className="mini-card-damage">
              {order.damageMarks.slice(0, 2).map((m) => (
                <span
                  key={m.id}
                  className="damage-pill"
                  style={{
                    color: m.severity === 'severe' ? '#dc2626' : m.severity === 'moderate' ? '#ea580c' : '#16a34a',
                    background: m.severity === 'severe' ? '#fee2e2' : m.severity === 'moderate' ? '#ffedd5' : '#dcfce7',
                  }}
                >
                  {m.type === 'scratch' ? '划痕' : m.type === 'dent' ? '凹坑' : m.type === 'burn' ? '烧伤' : '脱层'}
                  {SEVERITY_LEVELS.find((s) => s.value === m.severity)?.label}
                </span>
              ))}
              {order.damageMarks.length > 2 && (
                <span className="more-damage">+{order.damageMarks.length - 2}</span>
              )}
            </div>
          )}
        </div>
        <div className="mini-card-footer">
          <span className="complexity-badge" style={{ background: complexity.bgColor, color: complexity.color }}>
            复杂度{complexity.label}
          </span>
          <span className="est-time">⏱ {formatMinutes(estMinutes)}</span>
        </div>
        {overdue.isOverdue && <div className="overdue-banner">已逾期</div>}
        {overdue.isUrgent && !overdue.isOverdue && <div className="urgent-banner">今日到期</div>}
      </div>
    );
  };

  const TechniciansPanel = () => (
    <div className="technicians-panel">
      <div className="panel-heading">
        <h3>技师排班状态</h3>
        <div className="panel-stats">
          <span className="stat-chip on-duty">
            在岗 {technicianWorkload.filter((t) => t.technician.status === 'on_duty').length}
          </span>
          <span className="stat-chip overload">
            超负荷 {technicianWorkload.filter((t) => t.isOverloaded).length}
          </span>
        </div>
      </div>
      <div className="technicians-grid">
        {technicianWorkload.map(({ technician, totalMinutes, effectiveCapacity, loadPercent, isOverloaded, assignments: techAssignments }) => {
          const displayStatus = isOverloaded ? 'overloaded' : technician.status;
          const statusConfig = TECHNICIAN_STATUS_CONFIG[displayStatus];
          const skillConfig = SKILL_LEVEL_CONFIG[technician.skillLevel];

          return (
            <div
              key={technician.id}
              className={`technician-card ${isOverloaded ? 'overloaded' : ''} ${selectedTechnicianId === technician.id ? 'selected' : ''}`}
              onClick={() => setSelectedTechnicianId(selectedTechnicianId === technician.id ? null : technician.id)}
            >
              <div className="tech-header">
                <div className="tech-avatar" style={{ background: technician.avatarColor }}>
                  {technician.name.charAt(0)}
                </div>
                <div className="tech-info">
                  <div className="tech-name">
                    {technician.name}
                    <span className="skill-badge" style={{ background: skillConfig.color + '20', color: skillConfig.color }}>
                      {skillConfig.label}
                    </span>
                  </div>
                  <div className="tech-status" style={{ background: statusConfig.bgColor, color: statusConfig.color }}>
                    {statusConfig.icon} {statusConfig.label}
                  </div>
                </div>
                <select
                  className="tech-status-select"
                  value={technician.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateTechnicianStatus(technician.id, e.target.value as TechnicianStatus)}
                >
                  <option value="on_duty">在岗</option>
                  <option value="break">休息</option>
                  <option value="off_duty">离岗</option>
                </select>
              </div>

              <div className="workload-bar">
                <div className="workload-track">
                  <div
                    className={`workload-fill ${loadPercent > 90 ? 'danger' : loadPercent > 70 ? 'warning' : 'safe'}`}
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
                <div className="workload-labels">
                  <span>{formatMinutes(totalMinutes)}</span>
                  <span className={isOverloaded ? 'overload-text' : ''}>
                    {loadPercent}% / {formatMinutes(Math.round(effectiveCapacity))}
                  </span>
                </div>
              </div>

              <div className="tech-specialties">
                {technician.specialties.map((s, i) => (
                  <span key={i} className="specialty-tag">{s}</span>
                ))}
              </div>

              <div className="tech-task-count">
                当前任务：{techAssignments.length} 个
              </div>

              {isOverloaded && (
                <div className="overload-warning">
                  ⚠️ 工作量超出容量 {formatMinutes(totalMinutes - Math.round(effectiveCapacity))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const PendingOrdersPanel = () => (
    <div className="pending-panel">
      <div className="panel-heading">
        <h3>待分配工单 ({pendingOrders.length})</h3>
      </div>
      {pendingOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">暂无待分配工单</div>
          <div className="empty-desc">所有未交付工单均已分配给技师</div>
        </div>
      ) : (
        <div className="pending-orders-list">
          {pendingOrders.map((order) => (
            <div key={order.id} className="pending-order-item">
              <WorkOrderMiniCard order={order} />
              <div className="assign-actions">
                {assigningOrderId === order.id ? (
                  <div className="assign-dropdown" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="tech-select"
                      value=""
                      onChange={(e) => e.target.value && handleAssignOrder(order.id, e.target.value)}
                    >
                      <option value="">选择技师...</option>
                      {technicianWorkload
                        .filter((t) => t.technician.status === 'on_duty')
                        .sort((a, b) => a.loadPercent - b.loadPercent)
                        .map(({ technician, loadPercent, isOverloaded }) => (
                          <option key={technician.id} value={technician.id}>
                            {technician.name} - {loadPercent}%{isOverloaded ? ' (超负荷)' : ''}
                          </option>
                        ))}
                    </select>
                    <div className="assign-options">
                      <label>
                        优先级：
                        <select
                          value={assignmentPriority}
                          onChange={(e) => setAssignmentPriority(Number(e.target.value))}
                        >
                          <option value={1}>普通</option>
                          <option value={2}>较高</option>
                          <option value={3}>紧急</option>
                        </select>
                      </label>
                      <input
                        type="text"
                        placeholder="备注（可选）"
                        value={assignmentNote}
                        onChange={(e) => setAssignmentNote(e.target.value)}
                      />
                    </div>
                    <button className="small-btn danger" onClick={() => { setAssigningOrderId(null); setAssignmentNote(''); }}>
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    className="small-btn primary"
                    onClick={() => setAssigningOrderId(order.id)}
                  >
                    分配技师
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const BoardView = () => (
    <div className="dispatch-board-view">
      <div className="board-columns">
        {technicianWorkload.map(({ technician, assignments: techAssignments, totalMinutes, effectiveCapacity, loadPercent, isOverloaded }) => {
          const displayStatus = isOverloaded ? 'overloaded' : technician.status;
          const statusConfig = TECHNICIAN_STATUS_CONFIG[displayStatus];

          return (
            <div
              key={technician.id}
              className={`board-column ${isOverloaded ? 'overloaded' : ''}`}
            >
              <div className="board-column-header">
                <div className="column-technician">
                  <div className="tech-avatar small" style={{ background: technician.avatarColor }}>
                    {technician.name.charAt(0)}
                  </div>
                  <div>
                    <div className="column-tech-name">{technician.name}</div>
                    <div className="column-tech-status" style={{ color: statusConfig.color }}>
                      {statusConfig.icon} {statusConfig.label}
                    </div>
                  </div>
                </div>
                <div className="column-workload">
                  <span className={isOverloaded ? 'overload-text' : ''}>
                    {loadPercent}%
                  </span>
                  <span className="column-task-count">{techAssignments.length}单</span>
                </div>
              </div>
              <div className="board-column-body">
                {techAssignments.length === 0 ? (
                  <div className="column-empty">
                    <span>暂无任务</span>
                  </div>
                ) : (
                  techAssignments
                    .sort((a, b) => b.priority - a.priority || a.queuePosition - b.queuePosition)
                    .map((assignment, idx) => {
                      const order = getOrderById(assignment.workOrderId);
                      if (!order) return null;
                      return (
                        <div key={assignment.id} className="board-task-card">
                          <div className="task-queue-position">#{idx + 1}</div>
                          {assignment.priority >= 3 && <div className="priority-flag high">紧急</div>}
                          {assignment.priority === 2 && <div className="priority-flag mid">较高</div>}
                          <WorkOrderMiniCard order={order} compact />
                          <div className="task-meta">
                            <span>⏱ {formatMinutes(assignment.estimatedMinutes)}</span>
                            <span>📊 {getComplexityLabel(assignment.complexityScore).label}</span>
                          </div>
                          {assignment.note && <div className="task-note">📝 {assignment.note}</div>}
                          <div className="task-actions">
                            {reassigningAssignmentId === assignment.id ? (
                              <div className="reassign-dropdown">
                                <select
                                  className="tech-select small"
                                  value=""
                                  onChange={(e) => e.target.value && handleReassign(assignment.id, e.target.value)}
                                >
                                  <option value="">转派给...</option>
                                  {technicians
                                    .filter((t) => t.id !== technician.id && t.status === 'on_duty')
                                    .map((t) => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <button className="small-btn danger" onClick={() => setReassigningAssignmentId(null)}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <>
                                <button className="small-btn" onClick={() => setReassigningAssignmentId(assignment.id)}>
                                  转派
                                </button>
                                <button className="small-btn danger" onClick={() => onRemoveAssignment(assignment.id)}>
                                  取消分配
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const TechnicianDetailView = () => {
    const selected = technicianWorkload.find((t) => t.technician.id === selectedTechnicianId);
    if (!selected) {
      return (
        <div className="detail-empty">
          <div className="empty-icon">👆</div>
          <div className="empty-title">选择一位技师查看详情</div>
          <div className="empty-desc">点击上方技师卡片可查看其详细任务列表</div>
        </div>
      );
    }

    const { technician, assignments: techAssignments, totalMinutes, effectiveCapacity, loadPercent, isOverloaded } = selected;
    const skillConfig = SKILL_LEVEL_CONFIG[technician.skillLevel];

    return (
      <div className="technician-detail">
        <div className="detail-header">
          <div className="detail-avatar" style={{ background: technician.avatarColor }}>
            {technician.name.charAt(0)}
          </div>
          <div className="detail-info">
            <h3>
              {technician.name}
              <span className="skill-badge" style={{ background: skillConfig.color + '20', color: skillConfig.color }}>
                {skillConfig.label}
              </span>
            </h3>
            <div className="detail-specialties">
              专长：{technician.specialties.join('、')}
            </div>
          </div>
          <div className="detail-workload-summary">
            <div className={`big-load-percent ${isOverloaded ? 'overload' : ''}`}>{loadPercent}%</div>
            <div className="load-detail">
              已安排 {formatMinutes(totalMinutes)} / 容量 {formatMinutes(Math.round(effectiveCapacity))}
            </div>
          </div>
        </div>

        {isOverloaded && (
          <div className="big-overload-warning">
            ⚠️ 该技师当前已超负荷，超出容量 {formatMinutes(totalMinutes - Math.round(effectiveCapacity))}，建议转派部分任务
          </div>
        )}

        <div className="detail-task-list">
          <h4>任务队列 ({techAssignments.length})</h4>
          {techAssignments.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-title">暂无任务安排</div>
            </div>
          ) : (
            techAssignments
              .sort((a, b) => b.priority - a.priority || a.queuePosition - b.queuePosition)
              .map((assignment, idx) => {
                const order = getOrderById(assignment.workOrderId);
                if (!order) return null;
                const statusConfig = STATUS_CONFIG.find((s) => s.value === order.status);
                return (
                  <div key={assignment.id} className="detail-task-row">
                    <div className="task-pos-circle">{idx + 1}</div>
                    <div className="task-row-content">
                      <div className="task-row-header">
                        <strong>{order.id}</strong>
                        <span className="status-tag small" style={{ background: statusConfig?.color + '20', color: statusConfig?.color }}>
                          {statusConfig?.label}
                        </span>
                        {assignment.priority >= 3 && <span className="priority-tag high">紧急</span>}
                        {assignment.priority === 2 && <span className="priority-tag mid">较高</span>}
                      </div>
                      <div className="task-row-desc">
                        {order.brand} {order.length}cm {order.boardType}
                      </div>
                      <div className="task-row-meta">
                        <span>⏱ 预计 {formatMinutes(assignment.estimatedMinutes)}</span>
                        <span>📊 复杂度 {getComplexityLabel(assignment.complexityScore).label}</span>
                        <span>🕐 分配于 {assignment.assignedAt}</span>
                      </div>
                      {assignment.note && <div className="task-row-note">📝 {assignment.note}</div>}
                    </div>
                    <div className="task-row-actions">
                      {reassigningAssignmentId === assignment.id ? (
                        <div className="reassign-dropdown">
                          <select
                            className="tech-select small"
                            value=""
                            onChange={(e) => e.target.value && handleReassign(assignment.id, e.target.value)}
                          >
                            <option value="">转派给...</option>
                            {technicians
                              .filter((t) => t.id !== technician.id && t.status === 'on_duty')
                              .map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                          </select>
                          <button className="small-btn danger" onClick={() => setReassigningAssignmentId(null)}>
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <button className="small-btn" onClick={() => setReassigningAssignmentId(assignment.id)}>
                            转派
                          </button>
                          <button className="small-btn danger" onClick={() => onRemoveAssignment(assignment.id)}>
                            取消
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    );
  };

  const QueueView = () => (
    <div className="queue-view">
      <div className="queue-header-info">
        <h4>全局排队顺序</h4>
        <span className="queue-count">共 {queueOrders.length} 个已分配任务</span>
      </div>
      {queueOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">暂无已分配任务</div>
          <div className="empty-desc">从左侧待分配工单列表中将工单分配给技师</div>
        </div>
      ) : (
        <div className="queue-list">
          {queueOrders.map(({ assignment, order, tech }, idx) => {
            const statusConfig = STATUS_CONFIG.find((s) => s.value === order.status);
            const complexity = getComplexityLabel(assignment.complexityScore);
            const overdue = getOverdueStatus(order);
            return (
              <div
                key={assignment.id}
                className={`queue-row ${overdue.isOverdue ? 'overdue' : ''} ${overdue.isUrgent ? 'urgent' : ''}`}
              >
                <div className="queue-position">
                  <span className="queue-pos-num">{idx + 1}</span>
                </div>
                <div className="queue-tech-col">
                  <div className="tech-avatar tiny" style={{ background: tech.avatarColor }}>
                    {tech.name.charAt(0)}
                  </div>
                  <span>{tech.name}</span>
                </div>
                <div className="queue-order-col">
                  <div className="queue-order-header">
                    <strong>{order.id}</strong>
                    <span className="status-tag small" style={{ background: statusConfig?.color + '20', color: statusConfig?.color }}>
                      {statusConfig?.label}
                    </span>
                    {assignment.priority >= 3 && <span className="priority-tag high">紧急</span>}
                    {assignment.priority === 2 && <span className="priority-tag mid">较高</span>}
                    {overdue.isOverdue && <span className="priority-tag overdue">已逾期</span>}
                    {overdue.isUrgent && !overdue.isOverdue && <span className="priority-tag urgent">今日到期</span>}
                  </div>
                  <div className="queue-order-desc">
                    {order.brand} {order.length}cm {order.boardType}
                  </div>
                </div>
                <div className="queue-meta-col">
                  <div className="queue-meta-item">
                    <span className="meta-label">预计耗时</span>
                    <span className="meta-value">{formatMinutes(assignment.estimatedMinutes)}</span>
                  </div>
                  <div className="queue-meta-item">
                    <span className="meta-label">复杂度</span>
                    <span className="meta-value" style={{ color: complexity.color, background: complexity.bgColor, padding: '2px 8px', borderRadius: 10 }}>
                      {complexity.label}
                    </span>
                  </div>
                </div>
                <div className="queue-actions">
                  {reassigningAssignmentId === assignment.id ? (
                    <div className="reassign-dropdown">
                      <select
                        className="tech-select small"
                        value=""
                        onChange={(e) => e.target.value && handleReassign(assignment.id, e.target.value)}
                      >
                        <option value="">转派给...</option>
                        {technicians
                          .filter((t) => t.id !== tech.id && t.status === 'on_duty')
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                      <button className="small-btn danger" onClick={() => setReassigningAssignmentId(null)}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button className="small-btn" onClick={() => setReassigningAssignmentId(assignment.id)}>
                      转派
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <section className="schedule-dispatch-section">
      <div className="heading">
        <div>
          <p>排班与分配</p>
          <h2>店内排班与工单分配</h2>
        </div>
        <div className="view-mode-tabs">
          <button
            className={viewMode === 'board' ? 'active' : ''}
            onClick={() => setViewMode('board')}
          >
            看板视图
          </button>
          <button
            className={viewMode === 'technician' ? 'active' : ''}
            onClick={() => setViewMode('technician')}
          >
            技师视图
          </button>
          <button
            className={viewMode === 'queue' ? 'active' : ''}
            onClick={() => setViewMode('queue')}
          >
            排队顺序
          </button>
        </div>
      </div>

      <TechniciansPanel />

      <div className="dispatch-main-layout">
        <PendingOrdersPanel />
        <div className="dispatch-view-area">
          {viewMode === 'board' && <BoardView />}
          {viewMode === 'technician' && <TechnicianDetailView />}
          {viewMode === 'queue' && <QueueView />}
        </div>
      </div>
    </section>
  );
}
