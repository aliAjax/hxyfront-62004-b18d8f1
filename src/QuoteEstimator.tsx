import { useState, useEffect, useMemo } from 'react';
import {
  QuoteEstimate,
  QuoteSummary,
  BOARD_TYPES,
  WAX_TYPES,
  EDGE_ANGLE_ADJUSTMENTS,
  REPAIR_MATERIALS,
  WAX_PRICING,
  BOARD_TYPE_PRICE_MULTIPLIER,
  RUSH_SURCHARGE_PERCENT,
  LENGTH_PRICE_TIERS,
  DAMAGE_LABOR_COST,
} from './types';

interface QuoteEstimatorProps {
  initialBoardType?: string;
  initialLength?: string;
  initialWaxType?: string;
  initialDamageCount?: number;
  onApplyQuote?: (summary: QuoteSummary) => void;
  applyButtonText?: string;
}

const emptyQuote: QuoteEstimate = {
  boardType: '',
  length: '',
  edgeAngleAdjustment: 'standard',
  waxType: '',
  baseDamageCount: 0,
  repairMaterial: 'pTex',
  isRush: false,
  breakdown: { labor: 0, material: 0, rush: 0 },
  subtotal: 0,
  discount: 0,
  discountPercent: 0,
  finalTotal: 0,
  remark: '',
};

export default function QuoteEstimator({
  initialBoardType,
  initialLength,
  initialWaxType,
  initialDamageCount,
  onApplyQuote,
  applyButtonText = '应用到工单',
}: QuoteEstimatorProps) {
  const [quote, setQuote] = useState<QuoteEstimate>(emptyQuote);

  useEffect(() => {
    setQuote((prev) => ({
      ...prev,
      boardType: initialBoardType || '',
      length: initialLength || '',
      waxType: initialWaxType || '',
      baseDamageCount: initialDamageCount ?? 0,
    }));
  }, [initialBoardType, initialLength, initialWaxType, initialDamageCount]);

  const calculateQuote = useMemo(() => {
    const lengthNum = parseFloat(quote.length) || 0;
    const boardTypeMultiplier = BOARD_TYPE_PRICE_MULTIPLIER[quote.boardType] ?? 1.0;

    const lengthTier = LENGTH_PRICE_TIERS.find(
      (tier) => lengthNum >= tier.min && lengthNum < tier.max
    );
    const baseLabor = lengthTier ? lengthTier.baseLabor : 80;

    const edgeAdj = EDGE_ANGLE_ADJUSTMENTS.find((a) => a.value === quote.edgeAngleAdjustment);
    const edgeLabor = edgeAdj ? edgeAdj.laborPrice : 80;

    const damageLabor = quote.baseDamageCount * DAMAGE_LABOR_COST;

    const laborCost = Math.round((baseLabor + edgeLabor + damageLabor) * boardTypeMultiplier);

    const waxCost = WAX_PRICING[quote.waxType] ?? 0;

    const repairMat = REPAIR_MATERIALS.find((m) => m.value === quote.repairMaterial);
    const materialCost = waxCost + (repairMat ? repairMat.pricePerUnit * quote.baseDamageCount : 0);

    const subtotal = laborCost + materialCost;

    const rushCost = quote.isRush ? Math.round(subtotal * RUSH_SURCHARGE_PERCENT) : 0;

    const subtotalWithRush = subtotal + rushCost;

    const discountAmount = quote.discountPercent
      ? Math.round(subtotalWithRush * (quote.discountPercent / 100))
      : quote.discount;

    const finalTotal = Math.max(0, subtotalWithRush - discountAmount);

    return {
      labor: laborCost,
      material: materialCost,
      rush: rushCost,
      subtotal: subtotalWithRush,
      discount: discountAmount,
      finalTotal,
    };
  }, [quote]);

  const handleChange = (field: keyof QuoteEstimate, value: string | number | boolean) => {
    setQuote((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyQuote = () => {
    if (onApplyQuote) {
      const summary: QuoteSummary = {
        labor: calculateQuote.labor,
        material: calculateQuote.material,
        rush: calculateQuote.rush,
        subtotal: calculateQuote.subtotal,
        discountPercent: quote.discountPercent,
        discount: calculateQuote.discount,
        finalTotal: calculateQuote.finalTotal,
        remark: quote.remark,
      };
      onApplyQuote(summary);
    }
  };

  const formatCurrency = (value: number) => `¥${value.toFixed(0)}`;

  return (
    <section className="panel quote-panel">
      <div className="heading">
        <div>
          <p>费用核算</p>
          <h2>维护报价预估</h2>
        </div>
      </div>

      <div className="quote-form">
        <div className="field-grid">
          <label className="form-field">
            <span>板型</span>
            <select
              value={quote.boardType}
              onChange={(e) => handleChange('boardType', e.target.value)}
            >
              <option value="">请选择板型</option>
              {BOARD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>长度 (cm)</span>
            <input
              type="number"
              value={quote.length}
              onChange={(e) => handleChange('length', e.target.value)}
              placeholder="请输入长度"
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>刃角调校</span>
            <select
              value={quote.edgeAngleAdjustment}
              onChange={(e) => handleChange('edgeAngleAdjustment', e.target.value)}
            >
              {EDGE_ANGLE_ADJUSTMENTS.map((adj) => (
                <option key={adj.value} value={adj.value}>
                  {adj.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>打蜡类型</span>
            <select
              value={quote.waxType}
              onChange={(e) => handleChange('waxType', e.target.value)}
            >
              <option value="">请选择蜡型</option>
              {WAX_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>底板损伤数量</span>
            <input
              type="number"
              min="0"
              value={quote.baseDamageCount}
              onChange={(e) => handleChange('baseDamageCount', parseInt(e.target.value) || 0)}
            />
          </label>

          <label className="form-field">
            <span>修补材料</span>
            <select
              value={quote.repairMaterial}
              onChange={(e) => handleChange('repairMaterial', e.target.value)}
            >
              {REPAIR_MATERIALS.map((mat) => (
                <option key={mat.value} value={mat.value}>
                  {mat.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field rush-field">
          <span className="rush-checkbox-label">
            <input
              type="checkbox"
              checked={quote.isRush}
              onChange={(e) => handleChange('isRush', e.target.checked)}
              className="rush-checkbox"
            />
            <span className="rush-label-text">加急服务 (+30%)</span>
          </span>
        </label>
      </div>

      <div className="quote-breakdown">
        <h3 className="breakdown-title">费用明细</h3>

        <div className="breakdown-list">
          <div className="breakdown-item">
            <span className="breakdown-label">人工费</span>
            <span className="breakdown-value">{formatCurrency(calculateQuote.labor)}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">材料费</span>
            <span className="breakdown-value">{formatCurrency(calculateQuote.material)}</span>
          </div>
          {calculateQuote.rush > 0 && (
            <div className="breakdown-item rush-item">
              <span className="breakdown-label">加急费</span>
              <span className="breakdown-value rush-value">
                {formatCurrency(calculateQuote.rush)}
              </span>
            </div>
          )}
        </div>

        <div className="breakdown-subtotal">
          <span>小计</span>
          <span>{formatCurrency(calculateQuote.subtotal)}</span>
        </div>

        <div className="discount-section">
          <div className="discount-controls">
            <label className="form-field discount-field">
              <span>折扣 (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={quote.discountPercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleChange('discountPercent', val);
                  handleChange('discount', 0);
                }}
                placeholder="0"
              />
            </label>
            <span className="discount-divider">或</span>
            <label className="form-field discount-field">
              <span>减免金额 (¥)</span>
              <input
                type="number"
                min="0"
                value={quote.discount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  handleChange('discount', val);
                  handleChange('discountPercent', 0);
                }}
                placeholder="0"
              />
            </label>
          </div>
          {calculateQuote.discount > 0 && (
            <div className="breakdown-item discount-item">
              <span className="breakdown-label">优惠减免</span>
              <span className="breakdown-value discount-value">
                -{formatCurrency(calculateQuote.discount)}
              </span>
            </div>
          )}
        </div>

        <div className="breakdown-total">
          <span>应付总额</span>
          <span className="total-value">{formatCurrency(calculateQuote.finalTotal)}</span>
        </div>
      </div>

      <div className="quote-remark">
        <label className="form-field">
          <span>备注</span>
          <textarea
            value={quote.remark}
            onChange={(e) => handleChange('remark', e.target.value)}
            placeholder="技师备注说明..."
            rows={2}
          />
        </label>
      </div>

      {onApplyQuote && (
        <div className="quote-actions">
          <button className="primary submit-btn" onClick={handleApplyQuote}>
            {applyButtonText}
          </button>
        </div>
      )}
    </section>
  );
}
