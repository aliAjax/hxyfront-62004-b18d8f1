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
  EdgeAngleParam,
  CustomerHistoryRecord,
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
  TechnicianStatus,
  SKILL_LEVEL_CONFIG,
  emptyFormData,
} from './types';
import QualityChecklistPanel from './QualityChecklistPanel';
import {
  useStoreInitialized,
  useWorkOrders,
  useCustomerHistory,
  useEdgeParams,
  useTechnicians,
  useAssignments,
  useWorkOrderActions,
  useAssignmentActions,
  useTechnicianActions,
  useDataIO,
} from './store/hooks';

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
  const initialized = useStoreInitialized();
  const orders = useWorkOrders();
  const customerHistory = useCustomerHistory();
  const edgeParams = useEdgeParams();
  const technicians = useTechnicians();
  const assignments = useAssignments();

  const orderActions = useWorkOrderActions();
  const assignmentActions = useAssignmentActions();
  const technicianActions = useTechnicianActions();
  const dataIO = useDataIO();

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | WorkOrderStatus>('all');
  const [selectedEdgeParam, setSelectedEdgeParam] = useState<EdgeAngleParam | null>(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<CustomerHistoryRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<WorkOrder | null>(null);
  const [selectedQaOrder, setSelectedQaOrder] = useState<WorkOrder | null>(null);
  const [quoteTargetOrderId, setQuoteTargetOrderId] = useState<string | null>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const qaSectionRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (formData: WorkOrderFormData, editingId?: string) => {
    if (editingId) {
      orderActions.update(editingId, formData);
      setEditingOrder(null);
    } else {
      orderActions.create(formData);
    }
    setSelectedHistoryRecord(null);
  };

  const handleEditOrder = (order: WorkOrder) => {
    setEditingOrder(order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = (orderId: string) => {
    const result = orderActions.advanceStatus(orderId);
    if (selectedQaOrder?.id === orderId && result) {
      setSelectedQaOrder(result);
    }
  };

  const handleMoveOrder = (orderId: string, newStatus: WorkOrderStatus, historyRecord: StatusHistoryRecord) => {
    const result = orderActions.transitionStatus(orderId, newStatus, historyRecord.note);
    if (selectedQaOrder?.id === orderId && result) {
      setSelectedQaOrder(result);
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
    orderActions.applyQuote(quoteTargetOrderId, summary);
    setQuoteTargetOrderId(null);
  };

  const handleOpenQaChecklist = (order: WorkOrder) => {
    setSelectedQaOrder(order);
    if (qaSectionRef.current) {
      qaSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCreateQaChecklist = () => {
    if (!selectedQaOrder) return;
    const checklist = orderActions.createQualityChecklist(selectedQaOrder.id);
    if (checklist) {
      setSelectedQaOrder((prev) => (prev ? { ...prev, qualityChecklist: checklist } : null));
    }
  };

  const handleUpdateQaChecklist = (checklist: QualityChecklist) => {
    if (!selectedQaOrder) return;
    const updated = orderActions.updateQualityChecklist(selectedQaOrder.id, checklist);
    if (updated) {
      setSelectedQaOrder(updated);
    }
  };

  const handleAssignOrder = (assignment: Omit<WorkOrderAssignment, 'id'>) => {
    assignmentActions.create(assignment);
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

    assignmentActions.reassign(assignmentId, newTechnicianId);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    assignmentActions.remove(assignmentId);
  };

  const handleUpdateTechnicianStatus = (technicianId: string, status: TechnicianStatus) => {
    technicianActions.updateStatus(technicianId, status);
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

  const handleExportData = () => {
    dataIO.downloadJSON();
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mode = window.confirm('点击"确定"合并数据，点击"取消"替换全部数据') ? 'merge' : 'replace';
    try {
      await dataIO.importFile(file, mode);
      alert(mode === 'merge' ? '数据合并成功！' : '数据已全部替换！');
    } catch {
      // error already alerted
    }
    e.target.value = '';
  };

  const handleResetData = () => {
    if (window.confirm('确定要重置所有数据吗？此操作不可恢复！')) {
      dataIO.reset();
      alert('数据已重置为初始状态');
    }
  };

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: 18, color: '#64748b' }}>正在加载数据...</div>
      </div>
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleExportData}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #14b8a6',
              background: 'transparent',
              color: '#14b8a6',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            📤 导出数据
          </button>
          <button
            onClick={handleImportClick}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #0ea5e9',
              background: 'transparent',
              color: '#0ea5e9',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            📥 导入数据
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            onClick={handleResetData}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #dc2626',
              background: 'transparent',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🔄 重置数据
          </button>
        </div>
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
