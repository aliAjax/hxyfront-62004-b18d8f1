import { WorkOrder } from './types';

interface WorkOrderListProps {
  orders: WorkOrder[];
}

const statusMap = {
  pending: { label: '待维护', color: 'var(--accent)' },
  completed: { label: '已完工', color: 'var(--secondary)' },
};

export default function WorkOrderList({ orders }: WorkOrderListProps) {
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
          return (
            <article key={order.id}>
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
                {order.customerPreference && (
                  <p className="record-note">偏好：{order.customerPreference}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
