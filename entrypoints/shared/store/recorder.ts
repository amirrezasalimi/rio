import { create } from 'zustand';

export type RecorderStatus = 'idle' | 'preparing' | 'recording' | 'paused' | 'processing' | 'error';

interface RecorderState {
  status: RecorderStatus;
  error: string | null;
  setStatus: (status: RecorderStatus) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState: Pick<RecorderState, 'status' | 'error'> = {
  status: 'idle',
  error: null,
};

export const useRecorderStore = create<RecorderState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status, error: null }),
  setError: (error) => set({ status: 'error', error }),
  reset: () => set(initialState),
}));
