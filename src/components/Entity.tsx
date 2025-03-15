import { useState, useRef, useEffect, useCallback } from "react";
import { TableEntity } from "../types/visualization";
import "../styles/Entity.css";
import { AttributeTooltip } from "./AttributeTooltip";
import { KeyIcon } from "./icons/KeyIcon";
import { LinkIcon } from "./icons/LinkIcon";
import { TableTooltip } from "./TableTooltip";

interface EntityProps {
    entity: TableEntity;
    isSelected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, position: { x: number; y: number }) => void;
}

export function Entity({
    entity,
    isSelected = false,
    onSelect,
    onMove,
}: EntityProps) {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    
    const [hoveringHeader, setHoveringHeader] = useState<boolean>(false);
    const [hoveredAttribute, setHoveredAttribute] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, halfTop: 0 });
    const [headerPosition, setHeaderPosition] = useState({ top: 0, left: 0, halfTop: 0 });

    const entityRef = useRef<HTMLDivElement>(null);
    const entityHeaderRef = useRef<HTMLDivElement>(null);
    const attributeRefs = useRef<(HTMLLIElement | null)[]>([]);

    const updatePosition = useCallback((element: HTMLElement, set: React.Dispatch<React.SetStateAction<{ top: number; left: number; halfTop: number }>>) => {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        set({
            top: rect.top, 
            left: rect.right, 
            halfTop: rect.height / 2
        });
    }, []);

    const updateTooltipPosition = useCallback(() => {
        if (hoveredAttribute !== null && attributeRefs.current[hoveredAttribute]) {
            const attrElement = attributeRefs.current[hoveredAttribute];
            updatePosition(attrElement, setTooltipPosition);
        }
    }, [hoveredAttribute, updatePosition]);
    
    const updateHeaderPosition = useCallback(() => {
        if (entityHeaderRef.current) {
            updatePosition(entityHeaderRef.current, setHeaderPosition);
        }
    }, [entityHeaderRef, updatePosition]);

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseDown = (e: React.MouseEvent) => {
        if (entityRef.current) {
            const rect = entityRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
            setIsDragging(true);
            onSelect(entity.id);
            e.stopPropagation();
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging && entityRef.current) {
            const container = entityRef.current.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const newX = e.clientX - containerRect.left - dragOffset.x;
                const newY = e.clientY - containerRect.top - dragOffset.y;

                updateTooltipPosition();
                updateHeaderPosition();
                onMove(entity.id, { x: newX, y: newY });
            }
        }
    }, [dragOffset.x, dragOffset.y, entity.id, isDragging, onMove, updateHeaderPosition, updateTooltipPosition]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, isDragging]);

    
    useEffect(() => {
        updateTooltipPosition();
    }, [hoveredAttribute, updateTooltipPosition]);
    
    useEffect(() => {
        updateHeaderPosition();
    }, [entity, updateHeaderPosition]);

    return (
        <>
            <div
                ref={entityRef}
                className="entity"
                style={{
                    left: `${entity.position.x}px`,
                    top: `${entity.position.y}px`,
                    cursor: isDragging ? "grabbing" : "grab",
                    boxShadow: isSelected ? "0 0 0 2px #61dafb, 0 4px 16px rgba(0,0,0,0.4)" : "0 4px 8px rgba(0,0,0,0.3)",
                    zIndex: isSelected ? 2 : 1,
                }}
                onMouseDown={handleMouseDown}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(entity.id);
                }}
            >
                <div className="entity-header" ref={entityHeaderRef}
                    onMouseEnter={() => setHoveringHeader(true)}
                    onMouseLeave={() => setHoveringHeader(false)}
                > {entity.table.name} </div>
                <div className="entity-attributes">
                    <ul className="attribute-list">
                        {entity.table.attributes.map((attr, index) => {
                            return (
                                <li
                                    key={index}
                                    className="entity-attribute"
                                    ref={(element) => { attributeRefs.current[index] = element; }}
                                    style={{ backgroundColor: index % 2 === 0 ? "#303030" : "#2a2a2a" }}
                                    onMouseEnter={() => setHoveredAttribute(index)}
                                    onMouseLeave={() => setHoveredAttribute(null)}
                                >
                                    <div className="h-stack attribute-content">
                                        <div className="h-stack" style={{ flexGrow: 1, gap: "5px" }}> 
                                            { attr.name } 
                                            { attr.isPrimaryKey && <KeyIcon /> }
                                            { attr.foreignKey && <LinkIcon /> }
                                        </div>
                                        <div className="h-stack" style={{ gap: "5px", color: "#f58b40" }}> 
                                            { attr.type } 
                                            { !attr.isNullable && <div className="nn-icon"> NN </div> }
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            <TableTooltip tableName={ hoveringHeader ? entity.table.name : null } note={ entity.table.note } position={headerPosition} />
            <AttributeTooltip attribute={ hoveredAttribute !== null ? entity.table.attributes[hoveredAttribute] : null } position={tooltipPosition} />
        </>
    );
}

// table tooltip
// table get rid of sticky select
// table disable text select
// table pos on generate
// table keep pos
