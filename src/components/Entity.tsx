/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect, useCallback } from "react";
import { TableEntity } from "../types/visualization";
import "../styles/Entity.css";

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
    // const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const entityRef = useRef<HTMLDivElement>(null);
    const attributeRefs = useRef<(HTMLLIElement | null)[]>([]);

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

                onMove(entity.id, { x: newX, y: newY });
            }
        }
    }, [dragOffset.x, dragOffset.y, entity.id, isDragging, onMove]);

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

    
    // useEffect(() => {
    //     if (
    //         hoveredAttribute !== null &&
    //         attributeRefs.current[hoveredAttribute]
    //     ) {
    //         const attrElement = attributeRefs.current[hoveredAttribute];
    //         if (attrElement) {
    //             const rect = attrElement.getBoundingClientRect();
                
    //             setTooltipPosition({
    //                 top: rect.top - 10, 
    //                 left: rect.left + rect.width / 2, 
    //             });
    //         }
    //     }
    // }, [hoveredAttribute]);

    
    // const getTooltipContent = (attr: string) => {
    //     return ["TOLTIPS"];
    // };

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
                <div className="entity-attributes" style={{ padding: "8px 0" }}>
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
                                    <span style={{ flexGrow: 1 }}> { `${attr.name} (${attr.type})` } </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* {hoveredAttribute !== null && attributes[hoveredAttribute] && (
                <div
                    className="attribute-tooltip"
                    style={{
                        position: "fixed",
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: "translate(-50%, -100%)",
                        backgroundColor: "#333",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        whiteSpace: "pre-line",
                        zIndex: 1000,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        maxWidth: "350px",
                        minWidth: "250px",
                        margin: "0 0 10px 0",
                        lineHeight: "1.5",
                        pointerEvents: "none", // Ensures the tooltip doesn't interfere with mouse events
                    }}
                >
                    {getTooltipContent(attributes[hoveredAttribute])}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "-8px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "8px solid transparent",
                            borderRight: "8px solid transparent",
                            borderTop: "8px solid #333",
                        }}
                    ></div>
                </div>
            )} */}
        </>
    );
}
