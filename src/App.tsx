import { useState, useRef } from 'react';
import './styles.css';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderList from './WorkOrderList';
import EdgeAngleTable from './EdgeAngleTable';
import CustomerHistoryPanel from './CustomerHistoryPanel';
import KanbanBoard from './KanbanBoard';
import StatusHistoryModal from './StatusHistoryModal';
import QuoteEstimator from './QuoteEstimator';
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
} from './types';

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
  const [customerHistory] = useState<CustomerHistoryRecord[]>(initialCustomerHistory);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<CustomerHistoryRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<WorkOrder | null>(null);
  const [quoteTargetOrderId, setQuoteTargetOrderId] = useState<string | null>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);

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
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const statusOrder: WorkOrderStatus[] = [
          'pending_inspection',
          'pending_wax',
          'pending_base_repair',
          'pending_qa',
          'delivered',
        ];
        const currentIndex = statusOrder.indexOf(order.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIndex];

        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const targetLabel = STATUS_CONFIG.find((s) => s.value === nextStatus)?.label ?? nextStatus;

        const newHistoryRecord: StatusHistoryRecord = {
          id: `SH-${order.id}-${Date.now()}`,
          fromStatus: order.status,
          toStatus: nextStatus,
          timestamp,
          note: `移至${targetLabel}`,
        };

        return {
          ...order,
          status: nextStatus,
          statusHistory: [...order.statusHistory, newHistoryRecord],
        };
      })
    );
  };

  const handleMoveOrder = (orderId: string, newStatus: WorkOrderStatus, historyRecord: StatusHistoryRecord) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              statusHistory: [...order.statusHistory, historyRecord],
            }
          : order
      )
    );
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
          <small>进行中</small>
          <strong>{inProgressCount}</strong>
        </article>
        <article>
          <small>待质检</small>
          <strong>{qaCount}</strong>
        </article>
        <article>
          <small>已交付</small>
          <strong>{deliveredCount}</strong>
        </article>
        <article>
          <small>逾期工单</small>
          <strong style={{ color: overdueCount > 0 ? 'var(--error)' : 'inherit' }}>{overdueCount}</strong>
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
        onMoveOrder={handleMoveOrder}
        onViewHistory={handleViewHistory}
        onOpenQuote={handleOpenQuote}
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

      <WorkOrderList
        orders={filteredOrders}
        onEditOrder={handleEditOrder}
        onToggleStatus={handleToggleStatus}
        editingOrderId={editingOrder?.id ?? null}
        onOpenQuote={handleOpenQuote}
      />

      <StatusHistoryModal
        order={selectedHistoryOrder}
        onClose={handleCloseHistoryModal}
      />
    </main>
  );
}

export default App;
