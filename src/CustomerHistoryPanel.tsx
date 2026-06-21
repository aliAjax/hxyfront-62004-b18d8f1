import { useState } from 'react';
import { CustomerHistoryRecord } from './types';

interface CustomerHistoryPanelProps {
  records: CustomerHistoryRecord[];
  onSelectRecord: (record: CustomerHistoryRecord) => void;
  selectedRecordId: string | null;
}

export default function CustomerHistoryPanel({
  records,
  onSelectRecord,
  selectedRecordId,
}: CustomerHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredRecords = hasSearched
    ? records.filter(
        (r) =>
          r.customerName.includes(searchTerm.trim()) ||
          r.customerPhone.includes(searchTerm.trim())
      )
    : [];

  const groupedByCustomer = filteredRecords.reduce<
    Record<string, CustomerHistoryRecord[]>
  >((acc, record) => {
    const key = `${record.customerName}-${record.customerPhone}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  return (
    <section className="panel customer-history-panel">
      <div className="heading">
        <div>
          <p>客户查询</p>
          <h2>历史维护记录</h2>
        </div>
      </div>

      <div className="history-search">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (hasSearched) setHasSearched(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入客户姓名或手机号"
          className="history-search-input"
        />
        <button className="primary" onClick={handleSearch}>
          查询
        </button>
      </div>

      {!hasSearched && (
        <div className="empty-state">
          <div className="empty-icon">&#128269;</div>
          <p className="empty-title">输入客户信息查询</p>
          <p className="empty-desc">请输入客户姓名或手机号，查看历史维护记录</p>
        </div>
      )}

      {hasSearched && filteredRecords.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">&#128533;</div>
          <p className="empty-title">未找到匹配记录</p>
          <p className="empty-desc">
            没有找到与「{searchTerm}」相关的客户维护记录，请检查输入后重试
          </p>
        </div>
      )}

      {hasSearched && filteredRecords.length > 0 && (
        <div className="history-results">
          {Object.entries(groupedByCustomer).map(([key, customerRecords]) => {
            const customerName = customerRecords[0].customerName;
            const customerPhone = customerRecords[0].customerPhone;
            return (
              <div key={key} className="history-customer-group">
                <div className="customer-info">
                  <span className="customer-name">{customerName}</span>
                  <span className="customer-phone">{customerPhone}</span>
                  <span className="customer-count">
                    共 {customerRecords.length} 条记录
                  </span>
                </div>
                <div className="history-records-list">
                  {customerRecords
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((record) => (
                      <article
                        key={record.id}
                        className={`history-record-item ${selectedRecordId === record.id ? 'selected' : ''}`}
                        onClick={() => onSelectRecord(record)}
                      >
                        <div className="history-record-header">
                          <span className="history-date">
                            {record.createdAt}
                          </span>
                          <span className="history-board-tag">
                            {record.boardType}
                          </span>
                        </div>
                        <p className="history-record-main">
                          {record.brand} · {record.length}cm ·{' '}
                          {record.boardType}
                        </p>
                        <p className="history-record-detail">
                          维护：{record.maintenanceItems}
                        </p>
                        <p className="history-record-detail">
                          刃角：侧刃 {record.sideEdgeAngle} / 底刃{' '}
                          {record.baseEdgeAngle} · {record.waxType}
                        </p>
                        {record.deliveryNote && (
                          <p className="history-record-note">
                            交付备注：{record.deliveryNote}
                          </p>
                        )}
                        {selectedRecordId === record.id && (
                          <div className="history-selected-badge">
                            &#10003; 已选择，将回填至工单表单
                          </div>
                        )}
                      </article>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
