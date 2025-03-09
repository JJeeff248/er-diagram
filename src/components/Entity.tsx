import { useState, useRef, useEffect } from "react";

interface EntityProps {
    id: string;
    name: string;
    attributes: string[];
    position: { x: number; y: number };
    isSelected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, position: { x: number; y: number }) => void;
    enumData?: Record<string, string[]>;
}

export function Entity({
    id,
    name,
    attributes,
    position,
    isSelected = false,
    onSelect,
    onMove,
    enumData = {},
}: EntityProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hoveredAttribute, setHoveredAttribute] = useState<number | null>(
        null
    );
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const entityRef = useRef<HTMLDivElement>(null);
    const attributeRefs = useRef<(HTMLLIElement | null)[]>([]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (entityRef.current) {
            const rect = entityRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
            setIsDragging(true);
            onSelect(id);
            e.stopPropagation();
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && entityRef.current) {
            const container = entityRef.current.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const newX = e.clientX - containerRect.left - dragOffset.x;
                const newY = e.clientY - containerRect.top - dragOffset.y;

                onMove(id, { x: newX, y: newY });
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add/remove event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    // Update tooltip position when hovering over an attribute
    useEffect(() => {
        if (
            hoveredAttribute !== null &&
            attributeRefs.current[hoveredAttribute]
        ) {
            const attrElement = attributeRefs.current[hoveredAttribute];
            if (attrElement) {
                const rect = attrElement.getBoundingClientRect();
                // Position the tooltip above the attribute element
                setTooltipPosition({
                    top: rect.top - 10, // Position it above the element with some margin
                    left: rect.left + rect.width / 2, // Center it horizontally
                });
            }
        }
    }, [hoveredAttribute]);

    // Get tooltip content for an attribute
    const getTooltipContent = (attr: string) => {
        // Extract column name and type for better display in tooltip
        const nameTypeMatch = attr.match(
            /(?:PK:|FK:|pk:|fk:)?\s*(\w+)\s+\((\w+(?:\(\d+(?:,\d+)?\))?)\)/
        );
        const columnType = nameTypeMatch ? nameTypeMatch[2] : "";

        const tooltipLines = [];

        // Check if it's an enum type
        if (columnType && enumData[columnType]) {
            tooltipLines.push(`Type: Enum (${columnType})`);
            tooltipLines.push(`Values: ${enumData[columnType].join(", ")}`);
        }

        // Check if it's a primary key
        if (
            attr.toLowerCase().includes("pk:") ||
            attr.toLowerCase().includes("[primary key]") ||
            attr.toLowerCase().includes("primary key") ||
            attr.toLowerCase().includes("[pk]")
        ) {
            tooltipLines.push("Primary Key");
        }

        // Check if it's a foreign key
        if (
            attr.toLowerCase().includes("[ref:") ||
            attr.toLowerCase().includes("fk:") ||
            attr.toLowerCase().includes("[fk]")
        ) {
            const refMatch = attr.match(/ref:\s*([<>])\s*(\w+)\.(\w+)/);
            if (refMatch) {
                const direction = refMatch[1] === ">" ? "to" : "from";
                tooltipLines.push(
                    `Foreign Key - References ${direction} ${refMatch[2]}.${refMatch[3]}`
                );
            } else {
                tooltipLines.push("Foreign Key");
            }
        }

        // Add nullable information
        if (
            attr.toLowerCase().includes("not null") ||
            attr.toLowerCase().includes("nn")
        ) {
            tooltipLines.push("Required (NOT NULL)");
        } else {
            tooltipLines.push("Nullable");
        }

        return tooltipLines.join("\n");
    };

    return (
        <>
            <div
                ref={entityRef}
                className="entity"
                style={{
                    position: "absolute",
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    border: `2px solid ${isSelected ? "#61dafb" : "#555"}`,
                    borderRadius: "8px",
                    backgroundColor: "#2a2a2a",
                    minWidth: "200px",
                    cursor: isDragging ? "grabbing" : "grab",
                    boxShadow: isSelected
                        ? "0 0 0 2px #61dafb, 0 4px 16px rgba(0,0,0,0.4)"
                        : "0 4px 8px rgba(0,0,0,0.3)",
                    overflow: "hidden",
                    fontFamily:
                        "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                    zIndex: isSelected ? 2 : 1,
                    transition: "box-shadow 0.2s ease-in-out",
                }}
                onMouseDown={handleMouseDown}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(id);
                }}
            >
                <div
                    className="entity-header"
                    style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #444",
                        fontWeight: "bold",
                        fontSize: "16px",
                        textAlign: "center",
                        backgroundColor: "#383838",
                        color: "#f8f8f8",
                        position: "relative",
                    }}
                >
                    {name}
                </div>
                <div className="entity-attributes" style={{ padding: "8px 0" }}>
                    <ul
                        style={{
                            listStyle: "none",
                            padding: 0,
                            margin: 0,
                            maxHeight: "400px",
                            overflowY: "auto",
                        }}
                    >
                        {attributes.map((attr, index) => {
                            // Style differently based on attribute type
                            const isPrimaryKey =
                                attr.toLowerCase().includes("pk:") ||
                                attr.toLowerCase().includes("[primary key]") ||
                                attr.toLowerCase().includes("primary key") ||
                                attr.toLowerCase().includes("[pk]");

                            const isForeignKey =
                                attr.toLowerCase().includes("[ref:") ||
                                attr.toLowerCase().includes("fk:") ||
                                attr.toLowerCase().includes("[fk]");

                            // Check if it's an enum type by extracting the type
                            const typeMatch = attr.match(
                                /\((\w+)(?:\(\d+(?:,\d+)?\))?\)/
                            );
                            const columnType = typeMatch ? typeMatch[1] : "";
                            const isEnum =
                                columnType &&
                                Object.keys(enumData).includes(columnType);

                            // Only show icons for special column types
                            const showIcon =
                                isPrimaryKey || isForeignKey || isEnum;
                            let iconType = "";
                            let itemColor = "#e0e0e0";

                            if (isPrimaryKey) {
                                iconType = "key";
                                itemColor = "#ffd700";
                            } else if (isForeignKey) {
                                iconType = "link";
                                itemColor = "#61dafb";
                            } else if (isEnum) {
                                iconType = "enum";
                                itemColor = "#9c64f4";
                            }

                            return (
                                <li
                                    key={index}
                                    ref={(element) => {
                                        attributeRefs.current[index] = element;
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        display: "flex",
                                        alignItems: "center",
                                        borderLeft: `4px solid ${
                                            isPrimaryKey
                                                ? "#ffd700"
                                                : isForeignKey
                                                ? "#61dafb"
                                                : isEnum
                                                ? "#9c64f4"
                                                : "transparent"
                                        }`,
                                        backgroundColor:
                                            index % 2 === 0
                                                ? "#303030"
                                                : "#2a2a2a",
                                        color: itemColor,
                                        position: "relative",
                                    }}
                                    onMouseEnter={() =>
                                        setHoveredAttribute(index)
                                    }
                                    onMouseLeave={() =>
                                        setHoveredAttribute(null)
                                    }
                                >
                                    {showIcon && (
                                        <span
                                            style={{
                                                marginRight: "8px",
                                                width: "16px",
                                                height: "16px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {iconType === "key" && (
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="white"
                                                >
                                                    <path d="M7 17a5.007 5.007 0 0 0 4.898-4H14v2h2v-2h2v-2h-7.102A5.007 5.007 0 0 0 7 7c-2.757 0-5 2.243-5 5s2.243 5 5 5zm0-8c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3z" />
                                                </svg>
                                            )}
                                            {iconType === "link" && (
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="white"
                                                >
                                                    <path d="M8 13h8v-2H8v2zm9-6h-4V5H7v2H3v2h4v2h10V9h4V7z" />
                                                    <path d="M7 17h10v-2H7v2zm4 4h2v-2h-2v2z" />
                                                </svg>
                                            )}
                                            {iconType === "enum" && (
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="white"
                                                >
                                                    <path d="M4 5h16v2H4V5zm0 6h16v2H4v-2zm0 6h16v2H4v-2z" />
                                                </svg>
                                            )}
                                        </span>
                                    )}
                                    <span style={{ flexGrow: 1 }}>{attr}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Floating Tooltip - Positioned in the document flow rather than in the entity */}
            {hoveredAttribute !== null && attributes[hoveredAttribute] && (
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
            )}
        </>
    );
}
