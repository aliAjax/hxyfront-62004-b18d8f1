export type WorkOrderPhase =
  | 'board_received'
  | 'damage_assessment'
  | 'tuning_quote'
  | 'technician_work'
  | 'quality_check'
  | 'customer_delivered';

export type WorkOrderStatus = WorkOrderPhase;

export type EditableField =
  | 'brand'
  | 'length'
  | 'boardType'
  | 'sideEdgeAngle'
  | 'baseEdgeAngle'
  | 'waxType'
  | 'baseDamage'
  | 'repairLocation'
  | 'customerPreference'
  | 'damageMarks'
  | 'damageSummary'
  | 'damageLevel'
  | 'riskWarning'
  | 'estimatedDelivery'
  | 'quoteSummary'
  | 'quoteItems'
  | 'discount'
  | 'rushService'
  | 'technicianNotes'
  | 'workStartTime'
  | 'workEndTime'
  | 'qualityChecklist'
  | 'qaOverallNote'
  | 'qaInspector'
  | 'deliveryNote'
  | 'paymentMethod'
  | 'customerFeedback';

export interface PhaseFieldConfig {
  phase: WorkOrderPhase;
  label: string;
  editableFields: EditableField[];
  requiredFields: EditableField[];
  canTransitionForward: boolean;
  canTransitionBackward: boolean;
  canReject: boolean;
}

export const PHASE_FIELD_CONFIG: PhaseFieldConfig[] = [
  {
    phase: 'board_received',
    label: '接板登记',
    editableFields: ['brand', 'length', 'boardType', 'customerPreference', 'estimatedDelivery'],
    requiredFields: ['brand', 'length', 'boardType'],
    canTransitionForward: true,
    canTransitionBackward: false,
    canReject: false,
  },
  {
    phase: 'damage_assessment',
    label: '损伤评估',
    editableFields: ['baseDamage', 'repairLocation', 'damageMarks', 'riskWarning', 'sideEdgeAngle', 'baseEdgeAngle', 'waxType'],
    requiredFields: ['damageMarks'],
    canTransitionForward: true,
    canTransitionBackward: true,
    canReject: true,
  },
  {
    phase: 'tuning_quote',
    label: '调校报价',
    editableFields: ['quoteSummary', 'sideEdgeAngle', 'baseEdgeAngle', 'waxType', 'estimatedDelivery'],
    requiredFields: ['quoteSummary'],
    canTransitionForward: true,
    canTransitionBackward: true,
    canReject: true,
  },
  {
    phase: 'technician_work',
    label: '技师施工',
    editableFields: ['damageMarks', 'waxType', 'sideEdgeAngle', 'baseEdgeAngle', 'repairLocation'],
    requiredFields: [],
    canTransitionForward: true,
    canTransitionBackward: true,
    canReject: true,
  },
  {
    phase: 'quality_check',
    label: '质检确认',
    editableFields: ['qualityChecklist'],
    requiredFields: ['qualityChecklist'],
    canTransitionForward: true,
    canTransitionBackward: true,
    canReject: true,
  },
  {
    phase: 'customer_delivered',
    label: '客户交付',
    editableFields: [],
    requiredFields: [],
    canTransitionForward: false,
    canTransitionBackward: true,
    canReject: false,
  },
];

export interface FieldChangeRecord {
  id: string;
  field: EditableField;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

export interface RejectRecord {
  id: string;
  fromPhase: WorkOrderPhase;
  toPhase: WorkOrderPhase;
  reason: string;
  rejectedAt: string;
  rejectedBy?: string;
  fieldChangeIds?: string[];
}

export const PHASE_ORDER: WorkOrderPhase[] = [
  'board_received',
  'damage_assessment',
  'tuning_quote',
  'technician_work',
  'quality_check',
  'customer_delivered',
];

export const getPhaseConfig = (phase: WorkOrderPhase): PhaseFieldConfig => {
  return PHASE_FIELD_CONFIG.find((p) => p.phase === phase) || PHASE_FIELD_CONFIG[0];
};

export const canEditField = (phase: WorkOrderPhase, field: EditableField): boolean => {
  const config = getPhaseConfig(phase);
  return config.editableFields.includes(field);
};

export const isFieldRequired = (phase: WorkOrderPhase, field: EditableField): boolean => {
  const config = getPhaseConfig(phase);
  return config.requiredFields.includes(field);
};

export const getNextPhase = (currentPhase: WorkOrderPhase): WorkOrderPhase | null => {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[currentIndex + 1];
};

export const getPreviousPhase = (currentPhase: WorkOrderPhase): WorkOrderPhase | null => {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex <= 0) return null;
  return PHASE_ORDER[currentIndex - 1];
};

export const validatePhaseCompletion = (order: WorkOrder, phase: WorkOrderPhase): { valid: boolean; errors: string[] } => {
  const config = getPhaseConfig(phase);
  const errors: string[] = [];

  config.requiredFields.forEach((field) => {
    const value = order[field as keyof WorkOrder];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      const fieldLabel = FIELD_LABELS[field] || field;
      errors.push(`${fieldLabel} 为必填项`);
    }
  });

  return { valid: errors.length === 0, errors };
};

export const FIELD_LABELS: Record<EditableField, string> = {
  brand: '品牌',
  length: '长度',
  boardType: '板型',
  sideEdgeAngle: '侧刃角度',
  baseEdgeAngle: '底刃角度',
  waxType: '蜡型',
  baseDamage: '底板损伤描述',
  repairLocation: '修补位置',
  customerPreference: '客户偏好',
  damageMarks: '损伤标记',
  damageSummary: '损伤总结',
  damageLevel: '损伤等级',
  riskWarning: '风险提示',
  estimatedDelivery: '预计交付日期',
  quoteSummary: '报价明细',
  quoteItems: '报价项目',
  discount: '折扣',
  rushService: '加急服务',
  technicianNotes: '技师备注',
  workStartTime: '施工开始时间',
  workEndTime: '施工结束时间',
  qualityChecklist: '质检清单',
  qaOverallNote: '质检总体备注',
  qaInspector: '质检员',
  deliveryNote: '交付备注',
  paymentMethod: '付款方式',
  customerFeedback: '客户反馈',
};

export interface PhaseTransitionResult {
  success: boolean;
  order?: WorkOrder;
  errors?: string[];
  requiresRejectReason?: boolean;
}

export type WorkOrderStatusOld =
  | 'pending_inspection'
  | 'pending_wax'
  | 'pending_base_repair'
  | 'pending_qa'
  | 'delivered';

export type QaCheckItemStatus = 'pass' | 'fail' | 'pending';

export interface QaCheckItem {
  id: string;
  key: string;
  label: string;
  status: QaCheckItemStatus;
  note: string;
}

export interface QualityChecklist {
  id: string;
  workOrderId: string;
  items: QaCheckItem[];
  photoUrls: string[];
  overallNote: string;
  completedAt: string | null;
  inspectorName: string;
}

export const QA_CHECK_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'edge_angle', label: '刃角复核', icon: '📐' },
  { key: 'wax_layer', label: '蜡层状态', icon: '🧴' },
  { key: 'base_flatness', label: '底板平整度', icon: '📏' },
  { key: 'repair_location', label: '修补位置', icon: '🔧' },
  { key: 'customer_preference', label: '客户偏好', icon: '👤' },
  { key: 'photo_note', label: '照片备注', icon: '📷' },
];

export const createEmptyQualityChecklist = (workOrderId: string): QualityChecklist => {
  return {
    id: `QC-${workOrderId}-${Date.now()}`,
    workOrderId,
    items: QA_CHECK_ITEMS.map((item, index) => ({
      id: `QCI-${workOrderId}-${index}`,
      key: item.key,
      label: item.label,
      status: 'pending',
      note: '',
    })),
    photoUrls: [],
    overallNote: '',
    completedAt: null,
    inspectorName: '',
  };
};

export const isQualityCheckCompleted = (checklist?: QualityChecklist): boolean => {
  if (!checklist) return false;
  return checklist.completedAt !== null && checklist.items.every((item) => item.status === 'pass');
};

export const hasQualityCheckFailedItems = (checklist?: QualityChecklist): boolean => {
  if (!checklist) return false;
  return checklist.items.some((item) => item.status === 'fail');
};

export const getQualityCheckProgress = (checklist?: QualityChecklist): { passed: number; failed: number; pending: number; total: number } => {
  if (!checklist) {
    return { passed: 0, failed: 0, pending: 0, total: 0 };
  }
  return {
    passed: checklist.items.filter((i) => i.status === 'pass').length,
    failed: checklist.items.filter((i) => i.status === 'fail').length,
    pending: checklist.items.filter((i) => i.status === 'pending').length,
    total: checklist.items.length,
  };
};

export interface StatusHistoryRecord {
  id: string;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  timestamp: string;
  note?: string;
  isReject?: boolean;
  rejectReason?: string;
  fieldChanges?: FieldChangeRecord[];
}

export interface QuoteSummary {
  labor: number;
  material: number;
  rush: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  finalTotal: number;
  remark: string;
}

export interface WorkOrder {
  id: string;
  brand: string;
  length: string;
  boardType: string;
  sideEdgeAngle: string;
  baseEdgeAngle: string;
  waxType: string;
  baseDamage: string;
  repairLocation: string;
  customerPreference: string;
  status: WorkOrderStatus;
  createdAt: string;
  estimatedDelivery: string;
  riskWarning: string;
  damageMarks: BaseDamageMark[];
  statusHistory: StatusHistoryRecord[];
  quoteSummary?: QuoteSummary;
  qualityChecklist?: QualityChecklist;
  fieldChangeHistory: FieldChangeRecord[];
  rejectHistory: RejectRecord[];
  customerName?: string;
  customerPhone?: string;
  receivedBy?: string;
  technicianId?: string;
  actualDelivery?: string;
}

export interface WorkOrderFormData {
  brand: string;
  length: string;
  boardType: string;
  sideEdgeAngle: string;
  baseEdgeAngle: string;
  waxType: string;
  baseDamage: string;
  repairLocation: string;
  customerPreference: string;
  damageMarks: BaseDamageMark[];
}

export type DamageType = 'scratch' | 'dent' | 'burn' | 'edgeDelam';

export type SeverityLevel = 'mild' | 'moderate' | 'severe';

export interface BaseDamageMark {
  id: string;
  type: DamageType;
  x: number;
  y: number;
  locationNote: string;
  length: string;
  severity: SeverityLevel;
  repairMethod: string;
}

export const DAMAGE_TYPES: { value: DamageType; label: string; color: string; icon: string }[] = [
  { value: 'scratch', label: '划痕', color: '#f97316', icon: '〰' },
  { value: 'dent', label: '凹坑', color: '#dc2626', icon: '●' },
  { value: 'burn', label: '烧伤', color: '#7c3aed', icon: '✦' },
  { value: 'edgeDelam', label: '边缘脱层', color: '#0891b2', icon: '◢' },
];

export const SEVERITY_LEVELS: { value: SeverityLevel; label: string }[] = [
  { value: 'mild', label: '轻微' },
  { value: 'moderate', label: '中等' },
  { value: 'severe', label: '严重' },
];

export const REPAIR_METHODS = [
  'P-Tex填充',
  '环氧树脂修补',
  '底座打磨',
  '边缘焊接',
  '重新压合',
  '整块更换',
  '其他',
];

export const BOARD_TYPES = ['全地域', '公园板', '竞速板', '粉雪板'];

export const WAX_TYPES = ['低温蜡', '中温蜡', '高温蜡', '氟素蜡', '无氟蜡'];

export const REPAIR_LOCATIONS = ['板头', '板尾', '板腰', '全板'];

export const STATUS_CONFIG: { value: WorkOrderStatus; label: string; color: string; icon: string }[] = [
  { value: 'board_received', label: '接板登记', color: '#0ea5e9', icon: '�' },
  { value: 'damage_assessment', label: '损伤评估', color: '#f97316', icon: '🔍' },
  { value: 'tuning_quote', label: '调校报价', color: '#8b5cf6', icon: '🧮' },
  { value: 'technician_work', label: '技师施工', color: '#dc2626', icon: '🔧' },
  { value: 'quality_check', label: '质检确认', color: '#7c3aed', icon: '✅' },
  { value: 'customer_delivered', label: '客户交付', color: '#14b8a6', icon: '📦' },
];

export const PHASE_STEP_INDICATORS: { phase: WorkOrderPhase; label: string; icon: string; color: string }[] = [
  { phase: 'board_received', label: '接板登记', icon: '📋', color: '#0ea5e9' },
  { phase: 'damage_assessment', label: '损伤评估', icon: '🔍', color: '#f97316' },
  { phase: 'tuning_quote', label: '调校报价', icon: '🧮', color: '#8b5cf6' },
  { phase: 'technician_work', label: '技师施工', icon: '🔧', color: '#dc2626' },
  { phase: 'quality_check', label: '质检确认', icon: '✅', color: '#7c3aed' },
  { phase: 'customer_delivered', label: '客户交付', icon: '📦', color: '#14b8a6' },
];

export interface EdgeAngleParam {
  id: string;
  boardType: string;
  sideEdgeAngle: string;
  baseEdgeAngle: string;
  snowCondition: string;
  tuningNote: string;
}

export const EDGE_ANGLE_BOARD_TYPES = ['公园板', '竞速板', '粉雪板'];

export const initialEdgeAngleParams: EdgeAngleParam[] = [
  {
    id: 'EAP-001',
    boardType: '公园板',
    sideEdgeAngle: '90°',
    baseEdgeAngle: '1°',
    snowCondition: '公园雪道、道具区',
    tuningNote: '较钝的侧刃减少道具卡刃风险，底刃保证滑行稳定性',
  },
  {
    id: 'EAP-002',
    boardType: '公园板',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '0.5°',
    snowCondition: '湿软公园雪',
    tuningNote: '稍锐侧刃增加切雪能力，适合有速度的公园滑行',
  },
  {
    id: 'EAP-003',
    boardType: '公园板',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '1.5°',
    snowCondition: '硬冰面公园',
    tuningNote: '锐利刃角增加硬雪咬合力，适合低温冰状雪',
  },
  {
    id: 'EAP-004',
    boardType: '竞速板',
    sideEdgeAngle: '87°',
    baseEdgeAngle: '0.5°',
    snowCondition: '冰状雪道',
    tuningNote: '极致锐利的侧刃提供最大切雪角度，适合竞技 carving',
  },
  {
    id: 'EAP-005',
    boardType: '竞速板',
    sideEdgeAngle: '86°',
    baseEdgeAngle: '0.3°',
    snowCondition: '完美冰面',
    tuningNote: '比赛级调校，极小底刃减少滑行阻力，刃角极端锐利',
  },
  {
    id: 'EAP-006',
    boardType: '竞速板',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '0.7°',
    snowCondition: '软硬混合雪道',
    tuningNote: '平衡调校，兼顾切雪性能和容错性，适合日常训练',
  },
  {
    id: 'EAP-007',
    boardType: '粉雪板',
    sideEdgeAngle: '90°',
    baseEdgeAngle: '2°',
    snowCondition: '深粉雪',
    tuningNote: '钝刃减少深雪中的卡雪风险，大底刃增强浮雪时的控制力',
  },
  {
    id: 'EAP-008',
    boardType: '粉雪板',
    sideEdgeAngle: '89.5°',
    baseEdgeAngle: '1.5°',
    snowCondition: '湿粉雪、烂雪',
    tuningNote: '稍锐利刃角增加湿雪抓地力，适合多变的粉雪条件',
  },
  {
    id: 'EAP-009',
    boardType: '粉雪板',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '1°',
    snowCondition: '粉雪夹杂硬雪壳',
    tuningNote: '更锐利的刃角应对硬雪壳层，适合春雪或多变雪况',
  },
];

export const initialWorkOrders: WorkOrder[] = [
  {
    id: 'ORD-106',
    brand: 'Burton',
    length: '156',
    boardType: '全地域',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '1°',
    waxType: '低温蜡',
    baseDamage: '轻微划痕',
    repairLocation: '板腰',
    customerPreference: '中等咬雪',
    status: 'customer_delivered',
    createdAt: '2024-01-15',
    estimatedDelivery: '2024-01-17',
    actualDelivery: '2024-01-16',
    riskWarning: '',
    damageMarks: [
      {
        id: 'DM-106-1',
        type: 'scratch',
        x: 42,
        y: 55,
        locationNote: '板腰中部偏左',
        length: '3',
        severity: 'mild',
        repairMethod: '底座打磨',
      },
    ],
    fieldChangeHistory: [
      {
        id: 'FC-106-1',
        field: 'damageMarks',
        oldValue: [],
        newValue: [{ id: 'DM-106-1', type: 'scratch' }],
        changedAt: '2024-01-15 10:00',
        note: '损伤评估阶段添加划痕标记',
      },
    ],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-106-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-15 09:00',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-106-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-15 09:30',
        note: '进入损伤评估阶段',
      },
      {
        id: 'SH-106-3',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-15 10:30',
        note: '损伤评估完成，发现轻微划痕需补底',
      },
      {
        id: 'SH-106-4',
        fromStatus: 'tuning_quote',
        toStatus: 'technician_work',
        timestamp: '2024-01-15 11:00',
        note: '报价确认，进入技师施工阶段',
      },
      {
        id: 'SH-106-5',
        fromStatus: 'technician_work',
        toStatus: 'quality_check',
        timestamp: '2024-01-16 09:00',
        note: '施工完成，转质检确认',
      },
      {
        id: 'SH-106-6',
        fromStatus: 'quality_check',
        toStatus: 'customer_delivered',
        timestamp: '2024-01-16 15:00',
        note: '质检通过，已交付客户',
      },
    ],
    qualityChecklist: {
      id: 'QC-ORD-106-001',
      workOrderId: 'ORD-106',
      items: [
        { id: 'QCI-106-1', key: 'edge_angle', label: '刃角复核', status: 'pass', note: '侧刃88°、底刃1°符合要求，刃口锐利均匀' },
        { id: 'QCI-106-2', key: 'wax_layer', label: '蜡层状态', status: 'pass', note: '低温蜡涂刷均匀，无漏涂' },
        { id: 'QCI-106-3', key: 'base_flatness', label: '底板平整度', status: 'pass', note: '底板平整，无翘曲' },
        { id: 'QCI-106-4', key: 'repair_location', label: '修补位置', status: 'pass', note: '板腰划痕修补平整，与原底板过渡自然' },
        { id: 'QCI-106-5', key: 'customer_preference', label: '客户偏好', status: 'pass', note: '中等咬雪偏好已满足' },
        { id: 'QCI-106-6', key: 'photo_note', label: '照片备注', status: 'pass', note: '已拍摄修复前后对比照' },
      ],
      photoUrls: [],
      overallNote: '整体质量良好，符合交付标准。底板修补处处理细致，刃角精度达标。',
      completedAt: '2024-01-16 14:30',
      inspectorName: '张技师',
    },
    quoteSummary: {
      labor: 80,
      material: 30,
      rush: 0,
      subtotal: 110,
      discountPercent: 0,
      discount: 0,
      finalTotal: 110,
      remark: '常规维护，底座打磨+低温蜡',
    },
    customerName: '张伟',
    customerPhone: '13800138001',
    receivedBy: '前台小王',
    technicianId: 'TECH-001',
  },
  {
    id: 'ORD-112',
    brand: 'Head',
    length: '165',
    boardType: '竞速板',
    sideEdgeAngle: '87°',
    baseEdgeAngle: '0.5°',
    waxType: '中温蜡',
    baseDamage: '底板划痕12cm',
    repairLocation: '板尾',
    customerPreference: '强咬雪',
    status: 'technician_work',
    createdAt: '2024-01-18',
    estimatedDelivery: '2024-01-22',
    riskWarning: '板尾边缘脱层，修复难度较高',
    damageMarks: [
      {
        id: 'DM-112-1',
        type: 'scratch',
        x: 68,
        y: 78,
        locationNote: '板尾右侧边缘',
        length: '12',
        severity: 'moderate',
        repairMethod: 'P-Tex填充',
      },
      {
        id: 'DM-112-2',
        type: 'edgeDelam',
        x: 88,
        y: 82,
        locationNote: '板尾右刃',
        length: '5',
        severity: 'moderate',
        repairMethod: '边缘焊接',
      },
    ],
    fieldChangeHistory: [
      {
        id: 'FC-112-1',
        field: 'damageMarks',
        oldValue: [],
        newValue: [{ id: 'DM-112-1', type: 'scratch' }, { id: 'DM-112-2', type: 'edgeDelam' }],
        changedAt: '2024-01-18 14:00',
        note: '损伤评估阶段添加多处损伤标记',
      },
      {
        id: 'FC-112-2',
        field: 'riskWarning',
        oldValue: '',
        newValue: '板尾边缘脱层，修复难度较高',
        changedAt: '2024-01-18 14:15',
        note: '评估师添加风险提示',
      },
    ],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-112-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-18 11:00',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-112-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-18 13:00',
        note: '进入损伤评估阶段',
      },
      {
        id: 'SH-112-3',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-18 14:30',
        note: '损伤评估完成，底板划痕+边缘脱层需补底',
      },
      {
        id: 'SH-112-4',
        fromStatus: 'tuning_quote',
        toStatus: 'technician_work',
        timestamp: '2024-01-18 15:00',
        note: '报价确认，进入技师施工阶段',
      },
    ],
    quoteSummary: {
      labor: 180,
      material: 110,
      rush: 0,
      subtotal: 290,
      discountPercent: 0,
      discount: 0,
      finalTotal: 290,
      remark: '竞速板竞技调校，P-Tex填充+边缘焊接',
    },
    customerName: '李娜',
    customerPhone: '13900139002',
    receivedBy: '前台小李',
    technicianId: 'TECH-005',
  },
  {
    id: 'ORD-118',
    brand: 'Jones',
    length: '158',
    boardType: '粉雪板',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '1.5°',
    waxType: '低温蜡',
    baseDamage: '无',
    repairLocation: '板头',
    customerPreference: '弱咬雪',
    status: 'tuning_quote',
    createdAt: '2024-01-20',
    estimatedDelivery: '2024-01-21',
    riskWarning: '',
    damageMarks: [],
    fieldChangeHistory: [],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-118-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-20 09:30',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-118-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-20 10:00',
        note: '进入损伤评估阶段',
      },
      {
        id: 'SH-118-3',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-20 11:00',
        note: '损伤评估完成，底板无损伤，直接调校报价',
      },
    ],
    customerName: '赵雪',
    customerPhone: '18600186004',
    receivedBy: '前台小王',
  },
  {
    id: 'ORD-125',
    brand: 'Ride',
    length: '152',
    boardType: '公园板',
    sideEdgeAngle: '90°',
    baseEdgeAngle: '1°',
    waxType: '高温蜡',
    baseDamage: '板底凹坑',
    repairLocation: '板头',
    customerPreference: '中等咬雪',
    status: 'damage_assessment',
    createdAt: '2024-01-20',
    estimatedDelivery: '2024-01-23',
    riskWarning: '',
    damageMarks: [
      {
        id: 'DM-125-1',
        type: 'dent',
        x: 25,
        y: 30,
        locationNote: '板头中央',
        length: '2',
        severity: 'mild',
        repairMethod: '环氧树脂修补',
      },
    ],
    fieldChangeHistory: [
      {
        id: 'FC-125-1',
        field: 'damageMarks',
        oldValue: [],
        newValue: [{ id: 'DM-125-1', type: 'dent' }],
        changedAt: '2024-01-20 16:30',
        note: '损伤评估中，初步标记板头凹坑',
      },
    ],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-125-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-20 16:00',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-125-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-20 16:15',
        note: '进入损伤评估阶段',
      },
    ],
    customerName: '王强',
    customerPhone: '15000150003',
    receivedBy: '前台小李',
  },
  {
    id: 'ORD-131',
    brand: 'Capita',
    length: '155',
    boardType: '公园板',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '0.5°',
    waxType: '无氟蜡',
    baseDamage: '板尾烧伤',
    repairLocation: '板尾',
    customerPreference: '弱咬雪',
    status: 'quality_check',
    createdAt: '2024-01-17',
    estimatedDelivery: '2024-01-21',
    riskWarning: '烧伤区域较大，需重点检查修复质量',
    damageMarks: [
      {
        id: 'DM-131-1',
        type: 'burn',
        x: 72,
        y: 85,
        locationNote: '板尾左侧',
        length: '4',
        severity: 'severe',
        repairMethod: '整块更换',
      },
    ],
    fieldChangeHistory: [
      {
        id: 'FC-131-1',
        field: 'damageMarks',
        oldValue: [],
        newValue: [{ id: 'DM-131-1', type: 'burn', severity: 'severe' }],
        changedAt: '2024-01-17 11:00',
        note: '损伤评估发现板尾严重烧伤',
      },
      {
        id: 'FC-131-2',
        field: 'damageSummary',
        oldValue: '',
        newValue: '板尾严重烧伤，需整块更换',
        changedAt: '2024-01-17 11:30',
        changedBy: '陈技师',
        note: '因烧伤严重，升级修补方案',
      },
    ],
    rejectHistory: [
      {
        id: 'REJ-131-1',
        fromPhase: 'technician_work',
        toPhase: 'damage_assessment',
        reason: '初步修补方案P-Tex填充不适用，需重新评估损伤程度并升级方案',
        rejectedAt: '2024-01-18 10:00',
        rejectedBy: '陈技师',
      },
    ],
    statusHistory: [
      {
        id: 'SH-131-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-17 10:00',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-131-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-17 10:30',
        note: '进入损伤评估阶段',
      },
      {
        id: 'SH-131-3',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-17 12:00',
        note: '损伤评估完成，板尾严重烧伤需补底',
      },
      {
        id: 'SH-131-4',
        fromStatus: 'tuning_quote',
        toStatus: 'technician_work',
        timestamp: '2024-01-17 12:30',
        note: '报价确认，进入技师施工阶段',
      },
      {
        id: 'SH-131-5',
        fromStatus: 'technician_work',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-18 10:00',
        note: '异常退回：初步修补方案不适用，需重新评估',
        isReject: true,
        rejectReason: '初步修补方案P-Tex填充不适用，需重新评估损伤程度并升级方案',
      },
      {
        id: 'SH-131-6',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-18 11:30',
        note: '重新评估完成，升级方案为整块更换',
      },
      {
        id: 'SH-131-7',
        fromStatus: 'tuning_quote',
        toStatus: 'technician_work',
        timestamp: '2024-01-18 12:00',
        note: '重新报价确认，进入施工阶段',
      },
      {
        id: 'SH-131-8',
        fromStatus: 'technician_work',
        toStatus: 'quality_check',
        timestamp: '2024-01-20 14:00',
        note: '整块更换完成，转质检确认',
      },
    ],
    qualityChecklist: {
      id: 'QC-ORD-131-001',
      workOrderId: 'ORD-131',
      items: [
        { id: 'QCI-131-1', key: 'edge_angle', label: '刃角复核', status: 'pending', note: '' },
        { id: 'QCI-131-2', key: 'wax_layer', label: '蜡层状态', status: 'pending', note: '' },
        { id: 'QCI-131-3', key: 'base_flatness', label: '底板平整度', status: 'pending', note: '' },
        { id: 'QCI-131-4', key: 'repair_location', label: '修补位置', status: 'pending', note: '' },
        { id: 'QCI-131-5', key: 'customer_preference', label: '客户偏好', status: 'pending', note: '' },
        { id: 'QCI-131-6', key: 'photo_note', label: '照片备注', status: 'pending', note: '' },
      ],
      photoUrls: [],
      overallNote: '',
      completedAt: null,
      inspectorName: '',
    },
    quoteSummary: {
      labor: 200,
      material: 200,
      rush: 0,
      subtotal: 400,
      discountPercent: 5,
      discount: 20,
      finalTotal: 380,
      remark: '板尾严重烧伤，需整块更换底座，老客户5%折扣',
    },
    customerName: '王强',
    customerPhone: '15000150003',
    receivedBy: '前台小王',
    technicianId: 'TECH-005',
  },
  {
    id: 'ORD-142',
    brand: 'K2',
    length: '160',
    boardType: '全地域',
    sideEdgeAngle: '88.5°',
    baseEdgeAngle: '1°',
    waxType: '中温蜡',
    baseDamage: '多处划痕',
    repairLocation: '全板',
    customerPreference: '中等咬雪',
    status: 'board_received',
    createdAt: '2024-01-20',
    estimatedDelivery: '2024-01-24',
    riskWarning: '',
    damageMarks: [
      {
        id: 'DM-142-1',
        type: 'scratch',
        x: 35,
        y: 40,
        locationNote: '板腰左侧',
        length: '5',
        severity: 'mild',
        repairMethod: '底座打磨',
      },
      {
        id: 'DM-142-2',
        type: 'scratch',
        x: 55,
        y: 60,
        locationNote: '板腰右侧',
        length: '8',
        severity: 'moderate',
        repairMethod: 'P-Tex填充',
      },
    ],
    fieldChangeHistory: [],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-142-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-20 14:30',
        note: '工单创建，接板登记完成',
      },
    ],
    customerName: '刘明',
    customerPhone: '13700137005',
    receivedBy: '前台小李',
  },
  {
    id: 'ORD-156',
    brand: 'Never Summer',
    length: '154',
    boardType: '全地域',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '1°',
    waxType: '低温蜡',
    baseDamage: '无',
    repairLocation: '',
    customerPreference: '中等咬雪',
    status: 'customer_delivered',
    createdAt: '2024-01-12',
    estimatedDelivery: '2024-01-14',
    actualDelivery: '2024-01-13',
    riskWarning: '',
    damageMarks: [],
    fieldChangeHistory: [],
    rejectHistory: [],
    statusHistory: [
      {
        id: 'SH-156-1',
        fromStatus: null,
        toStatus: 'board_received',
        timestamp: '2024-01-12 09:00',
        note: '工单创建，接板登记完成',
      },
      {
        id: 'SH-156-2',
        fromStatus: 'board_received',
        toStatus: 'damage_assessment',
        timestamp: '2024-01-12 09:30',
        note: '进入损伤评估阶段',
      },
      {
        id: 'SH-156-3',
        fromStatus: 'damage_assessment',
        toStatus: 'tuning_quote',
        timestamp: '2024-01-12 10:30',
        note: '损伤评估完成，底板无损伤',
      },
      {
        id: 'SH-156-4',
        fromStatus: 'tuning_quote',
        toStatus: 'technician_work',
        timestamp: '2024-01-12 11:00',
        note: '报价确认，进入技师施工阶段',
      },
      {
        id: 'SH-156-5',
        fromStatus: 'technician_work',
        toStatus: 'quality_check',
        timestamp: '2024-01-13 09:00',
        note: '打蜡修刃完成，转质检确认',
      },
      {
        id: 'SH-156-6',
        fromStatus: 'quality_check',
        toStatus: 'customer_delivered',
        timestamp: '2024-01-13 16:00',
        note: '质检通过，已交付客户',
      },
    ],
    qualityChecklist: {
      id: 'QC-ORD-156-001',
      workOrderId: 'ORD-156',
      items: [
        { id: 'QCI-156-1', key: 'edge_angle', label: '刃角复核', status: 'pass', note: '侧刃88°、底刃1°，刃口锋利度均匀' },
        { id: 'QCI-156-2', key: 'wax_layer', label: '蜡层状态', status: 'pass', note: '低温蜡层均匀，光泽度良好' },
        { id: 'QCI-156-3', key: 'base_flatness', label: '底板平整度', status: 'pass', note: '底板平整，无变形' },
        { id: 'QCI-156-4', key: 'repair_location', label: '修补位置', status: 'pass', note: '无修补，底板完好' },
        { id: 'QCI-156-5', key: 'customer_preference', label: '客户偏好', status: 'pass', note: '中等咬雪偏好已满足' },
        { id: 'QCI-156-6', key: 'photo_note', label: '照片备注', status: 'pass', note: '已拍摄整体外观照' },
      ],
      photoUrls: [],
      overallNote: '雪板状态良好，保养到位，刃角精准，蜡层均匀。',
      completedAt: '2024-01-13 15:30',
      inspectorName: '李技师',
    },
    quoteSummary: {
      labor: 80,
      material: 50,
      rush: 0,
      subtotal: 130,
      discountPercent: 0,
      discount: 0,
      finalTotal: 130,
      remark: '常规保养，修刃+低温蜡',
    },
    customerName: '张伟',
    customerPhone: '13800138001',
    receivedBy: '前台小王',
    technicianId: 'TECH-002',
  },
];

export interface CustomerHistoryRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  brand: string;
  length: string;
  boardType: string;
  maintenanceItems: string;
  waxType: string;
  sideEdgeAngle: string;
  baseEdgeAngle: string;
  deliveryNote: string;
  createdAt: string;
  qualityChecklist?: QualityChecklist;
}

export const initialCustomerHistory: CustomerHistoryRecord[] = [
  {
    id: 'CHR-001',
    customerName: '张伟',
    customerPhone: '13800138001',
    brand: 'Burton',
    length: '156',
    boardType: '全地域',
    maintenanceItems: '修刃+打蜡+底板修补',
    waxType: '低温蜡',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '1°',
    deliveryNote: '客户偏好中等咬雪，侧刃不要太锐，下次维护前可保持当前角度',
    createdAt: '2024-01-10',
    qualityChecklist: {
      id: 'QC-CHR-001',
      workOrderId: 'CHR-001',
      items: [
        { id: 'QCI-CHR001-1', key: 'edge_angle', label: '刃角复核', status: 'pass', note: '侧刃88°、底刃1°，符合中等咬雪偏好' },
        { id: 'QCI-CHR001-2', key: 'wax_layer', label: '蜡层状态', status: 'pass', note: '低温蜡层均匀，光泽度良好' },
        { id: 'QCI-CHR001-3', key: 'base_flatness', label: '底板平整度', status: 'pass', note: '底板平整，无翘曲' },
        { id: 'QCI-CHR001-4', key: 'repair_location', label: '修补位置', status: 'pass', note: '底板修补处过渡自然，无明显凹凸' },
        { id: 'QCI-CHR001-5', key: 'customer_preference', label: '客户偏好', status: 'pass', note: '中等咬雪偏好已满足，刃角适中' },
        { id: 'QCI-CHR001-6', key: 'photo_note', label: '照片备注', status: 'pass', note: '已拍摄修复前后对比照片存档' },
      ],
      photoUrls: [],
      overallNote: '整体质量良好，修刃、打蜡、补底均符合标准。客户中等咬雪偏好已满足。',
      completedAt: '2024-01-10 15:00',
      inspectorName: '张技师',
    },
  },
  {
    id: 'CHR-002',
    customerName: '张伟',
    customerPhone: '13800138001',
    brand: 'Jones',
    length: '158',
    boardType: '粉雪板',
    maintenanceItems: '打蜡+底板检查',
    waxType: '中温蜡',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '1.5°',
    deliveryNote: '粉雪板用钝刃即可，底刃1.5°适合深粉雪，注意板底刮痕修复',
    createdAt: '2023-12-05',
  },
  {
    id: 'CHR-003',
    customerName: '李娜',
    customerPhone: '13900139002',
    brand: 'Head',
    length: '165',
    boardType: '竞速板',
    maintenanceItems: '全面调校+氟素打蜡',
    waxType: '氟素蜡',
    sideEdgeAngle: '87°',
    baseEdgeAngle: '0.5°',
    deliveryNote: '竞技选手，要求极致锐利刃角，氟素蜡提高滑速，交付前确认刃角精度',
    createdAt: '2024-01-08',
    qualityChecklist: {
      id: 'QC-CHR-003',
      workOrderId: 'CHR-003',
      items: [
        { id: 'QCI-CHR003-1', key: 'edge_angle', label: '刃角复核', status: 'pass', note: '侧刃87°、底刃0.5°，竞技级精度，刃口极度锐利' },
        { id: 'QCI-CHR003-2', key: 'wax_layer', label: '蜡层状态', status: 'pass', note: '氟素蜡涂刷均匀，高速滑行性能佳' },
        { id: 'QCI-CHR003-3', key: 'base_flatness', label: '底板平整度', status: 'pass', note: '底板平整度优秀，无任何变形' },
        { id: 'QCI-CHR003-4', key: 'repair_location', label: '修补位置', status: 'pass', note: '无修补项' },
        { id: 'QCI-CHR003-5', key: 'customer_preference', label: '客户偏好', status: 'pass', note: '竞技选手强咬雪需求已完全满足' },
        { id: 'QCI-CHR003-6', key: 'photo_note', label: '照片备注', status: 'pass', note: '刃角测量照片、整体外观照已存档' },
      ],
      photoUrls: [],
      overallNote: '竞技级调校完成，刃角精度达到比赛标准。氟素蜡层均匀，滑行速度有保障。',
      completedAt: '2024-01-08 16:30',
      inspectorName: '李技师',
    },
  },
  {
    id: 'CHR-004',
    customerName: '李娜',
    customerPhone: '13900139002',
    brand: 'Head',
    length: '163',
    boardType: '竞速板',
    maintenanceItems: '修刃+打蜡',
    waxType: '中温蜡',
    sideEdgeAngle: '88°',
    baseEdgeAngle: '0.7°',
    deliveryNote: '训练用板，刃角稍钝以增加容错，日常训练不需要氟素蜡',
    createdAt: '2023-11-20',
  },
  {
    id: 'CHR-005',
    customerName: '王强',
    customerPhone: '15000150003',
    brand: 'Ride',
    length: '152',
    boardType: '公园板',
    maintenanceItems: '底板修补+打蜡',
    waxType: '高温蜡',
    sideEdgeAngle: '90°',
    baseEdgeAngle: '1°',
    deliveryNote: '公园板钝刃防卡刃，底刃1°保持稳定，高温蜡适合室内雪场',
    createdAt: '2024-01-12',
  },
  {
    id: 'CHR-006',
    customerName: '王强',
    customerPhone: '15000150003',
    brand: 'Capita',
    length: '155',
    boardType: '公园板',
    maintenanceItems: '修刃+打蜡+板尾修补',
    waxType: '无氟蜡',
    sideEdgeAngle: '89°',
    baseEdgeAngle: '0.5°',
    deliveryNote: '湿软雪况稍锐侧刃，板尾有撞痕需注意修补质量',
    createdAt: '2023-10-28',
  },
  {
    id: 'CHR-007',
    customerName: '赵雪',
    customerPhone: '18600186004',
    brand: 'Jones',
    length: '149',
    boardType: '粉雪板',
    maintenanceItems: '全面保养',
    waxType: '低温蜡',
    sideEdgeAngle: '89.5°',
    baseEdgeAngle: '1.5°',
    deliveryNote: '新手偏好宽松操控，刃角不要太锐，低温蜡适合户外粉雪',
    createdAt: '2024-01-16',
  },
];

export const emptyFormData: WorkOrderFormData = {
  brand: '',
  length: '',
  boardType: '',
  sideEdgeAngle: '',
  baseEdgeAngle: '',
  waxType: '',
  baseDamage: '',
  repairLocation: '',
  customerPreference: '',
  damageMarks: [],
};

export const createEmptyWorkOrder = (): Omit<WorkOrder, 'id' | 'createdAt' | 'statusHistory'> => {
  return {
    brand: '',
    length: '',
    boardType: '',
    sideEdgeAngle: '',
    baseEdgeAngle: '',
    waxType: '',
    baseDamage: '',
    repairLocation: '',
    customerPreference: '',
    status: 'board_received',
    estimatedDelivery: '',
    riskWarning: '',
    damageMarks: [],
    fieldChangeHistory: [],
    rejectHistory: [],
  };
};

export const mapOldStatusToNewPhase = (oldStatus: WorkOrderStatusOld): WorkOrderPhase => {
  const mapping: Record<WorkOrderStatusOld, WorkOrderPhase> = {
    pending_inspection: 'damage_assessment',
    pending_wax: 'technician_work',
    pending_base_repair: 'technician_work',
    pending_qa: 'quality_check',
    delivered: 'customer_delivered',
  };
  return mapping[oldStatus] || 'board_received';
};

export interface QuoteBreakdown {
  labor: number;
  material: number;
  rush: number;
}

export interface QuoteEstimate {
  boardType: string;
  length: string;
  edgeAngleAdjustment: string;
  waxType: string;
  baseDamageCount: number;
  repairMaterial: string;
  isRush: boolean;
  breakdown: QuoteBreakdown;
  subtotal: number;
  discount: number;
  discountPercent: number;
  finalTotal: number;
  remark: string;
}

export const EDGE_ANGLE_ADJUSTMENTS = [
  { value: 'standard', label: '标准调校', laborPrice: 80 },
  { value: 'precision', label: '精密调校', laborPrice: 120 },
  { value: 'race', label: '竞技调校', laborPrice: 180 },
];

export const REPAIR_MATERIALS = [
  { value: 'pTex', label: 'P-Tex 填充', pricePerUnit: 30 },
  { value: 'epoxy', label: '环氧树脂', pricePerUnit: 45 },
  { value: 'carbon', label: '碳纤维补片', pricePerUnit: 80 },
  { value: 'fullBase', label: '整块底座', pricePerUnit: 200 },
];

export const WAX_PRICING: Record<string, number> = {
  '低温蜡': 50,
  '中温蜡': 45,
  '高温蜡': 40,
  '氟素蜡': 80,
  '无氟蜡': 35,
};

export const BOARD_TYPE_PRICE_MULTIPLIER: Record<string, number> = {
  '全地域': 1.0,
  '公园板': 1.1,
  '竞速板': 1.3,
  '粉雪板': 1.2,
};

export const RUSH_SURCHARGE_PERCENT = 0.3;

export const LENGTH_PRICE_TIERS = [
  { min: 0, max: 140, baseLabor: 60 },
  { min: 140, max: 155, baseLabor: 80 },
  { min: 155, max: 170, baseLabor: 100 },
  { min: 170, max: 999, baseLabor: 120 },
];

export const DAMAGE_LABOR_COST = 40;

export type TechnicianStatus = 'on_duty' | 'off_duty' | 'break' | 'overloaded';

export type SkillLevel = 'junior' | 'intermediate' | 'senior' | 'master';

export interface Technician {
  id: string;
  name: string;
  status: TechnicianStatus;
  skillLevel: SkillLevel;
  dailyCapacityMinutes: number;
  specialties: string[];
  avatarColor: string;
}

export interface WorkOrderAssignment {
  id: string;
  workOrderId: string;
  technicianId: string;
  assignedAt: string;
  estimatedMinutes: number;
  complexityScore: number;
  priority: number;
  queuePosition: number;
  reassignedFrom?: string;
  note?: string;
}

export type AssignmentViewMode = 'board' | 'technician' | 'queue';

export const SKILL_LEVEL_CONFIG: Record<SkillLevel, { label: string; capacityMultiplier: number; color: string }> = {
  junior: { label: '初级技师', capacityMultiplier: 0.8, color: '#94a3b8' },
  intermediate: { label: '中级技师', capacityMultiplier: 1.0, color: '#0ea5e9' },
  senior: { label: '高级技师', capacityMultiplier: 1.3, color: '#8b5cf6' },
  master: { label: '首席技师', capacityMultiplier: 1.5, color: '#f59e0b' },
};

export const TECHNICIAN_STATUS_CONFIG: Record<TechnicianStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  on_duty: { label: '在岗', color: '#059669', bgColor: '#d1fae5', icon: '🟢' },
  off_duty: { label: '离岗', color: '#64748b', bgColor: '#f1f5f9', icon: '⚪' },
  break: { label: '休息', color: '#d97706', bgColor: '#fef3c7', icon: '🟡' },
  overloaded: { label: '超负荷', color: '#dc2626', bgColor: '#fee2e2', icon: '🔴' },
};

export const COMPLEXITY_MULTIPLIER: Record<SeverityLevel, number> = {
  mild: 1.0,
  moderate: 1.5,
  severe: 2.5,
};

export const BASE_TASK_MINUTES: Record<string, number> = {
  board_received: 10,
  damage_assessment: 20,
  tuning_quote: 15,
  technician_work: 60,
  quality_check: 15,
  customer_delivered: 5,
};

export const calculateEstimatedMinutes = (workOrder: WorkOrder): number => {
  const baseTime = BASE_TASK_MINUTES[workOrder.status] || 30;
  const damageComplexity = workOrder.damageMarks.reduce((sum, mark) => {
    return sum + COMPLEXITY_MULTIPLIER[mark.severity];
  }, 0);
  return Math.round(baseTime * (1 + damageComplexity * 0.3));
};

export const calculateComplexityScore = (workOrder: WorkOrder): number => {
  const baseScore = workOrder.status === 'technician_work' ? 3 : workOrder.status === 'damage_assessment' ? 2 : 1;
  const damageScore = workOrder.damageMarks.reduce((sum, mark) => {
    const severityScore = mark.severity === 'severe' ? 3 : mark.severity === 'moderate' ? 2 : 1;
    return sum + severityScore;
  }, 0);
  return baseScore + damageScore;
};

export const initialTechnicians: Technician[] = [
  {
    id: 'TECH-001',
    name: '张技师',
    status: 'on_duty',
    skillLevel: 'master',
    dailyCapacityMinutes: 480,
    specialties: ['竞速板', '修刃', '竞技调校'],
    avatarColor: '#f59e0b',
  },
  {
    id: 'TECH-002',
    name: '李技师',
    status: 'on_duty',
    skillLevel: 'senior',
    dailyCapacityMinutes: 420,
    specialties: ['公园板', '底板修补', '氟素打蜡'],
    avatarColor: '#8b5cf6',
  },
  {
    id: 'TECH-003',
    name: '王技师',
    status: 'on_duty',
    skillLevel: 'intermediate',
    dailyCapacityMinutes: 360,
    specialties: ['全地域', '粉雪板', '基础保养'],
    avatarColor: '#0ea5e9',
  },
  {
    id: 'TECH-004',
    name: '赵技师',
    status: 'break',
    skillLevel: 'junior',
    dailyCapacityMinutes: 300,
    specialties: ['打蜡', '基础修刃'],
    avatarColor: '#94a3b8',
  },
  {
    id: 'TECH-005',
    name: '陈技师',
    status: 'on_duty',
    skillLevel: 'senior',
    dailyCapacityMinutes: 420,
    specialties: ['边缘脱层修复', '整块更换', '高温蜡处理'],
    avatarColor: '#14b8a6',
  },
];

export const initialAssignments: WorkOrderAssignment[] = [];
