import "../styles/Entity.css";
import { AttributeDefinition } from "../types/schema";

interface AttributeTooltipProps {
    attribute: AttributeDefinition | null;
    position: { top: number; left: number, halfTop: number };
}

export function AttributeTooltip({
    attribute,
    position
}: AttributeTooltipProps) {
    const xOffset = 20;

    return (
        <> {attribute && (
            <div
                className="attribute-tooltip"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left + xOffset}px`,
                    '--triangle-top': `${position.halfTop}px` 
                } as React.CSSProperties } 
            >
                <div className="v-stack">
                    <div className="h-stack tooltip-header">
                        <div style={{ flexGrow: 1 }}> { attribute.name } </div>
                        <div style={{ color: "#f58b40" }}> { attribute.type } </div>
                    </div>
                    
                    { attribute.isPrimaryKey && <div> Primary Key </div> }
                    <div> { attribute.isNullable ? "Nullable" : "Non-Null" } </div> 
                    { attribute.enumValues && <div className="enum-values">
                        <div> Allowed Values: </div> 
                        { attribute.enumValues.map((val) => <div style={{ marginLeft: "10px", fontSize: "13px" }}> - { val } </div>) }
                    </div> }
                    { attribute.note && <div className="pre-note-underline"> { attribute.note } </div> }
                </div>
            </div>
        )} </>
    );
}
