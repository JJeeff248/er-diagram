import { useCallback, useEffect, useRef, useState } from "react";
import { Entity } from "./Entity";
import { AttributeDefinition, TableDefinition } from "../types/schema";
import useTableStore from "../stores/schemaStore";
import { useShallow } from "zustand/shallow";
import { Relationship } from "./Relationship";

interface TableEntity {
    id: string;
    position: { x: number; y: number };
    table: TableDefinition;
}

interface RelationshipData {
    from: { tableName: string; atrrName: string };
    to: { tableName: string; atrrName: string };
}

export function DiagramCanvas() {
    const maxPerRow: number = 4;
    const xSpacing: number = 300;
    const ySpacing: number = 250;
    const gridMargin: number = 50;

    const [tables] = useTableStore(useShallow((state) => [state.tables]));

    const [entities, setEntities] = useState<TableEntity[]>([]);
    const [relationships, setRelationships] = useState<RelationshipData[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

    const entityRefs = useRef<Map<string, ({ 
        getName: () => string, 
        getAttribute: (name: string) => HTMLLIElement | null; 
    } | null)>>(new Map());

    const [refsReady, setRefsReady] = useState<boolean>(false);

    useEffect(() => {
        setRefsReady(false);

        setEntities((prev) => {
            const oldEntities = new Map();
            prev.forEach((entity) => { oldEntities.set(entity.table.name, entity.position); });

            return tables.map((table, idx): TableEntity => ({
                id: table.name,
                position: oldEntities.get(table.name) ?? { 
                    x: gridMargin + idx % maxPerRow * xSpacing, 
                    y: gridMargin + Math.floor(idx / maxPerRow) * ySpacing 
                },
                table
            }));
        });

        const newRelationships: RelationshipData[] = [];
        tables.forEach((table: TableDefinition) => {
            table.attributes.forEach((attr: AttributeDefinition) => {
                if (!attr.foreignKey) return;
                
                newRelationships.push({
                    from: { tableName: table.name, atrrName: attr.name },
                    to: { tableName: attr.foreignKey.split(".")[0], atrrName: attr.foreignKey.split(".")[1] }
                });
            })
        })
        setRelationships(newRelationships);
    }, [tables]);
    
    const onEntityMove = useCallback((id: string, position: { x: number; y: number }) => {
        setEntities((prev) =>
            prev.map((e) => (e.id === id ? { ...e, position } : e))
        );
    }, []);

    const getAttributeRef = useCallback((id: string, attributeName: string): HTMLLIElement | null => {
        const entity = entityRefs.current.get(id);
        if (!entity) return null;
        return entity.getAttribute(attributeName);
    }, []);

    useEffect(() => {
        if (refsReady) return;
        setRefsReady(entities.every(entity => entityRefs.current.get(entity.table.name) !== null));
    }, [entities, refsReady]);

    return (
        <div
            className="diagram-canvas"
            style={{ position: "relative", height: "100%", width: "100%" }}
            onClick={() => setSelectedEntityId(null)}
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
                    {relationships.map((relationship, idx) => (
                        <Relationship 
                            key={idx}
                            from={getAttributeRef(relationship.from.tableName, relationship.from.atrrName)} 
                            to={getAttributeRef(relationship.to.tableName, relationship.to.atrrName)}
                        />
                    ))}

                    {entities.map((entity) => (
                        <Entity
                            ref={(element) => { entityRefs.current.set(entity.table.name, element); }}
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
