import { storage } from './storage';
import {
  WorkOrder,
  WorkOrderFormData,
  WorkOrderStatus,
  StatusHistoryRecord,
  STATUS_CONFIG,
  QualityChecklist,
  createEmptyQualityChecklist,
  isQualityCheckCompleted,
  hasQualityCheckFailedItems,
  CustomerHistoryRecord,
  initialWorkOrders,
  initialCustomerHistory,
  initialEdgeAngleParams,
  initialTechnicians,
  initialAssignments,
  EdgeAngleParam,
  Technician,
  WorkOrderAssignment,
  QuoteSummary,
  BaseDamageMark,
} from '../types';

export type StoreEvent =
  | 'workOrders:changed'
  | 'customerHistory:changed'
  | 'technicians:changed'
  | 'assignments:changed'
  | 'edgeParams:changed'
  | 'store:initialized'
  | 'store:error';

type UnsubscribeFn = () => void;
type Listener = (data?: unknown) => void;

export interface StoreSnapshot {
  workOrders: WorkOrder[];
  customerHistory: CustomerHistoryRecord[];
  technicians: Technician[];
  assignments: WorkOrderAssignment[];
  edgeParams: EdgeAngleParam[];
  exportedAt: string;
  version: number;
}

const STORAGE_KEYS = {
  WORK_ORDERS: 'hxy:workOrders',
  CUSTOMER_HISTORY: 'hxy:customerHistory',
  TECHNICIANS: 'hxy:technicians',
  ASSIGNMENTS: 'hxy:assignments',
  EDGE_PARAMS: 'hxy:edgeParams',
  INITIALIZED: 'hxy:initialized',
};

const STORE_VERSION = 1;

class WorkOrderStore {
  private static instance: WorkOrderStore | null = null;

  private workOrders: WorkOrder[] = [];
  private customerHistory: CustomerHistoryRecord[] = [];
  private technicians: Technician[] = [];
  private assignments: WorkOrderAssignment[] = [];
  private edgeParams: EdgeAngleParam[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private listeners: Map<StoreEvent, Set<Listener>> = new Map();

  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly DEBOUNCE_MS = 200;
  private pendingWrites: Map<string, unknown> = new Map();

  private constructor() {
    this.setupBeforeUnloadHandler();
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushPendingWrites();
      });

      if ('visibilitychange' in document) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            this.flushPendingWrites();
          }
        });
      }
    }
  }

  private flushPendingWrites(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    this.pendingWrites.forEach((value, key) => {
      try {
        storage.set(key, value).catch((e) => {
          console.error(`[Store] Flush write failed for ${key}:`, e);
        });
      } catch (e) {
        console.error(`[Store] Flush write error for ${key}:`, e);
      }
    });
    this.pendingWrites.clear();
  }

  static getInstance(): WorkOrderStore {
    if (!WorkOrderStore.instance) {
      WorkOrderStore.instance = new WorkOrderStore();
    }
    return WorkOrderStore.instance;
  }

  on(event: StoreEvent, listener: Listener): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  private emit(event: StoreEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[Store] Listener error for event ${event}:`, e);
      }
    });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      const [storedOrders, storedHistory, storedTechs, storedAssigns, storedParams, wasInitialized] =
        await Promise.all([
          storage.get<WorkOrder[]>(STORAGE_KEYS.WORK_ORDERS),
          storage.get<CustomerHistoryRecord[]>(STORAGE_KEYS.CUSTOMER_HISTORY),
          storage.get<Technician[]>(STORAGE_KEYS.TECHNICIANS),
          storage.get<WorkOrderAssignment[]>(STORAGE_KEYS.ASSIGNMENTS),
          storage.get<EdgeAngleParam[]>(STORAGE_KEYS.EDGE_PARAMS),
          storage.get<boolean>(STORAGE_KEYS.INITIALIZED),
        ]);

      if (wasInitialized) {
        this.workOrders = storedOrders ?? [];
        this.customerHistory = storedHistory ?? [];
        this.technicians = storedTechs ?? [];
        this.assignments = storedAssigns ?? [];
        this.edgeParams = storedParams ?? [];
      } else {
        this.workOrders = [...initialWorkOrders];
        this.customerHistory = [...initialCustomerHistory];
        this.technicians = [...initialTechnicians];
        this.assignments = [...initialAssignments];
        this.edgeParams = [...initialEdgeAngleParams];

        await Promise.all([
          storage.set(STORAGE_KEYS.WORK_ORDERS, this.workOrders),
          storage.set(STORAGE_KEYS.CUSTOMER_HISTORY, this.customerHistory),
          storage.set(STORAGE_KEYS.TECHNICIANS, this.technicians),
          storage.set(STORAGE_KEYS.ASSIGNMENTS, this.assignments),
          storage.set(STORAGE_KEYS.EDGE_PARAMS, this.edgeParams),
          storage.set(STORAGE_KEYS.INITIALIZED, true),
        ]);
      }

      this.initialized = true;
      this.emit('store:initialized');
    } catch (error) {
      console.error('[Store] Initialization failed:', error);
      this.emit('store:error', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private persistImmediate(key: string, value: unknown): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(key);
    }
    this.pendingWrites.delete(key);

    storage.set(key, value).catch((e) => {
      console.error(`[Store] Immediate persist failed for ${key}:`, e);
      this.emit('store:error', e);
    });
  }

  private schedulePersist(key: string, value: unknown): void {
    this.pendingWrites.set(key, value);

    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        storage.set(key, value).catch((e) => {
          console.error(`[Store] Debounced persist failed for ${key}:`, e);
          this.emit('store:error', e);
        });
        this.debounceTimers.delete(key);
        this.pendingWrites.delete(key);
      }, this.DEBOUNCE_MS)
    );
  }

  getWorkOrders(): WorkOrder[] {
    return [...this.workOrders];
  }

  getWorkOrderById(id: string): WorkOrder | undefined {
    return this.workOrders.find((o) => o.id === id);
  }

  private getNextOrderId(): string {
    let maxNum = 0;
    this.workOrders.forEach((order) => {
      const match = order.id.match(/ORD-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ORD-${maxNum + 1}`;
  }

  private static formatTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;
  }

  private static formatDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }

  createWorkOrder(formData: WorkOrderFormData): WorkOrder {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 3);
    const estimatedDelivery = deliveryDate.toISOString().split('T')[0];

    const id = this.getNextOrderId();
    const newOrder: WorkOrder = {
      ...formData,
      id,
      status: 'pending_inspection',
      createdAt: WorkOrderStore.formatDate(),
      estimatedDelivery,
      riskWarning: '',
      damageMarks: formData.damageMarks || [],
      statusHistory: [
        {
          id: `SH-${id}-${Date.now()}`,
          fromStatus: null,
          toStatus: 'pending_inspection',
          timestamp: WorkOrderStore.formatTimestamp(),
          note: '工单创建',
        },
      ],
    };

    this.workOrders = [newOrder, ...this.workOrders];
    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return newOrder;
  }

  updateWorkOrder(id: string, updates: Partial<WorkOrderFormData>): WorkOrder | undefined {
    const index = this.workOrders.findIndex((o) => o.id === id);
    if (index === -1) return undefined;

    const updated = { ...this.workOrders[index], ...updates };
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  deleteWorkOrder(id: string): boolean {
    const index = this.workOrders.findIndex((o) => o.id === id);
    if (index === -1) return false;

    this.workOrders.splice(index, 1);
    this.workOrders = [...this.workOrders];

    this.assignments = this.assignments.filter((a) => a.workOrderId !== id);

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.persistImmediate(STORAGE_KEYS.ASSIGNMENTS, this.assignments);
    this.emit('workOrders:changed', this.getWorkOrders());
    this.emit('assignments:changed', this.getAssignments());

    return true;
  }

  transitionStatus(orderId: string, targetStatus: WorkOrderStatus, note?: string): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    if (targetStatus === 'delivered') {
      if (!order.qualityChecklist) {
        throw new Error('请先完成质检检查清单后再交付');
      }
      if (hasQualityCheckFailedItems(order.qualityChecklist)) {
        throw new Error('质检存在不通过项，无法交付。请先修复所有不通过项后再尝试交付。');
      }
      if (!isQualityCheckCompleted(order.qualityChecklist)) {
        throw new Error('请先完成所有质检项并确保全部通过后再交付');
      }
    }

    const targetLabel = STATUS_CONFIG.find((s) => s.value === targetStatus)?.label ?? targetStatus;
    const historyRecord: StatusHistoryRecord = {
      id: `SH-${order.id}-${Date.now()}`,
      fromStatus: order.status,
      toStatus: targetStatus,
      timestamp: WorkOrderStore.formatTimestamp(),
      note: note ?? `移至${targetLabel}`,
    };

    const updated: WorkOrder = {
      ...order,
      status: targetStatus,
      statusHistory: [...order.statusHistory, historyRecord],
    };

    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    if (targetStatus === 'delivered') {
      this.syncOrderToCustomerHistory(updated);
      this.assignments = this.assignments.filter((a) => a.workOrderId !== orderId);
      this.persistImmediate(STORAGE_KEYS.ASSIGNMENTS, this.assignments);
      this.emit('assignments:changed', this.getAssignments());
    }

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  advanceStatus(orderId: string): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const statusOrder: WorkOrderStatus[] = [
      'pending_inspection',
      'pending_wax',
      'pending_base_repair',
      'pending_qa',
      'delivered',
    ];
    const currentIndex = statusOrder.indexOf(order.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;

    return this.transitionStatus(orderId, statusOrder[nextIndex]);
  }

  addDamageMark(orderId: string, mark: Omit<BaseDamageMark, 'id'>): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const newMark: BaseDamageMark = {
      ...mark,
      id: `DM-${orderId}-${Date.now()}`,
    };

    const updated: WorkOrder = {
      ...order,
      damageMarks: [...order.damageMarks, newMark],
    };

    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  updateDamageMark(
    orderId: string,
    markId: string,
    updates: Partial<BaseDamageMark>
  ): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const updated: WorkOrder = {
      ...order,
      damageMarks: order.damageMarks.map((m) => (m.id === markId ? { ...m, ...updates } : m)),
    };

    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  removeDamageMark(orderId: string, markId: string): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const updated: WorkOrder = {
      ...order,
      damageMarks: order.damageMarks.filter((m) => m.id !== markId),
    };

    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  createQualityChecklist(orderId: string): QualityChecklist | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const checklist = createEmptyQualityChecklist(orderId);
    const updated: WorkOrder = { ...order, qualityChecklist: checklist };

    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return checklist;
  }

  updateQualityChecklist(orderId: string, checklist: QualityChecklist): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const updated: WorkOrder = { ...order, qualityChecklist: checklist };
    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    if (isQualityCheckCompleted(checklist)) {
      this.syncOrderToCustomerHistory(updated);
    }

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  applyQuote(orderId: string, summary: QuoteSummary): WorkOrder | undefined {
    const order = this.workOrders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const updated: WorkOrder = { ...order, quoteSummary: summary };
    const index = this.workOrders.findIndex((o) => o.id === orderId);
    this.workOrders[index] = updated;
    this.workOrders = [...this.workOrders];

    this.persistImmediate(STORAGE_KEYS.WORK_ORDERS, this.workOrders);
    this.emit('workOrders:changed', this.getWorkOrders());

    return updated;
  }

  private syncOrderToCustomerHistory(order: WorkOrder): void {
    if (!isQualityCheckCompleted(order.qualityChecklist)) return;

    const maintenanceItems = [];
    if (order.sideEdgeAngle || order.baseEdgeAngle) maintenanceItems.push('修刃');
    if (order.waxType && order.waxType !== '不打蜡') maintenanceItems.push('打蜡');
    if (order.baseDamage && order.baseDamage !== '无') maintenanceItems.push('补底');
    if (order.repairLocation) maintenanceItems.push('修补');

    const historyRecord: CustomerHistoryRecord = {
      id: `CHR-${order.id}`,
      customerName: '客户',
      customerPhone: '',
      brand: order.brand,
      length: order.length,
      boardType: order.boardType,
      maintenanceItems: maintenanceItems.join('、') || '常规维护',
      waxType: order.waxType,
      sideEdgeAngle: order.sideEdgeAngle,
      baseEdgeAngle: order.baseEdgeAngle,
      deliveryNote: order.qualityChecklist?.overallNote || '',
      createdAt: WorkOrderStore.formatDate(),
      qualityChecklist: order.qualityChecklist,
    };

    const existingIndex = this.customerHistory.findIndex(
      (record) =>
        record.id === historyRecord.id || record.qualityChecklist?.workOrderId === order.id
    );

    if (existingIndex === -1) {
      this.customerHistory = [historyRecord, ...this.customerHistory];
    } else {
      const next = [...this.customerHistory];
      next.splice(existingIndex, 1);
      this.customerHistory = [historyRecord, ...next];
    }

    this.persistImmediate(STORAGE_KEYS.CUSTOMER_HISTORY, this.customerHistory);
    this.emit('customerHistory:changed', this.getCustomerHistory());
  }

  getCustomerHistory(): CustomerHistoryRecord[] {
    return [...this.customerHistory];
  }

  queryCustomerHistory(options?: {
    customerName?: string;
    customerPhone?: string;
    brand?: string;
    boardType?: string;
    startDate?: string;
    endDate?: string;
  }): CustomerHistoryRecord[] {
    if (!options) return this.getCustomerHistory();

    return this.customerHistory.filter((record) => {
      if (options.customerName && !record.customerName.includes(options.customerName)) return false;
      if (options.customerPhone && !record.customerPhone.includes(options.customerPhone)) return false;
      if (options.brand && record.brand !== options.brand) return false;
      if (options.boardType && record.boardType !== options.boardType) return false;
      if (options.startDate && record.createdAt < options.startDate) return false;
      if (options.endDate && record.createdAt > options.endDate) return false;
      return true;
    });
  }

  getCustomerDistinctValues(): {
    names: string[];
    phones: string[];
    brands: string[];
  } {
    const names = new Set<string>();
    const phones = new Set<string>();
    const brands = new Set<string>();

    this.customerHistory.forEach((r) => {
      if (r.customerName) names.add(r.customerName);
      if (r.customerPhone) phones.add(r.customerPhone);
      if (r.brand) brands.add(r.brand);
    });

    return {
      names: Array.from(names).sort(),
      phones: Array.from(phones).sort(),
      brands: Array.from(brands).sort(),
    };
  }

  addCustomerHistoryRecord(record: Omit<CustomerHistoryRecord, 'id'>): CustomerHistoryRecord {
    const newRecord: CustomerHistoryRecord = {
      ...record,
      id: `CHR-${Date.now()}`,
    };

    this.customerHistory = [newRecord, ...this.customerHistory];
    this.persistImmediate(STORAGE_KEYS.CUSTOMER_HISTORY, this.customerHistory);
    this.emit('customerHistory:changed', this.getCustomerHistory());

    return newRecord;
  }

  getTechnicians(): Technician[] {
    return [...this.technicians];
  }

  updateTechnicianStatus(technicianId: string, status: Technician['status']): Technician | undefined {
    const index = this.technicians.findIndex((t) => t.id === technicianId);
    if (index === -1) return undefined;

    const updated = { ...this.technicians[index], status };
    this.technicians[index] = updated;
    this.technicians = [...this.technicians];

    this.persistImmediate(STORAGE_KEYS.TECHNICIANS, this.technicians);
    this.emit('technicians:changed', this.getTechnicians());

    return updated;
  }

  getAssignments(): WorkOrderAssignment[] {
    return [...this.assignments];
  }

  createAssignment(assignment: Omit<WorkOrderAssignment, 'id'>): WorkOrderAssignment {
    const newAssignment: WorkOrderAssignment = {
      ...assignment,
      id: `ASM-${Date.now()}`,
    };

    this.assignments = [...this.assignments, newAssignment];
    this.persistImmediate(STORAGE_KEYS.ASSIGNMENTS, this.assignments);
    this.emit('assignments:changed', this.getAssignments());

    return newAssignment;
  }

  reassignAssignment(assignmentId: string, newTechnicianId: string): WorkOrderAssignment | undefined {
    const assignment = this.assignments.find((a) => a.id === assignmentId);
    const newTech = this.technicians.find((t) => t.id === newTechnicianId);
    if (!assignment || !newTech) return undefined;

    const newTechAssignments = this.assignments.filter((a) => a.technicianId === newTechnicianId);
    const maxQueuePos =
      newTechAssignments.length > 0 ? Math.max(...newTechAssignments.map((a) => a.queuePosition)) : 0;

    const updated: WorkOrderAssignment = {
      ...assignment,
      technicianId: newTechnicianId,
      reassignedFrom: assignment.technicianId,
      assignedAt: WorkOrderStore.formatTimestamp(),
      queuePosition: maxQueuePos + 1,
    };

    const index = this.assignments.findIndex((a) => a.id === assignmentId);
    this.assignments[index] = updated;
    this.assignments = [...this.assignments];

    this.persistImmediate(STORAGE_KEYS.ASSIGNMENTS, this.assignments);
    this.emit('assignments:changed', this.getAssignments());

    return updated;
  }

  removeAssignment(assignmentId: string): boolean {
    const index = this.assignments.findIndex((a) => a.id === assignmentId);
    if (index === -1) return false;

    this.assignments.splice(index, 1);
    this.assignments = [...this.assignments];

    this.persistImmediate(STORAGE_KEYS.ASSIGNMENTS, this.assignments);
    this.emit('assignments:changed', this.getAssignments());

    return true;
  }

  getEdgeParams(): EdgeAngleParam[] {
    return [...this.edgeParams];
  }

  exportToJSON(): string {
    const snapshot: StoreSnapshot = {
      workOrders: this.workOrders,
      customerHistory: this.customerHistory,
      technicians: this.technicians,
      assignments: this.assignments,
      edgeParams: this.edgeParams,
      exportedAt: WorkOrderStore.formatTimestamp(),
      version: STORE_VERSION,
    };

    return JSON.stringify(snapshot, null, 2);
  }

  downloadJSON(filename?: string): void {
    this.flushPendingWrites();

    const data = this.exportToJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `hxy-workorders-${WorkOrderStore.formatDate().replace(/-/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromJSON(jsonString: string, mode: 'merge' | 'replace' = 'merge'): StoreSnapshot {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('JSON 解析失败，请检查文件格式');
    }

    if (!this.isValidSnapshot(parsed)) {
      throw new Error('数据格式无效，请确保是从本系统导出的文件');
    }

    const snapshot = parsed as StoreSnapshot;

    if (mode === 'replace') {
      this.workOrders = snapshot.workOrders;
      this.customerHistory = snapshot.customerHistory;
      this.technicians = snapshot.technicians;
      this.assignments = snapshot.assignments;
      this.edgeParams = snapshot.edgeParams;
    } else {
      const orderIdMap = new Map(this.workOrders.map((o) => [o.id, o]));
      snapshot.workOrders.forEach((o) => orderIdMap.set(o.id, o));
      this.workOrders = Array.from(orderIdMap.values());

      const historyIdMap = new Map(this.customerHistory.map((h) => [h.id, h]));
      snapshot.customerHistory.forEach((h) => historyIdMap.set(h.id, h));
      this.customerHistory = Array.from(historyIdMap.values());

      const techIdMap = new Map(this.technicians.map((t) => [t.id, t]));
      snapshot.technicians.forEach((t) => techIdMap.set(t.id, t));
      this.technicians = Array.from(techIdMap.values());

      const assignIdMap = new Map(this.assignments.map((a) => [a.id, a]));
      snapshot.assignments.forEach((a) => assignIdMap.set(a.id, a));
      this.assignments = Array.from(assignIdMap.values());

      const paramIdMap = new Map(this.edgeParams.map((p) => [p.id, p]));
      snapshot.edgeParams.forEach((p) => paramIdMap.set(p.id, p));
      this.edgeParams = Array.from(paramIdMap.values());
    }

    Promise.all([
      storage.set(STORAGE_KEYS.WORK_ORDERS, this.workOrders),
      storage.set(STORAGE_KEYS.CUSTOMER_HISTORY, this.customerHistory),
      storage.set(STORAGE_KEYS.TECHNICIANS, this.technicians),
      storage.set(STORAGE_KEYS.ASSIGNMENTS, this.assignments),
      storage.set(STORAGE_KEYS.EDGE_PARAMS, this.edgeParams),
    ]).catch((e) => {
      console.error('[Store] Import persist failed:', e);
    });

    this.emit('workOrders:changed', this.getWorkOrders());
    this.emit('customerHistory:changed', this.getCustomerHistory());
    this.emit('technicians:changed', this.getTechnicians());
    this.emit('assignments:changed', this.getAssignments());
    this.emit('edgeParams:changed', this.getEdgeParams());

    return snapshot;
  }

  async importFromFile(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<StoreSnapshot> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.onload = () => {
        try {
          const result = this.importFromJSON(String(reader.result), mode);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsText(file);
    });
  }

  private isValidSnapshot(obj: unknown): obj is StoreSnapshot {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return (
      Array.isArray(o.workOrders) &&
      Array.isArray(o.customerHistory) &&
      Array.isArray(o.technicians) &&
      Array.isArray(o.assignments) &&
      Array.isArray(o.edgeParams) &&
      typeof o.version === 'number'
    );
  }

  async resetAll(): Promise<void> {
    this.workOrders = [...initialWorkOrders];
    this.customerHistory = [...initialCustomerHistory];
    this.technicians = [...initialTechnicians];
    this.assignments = [...initialAssignments];
    this.edgeParams = [...initialEdgeAngleParams];

    await Promise.all([
      storage.set(STORAGE_KEYS.WORK_ORDERS, this.workOrders),
      storage.set(STORAGE_KEYS.CUSTOMER_HISTORY, this.customerHistory),
      storage.set(STORAGE_KEYS.TECHNICIANS, this.technicians),
      storage.set(STORAGE_KEYS.ASSIGNMENTS, this.assignments),
      storage.set(STORAGE_KEYS.EDGE_PARAMS, this.edgeParams),
    ]);

    this.emit('workOrders:changed', this.getWorkOrders());
    this.emit('customerHistory:changed', this.getCustomerHistory());
    this.emit('technicians:changed', this.getTechnicians());
    this.emit('assignments:changed', this.getAssignments());
    this.emit('edgeParams:changed', this.getEdgeParams());
  }
}

export const workOrderStore = WorkOrderStore.getInstance();
