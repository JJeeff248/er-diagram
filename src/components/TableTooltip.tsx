import "../styles/Entity.css";

interface TableTooltipProps {
    tableName: string | null;
    note: string | undefined;
    position: { top: number; left: number, halfTop: number };
}

export function TableTooltip({
    tableName,
    note,
    position
}: TableTooltipProps) {
    const xOffset = 20;

    return (
        <> {tableName && note && (
            <div
                className="attribute-tooltip"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left + xOffset}px`,
                    '--triangle-top': `${position.halfTop}px` 
                } as React.CSSProperties } 
            >
                <div className="v-stack">
                    <div className="h-stack">
                        <div style={{ flexGrow: 1 }}> { tableName } </div>
                        <div style={{ color: "#f58b40" }}> Table </div>
                    </div>
                    
                    { note && <div className="pre-note-underline"> { note } </div> }
                </div>
            </div>
        )} </>
    );
}
