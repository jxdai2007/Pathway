import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Node } from '@/lib/schemas';

type NodeStatus = 'idle' | 'loading' | 'loaded' | 'error';
type NodeRecord = Node & { status: NodeStatus };
type InFlight = { requestId: string; abort: AbortController };

type PathwayState = {
  nodesById: Record<string, NodeRecord>;
  lockedNodeIds: string[];
  openPromptStageIdx: number | null;
  previewNodeId: string | null;
  justLockedStageIdx: number | null;
  justLandedStageIdx: number | null;
  confirmed: boolean;
  humility: string | null;
  inFlight: Record<number, InFlight>;
  requestCounter: number;

  setPreview: (nodeId: string | null) => void;
  cancelPreview: () => void;
  setHumility: (h: string | null) => void;
  addNodes: (nodes: Node[]) => void;
  toggleTodoDone: (nodeId: string, idx: number) => void;
  lockIn: (stageIdx: number, nodeId: string) => void;
  reopen: (stageIdx: number) => void;
  startExpand: (stageIdx: number, parentNodeId: string | null) =>
    { requestId: string; signal: AbortSignal };
  acceptChildren: (stageIdx: number, requestId: string, children: Node[]) => boolean;
  abortExpand: (stageIdx: number) => void;
  confirmPlan: () => void;
  triggerLand: (stageIdx: number) => void;
  reset: () => void;
};

export const usePathwayStore = create<PathwayState>()(
  persist(
    (set, get) => ({
      nodesById: {},
      lockedNodeIds: [],
      openPromptStageIdx: 0,
      previewNodeId: null,
      justLockedStageIdx: null,
      justLandedStageIdx: null,
      confirmed: false,
      humility: null,
      inFlight: {},
      requestCounter: 0,

      setPreview: (nodeId) => set({ previewNodeId: nodeId }),
      cancelPreview: () => set({ previewNodeId: null }),
      setHumility: (h) => set({ humility: h }),

      addNodes: (nodes) => set((state) => {
        const next = { ...state.nodesById };
        for (const n of nodes) next[n.id] = { ...n, status: 'loaded' };
        return { nodesById: next };
      }),

      toggleTodoDone: (nodeId, idx) => set((state) => {
        const node = state.nodesById[nodeId];
        if (!node) return {};
        const todos = node.todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
        return { nodesById: { ...state.nodesById, [nodeId]: { ...node, todos } } };
      }),

      lockIn: (stageIdx, nodeId) => {
        set((state) => ({
          lockedNodeIds: [...state.lockedNodeIds.slice(0, stageIdx), nodeId],
          openPromptStageIdx: stageIdx < 4 ? stageIdx + 1 : null,
          previewNodeId: null,
          justLockedStageIdx: stageIdx,
        }));
        setTimeout(() => {
          if (get().justLockedStageIdx === stageIdx) {
            set({ justLockedStageIdx: null });
          }
        }, 1400);
      },

      reopen: (stageIdx) => {
        const state = get();
        const prior = state.lockedNodeIds[stageIdx] ?? null;
        set({
          lockedNodeIds: state.lockedNodeIds.slice(0, stageIdx),
          openPromptStageIdx: stageIdx,
          previewNodeId: prior,
        });
      },

      startExpand: (stageIdx, parentNodeId) => {
        const counter = get().requestCounter + 1;
        const requestId = `req-${counter}`;
        const abort = new AbortController();
        const prior = get().inFlight[stageIdx];
        if (prior) prior.abort.abort();
        set({
          requestCounter: counter,
          inFlight: { ...get().inFlight, [stageIdx]: { requestId, abort } },
        });
        void parentNodeId; // parent is encoded in the HTTP call
        return { requestId, signal: abort.signal };
      },

      acceptChildren: (stageIdx, requestId, children) => {
        const flight = get().inFlight[stageIdx];
        if (!flight || flight.requestId !== requestId) return false;
        get().addNodes(children);
        set((state) => {
          const next = { ...state.inFlight };
          delete next[stageIdx];
          return { inFlight: next };
        });
        return true;
      },

      abortExpand: (stageIdx) => {
        const flight = get().inFlight[stageIdx];
        if (flight) {
          flight.abort.abort();
          set((state) => {
            const next = { ...state.inFlight };
            delete next[stageIdx];
            return { inFlight: next };
          });
        }
      },

      confirmPlan: () => set({ confirmed: true }),

      triggerLand: (stageIdx) => {
        set({ justLandedStageIdx: stageIdx });
        setTimeout(() => {
          if (get().justLandedStageIdx === stageIdx) {
            set({ justLandedStageIdx: null });
          }
        }, 1400);
      },

      reset: () => {
        for (const f of Object.values(get().inFlight)) f.abort.abort();
        set({
          nodesById: {}, lockedNodeIds: [], openPromptStageIdx: 0,
          previewNodeId: null, justLockedStageIdx: null, justLandedStageIdx: null,
          confirmed: false, humility: null, inFlight: {}, requestCounter: 0,
        });
      },
    }),
    {
      name: 'pathway-state-v3',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        nodesById: state.nodesById,
        lockedNodeIds: state.lockedNodeIds,
        openPromptStageIdx: state.openPromptStageIdx,
        requestCounter: state.requestCounter,
        confirmed: state.confirmed,
      }) as any,
    }
  )
);
