interface TableDefinition {
    name: string;
    alias?: string;
    note?: string;

    attributes: AttributeDefinition[];
}

interface AttributeDefinition {
    name: string;
    type: string;
    note?: string;
    
    isPrimaryKey: boolean;
    isNullable: boolean;
    foreignKey?: string;
    foreignKeyName?: string;
    enumValues?: string[];
}

export type { TableDefinition, AttributeDefinition };
