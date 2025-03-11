import { TableDefinition } from "./schema";

interface TableEntity {
    id: string;
    position: { x: number; y: number };
    table: TableDefinition;
}

export type { TableEntity };
