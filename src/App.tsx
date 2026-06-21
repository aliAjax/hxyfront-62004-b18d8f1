import { useState } from 'react';
import './styles.css';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderList from './WorkOrderList';
import EdgeAngleTable from './EdgeAngleTable';
import CustomerHistoryPanel from './CustomerHistoryPanel';
import {
  WorkOrder,
  WorkOrderFormData,
  initialWorkOrders,
  EdgeAngleParam,
  initialEdgeAngleParams,
  CustomerHistoryRecord,
  initialCustomerHistory,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedEdgeParam, setSelectedEdgeParam] = useState<EdgeAngleParam | null>(null);
  const [edgeParams] = useState<EdgeAngleParam[]>(initialEdgeAngleParams);
  const [customerHistory] = useState<CustomerHistoryRecord[]>(initialCustomerHistory);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<CustomerHistoryRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);

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
      const newOrder: WorkOrder = {
        ...formData,
        id: getNextOrderId(),
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
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
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: order.status === 'pending' ? 'completed' : 'pending' }
          : order
      )
    );
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
  };

  let filteredOrders = activeFilter
    ? orders.filter((order) => order.boardType === activeFilter)
    : orders;

  if (statusFilter !== 'all') {
    filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const avgSideEdge = orders.length
    ? (
        orders.reduce((sum, o) => {
          const angle = parseFloat(o.sideEdgeAngle.replace('°', ''));
          return sum + (isNaN(angle) ? 0 : angle);
        }, 0) / orders.length
      ).toFixed(1)
    : 0;

  const repairCount = orders.filter(
    (o) => (o.baseDamage && o.baseDamage !== '无') || (o.damageMarks && o.damageMarks.length > 0)
  ).length;

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
          <small>待维护</small>
          <strong>{pendingCount}</strong>
        </article>
        <article>
          <small>完工工单</small>
          <strong>{completedCount}</strong>
        </article>
        <article>
          <small>平均侧刃角</small>
          <strong>{avgSideEdge}°</strong>
        </article>
        <article>
          <small>底板修补</small>
          <strong>{repairCount}</strong>
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
            <button
              className={statusFilter === 'pending' ? 'active' : ''}
              onClick={() => setStatusFilter('pending')}
            >
              待维护
            </button>
            <button
              className={statusFilter === 'completed' ? 'active' : ''}
              onClick={() => setStatusFilter('completed')}
            >
              已完工
            </button>
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

      <WorkOrderList
        orders={filteredOrders}
        onEditOrder={handleEditOrder}
        onToggleStatus={handleToggleStatus}
        editingOrderId={editingOrder?.id ?? null}
      />
    </main>
  );
}

export default App;
