import { useEffect } from "react";
import parse from "../utils/parser";
import { TableDefinition } from "../types/schema";

interface SqlInputPanelProps {
    smlInput: string;
    onSmlInputChange: (value: string) => void;
    onTablesGenerated: (tables: TableDefinition[]) => void;
}

export function SqlInputPanel({
    smlInput,
    onSmlInputChange,
    onTablesGenerated,
}: SqlInputPanelProps) {
    useEffect(() => {
        const tables = parse(smlInput);
        if (tables) onTablesGenerated(tables);
    }, [onTablesGenerated, smlInput]);

    return (
        <div className="sql-input-panel">
            <textarea
                value={smlInput}
                onChange={(e) => onSmlInputChange(e.target.value)}
                placeholder="Enter Schema Markup Language (SML)"
            />
        </div>
    );
}
