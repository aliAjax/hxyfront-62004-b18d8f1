import { useState, useRef, useMemo } from 'react';
import './styles.css';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderList from './WorkOrderList';
import EdgeAngleTable from './EdgeAngleTable';
import CustomerHistoryPanel from './CustomerHistoryPanel';
import KanbanBoard from './KanbanBoard';
import StatusHistoryModal from './StatusHistoryModal';
import QuoteEstimator from './QuoteEstimator';
import ScheduleAndDispatch from './ScheduleAndDispatch';
import {
  WorkOrder,
  WorkOrderFormData,
  initialWorkOrders,
  EdgeAngleParam,
  initialEdgeAngleParams,
  CustomerHistoryRecord,
  initialCustomerHistory,
  WorkOrderStatus,
  StatusHistoryRecord,
  STATUS_CONFIG,
  QuoteSummary,
  QualityChecklist,
  createEmptyQualityChecklist,
  isQualityCheckCompleted,
  hasQualityCheckFailedItems,
  Technician,
  WorkOrderAssignment,
  initialTechnicians,
  initialAssignments,
  TechnicianStatus,
  SKILL_LEVEL_CONFIG,
} from './types';
import QualityChecklistPanel from './QualityChecklistPanel';

const project = {
  sourceNo: 6,
  id: 'hxyfront-62004',
  port: 62004,
  title: '滑雪板调校维护',
  domain: '滑雪装备调校',
  prompt:
    '我想做一个面向滑雪板调校店的装备维护前端系统，技师可以记录雪板品牌、长度、板型、刃角、打蜡类型、底板损伤、修补位置和客户偏好。页面需要有维护工单列表、刃角参数表、底板损伤标记区、完工状态筛选和客户历史维护记录。',
  palette: ['#0369a1', '#14b8a6', '#f97316'],
  filters: ['全地域', '公园板', '竞速板', '粉雪板'],
};

function App() {
  const [orders, setOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | WorkOrderStatus>('all');
  const [selectedEdgeParam, setSelectedEdgeParam] = useState<EdgeAngleParam | null>(null);
  const [edgeParams] = useState<EdgeAngleParam[]>(initialEdgeAngleParams);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryRecord[]>(initialCustomerHistory);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<CustomerHistoryRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<WorkOrder | null>(null);
  const [selectedQaOrder, setSelectedQaOrder] = useState<WorkOrder | null>(null);
  const [quoteTargetOrderId, setQuoteTargetOrderId] = useState<string | null>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const qaSectionRef = useRef<HTMLDivElement>(null);

  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [assignments, setAssignments] = useState<WorkOrderAssignment[]>(initialAssignments);

  const getNextOrderId = () => {
    let maxNum = 0;
    orders.forEach((order) => {
      const match = order.id.match(/ORD-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ORD-${maxNum + 1}`;
  };

  const handleSubmit = (formData: WorkOrderFormData, editingId?: string) => {
    if (editingId) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === editingId
            ? { ...order, ...formData }
            : order
        )
      );
      setEditingOrder(null);
    } else {
      const today = new Date();
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + 3);
      const estimatedDelivery = deliveryDate.toISOString().split('T')[0];

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newOrder: WorkOrder = {
        ...formData,
        id: getNextOrderId(),
        status: 'pending_inspection',
        createdAt: today.toISOString().split('T')[0],
        estimatedDelivery,
        riskWarning: '',
        damageMarks: formData.damageMarks || [],
        statusHistory: [
          {
            id: `SH-${getNextOrderId()}-${Date.now()}`,
            fromStatus: null,
            toStatus: 'pending_inspection',
            timestamp,
            note: '工单创建',
          },
        ],
      };
      setOrders([newOrder, ...orders]);
    }
    setSelectedHistoryRecord(null);
  };

  const handleEditOrder = (order: WorkOrder) => {
    setEditingOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = (orderId: string) => {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    const statusOrder: WorkOrderStatus[] = [
      'pending_inspection',
      'pending_wax',
      'pending_base_repair',
      'pending_qa',
      'delivered',
    ];
    const currentIndex = statusOrder.indexOf(currentOrder.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];

    if (nextStatus === 'delivered') {
      if (!currentOrder.qualityChecklist) {
        alert('请先完成质检检查清单后再交付');
        return;
      }
      if (hasQualityCheckFailedItems(currentOrder.qualityChecklist)) {
        alert('质检存在不通过项，无法交付。请先修复所有不通过项后再尝试交付。');
        return;
      }
      if (!isQualityCheckCompleted(currentOrder.qualityChecklist)) {
        alert('请先完成所有质检项并确保全部通过后再交付');
        return;
      }
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const targetLabel = STATUS_CONFIG.find((s) => s.value === nextStatus)?.label ?? nextStatus;
    const newHistoryRecord: StatusHistoryRecord = {
      id: `SH-${currentOrder.id}-${Date.now()}`,
      fromStatus: currentOrder.status,
      toStatus: nextStatus,
      timestamp,
      note: `移至${targetLabel}`,
    };
    const updatedOrder: WorkOrder = {
      ...currentOrder,
      status: nextStatus,
      statusHistory: [...currentOrder.statusHistory, newHistoryRecord],
    };

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? updatedOrder : order))
    );

    if (nextStatus === 'delivered') {
      syncOrderToCustomerHistory(updatedOrder);
      const existingAssignment = assignments.find((a) => a.workOrderId === orderId);
      if (existingAssignment) {
        handleRemoveAssignment(existingAssignment.id);
      }
    }
  };

  const handleMoveOrder = (orderId: string, newStatus: WorkOrderStatus, historyRecord: StatusHistoryRecord) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (newStatus === 'delivered') {
      if (!order.qualityChecklist) {
        alert('请先完成质检检查清单后再交付');
        return;
      }
      if (hasQualityCheckFailedItems(order.qualityChecklist)) {
        alert('质检存在不通过项，无法交付。请先修复所有不通过项后再尝试交付。');
        return;
      }
      if (!isQualityCheckCompleted(order.qualityChecklist)) {
        alert('请先完成所有质检项并确保全部通过后再交付');
        return;
      }
    }

    const updatedOrder: WorkOrder = {
      ...order,
      status: newStatus,
      statusHistory: [...order.statusHistory, historyRecord],
    };

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? updatedOrder : order))
    );

    if (newStatus === 'delivered') {
      syncOrderToCustomerHistory(updatedOrder);
      const existingAssignment = assignments.find((a) => a.workOrderId === orderId);
      if (existingAssignment) {
        handleRemoveAssignment(existingAssignment.id);
      }
    }
  };

  const handleViewHistory = (order: WorkOrder) => {
    setSelectedHistoryOrder(order);
  };

  const handleCloseHistoryModal = () => {
    setSelectedHistoryOrder(null);
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
  };

  const handleOpenQuote = (order: WorkOrder) => {
    setQuoteTargetOrderId(order.id);
    if (quoteSectionRef.current) {
      quoteSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleApplyQuote = (summary: QuoteSummary) => {
    if (!quoteTargetOrderId) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === quoteTargetOrderId
          ? { ...order, quoteSummary: summary }
          : order
      )
    );
    setQuoteTargetOrderId(null);
  };

  const syncOrderToCustomerHistory = (order: WorkOrder) => {
    if (!isQualityCheckCompleted(order.qualityChecklist)) return;

    const maintenanceItems = [];
    if (order.sideEdgeAngle || order.baseEdgeAngle) maintenanceItems.push('修刃');
    if (order.waxType && order.waxType !== '不打蜡') maintenanceItems.push('打蜡');
    if (order.baseDamage && order.baseDamage !== '无') maintenanceItems.push('补底');
    if (order.repairLocation) maintenanceItems.push('修补');

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const historyRecord: CustomerHistoryRecord = {
      id: `CHR-${order.id}`,
      customerName: '客户',
      customerPhone: '',
      brand: order.brand,
      length: order.length,
      boardType: order.boardType,
      maintenanceItems: maintenanceItems.join('、') || '常规维护',
      waxType: order.waxType,
      sideEdgeAngle: order.sideEdgeAngle,
      baseEdgeAngle: order.baseEdgeAngle,
      deliveryNote: order.qualityChecklist?.overallNote || '',
      createdAt: dateStr,
      qualityChecklist: order.qualityChecklist,
    };

    setCustomerHistory((prev) => {
      const existingIndex = prev.findIndex(
        (record) =>
          record.id === historyRecord.id ||
          record.qualityChecklist?.workOrderId === order.id
      );

      if (existingIndex === -1) {
        return [historyRecord, ...prev];
      }

      const next = [...prev];
      next.splice(existingIndex, 1);
      return [historyRecord, ...next];
    });
  };

  const handleOpenQaChecklist = (order: WorkOrder) => {
    setSelectedQaOrder(order);
    if (qaSectionRef.current) {
      qaSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCreateQaChecklist = () => {
    if (!selectedQaOrder) return;
    const checklist = createEmptyQualityChecklist(selectedQaOrder.id);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === selectedQaOrder.id
          ? { ...order, qualityChecklist: checklist }
          : order
      )
    );
    setSelectedQaOrder((prev) =>
      prev ? { ...prev, qualityChecklist: checklist } : null
    );
  };

  const handleUpdateQaChecklist = (checklist: QualityChecklist) => {
    if (!selectedQaOrder) return;
    const currentOrder = orders.find((order) => order.id === selectedQaOrder.id) ?? selectedQaOrder;
    const updatedOrder: WorkOrder = { ...currentOrder, qualityChecklist: checklist };

    setOrders((prev) =>
      prev.map((order) =>
        order.id === selectedQaOrder.id
          ? updatedOrder
          : order
      )
    );
    setSelectedQaOrder(updatedOrder);

    if (isQualityCheckCompleted(checklist)) {
      syncOrderToCustomerHistory(updatedOrder);
    }
  };

  const handleAssignOrder = (assignment: WorkOrderAssignment) => {
    setAssignments((prev) => [...prev, assignment]);
  };

  const handleReassignOrder = (assignmentId: string, newTechnicianId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    const newTech = technicians.find((t) => t.id === newTechnicianId);
    if (!assignment || !newTech) return;

    const newTechCurrentLoad = assignments
      .filter((a) => a.technicianId === newTechnicianId)
      .reduce((sum, a) => sum + a.estimatedMinutes, 0);
    const effectiveCapacity = newTech.dailyCapacityMinutes * SKILL_LEVEL_CONFIG[newTech.skillLevel].capacityMultiplier;
    const remainingCapacity = effectiveCapacity - newTechCurrentLoad;
    const willOverload = remainingCapacity < assignment.estimatedMinutes;

    if (willOverload) {
      const confirmMsg = `⚠️ 转派此工单将导致 ${newTech.name} 超负荷！\n\n该工单预计耗时：${Math.round(assignment.estimatedMinutes)}分钟\n技师剩余容量：${Math.round(Math.max(0, remainingCapacity))}分钟\n超出容量：${Math.round(assignment.estimatedMinutes - Math.max(0, remainingCapacity))}分钟\n\n是否仍要转派？`;
      if (!window.confirm(confirmMsg)) return;
    }

    setAssignments((prev) => {
      const target = prev.find((a) => a.id === assignmentId);
      if (!target) return prev;

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newTechAssignments = prev.filter((a) => a.technicianId === newTechnicianId);
      const maxQueuePos = newTechAssignments.length > 0
        ? Math.max(...newTechAssignments.map((a) => a.queuePosition))
        : 0;

      return prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              technicianId: newTechnicianId,
              reassignedFrom: target.technicianId,
              assignedAt: timestamp,
              queuePosition: maxQueuePos + 1,
            }
          : a
      );
    });
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const handleUpdateTechnicianStatus = (technicianId: string, status: TechnicianStatus) => {
    setTechnicians((prev) =>
      prev.map((t) => (t.id === technicianId ? { ...t, status } : t))
    );
  };

  const assignmentStats = useMemo(() => {
    const assignedCount = assignments.length;
    const pendingAssign = orders.filter(
      (o) => o.status !== 'delivered' && !assignments.some((a) => a.workOrderId === o.id)
    ).length;

    const totalAssignedMinutes = assignments.reduce((sum, a) => sum + a.estimatedMinutes, 0);
    const totalCapacity = technicians.reduce(
      (sum, t) => sum + t.dailyCapacityMinutes * SKILL_LEVEL_CONFIG[t.skillLevel].capacityMultiplier,
      0
    );
    const overallLoad = totalCapacity > 0 ? Math.round((totalAssignedMinutes / totalCapacity) * 100) : 0;

    const overloadedTechs = technicians.filter((tech) => {
      const techAssignments = assignments.filter((a) => a.technicianId === tech.id);
      const totalMinutes = techAssignments.reduce((sum, a) => sum + a.estimatedMinutes, 0);
      const effectiveCapacity = tech.dailyCapacityMinutes * SKILL_LEVEL_CONFIG[tech.skillLevel].capacityMultiplier;
      return totalMinutes > effectiveCapacity;
    }).length;

    return {
      assignedCount,
      pendingAssign,
      overallLoad,
      overloadedTechs,
    };
  }, [assignments, orders, technicians]);

  let filteredOrders = activeFilter
    ? orders.filter((order) => order.boardType === activeFilter)
    : orders;

  if (statusFilter !== 'all') {
    filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
  }

  const inspectionCount = orders.filter((o) => o.status === 'pending_inspection').length;
  const waxCount = orders.filter((o) => o.status === 'pending_wax').length;
  const repairCount = orders.filter((o) => o.status === 'pending_base_repair').length;
  const qaCount = orders.filter((o) => o.status === 'pending_qa').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const inProgressCount = orders.length - deliveredCount;

  const avgSideEdge = orders.length
    ? (
        orders.reduce((sum, o) => {
          const angle = parseFloat(o.sideEdgeAngle.replace('°', ''));
          return sum + (isNaN(angle) ? 0 : angle);
        }, 0) / orders.length
      ).toFixed(1)
    : 0;

  const baseRepairCount = orders.filter(
    (o) => (o.baseDamage && o.baseDamage !== '无') || (o.damageMarks && o.damageMarks.length > 0)
  ).length;

  const overdueCount = orders.filter((o) => {
    if (o.status === 'delivered') return false;
    const today = new Date();
    const delivery = new Date(o.estimatedDelivery);
    today.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);
    return delivery < today;
  }).length;

  const handleSelectEdgeParam = (param: EdgeAngleParam) => {
    setSelectedEdgeParam(param);
  };

  const handleSelectHistoryRecord = (record: CustomerHistoryRecord) => {
    setSelectedHistoryRecord((prev) => (prev?.id === record.id ? null : record));
  };

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        <article>
          <small>待检查</small>
          <strong>{inspectionCount}</strong>
        </article>
        <article>
          <small>待打蜡</small>
          <strong>{waxCount}</strong>
        </article>
        <article>
          <small>待补底</small>
          <strong>{repairCount}</strong>
        </article>
        <article>
          <small>待质检</small>
          <strong>{qaCount}</strong>
        </article>
        <article>
          <small>已交付</small>
          <strong style={{ color: 'var(--secondary)' }}>{deliveredCount}</strong>
        </article>
        <article>
          <small>进行中</small>
          <strong>{inProgressCount}</strong>
        </article>
        <article>
          <small>已分配</small>
          <strong style={{ color: 'var(--secondary)' }}>{assignmentStats.assignedCount}</strong>
        </article>
        <article>
          <small>待分配</small>
          <strong style={{ color: assignmentStats.pendingAssign > 0 ? 'var(--accent)' : 'inherit' }}>{assignmentStats.pendingAssign}</strong>
        </article>
        <article>
          <small>整体负荷</small>
          <strong style={{ color: assignmentStats.overallLoad > 85 ? 'var(--error)' : assignmentStats.overallLoad > 70 ? 'var(--accent)' : 'var(--secondary)' }}>
            {assignmentStats.overallLoad}%
          </strong>
        </article>
        <article>
          <small>超负荷技师</small>
          <strong style={{ color: assignmentStats.overloadedTechs > 0 ? 'var(--error)' : 'inherit' }}>{assignmentStats.overloadedTechs}</strong>
        </article>
        <article>
          <small>逾期工单</small>
          <strong style={{ color: overdueCount > 0 ? 'var(--error)' : 'inherit' }}>{overdueCount}</strong>
        </article>
        <article>
          <small>需补底</small>
          <strong>{baseRepairCount}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>{project.domain}筛选</h2>
          <div className="chips">
            <button
              className={!activeFilter ? 'active' : ''}
              onClick={() => setActiveFilter(null)}
            >
              全部
            </button>
            {project.filters.map((item) => (
              <button
                key={item}
                className={activeFilter === item ? 'active' : ''}
                onClick={() => setActiveFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h2 style={{ marginTop: 20 }}>完工状态</h2>
          <div className="chips">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              全部
            </button>
            {STATUS_CONFIG.map((status) => (
              <button
                key={status.value}
                className={statusFilter === status.value ? 'active' : ''}
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
        </aside>

        <WorkOrderForm
          onSubmit={handleSubmit}
          selectedEdgeParam={selectedEdgeParam}
          historyFill={selectedHistoryRecord}
          editingOrder={editingOrder}
          onCancelEdit={handleCancelEdit}
        />
      </section>

      <CustomerHistoryPanel
        records={customerHistory}
        onSelectRecord={handleSelectHistoryRecord}
        selectedRecordId={selectedHistoryRecord?.id ?? null}
      />

      <EdgeAngleTable params={edgeParams} onSelectParam={handleSelectEdgeParam} />

      <KanbanBoard
        orders={orders}
        assignments={assignments}
        technicians={technicians}
        onMoveOrder={handleMoveOrder}
        onViewHistory={handleViewHistory}
        onOpenQuote={handleOpenQuote}
        onOpenQa={handleOpenQaChecklist}
      />

      <ScheduleAndDispatch
        workOrders={orders}
        technicians={technicians}
        assignments={assignments}
        onAssign={handleAssignOrder}
        onReassign={handleReassignOrder}
        onUpdateTechnicianStatus={handleUpdateTechnicianStatus}
        onRemoveAssignment={handleRemoveAssignment}
      />

      <div ref={quoteSectionRef}>
        <QuoteEstimator
          initialBoardType={quoteTargetOrderId ? orders.find((o) => o.id === quoteTargetOrderId)?.boardType : undefined}
          initialLength={quoteTargetOrderId ? orders.find((o) => o.id === quoteTargetOrderId)?.length : undefined}
          initialWaxType={quoteTargetOrderId ? orders.find((o) => o.id === quoteTargetOrderId)?.waxType : undefined}
          initialDamageCount={quoteTargetOrderId ? (orders.find((o) => o.id === quoteTargetOrderId)?.damageMarks?.length ?? 0) : undefined}
          onApplyQuote={quoteTargetOrderId ? handleApplyQuote : undefined}
          applyButtonText={quoteTargetOrderId ? `应用到工单 ${quoteTargetOrderId}` : '应用到工单'}
        />
      </div>

      <div ref={qaSectionRef}>
        {selectedQaOrder && (
          <QualityChecklistPanel
            checklist={selectedQaOrder.qualityChecklist}
            workOrderId={selectedQaOrder.id}
            workOrderStatus={selectedQaOrder.status}
            onUpdateChecklist={handleUpdateQaChecklist}
            onCreateChecklist={handleCreateQaChecklist}
          />
        )}
      </div>

      <WorkOrderList
        orders={filteredOrders}
        onEditOrder={handleEditOrder}
        onToggleStatus={handleToggleStatus}
        editingOrderId={editingOrder?.id ?? null}
        onOpenQuote={handleOpenQuote}
        onOpenQa={handleOpenQaChecklist}
        assignments={assignments}
        technicians={technicians}
      />

      <StatusHistoryModal
        order={selectedHistoryOrder}
        onClose={handleCloseHistoryModal}
      />
    </main>
  );
}

export default App;
