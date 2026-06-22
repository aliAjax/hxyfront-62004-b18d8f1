import { useState, useMemo, useEffect } from 'react';
import {
  CustomerHistoryRecord,
  WorkOrder,
  QA_CHECK_ITEMS,
  isQualityCheckCompleted,
  DAMAGE_TYPES,
  SEVERITY_LEVELS,
} from './types';

interface RelatedHistoryModalProps {
  isOpen: boolean;
  currentOrder: WorkOrder;
  historyRecords: CustomerHistoryRecord[];
  allWorkOrders: WorkOrder[];
  onClose: () => void;
  onSelectRecord: (record: CustomerHistoryRecord | WorkOrder) => void;
}

type HistoryItem = {
  id: string;
  source: 'history' | 'workorder';
  date: string;
  brand: string;
  length: string;
  boardType: string;
  sideEdgeAngle: string;
  baseEdgeAngle: string;
  waxType: string;
  customerPreference: string;
  damageMarks: any[];
  baseDamage: string;
  repairLocation: string;
  maintenanceItems: string;
  qualityChecklist?: any;
  qaOverallNote?: string;
  qaInspector?: string;
  originalRecord: CustomerHistoryRecord | WorkOrder;
};

const getDamageTypeLabel = (type: string) =>
  DAMAGE_TYPES.find((t) => t.value === type)?.label ?? type;

const getSeverityLabel = (sev: string) =>
  SEVERITY_LEVELS.find((s) => s.value === sev)?.label ?? sev;

const buildMaintenanceItemsFromOrder = (order: WorkOrder) => {
  const items: string[] = [];
  if (order.sideEdgeAngle || order.baseEdgeAngle) items.push('修刃');
  if (order.waxType && order.waxType !== '不打蜡') items.push('打蜡');
  if (order.baseDamage && order.baseDamage !== '无') items.push('补底');
  if (order.repairLocation) items.push('修补');
  return items.join('、') || '常规维护';
};

export default function RelatedHistoryModal({
  isOpen,
  currentOrder,
  historyRecords,
  allWorkOrders,
  onClose,
  onSelectRecord,
}: RelatedHistoryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setSelectedId(null);
  }, [isOpen]);

  const customerName = currentOrder.customerName || '';
  const customerPhone = currentOrder.customerPhone || '';

  const historyItems = useMemo<HistoryItem[]>(() => {
    const items: HistoryItem[] = [];

    const matchCustomer = (name: string, phone: string) => {
      if (!customerName && !customerPhone) return false;
      const nameMatch =
        customerName && name && name.includes(customerName);
      const phoneMatch =
        customerPhone && phone && phone.includes(customerPhone);
      return nameMatch || phoneMatch;
    };

    historyRecords.forEach((record) => {
      if (matchCustomer(record.customerName, record.customerPhone)) {
        const safeChecklist = record.qualityChecklist;
        items.push({
          id: record.id,
          source: 'history',
          date: record.createdAt,
          brand: record.brand,
          length: record.length,
          boardType: record.boardType,
          sideEdgeAngle: record.sideEdgeAngle,
          baseEdgeAngle: record.baseEdgeAngle,
          waxType: record.waxType,
          customerPreference: record.deliveryNote || '',
          damageMarks: Array.isArray(record.damageMarks)
            ? record.damageMarks
            : [],
          baseDamage: record.baseDamage || '',
          repairLocation: record.repairLocation || '',
          maintenanceItems: record.maintenanceItems || '',
          qualityChecklist: safeChecklist || undefined,
          qaOverallNote: safeChecklist?.overallNote,
          qaInspector: safeChecklist?.inspectorName,
          originalRecord: record,
        });
      }
    });

    allWorkOrders.forEach((order) => {
      if (order.id === currentOrder.id) return;
      if (order.status !== 'customer_delivered') return;
      if (matchCustomer(order.customerName || '', order.customerPhone || '')) {
        const safeChecklist = order.qualityChecklist;
        items.push({
          id: order.id,
          source: 'workorder',
          date: order.actualDelivery || order.createdAt,
          brand: order.brand,
          length: order.length,
          boardType: order.boardType,
          sideEdgeAngle: order.sideEdgeAngle,
          baseEdgeAngle: order.baseEdgeAngle,
          waxType: order.waxType,
          customerPreference: order.customerPreference || '',
          damageMarks: Array.isArray(order.damageMarks)
            ? order.damageMarks
            : [],
          baseDamage: order.baseDamage || '',
          repairLocation: order.repairLocation || '',
          maintenanceItems: buildMaintenanceItemsFromOrder(order),
          qualityChecklist: safeChecklist || undefined,
          qaOverallNote: safeChecklist?.overallNote,
          qaInspector: safeChecklist?.inspectorName,
          originalRecord: order,
        });
      }
    });

    return items.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return db - da;
    });
  }, [historyRecords, allWorkOrders, currentOrder, customerName, customerPhone]);

  const handleSelect = (item: HistoryItem) => {
    setSelectedId((prev) => (prev === item.id ? null : item.id));
  };

  const handleConfirmApply = () => {
    const item = historyItems.find((i) => i.id === selectedId);
    if (!item) return;
    onSelectRecord(item.originalRecord);
    onClose();
    setSelectedId(null);
  };

  if (!isOpen) return null;

  const selectedItem = historyItems.find((i) => i.id === selectedId);

  const safeQaCount = (item: HistoryItem) => {
    const items = item.qualityChecklist?.items;
    if (!Array.isArray(items)) return { passed: 0, total: 0 };
    const passed = items.filter((i: any) => i.status === 'pass').length;
    return { passed, total: items.length };
  };

  return (
    <div className="modal-overlay related-history-overlay" onClick={onClose}>
      <div
        className="modal-container related-history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>🔗 关联客户历史</h2>
            <p className="modal-subtitle">
              {customerName || customerPhone
                ? `正在为${customerName ? ` ${customerName}` : ''}${
                    customerPhone ? ` (${customerPhone})` : ''
                  } 查询历史记录`
                : '当前工单未填写客户信息，无法查询关联历史'}
              · 共 {historyItems.length} 条记录
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {historyItems.length === 0 ? (
          <div className="related-history-empty">
            <div className="empty-icon-large">📭</div>
            <h3>暂无关联历史记录</h3>
            <p>
              {customerName || customerPhone
                ? '该客户暂无已完成的维护记录。'
                : '请先在工单中填写客户姓名或手机号后再查询。'}
            </p>
          </div>
        ) : (
          <div className="related-history-content">
            <div className="related-history-list">
              {historyItems.map((item) => {
                const hasQa =
                  item.qualityChecklist !== undefined &&
                  Array.isArray(item.qualityChecklist.items);
                const qaCompleted = hasQa
                  ? !!isQualityCheckCompleted(item.qualityChecklist)
                  : false;
                const qaCount = safeQaCount(item);

                return (
                  <div
                    key={item.id}
                    className={`related-history-card ${
                      selectedId === item.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="rh-card-header">
                      <div className="rh-date-badge">📅 {item.date}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          className="rh-source-tag"
                          style={{
                            background:
                              item.source === 'history' ? '#dbeafe' : '#dcfce7',
                            color:
                              item.source === 'history' ? '#1e40af' : '#166534',
                          }}
                        >
                          {item.source === 'history' ? '历史库' : '已交付工单'}
                        </span>
                        {hasQa && (
                          <span
                            className="rh-qa-badge"
                            style={{
                              background: qaCompleted ? '#dcfce7' : '#fef3c7',
                              color: qaCompleted ? '#166534' : '#92400e',
                            }}
                          >
                            {qaCompleted
                              ? `✓ 质检${qaCount.passed}/${qaCount.total}`
                              : '⏳ 质检中'}
                          </span>
                        )}
                        {item.boardType && (
                          <span className="rh-board-tag">{item.boardType}</span>
                        )}
                        {item.damageMarks.length > 0 && (
                          <span
                            className="rh-board-tag"
                            style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                            }}
                          >
                            🩹 {item.damageMarks.length}处损伤
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rh-card-main">
                      <strong className="rh-board-info">
                        {item.brand || '-'} · {item.length || '-'}cm
                      </strong>
                      {item.maintenanceItems && (
                        <span className="rh-items-text">
                          维护：{item.maintenanceItems}
                        </span>
                      )}
                    </div>

                    <div className="rh-card-params">
                      <div className="rh-param">
                        <span className="rh-param-label">侧刃</span>
                        <span className="rh-param-value">
                          {item.sideEdgeAngle || '-'}
                        </span>
                      </div>
                      <div className="rh-param">
                        <span className="rh-param-label">底刃</span>
                        <span className="rh-param-value">
                          {item.baseEdgeAngle || '-'}
                        </span>
                      </div>
                      <div className="rh-param">
                        <span className="rh-param-label">蜡型</span>
                        <span className="rh-param-value">
                          {item.waxType || '-'}
                        </span>
                      </div>
                    </div>

                    {selectedId === item.id && (
                      <div className="rh-card-detail">
                        {item.customerPreference && (
                          <div className="rh-detail-section">
                            <span className="rh-detail-label">
                              💬 客户偏好/备注：
                            </span>
                            <span className="rh-detail-text">
                              {item.customerPreference}
                            </span>
                          </div>
                        )}

                        {item.damageMarks && item.damageMarks.length > 0 && (
                          <div className="rh-detail-section">
                            <span className="rh-detail-label">🩹 损伤记录：</span>
                            <div className="rh-damage-list">
                              {item.damageMarks.map((mark: any) => {
                                const typeInfo = DAMAGE_TYPES.find(
                                  (t) => t.value === mark.type
                                );
                                return (
                                  <span
                                    key={mark.id || mark.type + mark.length}
                                    className="rh-damage-tag"
                                    style={{
                                      background:
                                        (typeInfo?.color ?? '#64748b') + '12',
                                      color: typeInfo?.color ?? '#64748b',
                                      borderColor:
                                        (typeInfo?.color ?? '#64748b') + '30',
                                    }}
                                  >
                                    {typeInfo?.icon || '🩹'}{' '}
                                    {getDamageTypeLabel(mark.type)}
                                    <em>{mark.length}cm</em>
                                    <small>
                                      · {getSeverityLabel(mark.severity)}
                                    </small>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {item.baseDamage && item.baseDamage !== '无' && (
                          <div className="rh-detail-section">
                            <span className="rh-detail-label">📝 底板描述：</span>
                            <span className="rh-detail-text">
                              {item.baseDamage}
                            </span>
                            {item.repairLocation && (
                              <span className="rh-detail-text">
                                {' '}
                                · {item.repairLocation}
                              </span>
                            )}
                          </div>
                        )}

                        {hasQa && item.qualityChecklist && (
                          <div className="rh-detail-section">
                            <span className="rh-detail-label">✅ 质检项：</span>
                            <div className="rh-qa-items">
                              {item.qualityChecklist.items.map((qaItem: any) => {
                                const icon =
                                  QA_CHECK_ITEMS.find(
                                    (q) => q.key === qaItem.key
                                  )?.icon ?? '📋';
                                return (
                                  <div
                                    key={qaItem.id || qaItem.key}
                                    className="rh-qa-item"
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                      }}
                                    >
                                      <span className="rh-qa-item-icon">
                                        {icon}
                                      </span>
                                      <span className="rh-qa-item-label">
                                        {qaItem.label}
                                      </span>
                                      <span
                                        className={`rh-qa-item-status ${qaItem.status}`}
                                      >
                                        {qaItem.status === 'pass'
                                          ? '通过'
                                          : qaItem.status === 'fail'
                                          ? '不通过'
                                          : '待检'}
                                      </span>
                                    </div>
                                    {qaItem.note && (
                                      <p className="rh-qa-item-note">
                                        {qaItem.note}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {item.qaOverallNote && (
                              <div className="rh-qa-overall">
                                <strong>总体评价：</strong>
                                {item.qaOverallNote}
                              </div>
                            )}
                            {item.qaInspector && (
                              <div className="rh-qa-inspector">
                                质检员：{item.qaInspector}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="rh-apply-tip">
                          👆 点击下方按钮，将此记录的偏好与调校参数带入当前工单
                        </div>
                      </div>
                    )}

                    {selectedId === item.id && (
                      <div className="rh-selected-badge">✓ 已选择</div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedItem && (
              <div className="related-history-side">
                <h3>📋 将回填的参数</h3>
                <div className="rh-apply-preview">
                  <div className="rh-preview-row">
                    <span>板型：</span>
                    <strong>{selectedItem.boardType || '-'}</strong>
                  </div>
                  <div className="rh-preview-row">
                    <span>侧刃角度：</span>
                    <strong>{selectedItem.sideEdgeAngle || '-'}</strong>
                  </div>
                  <div className="rh-preview-row">
                    <span>底刃角度：</span>
                    <strong>{selectedItem.baseEdgeAngle || '-'}</strong>
                  </div>
                  <div className="rh-preview-row">
                    <span>蜡型：</span>
                    <strong>{selectedItem.waxType || '-'}</strong>
                  </div>
                  {selectedItem.baseDamage &&
                    selectedItem.baseDamage !== '无' && (
                      <div className="rh-preview-row">
                        <span>底板描述：</span>
                        <strong>{selectedItem.baseDamage}</strong>
                      </div>
                    )}
                  {selectedItem.repairLocation && (
                    <div className="rh-preview-row">
                      <span>修补位置：</span>
                      <strong>{selectedItem.repairLocation}</strong>
                    </div>
                  )}
                  {selectedItem.damageMarks.length > 0 && (
                    <div className="rh-preview-row full">
                      <span>
                        损伤标记 ({selectedItem.damageMarks.length}处)：
                      </span>
                      <strong className="multiline">
                        {selectedItem.damageMarks
                          .map(
                            (m) =>
                              `${getDamageTypeLabel(m.type)} ${m.length}cm`
                          )
                          .join('、')}
                      </strong>
                    </div>
                  )}
                  <div className="rh-preview-row full">
                    <span>客户偏好：</span>
                    <strong className="multiline">
                      {selectedItem.customerPreference || '-'}
                    </strong>
                  </div>
                </div>
                <div className="rh-apply-warn">
                  ⚠️ 回填将覆盖当前工单中上述字段的已有内容
                </div>
                <button
                  className="primary rh-apply-btn"
                  onClick={handleConfirmApply}
                >
                  🚀 确认应用到当前工单
                </button>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
