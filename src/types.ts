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
