import { create } from 'zustand';
import { TableDefinition } from '../types/schema';

interface Store {
  tables: TableDefinition[];
  smlInput: string;
  setTables: (tables: TableDefinition[]) => void;
  setSmlInput: (smlInput: string) => void;
}

const useTableStore = create<Store>((set) => ({
  tables: [],
  smlInput: "",
  setTables: (tables) => set({ tables }),
  setSmlInput: (smlInput) => set({ smlInput }),
}));

export default useTableStore;
