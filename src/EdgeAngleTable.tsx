import { useState } from 'react';
import { EdgeAngleParam, EDGE_ANGLE_BOARD_TYPES } from './types';

interface EdgeAngleTableProps {
  params: EdgeAngleParam[];
  onSelectParam: (param: EdgeAngleParam) => void;
}

export default function EdgeAngleTable({ params, onSelectParam }: EdgeAngleTableProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredParams = activeFilter
    ? params.filter((p) => p.boardType === activeFilter)
    : params;

  const handleClick = (param: EdgeAngleParam) => {
    setSelectedId(param.id);
    onSelectParam(param);
  };

  const getBoardTypeColor = (boardType: string) => {
    switch (boardType) {
      case '公园板':
        return 'var(--secondary)';
      case '竞速板':
        return 'var(--primary)';
      case '粉雪板':
        return 'var(--accent)';
      default:
        return 'var(--primary)';
    }
  };

  return (
    <section className="panel edge-angle-panel">
      <div className="heading">
        <div>
          <p>参考数据</p>
          <h2>刃角参数表</h2>
        </div>
      </div>

      <div className="chips edge-filter-chips">
        <button
          className={!activeFilter ? 'active' : ''}
          onClick={() => {
            setActiveFilter(null);
            setSelectedId(null);
          }}
        >
          全部
        </button>
        {EDGE_ANGLE_BOARD_TYPES.map((type) => (
          <button
            key={type}
            className={activeFilter === type ? 'active' : ''}
            onClick={() => {
              setActiveFilter(type);
              setSelectedId(null);
            }}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="edge-table-container">
        {filteredParams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p className="empty-title">暂无参数数据</p>
            <p className="empty-desc">当前筛选条件下没有刃角参数记录</p>
          </div>
        ) : (
          <table className="edge-table">
            <thead>
              <tr>
                <th>板型</th>
                <th>推荐侧刃角</th>
                <th>推荐底刃角</th>
                <th>适用雪况</th>
                <th>调校备注</th>
              </tr>
            </thead>
            <tbody>
              {filteredParams.map((param) => (
                <tr
                  key={param.id}
                  className={selectedId === param.id ? 'selected' : ''}
                  onClick={() => handleClick(param)}
                >
                  <td>
                    <span
                      className="board-type-tag"
                      style={{
                        backgroundColor: getBoardTypeColor(param.boardType) + '20',
                        color: getBoardTypeColor(param.boardType),
                      }}
                    >
                      {param.boardType}
                    </span>
                  </td>
                  <td className="angle-value">{param.sideEdgeAngle}</td>
                  <td className="angle-value">{param.baseEdgeAngle}</td>
                  <td className="snow-condition">{param.snowCondition}</td>
                  <td className="tuning-note">{param.tuningNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!selectedId && filteredParams.length > 0 && (
        <div className="select-hint">
          <span className="hint-icon">💡</span>
          <span>点击任意参数行可将推荐角度带入新增记录区域</span>
        </div>
      )}

      {selectedId && filteredParams.length > 0 && (
        <div className="select-success">
          <span className="success-icon">✓</span>
          <span>已选择参数，推荐角度已填入表单</span>
        </div>
      )}
    </section>
  );
}
