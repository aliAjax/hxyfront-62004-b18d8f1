import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { workOrderStore, StoreEvent, StoreSnapshot } from './index';
import {
  WorkOrder,
  WorkOrderFormData,
  WorkOrderStatus,
  WorkOrderPhase,
  QualityChecklist,
  QuoteSummary,
  BaseDamageMark,
  CustomerHistoryRecord,
  Technician,
  WorkOrderAssignment,
  EdgeAngleParam,
  TechnicianStatus,
} from '../types';

export function useStoreInitialized(): boolean {
  const [initialized, setInitialized] = useState(workOrderStore.isInitialized());

  useEffect(() => {
    if (initialized) return;

    let cancelled = false;

    workOrderStore.init().then(() => {
      if (!cancelled) setInitialized(true);
    });

    const unsubscribe = workOrderStore.on('store:initialized', () => {
      if (!cancelled) setInitialized(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [initialized]);

  return initialized;
}

function useStoreSubscription<T>(
  event: StoreEvent,
  getter: () => T,
  initialValue: T
): T {
  const [value, setValue] = useState<T>(initialValue);
  const initialized = useStoreInitialized();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!initialized) return;

    if (!hasRun.current) {
      setValue(getter());
      hasRun.current = true;
    }

    const unsubscribe = workOrderStore.on(event, () => {
      setValue(getter());
    });

    return unsubscribe;
  }, [event, getter, initialized]);

  return value;
}

export function useWorkOrders(): WorkOrder[] {
  const getter = useCallback(() => workOrderStore.getWorkOrders(), []);
  return useStoreSubscription('workOrders:changed', getter, []);
}

export function useWorkOrderById(id: string | null | undefined): WorkOrder | undefined {
  const getter = useCallback(() => (id ? workOrderStore.getWorkOrderById(id) : undefined), [id]);
  return useStoreSubscription('workOrders:changed', getter, undefined);
}

export function useCustomerHistory(): CustomerHistoryRecord[] {
  const getter = useCallback(() => workOrderStore.getCustomerHistory(), []);
  return useStoreSubscription('customerHistory:changed', getter, []);
}

export function useCustomerHistoryQuery(options?: {
  customerName?: string;
  customerPhone?: string;
  brand?: string;
  boardType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const allHistory = useCustomerHistory();
  return useMemo(() => {
    if (!options) return allHistory;
    return workOrderStore.queryCustomerHistory(options);
  }, [allHistory, options]);
}

export function useTechnicians(): Technician[] {
  const getter = useCallback(() => workOrderStore.getTechnicians(), []);
  return useStoreSubscription('technicians:changed', getter, []);
}

export function useAssignments(): WorkOrderAssignment[] {
  const getter = useCallback(() => workOrderStore.getAssignments(), []);
  return useStoreSubscription('assignments:changed', getter, []);
}

export function useEdgeParams(): EdgeAngleParam[] {
  const getter = useCallback(() => workOrderStore.getEdgeParams(), []);
  return useStoreSubscription('edgeParams:changed', getter, []);
}

export function useWorkOrderActions() {
  return useMemo(
    () => ({
      create: (formData: WorkOrderFormData) => workOrderStore.createWorkOrder(formData),
      update: (id: string, updates: Partial<WorkOrderFormData>) =>
        workOrderStore.updateWorkOrder(id, updates),
      remove: (id: string) => workOrderStore.deleteWorkOrder(id),
      advanceStatus: (id: string) => {
        try {
          return workOrderStore.advanceStatus(id);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      transitionStatus: (id: string, status: WorkOrderStatus, note?: string) => {
        try {
          return workOrderStore.transitionStatus(id, status, note);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      addDamageMark: (orderId: string, mark: Omit<BaseDamageMark, 'id'>) =>
        workOrderStore.addDamageMark(orderId, mark),
      updateDamageMark: (orderId: string, markId: string, updates: Partial<BaseDamageMark>) =>
        workOrderStore.updateDamageMark(orderId, markId, updates),
      removeDamageMark: (orderId: string, markId: string) =>
        workOrderStore.removeDamageMark(orderId, markId),
      createQualityChecklist: (orderId: string) =>
        workOrderStore.createQualityChecklist(orderId),
      updateQualityChecklist: (orderId: string, checklist: QualityChecklist) =>
        workOrderStore.updateQualityChecklist(orderId, checklist),
      applyQuote: (orderId: string, summary: QuoteSummary) =>
        workOrderStore.applyQuote(orderId, summary),
      updateFields: (orderId: string, updates: Partial<WorkOrder>, operator?: string) => {
        try {
          return workOrderStore.updateWorkOrderFields(orderId, updates, operator);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      transitionToNextPhase: (orderId: string, operator?: string, note?: string) => {
        try {
          return workOrderStore.transitionToNextPhase(orderId, operator, note);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      rejectToPreviousPhase: (orderId: string, reason: string, operator?: string) => {
        try {
          return workOrderStore.rejectToPreviousPhase(orderId, reason, operator);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      rejectToSpecificPhase: (orderId: string, targetPhase: WorkOrderPhase, reason: string, operator?: string) => {
        try {
          return workOrderStore.rejectToSpecificPhase(orderId, targetPhase, reason, operator);
        } catch (e) {
          alert((e as Error).message);
          return undefined;
        }
      },
      get: (id: string) => workOrderStore.getWorkOrderById(id),
      getStatistics: () => workOrderStore.getWorkOrderStatistics(),
    }),
    []
  );
}

export function useCustomerHistoryActions() {
  return useMemo(
    () => ({
      add: (record: Omit<CustomerHistoryRecord, 'id'>) =>
        workOrderStore.addCustomerHistoryRecord(record),
      query: (options?: {
        customerName?: string;
        customerPhone?: string;
        brand?: string;
        boardType?: string;
        startDate?: string;
        endDate?: string;
      }) => workOrderStore.queryCustomerHistory(options),
      getDistinctValues: () => workOrderStore.getCustomerDistinctValues(),
    }),
    []
  );
}

export function useTechnicianActions() {
  return useMemo(
    () => ({
      updateStatus: (technicianId: string, status: TechnicianStatus) =>
        workOrderStore.updateTechnicianStatus(technicianId, status),
    }),
    []
  );
}

export function useAssignmentActions() {
  return useMemo(
    () => ({
      create: (assignment: Omit<WorkOrderAssignment, 'id'>) =>
        workOrderStore.createAssignment(assignment),
      reassign: (assignmentId: string, newTechnicianId: string) =>
        workOrderStore.reassignAssignment(assignmentId, newTechnicianId),
      remove: (assignmentId: string) => workOrderStore.removeAssignment(assignmentId),
    }),
    []
  );
}

export function useDataIO() {
  return useMemo(
    () => ({
      exportJSON: () => workOrderStore.exportToJSON(),
      downloadJSON: (filename?: string) => workOrderStore.downloadJSON(filename),
      importJSON: (jsonString: string, mode: 'merge' | 'replace' = 'merge'): StoreSnapshot => {
        try {
          return workOrderStore.importFromJSON(jsonString, mode);
        } catch (e) {
          alert((e as Error).message);
          throw e;
        }
      },
      importFile: (file: File, mode: 'merge' | 'replace' = 'merge') =>
        workOrderStore.importFromFile(file, mode).catch((e) => {
          alert((e as Error).message);
          throw e;
        }),
      reset: () => workOrderStore.resetAll(),
    }),
    []
  );
}
