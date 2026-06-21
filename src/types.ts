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
  status: 'pending' | 'completed';
  createdAt: string;
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
}

export const BOARD_TYPES = ['全地域', '公园板', '竞速板', '粉雪板'];

export const WAX_TYPES = ['低温蜡', '中温蜡', '高温蜡', '氟素蜡', '无氟蜡'];

export const REPAIR_LOCATIONS = ['板头', '板尾', '板腰', '全板'];

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
    status: 'completed',
    createdAt: '2024-01-15',
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
    status: 'pending',
    createdAt: '2024-01-18',
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
    status: 'pending',
    createdAt: '2024-01-20',
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
};
