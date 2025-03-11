import { useEffect, useState } from "react";
import { Entity } from "./Entity";
// import { Relationship } from "./Relationship";
import { TableDefinition } from "../types/schema";
import useTableStore from "../stores/schemaStore";
import { useShallow } from "zustand/shallow";

interface TableEntity {
    id: string;
    position: { x: number; y: number };
    table: TableDefinition;
}

// interface RelationshipData {
//     id: string;
//     from: { entityId: string; attributeIndex: number };
//     to: { entityId: string; attributeIndex: number };
//     type: "one-to-one" | "one-to-many" | "many-to-many";
// }

export function DiagramCanvas() {
    const [tables] = useTableStore(useShallow((state) => [state.tables]));

    const [entities, setEntities] = useState<TableEntity[]>([]);
    // const [relationships, setRelationships] = useState<RelationshipData[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    // const [selectedRelationshipId, setSelectedRelationshipId] = useState<
    //     string | null
    // >(null);

    useEffect(() => {
        setEntities(tables.map((table, idx): TableEntity => ({
            id: table.name,
            position: { x: idx, y: 0 },
            table
        })));
    }, [tables]);
    
    const onEntityMove = (id: string, position: { x: number; y: number }) => {
        setEntities((prev) =>
            prev.map((e) => (e.id === id ? { ...e, position } : e))
        );
    };

    // const onEntitySelect = (id: string) => setSelectedEntityId(id);

    return (
        <div
            className="diagram-canvas"
            style={{ position: "relative", height: "100%", width: "100%" }}
            onClick={() => {
                setSelectedEntityId(null);
                // setSelectedRelationshipId(null);
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
                    <button onClick={() => {}}>Add Entity</button>
                </div>
            ) : (
                <>
                    {/* {relationships.map((relationship) => {
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
                                    selectedRelationshipId ===
                                    relationship.id
                                }
                                onSelect={handleRelationshipSelect}
                            />
                        );
                    })} */}

                    {entities.map((entity) => (
                        <Entity
                            entity={entity}
                            key={entity.id}
                            isSelected={selectedEntityId === entity.id}
                            onSelect={(id: string | null) => { setSelectedEntityId(id); }}
                            onMove={onEntityMove}
                        />
                    ))}
                </>
            )}
        </div>
    );
};
