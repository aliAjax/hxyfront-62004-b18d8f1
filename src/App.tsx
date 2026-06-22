import { useState, useRef, useMemo, useCallback } from 'react';
import './styles.css';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderList from './WorkOrderList';
import EdgeAngleTable from './EdgeAngleTable';
import CustomerHistoryPanel from './CustomerHistoryPanel';
import KanbanBoard from './KanbanBoard';
import StatusHistoryModal from './StatusHistoryModal';
import QuoteEstimator from './QuoteEstimator';
import ScheduleAndDispatch from './ScheduleAndDispatch';
import PhaseEditor from './PhaseEditor';
import RelatedHistoryModal from './RelatedHistoryModal';
import {
  WorkOrder,
  WorkOrderFormData,
  EdgeAngleParam,
  CustomerHistoryRecord,
  WorkOrderStatus,
  WorkOrderPhase,
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
  PHASE_ORDER,
  getPhaseConfig,
  WorkOrderFilter,
  EMPTY_FILTER,
  isFilterEmpty,
  BOARD_TYPES,
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

  const [workOrderFilter, setWorkOrderFilter] = useState<WorkOrderFilter>(EMPTY_FILTER);
  const [selectedEdgeParam, setSelectedEdgeParam] = useState<EdgeAngleParam | null>(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<CustomerHistoryRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<WorkOrder | null>(null);
  const [selectedQaOrder, setSelectedQaOrder] = useState<WorkOrder | null>(null);
  const [quoteTargetOrderId, setQuoteTargetOrderId] = useState<string | null>(null);
  const [phaseEditorOrder, setPhaseEditorOrder] = useState<WorkOrder | null>(null);
  const [relatedHistoryOpen, setRelatedHistoryOpen] = useState(false);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const qaSectionRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const phaseEditorRef = useRef<HTMLDivElement>(null);

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

  const handleOpenPhaseEditor = useCallback((order: WorkOrder) => {
    setPhaseEditorOrder(order);
    if (phaseEditorRef.current) {
      phaseEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleClosePhaseEditor = useCallback(() => {
    setPhaseEditorOrder(null);
  }, []);

  const handlePhaseEditorUpdateFields = useCallback((orderId: string, updates: Partial<WorkOrder>, operator?: string) => {
    const result = orderActions.updateFields(orderId, updates, operator);
    if (result) {
      setPhaseEditorOrder(result);
    }
    return result;
  }, [orderActions]);

  const handlePhaseEditorTransitionNext = useCallback((orderId: string, operator?: string, note?: string) => {
    const result = orderActions.transitionToNextPhase(orderId, operator, note);
    if (result) {
      setPhaseEditorOrder(result);
    }
    return result;
  }, [orderActions]);

  const handlePhaseEditorRejectToPhase = useCallback((orderId: string, targetPhase: WorkOrderPhase, reason: string, operator?: string) => {
    const result = orderActions.rejectToSpecificPhase(orderId, targetPhase, reason, operator);
    if (result) {
      setPhaseEditorOrder(result);
    }
    return result;
  }, [orderActions]);

  const handlePhaseEditorApplyQuote = useCallback((summary: QuoteSummary) => {
    if (!phaseEditorOrder) return;
    const updated = orderActions.applyQuote(phaseEditorOrder.id, summary);
    if (updated) {
      setPhaseEditorOrder(updated);
    }
  }, [phaseEditorOrder, orderActions]);

  const handlePhaseEditorUpdateQaChecklist = useCallback((checklist: QualityChecklist) => {
    if (!phaseEditorOrder) return;
    const updated = orderActions.updateQualityChecklist(phaseEditorOrder.id, checklist);
    if (updated) {
      setPhaseEditorOrder(updated);
    }
  }, [phaseEditorOrder, orderActions]);

  const handlePhaseEditorCreateQaChecklist = useCallback(() => {
    if (!phaseEditorOrder) return;
    const checklist = orderActions.createQualityChecklist(phaseEditorOrder.id);
    if (checklist) {
      setPhaseEditorOrder((prev) => (prev ? { ...prev, qualityChecklist: checklist } : null));
    }
  }, [phaseEditorOrder, orderActions]);

  const handleOpenRelatedHistory = useCallback(() => {
    setRelatedHistoryOpen(true);
  }, []);

  const handleCloseRelatedHistory = useCallback(() => {
    setRelatedHistoryOpen(false);
  }, []);

  const handleSelectRelatedHistory = useCallback((record: CustomerHistoryRecord | WorkOrder) => {
    if (!phaseEditorOrder) return;

    const isWorkOrder = 'status' in record;
    let updates: Partial<WorkOrder> = {};

    if (isWorkOrder) {
      const wo = record as WorkOrder;
      updates = {
        boardType: wo.boardType,
        sideEdgeAngle: wo.sideEdgeAngle,
        baseEdgeAngle: wo.baseEdgeAngle,
        waxType: wo.waxType,
        customerPreference: wo.customerPreference,
        baseDamage: wo.baseDamage,
        repairLocation: wo.repairLocation,
        damageMarks: Array.isArray(wo.damageMarks)
          ? wo.damageMarks.map((m) => ({ ...m, id: `hist-${m.id}-${Date.now()}` }))
          : [],
      };
    } else {
      const chr = record as CustomerHistoryRecord;
      updates = {
        boardType: chr.boardType,
        sideEdgeAngle: chr.sideEdgeAngle,
        baseEdgeAngle: chr.baseEdgeAngle,
        waxType: chr.waxType,
        customerPreference: chr.deliveryNote,
        baseDamage: chr.baseDamage || '',
        repairLocation: chr.repairLocation || '',
        damageMarks: Array.isArray(chr.damageMarks)
          ? chr.damageMarks.map((m) => ({ ...m, id: `hist-${m.id}-${Date.now()}` }))
          : [],
      };
    }

    const result = orderActions.applyRelatedHistory(phaseEditorOrder.id, updates);
    if (result) {
      setPhaseEditorOrder(result);
    }
  }, [phaseEditorOrder, orderActions]);

  const assignmentStats = useMemo(() => {
    const assignedCount = assignments.length;
    const pendingAssign = orders.filter(
      (o) => o.status !== 'customer_delivered' && !assignments.some((a) => a.workOrderId === o.id)
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

  const filteredOrders = useMemo(() => {
    let result = orders;
    const isOrderOverdue = (order: WorkOrder) => {
      if (order.status === 'customer_delivered') return false;
      const today = new Date();
      const delivery = new Date(order.estimatedDelivery);
      today.setHours(0, 0, 0, 0);
      delivery.setHours(0, 0, 0, 0);
      return delivery < today;
    };

    if (workOrderFilter.boardType) {
      result = result.filter((o) => o.boardType === workOrderFilter.boardType);
    }

    if (workOrderFilter.phase !== 'all') {
      result = result.filter((o) => o.status === workOrderFilter.phase);
    }

    if (workOrderFilter.overdue !== null) {
      result = result.filter((o) => isOrderOverdue(o) === workOrderFilter.overdue);
    }

    if (workOrderFilter.hasTechnician === true) {
      result = result.filter((o) => assignments.some((a) => a.workOrderId === o.id));
    } else if (workOrderFilter.hasTechnician === false) {
      result = result.filter((o) => o.status !== 'customer_delivered' && !assignments.some((a) => a.workOrderId === o.id));
    }

    if (workOrderFilter.hasAbnormalReturn !== null) {
      result = result.filter((o) => (o.rejectHistory && o.rejectHistory.length > 0) === workOrderFilter.hasAbnormalReturn);
    }

    return result;
  }, [orders, workOrderFilter, assignments]);

  const phaseStats = useMemo(() => {
    const stats = {
      boardReceived: orders.filter((o) => o.status === 'board_received').length,
      damageAssessment: orders.filter((o) => o.status === 'damage_assessment').length,
      tuningQuote: orders.filter((o) => o.status === 'tuning_quote').length,
      technicianWork: orders.filter((o) => o.status === 'technician_work').length,
      qualityCheck: orders.filter((o) => o.status === 'quality_check').length,
      customerDelivered: orders.filter((o) => o.status === 'customer_delivered').length,
    };
    return stats;
  }, [orders]);

  const workOrderStats = useMemo(() => {
    return orderActions.getStatistics();
  }, [orders, orderActions]);

  const inProgressCount = orders.length - phaseStats.customerDelivered;

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
    if (o.status === 'customer_delivered') return false;
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
        <article style={{ borderTop: '3px solid #0ea5e9' }}>
          <small>接板登记</small>
          <strong style={{ color: '#0ea5e9' }}>{phaseStats.boardReceived}</strong>
        </article>
        <article style={{ borderTop: '3px solid #f97316' }}>
          <small>损伤评估</small>
          <strong style={{ color: '#f97316' }}>{phaseStats.damageAssessment}</strong>
        </article>
        <article style={{ borderTop: '3px solid #8b5cf6' }}>
          <small>调校报价</small>
          <strong style={{ color: '#8b5cf6' }}>{phaseStats.tuningQuote}</strong>
        </article>
        <article style={{ borderTop: '3px solid #dc2626' }}>
          <small>技师施工</small>
          <strong style={{ color: '#dc2626' }}>{phaseStats.technicianWork}</strong>
        </article>
        <article style={{ borderTop: '3px solid #7c3aed' }}>
          <small>质检确认</small>
          <strong style={{ color: '#7c3aed' }}>{phaseStats.qualityCheck}</strong>
        </article>
        <article style={{ borderTop: '3px solid #14b8a6' }}>
          <small>客户交付</small>
          <strong style={{ color: '#14b8a6' }}>{phaseStats.customerDelivered}</strong>
        </article>
        <article>
          <small>今日交付</small>
          <strong style={{ color: 'var(--secondary)' }}>{workOrderStats.deliveredToday}</strong>
        </article>
        <article>
          <small>进行中</small>
          <strong>{inProgressCount}</strong>
        </article>
        <article>
          <small>异常退回</small>
          <strong style={{ color: workOrderStats.rejectedCount > 0 ? 'var(--error)' : 'inherit' }}>{workOrderStats.rejectedCount}</strong>
        </article>
        <article>
          <small>平均周期</small>
          <strong>{workOrderStats.avgCycleTime} 天</strong>
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
        <aside className="panel filter-panel">
          <div className="filter-panel-header">
            <h2>组合筛选</h2>
            {!isFilterEmpty(workOrderFilter) && (
              <button
                className="filter-clear-btn"
                onClick={() => setWorkOrderFilter(EMPTY_FILTER)}
              >
                ✕ 清空筛选
              </button>
            )}
          </div>

          <div className="filter-group">
            <h3>板型</h3>
            <div className="chips">
              <button
                className={workOrderFilter.boardType === null ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, boardType: null }))}
              >
                全部
              </button>
              {BOARD_TYPES.map((item) => (
                <button
                  key={item}
                  className={workOrderFilter.boardType === item ? 'active' : ''}
                  onClick={() => setWorkOrderFilter((f) => ({ ...f, boardType: item }))}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>阶段</h3>
            <div className="chips">
              <button
                className={workOrderFilter.phase === 'all' ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, phase: 'all' }))}
              >
                全部
              </button>
              {STATUS_CONFIG.map((status) => (
                <button
                  key={status.value}
                  className={workOrderFilter.phase === status.value ? 'active' : ''}
                  onClick={() => setWorkOrderFilter((f) => ({ ...f, phase: status.value }))}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>是否逾期</h3>
            <div className="chips">
              <button
                className={workOrderFilter.overdue === null ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, overdue: null }))}
              >
                全部
              </button>
              <button
                className={workOrderFilter.overdue === true ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, overdue: true }))}
              >
                🔴 已逾期
              </button>
              <button
                className={workOrderFilter.overdue === false ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, overdue: false }))}
              >
                🟢 未逾期
              </button>
            </div>
          </div>

          <div className="filter-group">
            <h3>技师分配</h3>
            <div className="chips">
              <button
                className={workOrderFilter.hasTechnician === null ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasTechnician: null }))}
              >
                全部
              </button>
              <button
                className={workOrderFilter.hasTechnician === true ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasTechnician: true }))}
              >
                👤 已分配
              </button>
              <button
                className={workOrderFilter.hasTechnician === false ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasTechnician: false }))}
              >
                ⚠️ 未分配
              </button>
            </div>
          </div>

          <div className="filter-group">
            <h3>异常退回</h3>
            <div className="chips">
              <button
                className={workOrderFilter.hasAbnormalReturn === null ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasAbnormalReturn: null }))}
              >
                全部
              </button>
              <button
                className={workOrderFilter.hasAbnormalReturn === true ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasAbnormalReturn: true }))}
              >
                🔙 有退回
              </button>
              <button
                className={workOrderFilter.hasAbnormalReturn === false ? 'active' : ''}
                onClick={() => setWorkOrderFilter((f) => ({ ...f, hasAbnormalReturn: false }))}
              >
                ✅ 无退回
              </button>
            </div>
          </div>

          <div className="filter-result-summary">
            当前筛选结果：<strong>{filteredOrders.length}</strong> / {orders.length} 条工单
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
        orders={filteredOrders}
        assignments={assignments}
        technicians={technicians}
        onMoveOrder={handleMoveOrder}
        onViewHistory={handleViewHistory}
        onOpenQuote={handleOpenQuote}
        onOpenQa={handleOpenQaChecklist}
        onOpenPhaseEditor={handleOpenPhaseEditor}
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
        onOpenPhaseEditor={handleOpenPhaseEditor}
      />

      <div ref={phaseEditorRef}>
        {phaseEditorOrder && (
          <div className="phase-editor-wrapper">
            <PhaseEditor
              order={phaseEditorOrder}
              onUpdateFields={handlePhaseEditorUpdateFields}
              onTransitionNext={handlePhaseEditorTransitionNext}
              onRejectToPhase={handlePhaseEditorRejectToPhase}
              onApplyQuote={handlePhaseEditorApplyQuote}
              onUpdateQualityChecklist={handlePhaseEditorUpdateQaChecklist}
              onCreateQualityChecklist={handlePhaseEditorCreateQaChecklist}
              onOpenRelatedHistory={handleOpenRelatedHistory}
              onClose={handleClosePhaseEditor}
            />
          </div>
        )}
      </div>

      {phaseEditorOrder && (
        <RelatedHistoryModal
          isOpen={relatedHistoryOpen}
          currentOrder={phaseEditorOrder}
          historyRecords={customerHistory}
          allWorkOrders={orders}
          onClose={handleCloseRelatedHistory}
          onSelectRecord={handleSelectRelatedHistory}
        />
      )}

      <StatusHistoryModal
        order={selectedHistoryOrder}
        onClose={handleCloseHistoryModal}
      />
    </main>
  );
}

export default App;
