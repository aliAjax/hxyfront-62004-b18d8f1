import { useState } from 'react';
import { WorkOrder, WorkOrderStatus, STATUS_CONFIG, StatusHistoryRecord, WorkOrderAssignment, Technician } from './types';
import WorkOrderCard from './WorkOrderCard';

interface KanbanBoardProps {
  orders: WorkOrder[];
  assignments?: WorkOrderAssignment[];
  technicians?: Technician[];
  onMoveOrder: (orderId: string, newStatus: WorkOrderStatus, historyRecord: StatusHistoryRecord) => void;
  onViewHistory: (order: WorkOrder) => void;
  onOpenQuote: (order: WorkOrder) => void;
  onOpenQa?: (order: WorkOrder) => void;
  onOpenPhaseEditor?: (order: WorkOrder) => void;
}

export default function KanbanBoard({ orders, assignments = [], technicians = [], onMoveOrder, onViewHistory, onOpenQuote, onOpenQa, onOpenPhaseEditor }: KanbanBoardProps) {
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkOrderStatus | null>(null);

  const getOrdersByStatus = (status: WorkOrderStatus) => {
    return orders.filter((o) => o.status === status);
  };

  const handleDragOver = (e: React.DragEvent, status: WorkOrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: WorkOrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    setDraggingOrderId(null);
    setDragOverColumn(null);

    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const targetLabel = STATUS_CONFIG.find((s) => s.value === targetStatus)?.label ?? targetStatus;

    const historyRecord: StatusHistoryRecord = {
      id: `SH-${orderId}-${Date.now()}`,
      fromStatus: order.status,
      toStatus: targetStatus,
      timestamp,
      note: `移至${targetLabel}`,
    };

    onMoveOrder(orderId, targetStatus, historyRecord);
  };

  const handleDragStart = (orderId: string) => {
    setDraggingOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingOrderId(null);
    setDragOverColumn(null);
  };

  const totalCount = orders.length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const inProgressCount = totalCount - deliveredCount;

  return (
    <section className="kanban-section">
      <div className="kanban-header">
        <div className="kanban-title">
          <p>生产管理</p>
          <h2>完工状态看板</h2>
        </div>
        <div className="kanban-stats">
          <div className="kanban-stat">
            <span className="stat-label">总工单</span>
            <span className="stat-value">{totalCount}</span>
          </div>
          <div className="kanban-stat">
            <span className="stat-label">进行中</span>
            <span className="stat-value in-progress">{inProgressCount}</span>
          </div>
          <div className="kanban-stat">
            <span className="stat-label">已交付</span>
            <span className="stat-value delivered">{deliveredCount}</span>
          </div>
        </div>
      </div>

      <div className="kanban-board">
        {STATUS_CONFIG.map((statusConfig) => {
          const columnOrders = getOrdersByStatus(statusConfig.value);
          const isDragOver = dragOverColumn === statusConfig.value;

          return (
            <div
              key={statusConfig.value}
              className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, statusConfig.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, statusConfig.value)}
            >
              <div
                className="kanban-column-header"
                style={{ borderTopColor: statusConfig.color }}
              >
                <div className="column-title">
                  <span className="column-icon">{statusConfig.icon}</span>
                  <span className="column-name">{statusConfig.label}</span>
                </div>
                <span
                  className="column-count"
                  style={{
                    backgroundColor: statusConfig.color + '15',
                    color: statusConfig.color,
                  }}
                >
                  {columnOrders.length}
                </span>
              </div>

              <div className="kanban-column-content">
                {columnOrders.length === 0 ? (
                  <div className="kanban-empty">
                    <span className="empty-icon">📭</span>
                    <span className="empty-text">暂无工单</span>
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const assignment = assignments.find((a) => a.workOrderId === order.id);
                    const technician = assignment ? technicians.find((t) => t.id === assignment.technicianId) : undefined;
                    return (
                      <div
                        key={order.id}
                        className={`kanban-card-wrapper ${draggingOrderId === order.id ? 'dragging' : ''}`}
                      >
                        <WorkOrderCard
                          order={order}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onViewHistory={onViewHistory}
                          onOpenQuote={onOpenQuote}
                          onOpenQa={onOpenQa}
                          onOpenPhaseEditor={onOpenPhaseEditor}
                          assignment={assignment}
                          technician={technician}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
