import { useState, useRef, useEffect, useCallback } from "react";
import { TableEntity } from "../types/visualization";
import "../styles/Entity.css";
import { AttributeTooltip } from "./AttributeTooltip";
import { KeyIcon } from "./icons/KeyIcon";
import { LinkIcon } from "./icons/LinkIcon";

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
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hoveredAttribute, setHoveredAttribute] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, halfTop: 0 });
    const entityRef = useRef<HTMLDivElement>(null);
    const attributeRefs = useRef<(HTMLLIElement | null)[]>([]);

    const updateTooltipPosition = useCallback(() => {
        if (hoveredAttribute !== null && attributeRefs.current[hoveredAttribute]) {
            const attrElement = attributeRefs.current[hoveredAttribute];
            if (attrElement) {
                const rect = attrElement.getBoundingClientRect();
                setTooltipPosition({
                    top: rect.top, 
                    left: rect.right, 
                    halfTop: rect.height / 2
                });
            }
        }
    }, [hoveredAttribute]);

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
                onMove(entity.id, { x: newX, y: newY });
            }
        }
    }, [dragOffset.x, dragOffset.y, entity.id, isDragging, onMove, updateTooltipPosition]);

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
                <div className="entity-header"> {entity.table.name} </div>
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

            <AttributeTooltip attribute={ hoveredAttribute !== null ? entity.table.attributes[hoveredAttribute] : null } position={tooltipPosition} />
        </>
    );
}
