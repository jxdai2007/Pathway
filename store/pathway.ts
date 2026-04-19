import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Node } from '@/lib/schemas';

type NodeStatus = 'idle' | 'loading' | 'loaded' | 'error';
type NodeRecord = Node & { status: NodeStatus; children: string[] };
type InFlight = { requestId: string; abort: AbortController };

type PathwayState = {
  nodesById: Record<string, NodeRecord>;
  selectedId: string | null;
  inFlight: Record<string, InFlight>;
  requestCounter: number;
  humility: string | null;

  setSelected: (id: string | null) => void;
  setHumility: (h: string | null) => void;
  addNodes: (nodes: Node[]) => void;
  toggleTodoDone: (nodeId: string, todoIdx: number) => void;
  startExpand: (parentId: string) => { requestId: string; signal: AbortSignal };
  acceptChildren: (parentId: string, requestId: string, children: Node[]) => boolean;
  abortExpand: (parentId: string) => void;
  reset: () => void;
};

export const usePathwayStore = create<PathwayState>()(
  persist(
    (set, get) => ({
      nodesById: {},
      selectedId: null,
      inFlight: {},
      requestCounter: 0,
      humility: null,

      setSelected: (id) => set({ selectedId: id }),
      setHumility: (h) => set({ humility: h }),

      addNodes: (nodes) => set((state) => {
        const next = { ...state.nodesById };
        for (const n of nodes) {
          const existing = next[n.id];
          next[n.id] = {
            ...n,
            status: 'loaded',
            children: existing?.children ?? [],
          };
          if (n.parent_id && next[n.parent_id]) {
            const list = next[n.parent_id].children;
            if (!list.includes(n.id)) {
              next[n.parent_id] = { ...next[n.parent_id], children: [...list, n.id] };
            }
          }
        }
        return { nodesById: next };
      }),

      toggleTodoDone: (nodeId, idx) => set((state) => {
        const node = state.nodesById[nodeId];
        if (!node) return {};
        const todos = node.todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
        return { nodesById: { ...state.nodesById, [nodeId]: { ...node, todos } } };
      }),

      startExpand: (parentId) => {
        const counter = get().requestCounter + 1;
        const requestId = `req-${counter}`;
        const abort = new AbortController();
        const prior = get().inFlight[parentId];
        if (prior) prior.abort.abort();
        set({
          requestCounter: counter,
          inFlight: { ...get().inFlight, [parentId]: { requestId, abort } },
        });
        return { requestId, signal: abort.signal };
      },

      acceptChildren: (parentId, requestId, children) => {
        const flight = get().inFlight[parentId];
        if (!flight || flight.requestId !== requestId) return false;
        get().addNodes(children);
        set((state) => {
          const next = { ...state.inFlight };
          delete next[parentId];
          return { inFlight: next };
        });
        return true;
      },

      abortExpand: (parentId) => {
        const flight = get().inFlight[parentId];
        if (flight) {
          flight.abort.abort();
          set((state) => {
            const next = { ...state.inFlight };
            delete next[parentId];
            return { inFlight: next };
          });
        }
      },

      reset: () => set({ nodesById: {}, selectedId: null, inFlight: {}, requestCounter: 0, humility: null }),
    }),
    {
      name: 'pathway-state-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      // Persist ONLY non-sensitive, serializable fields. No in-flight controllers.
      partialize: (state) => ({
        nodesById: state.nodesById,
        requestCounter: state.requestCounter,
      }) as any,
    }
  )
);
