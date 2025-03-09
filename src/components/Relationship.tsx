// Removing unused import: import React from 'react';

interface EntityData {
    id: string;
    name: string;
    attributes: string[];
    position: { x: number; y: number };
}

interface RelationshipProps {
    id: string;
    source: EntityData;
    target: EntityData;
    sourceAttributeIndex: number;
    targetAttributeIndex: number;
    type: "one-to-one" | "one-to-many" | "many-to-many";
    isSelected: boolean;
    onSelect: (id: string) => void;
}

export function Relationship({
    id,
    source,
    target,
    sourceAttributeIndex,
    targetAttributeIndex,
    type,
    isSelected,
    onSelect,
}: RelationshipProps) {
    const ENTITY_HEADER_HEIGHT = 40;
    const ATTRIBUTE_HEIGHT = 33; // Increased for the new design

    // Calculate connection points
    const sourceY =
        source.position.y +
        ENTITY_HEADER_HEIGHT +
        (sourceAttributeIndex + 0.5) * ATTRIBUTE_HEIGHT;
    const targetY =
        target.position.y +
        ENTITY_HEADER_HEIGHT +
        (targetAttributeIndex + 0.5) * ATTRIBUTE_HEIGHT;

    // Determine which sides to connect based on entity positions
    const sourceCenterX = source.position.x + 100; // Width/2 for wider entities
    const targetCenterX = target.position.x + 100;

    const isSourceToLeft = sourceCenterX < targetCenterX;

    const sourceX = isSourceToLeft
        ? source.position.x + 200 // Right side of source
        : source.position.x; // Left side of source

    const targetX = isSourceToLeft
        ? target.position.x // Left side of target
        : target.position.x + 200; // Right side of target

    // Draw arrow markers based on relationship type
    const renderMarker = () => {
        const markerId = `marker-${id}`;

        return (
            <defs>
                <marker
                    id={markerId}
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    {type === "one-to-many" || type === "many-to-many" ? (
                        <path
                            d="M 0 0 L 10 5 L 0 10 z"
                            fill={isSelected ? "#61dafb" : "#aaa"}
                        />
                    ) : (
                        <path
                            d="M 0 5 L 10 5 M 5 0 L 5 10"
                            stroke={isSelected ? "#61dafb" : "#aaa"}
                            strokeWidth="1.5"
                        />
                    )}
                </marker>
            </defs>
        );
    };

    // Calculate control points for the bezier curve
    const controlPointOffset = 100; // Increased for smoother curves
    const sourceControlX = isSourceToLeft
        ? sourceX + controlPointOffset
        : sourceX - controlPointOffset;
    const targetControlX = isSourceToLeft
        ? targetX - controlPointOffset
        : targetX + controlPointOffset;

    // Create the bezier path
    const path = `M ${sourceX},${sourceY} C ${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;

    // Get relationship label
    const getRelationshipLabel = () => {
        switch (type) {
            case "one-to-one":
                return "1:1";
            case "one-to-many":
                return "1:N";
            case "many-to-many":
                return "N:M";
            default:
                return "";
        }
    };

    return (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(id);
            }}
        >
            {renderMarker()}
            <path
                d={path}
                style={{
                    stroke: isSelected ? "#61dafb" : "#aaa",
                    strokeWidth: isSelected ? 3 : 2,
                    fill: "none",
                    pointerEvents: "stroke",
                    cursor: "pointer",
                    transition:
                        "stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out",
                    strokeDasharray: type === "many-to-many" ? "5,5" : "none",
                }}
                markerEnd={`url(#marker-${id})`}
            />

            {/* Label background */}
            <rect
                x={(sourceX + targetX) / 2 - 20}
                y={(sourceY + targetY) / 2 - 15}
                width="40"
                height="24"
                rx="12"
                ry="12"
                fill={isSelected ? "#61dafb" : "#444"}
                opacity="0.8"
                pointerEvents="none"
            />

            {/* Label text */}
            <text
                x={(sourceX + targetX) / 2}
                y={(sourceY + targetY) / 2 + 5}
                style={{
                    pointerEvents: "none",
                    textAnchor: "middle",
                    fontFamily:
                        "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: "12px",
                    fontWeight: "bold",
                    fill: isSelected ? "#000" : "#fff",
                }}
            >
                {getRelationshipLabel()}
            </text>
        </svg>
    );
}
