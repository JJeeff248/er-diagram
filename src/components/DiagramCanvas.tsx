import { useState, forwardRef, useImperativeHandle } from "react";
import { Entity } from "./Entity";
import { Relationship } from "./Relationship";

interface EntityData {
    id: string;
    name: string;
    attributes: string[];
    position: { x: number; y: number };
}

interface RelationshipData {
    id: string;
    from: { entityId: string; attributeIndex: number };
    to: { entityId: string; attributeIndex: number };
    type: "one-to-one" | "one-to-many" | "many-to-many";
}

interface TableDefinition {
    name: string;
    columns: ColumnDefinition[];
    foreignKeys: ForeignKeyDefinition[];
}

interface ColumnDefinition {
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isNullable: boolean;
    isEnum?: boolean;
    enumValues?: string[];
}

interface ForeignKeyDefinition {
    column: string;
    referenceTable: string;
    referenceColumn: string;
}

export const DiagramCanvas = forwardRef((props, ref) => {
    const [entities, setEntities] = useState<EntityData[]>([]);
    const [relationships, setRelationships] = useState<RelationshipData[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
        null
    );
    const [selectedRelationshipId, setSelectedRelationshipId] = useState<
        string | null
    >(null);
    const [enumData, setEnumData] = useState<Record<string, string[]>>({});

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        handleGenerateFromSql,
        getExportData: () => ({
            entities,
            relationships,
            enumData,
        }),
        handleImportFromJson: (data: {
            entities: EntityData[];
            relationships: RelationshipData[];
            enumData: Record<string, string[]>;
            sqlInput?: string; // Optional SQL input field
        }) => {
            try {
                // Validate imported data
                if (
                    !Array.isArray(data.entities) ||
                    !Array.isArray(data.relationships)
                ) {
                    throw new Error(
                        "Invalid JSON format: entities and relationships must be arrays"
                    );
                }

                // Validate that each entity has the required properties
                for (const entity of data.entities) {
                    if (
                        !entity.id ||
                        !entity.name ||
                        !Array.isArray(entity.attributes) ||
                        !entity.position ||
                        typeof entity.position.x !== "number" ||
                        typeof entity.position.y !== "number"
                    ) {
                        throw new Error(
                            "Invalid entity format in imported data"
                        );
                    }
                }

                // Validate relationships
                for (const relationship of data.relationships) {
                    if (
                        !relationship.id ||
                        !relationship.from ||
                        !relationship.to ||
                        !relationship.type
                    ) {
                        throw new Error(
                            "Invalid relationship format in imported data"
                        );
                    }
                }

                // If enumData is present, validate it
                let importedEnumData = {};
                if (data.enumData && typeof data.enumData === "object") {
                    importedEnumData = data.enumData;
                }

                // Set the data to state
                setEntities(data.entities);
                setRelationships(data.relationships);
                setEnumData(importedEnumData);

                // Reset selection
                setSelectedEntityId(null);
                setSelectedRelationshipId(null);

                return true;
            } catch (error) {
                console.error("Error importing diagram:", error);
                alert(
                    `Error importing diagram: ${
                        error instanceof Error
                            ? error.message
                            : "Invalid format"
                    }`
                );
                return false;
            }
        },
    }));

    const handleAddEntity = () => {
        const newEntity: EntityData = {
            id: `entity-${entities.length + 1}`,
            name: `Entity ${entities.length + 1}`,
            attributes: ["id", "name"],
            position: { x: 100, y: 100 },
        };

        setEntities([...entities, newEntity]);
    };

    const handleEntitySelect = (id: string) => {
        setSelectedEntityId(id);
        setSelectedRelationshipId(null);
    };

    const handleRelationshipSelect = (id: string) => {
        setSelectedRelationshipId(id);
        setSelectedEntityId(null);
    };

    const handleEntityMove = (
        id: string,
        newPosition: { x: number; y: number }
    ) => {
        setEntities(
            entities.map((entity) =>
                entity.id === id ? { ...entity, position: newPosition } : entity
            )
        );
    };

    const handleGenerateFromSql = (tables: TableDefinition[]) => {
        if (tables.length === 0) return;

        const newEntities: EntityData[] = [];
        const newRelationships: RelationshipData[] = [];

        // Position calculation for layout
        const margin = 50;
        const xSpacing = 300;
        const ySpacing = 250;
        const maxPerRow = 3;

        // Extract enum data from tables
        const extractedEnumData: Record<string, string[]> = {};

        tables.forEach((table) => {
            table.columns.forEach((column) => {
                if (column.isEnum && column.enumValues) {
                    extractedEnumData[column.type] = column.enumValues;
                }
            });
        });

        setEnumData(extractedEnumData);

        // Create entities from tables
        tables.forEach((table, index) => {
            const row = Math.floor(index / maxPerRow);
            const col = index % maxPerRow;

            const entity: EntityData = {
                id: `entity-${table.name}`,
                name: table.name,
                attributes: table.columns.map((col) => {
                    let attrDesc = col.name;
                    if (col.isPrimaryKey) attrDesc = `PK: ${attrDesc}`;
                    attrDesc += ` (${col.type})`;
                    if (!col.isNullable) attrDesc += " NOT NULL";
                    return attrDesc;
                }),
                position: {
                    x: margin + col * xSpacing,
                    y: margin + row * ySpacing,
                },
            };

            newEntities.push(entity);
        });

        // Create relationships from foreign keys
        tables.forEach((table) => {
            const sourceEntityId = `entity-${table.name}`;

            table.foreignKeys.forEach((fk, index) => {
                const targetEntityId = `entity-${fk.referenceTable}`;

                // Find column indices
                const sourceColumnIndex = table.columns.findIndex(
                    (col) => col.name === fk.column
                );
                const targetEntity = tables.find(
                    (t) => t.name === fk.referenceTable
                );

                if (targetEntity) {
                    const targetColumnIndex = targetEntity.columns.findIndex(
                        (col) => col.name === fk.referenceColumn
                    );

                    if (sourceColumnIndex !== -1 && targetColumnIndex !== -1) {
                        // Update the attribute description to include foreign key reference
                        const sourceEntity = newEntities.find(
                            (e) => e.id === sourceEntityId
                        );
                        if (
                            sourceEntity &&
                            sourceColumnIndex < sourceEntity.attributes.length
                        ) {
                            const attr =
                                sourceEntity.attributes[sourceColumnIndex];
                            sourceEntity.attributes[sourceColumnIndex] =
                                attr +
                                ` [ref: > ${fk.referenceTable}.${fk.referenceColumn}]`;
                        }

                        newRelationships.push({
                            id: `relationship-${table.name}-${index}`,
                            from: {
                                entityId: sourceEntityId,
                                attributeIndex: sourceColumnIndex,
                            },
                            to: {
                                entityId: targetEntityId,
                                attributeIndex: targetColumnIndex,
                            },
                            type: "one-to-many", // Default relationship type
                        });
                    }
                }
            });
        });

        setEntities(newEntities);
        setRelationships(newRelationships);
    };

    return (
        <div
            className="diagram-canvas"
            style={{ position: "relative", height: "100%", width: "100%" }}
            onClick={() => {
                setSelectedEntityId(null);
                setSelectedRelationshipId(null);
            }}
        >
            {entities.length === 0 ? (
                <div
                    className="canvas-empty-state"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                    }}
                >
                    <p>No entities yet</p>
                    <button onClick={handleAddEntity}>Add Entity</button>
                </div>
            ) : (
                <>
                    {/* Render relationships */}
                    {relationships.map((relationship) => {
                        const sourceEntity = entities.find(
                            (e) => e.id === relationship.from.entityId
                        );
                        const targetEntity = entities.find(
                            (e) => e.id === relationship.to.entityId
                        );

                        if (!sourceEntity || !targetEntity) return null;

                        return (
                            <Relationship
                                key={relationship.id}
                                id={relationship.id}
                                source={sourceEntity}
                                target={targetEntity}
                                sourceAttributeIndex={
                                    relationship.from.attributeIndex
                                }
                                targetAttributeIndex={
                                    relationship.to.attributeIndex
                                }
                                type={relationship.type}
                                isSelected={
                                    selectedRelationshipId === relationship.id
                                }
                                onSelect={handleRelationshipSelect}
                            />
                        );
                    })}

                    {/* Render entities */}
                    {entities.map((entity) => (
                        <Entity
                            key={entity.id}
                            id={entity.id}
                            name={entity.name}
                            attributes={entity.attributes}
                            position={entity.position}
                            isSelected={selectedEntityId === entity.id}
                            onSelect={handleEntitySelect}
                            onMove={handleEntityMove}
                            enumData={enumData}
                        />
                    ))}
                </>
            )}
        </div>
    );
});
