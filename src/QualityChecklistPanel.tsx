import { useState } from 'react';
import {
  QualityChecklist,
  QaCheckItemStatus,
  QaCheckItem,
  QA_CHECK_ITEMS,
  isQualityCheckCompleted,
  hasQualityCheckFailedItems,
  getQualityCheckProgress,
} from './types';

interface QualityChecklistPanelProps {
  checklist: QualityChecklist | undefined;
  workOrderId: string;
  workOrderStatus: string;
  onUpdateChecklist: (checklist: QualityChecklist) => void;
  onCreateChecklist: () => void;
}

const getStatusConfig = (status: QaCheckItemStatus) => {
  switch (status) {
    case 'pass':
      return { label: '通过', color: '#10b981', icon: '✓' };
    case 'fail':
      return { label: '不通过', color: '#ef4444', icon: '✕' };
    case 'pending':
      return { label: '待检查', color: '#6b7280', icon: '○' };
  }
};

export default function QualityChecklistPanel({
  checklist,
  workOrderId,
  workOrderStatus,
  onUpdateChecklist,
  onCreateChecklist,
}: QualityChecklistPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<QualityChecklist | null>(null);

  const isCompleted = isQualityCheckCompleted(checklist);
  const canEdit = workOrderStatus === 'pending_qa' && !isCompleted;
  const canStart = !checklist && workOrderStatus === 'pending_qa';

  const handleStartEdit = () => {
    if (!checklist) return;
    setEditingChecklist(JSON.parse(JSON.stringify(checklist)));
    setIsEditing(true);
  };

  const [showFailWarning, setShowFailWarning] = useState(false);

  const handleCancelEdit = () => {
    setEditingChecklist(null);
    setIsEditing(false);
    setShowFailWarning(false);
  };

  const handleSave = () => {
    if (!editingChecklist) return;
    
    const hasPending = editingChecklist.items.some((item) => item.status === 'pending');
    const hasFailed = hasQualityCheckFailedItems(editingChecklist);
    const allPassed = editingChecklist.items.every((item) => item.status === 'pass');
    
    if (hasPending) {
      alert('请完成所有检查项后再保存');
      return;
    }

    if (hasFailed) {
      setShowFailWarning(true);
      return;
    }
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updatedChecklist: QualityChecklist = {
      ...editingChecklist,
      completedAt: allPassed ? timestamp : null,
      inspectorName: allPassed ? '当前技师' : '',
    };

    onUpdateChecklist(updatedChecklist);
    setIsEditing(false);
    setEditingChecklist(null);
    setShowFailWarning(false);
  };

  const handleSaveWithFail = () => {
    if (!editingChecklist) return;
    
    const hasPending = editingChecklist.items.some((item) => item.status === 'pending');
    if (hasPending) {
      alert('请完成所有检查项后再保存');
      return;
    }

    const updatedChecklist: QualityChecklist = {
      ...editingChecklist,
      completedAt: null,
      inspectorName: '',
    };

    onUpdateChecklist(updatedChecklist);
    setIsEditing(false);
    setEditingChecklist(null);
    setShowFailWarning(false);
  };

  const handleItemStatusChange = (itemId: string, status: QaCheckItemStatus) => {
    if (!editingChecklist) return;
    setEditingChecklist({
      ...editingChecklist,
      items: editingChecklist.items.map((item) =>
        item.id === itemId ? { ...item, status } : item
      ),
    });
  };

  const handleItemNoteChange = (itemId: string, note: string) => {
    if (!editingChecklist) return;
    setEditingChecklist({
      ...editingChecklist,
      items: editingChecklist.items.map((item) =>
        item.id === itemId ? { ...item, note } : item
      ),
    });
  };

  const handleOverallNoteChange = (note: string) => {
    if (!editingChecklist) return;
    setEditingChecklist({ ...editingChecklist, overallNote: note });
  };

  const displayChecklist = isEditing && editingChecklist ? editingChecklist : checklist;

  const progress = getQualityCheckProgress(displayChecklist);
  const hasFailed = hasQualityCheckFailedItems(displayChecklist);

  const getItemIcon = (key: string) => {
    return QA_CHECK_ITEMS.find((item) => item.key === key)?.icon ?? '📋';
  };

  if (!checklist && canStart) {
    return (
      <section className="panel quality-checklist-panel">
        <div className="heading">
          <div>
            <p>交付质检</p>
            <h2>质检检查清单</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p className="empty-title">待开始质检</p>
          <p className="empty-desc">工单已进入质检阶段，点击下方按钮开始质检检查</p>
          <button className="primary" onClick={onCreateChecklist} style={{ marginTop: 12 }}>
            开始质检
          </button>
        </div>
      </section>
    );
  }

  if (!checklist) {
    return (
      <section className="panel quality-checklist-panel">
        <div className="heading">
          <div>
            <p>交付质检</p>
            <h2>质检检查清单</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-title">暂无质检记录</p>
          <p className="empty-desc">工单进入质检阶段后将生成检查清单</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel quality-checklist-panel">
      <div className="heading">
        <div>
          <p>交付质检</p>
          <h2>质检检查清单</h2>
        </div>
        <div>
          {isCompleted && (
            <span className="qa-completed-badge">
              ✓ 质检完成
            </span>
          )}
          {!isCompleted && canEdit && !isEditing && (
            <button className="primary small-btn" onClick={handleStartEdit}>
              编辑质检
            </button>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="qa-summary-bar">
          <div className="qa-summary-item">
            <span className="qa-summary-icon" style={{ color: '#10b981' }}>✓</span>
            <span className="qa-summary-label">通过</span>
            <span className="qa-summary-value">{progress.passed}</span>
          </div>
          <div className="qa-summary-item">
            <span className="qa-summary-icon" style={{ color: '#ef4444' }}>✕</span>
            <span className="qa-summary-label">不通过</span>
            <span className="qa-summary-value">{progress.failed}</span>
          </div>
          <div className="qa-summary-item">
            <span className="qa-summary-icon" style={{ color: '#6b7280' }}>○</span>
            <span className="qa-summary-label">待检查</span>
            <span className="qa-summary-value">{progress.pending}</span>
          </div>
          {checklist.completedAt && (
            <div className="qa-summary-item">
              <span className="qa-summary-icon">🕐</span>
              <span className="qa-summary-label">完成时间</span>
              <span className="qa-summary-value time-value">{checklist.completedAt}</span>
            </div>
          )}
          {checklist.inspectorName && (
            <div className="qa-summary-item">
              <span className="qa-summary-icon">👤</span>
              <span className="qa-summary-label">质检员</span>
              <span className="qa-summary-value">{checklist.inspectorName}</span>
            </div>
          )}
        </div>
      )}

      {hasFailed && !isCompleted && (
        <div className="qa-block-warning">
          <span className="qa-block-warning-icon">⚠️</span>
          <div className="qa-block-warning-text">
            <strong>存在不通过项，无法交付</strong>
            请先修复所有不通过的检查项，或与客户确认后重新质检
          </div>
        </div>
      )}

      <div className="qa-check-items">
        {displayChecklist?.items.map((item) => {
          const statusConfig = getStatusConfig(item.status);
          return (
            <div key={item.id} className="qa-check-item">
              <div className="qa-check-item-header">
                <div className="qa-check-item-title">
                  <span className="qa-check-item-icon">{getItemIcon(item.key)}</span>
                  <span className="qa-check-item-label">{item.label}</span>
                </div>
                {isEditing ? (
                  <div className="qa-status-buttons">
                    <button
                      className={`qa-status-btn pass ${item.status === 'pass' ? 'active' : ''}`}
                      onClick={() => handleItemStatusChange(item.id, 'pass')}
                    >
                      通过
                    </button>
                    <button
                      className={`qa-status-btn fail ${item.status === 'fail' ? 'active' : ''}`}
                      onClick={() => handleItemStatusChange(item.id, 'fail')}
                    >
                      不通过
                    </button>
                  </div>
                ) : (
                  <span
                    className="qa-status-tag"
                    style={{
                      backgroundColor: statusConfig.color + '15',
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                )}
              </div>
              {isEditing ? (
                <textarea
                  className="qa-note-textarea"
                  placeholder="输入检查备注..."
                  value={item.note}
                  onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                />
              ) : (
                item.note && (
                  <p className="qa-check-item-note">{item.note}</p>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="qa-overall-note">
        <div className="qa-section-title">
          <span>📝</span>
          <span>总体备注</span>
        </div>
        {isEditing ? (
          <textarea
            className="qa-note-textarea"
            placeholder="输入质检总体备注..."
            value={editingChecklist?.overallNote ?? ''}
            onChange={(e) => handleOverallNoteChange(e.target.value)}
          />
        ) : (
          checklist.overallNote && (
            <p className="qa-overall-note-text">{checklist.overallNote}</p>
          )
        )}
      </div>

      {isEditing && (
        <div className="qa-edit-actions">
          <button className="secondary" onClick={handleCancelEdit}>
            取消
          </button>
          <button
            className="primary"
            onClick={handleSave}
            disabled={editingChecklist?.items.every((i) => i.status === 'pending')}
          >
            完成质检
          </button>
        </div>
      )}

      {showFailWarning && (
        <div className="modal-overlay" onClick={() => setShowFailWarning(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>⚠️ 质检存在不通过项</h3>
            </div>
            <div className="modal-body">
              <div className="qa-block-warning" style={{ marginTop: 0, marginBottom: 12 }}>
                <span className="qa-block-warning-icon">⚠️</span>
                <div className="qa-block-warning-text">
                  <strong>有 {progress.failed} 项检查不通过</strong>
                  存在不通过项时工单无法交付。请确认是否仅保存检查结果？
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px 0' }}>• 选择 <strong>"仅保存，不完成"</strong> 将保存当前检查结果，但质检仍处于未完成状态，后续可继续修改</p>
                <p style={{ margin: 0 }}>• 选择 <strong>"返回修改"</strong> 将取消保存，继续编辑质检项</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowFailWarning(false)}>
                返回修改
              </button>
              <button className="primary" style={{ background: '#f59e0b' }} onClick={handleSaveWithFail}>
                仅保存，不完成
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
