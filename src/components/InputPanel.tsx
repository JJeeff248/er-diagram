import { useEffect } from "react";
import parse from "../utils/parser";
import useTableStore from "../stores/schemaStore";
import { useShallow } from "zustand/shallow";

export function SqlInputPanel() {
    const [smlInput, setSmlInput, setTables] = useTableStore(useShallow((state) => [
        state.smlInput,
        state.setSmlInput,
        state.setTables
    ]));

    useEffect(() => {
        const tables = parse(smlInput);
        if (tables) setTables(tables);
    }, [setTables, smlInput]);

    return (
        <div className="sql-input-panel">
            <textarea
                value={smlInput}
                onChange={(e) => setSmlInput(e.target.value)}
                placeholder="Enter Schema Markup Language (SML)"
            />
        </div>
    );
}
