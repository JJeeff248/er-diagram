/**
 * ShareCode utility
 * Creates a compact, text-based representation of ER diagrams
 * that can be easily copied and pasted
 */


export function diagramToShareCode(data: any): string {
    
    const code = {
        
        e: data.entities.map((entity: any) => ({
            i: entity.id,
            n: entity.name,
            a: entity.attributes,
            p: entity.position
        })),
        
        r: data.relationships.map((rel: any) => ({
            i: rel.id,
            f: { e: rel.from.entityId, a: rel.from.attributeIndex },
            t: { e: rel.to.entityId, a: rel.to.attributeIndex },
            y: rel.type
        })),
        
        d: data.enumData,
        
        s: data.sqlInput
    };
    
    
    return JSON.stringify(code).replace(/\\n/g, '\\\\n');
}


export function shareCodeToDiagram(code: string): any {
    try {
        
        const data = JSON.parse(code.replace(/\\\\n/g, '\\n'));
        
        
        return {
            entities: data.e.map((e: any) => ({
                id: e.i,
                name: e.n,
                attributes: e.a,
                position: e.p
            })),
            relationships: data.r.map((r: any) => ({
                id: r.i,
                from: {
                    entityId: r.f.e,
                    attributeIndex: r.f.a
                },
                to: {
                    entityId: r.t.e,
                    attributeIndex: r.t.a
                },
                type: r.y
            })),
            enumData: data.d,
            sqlInput: data.s
        };
    } catch (error) {
        console.error('Error parsing share code:', error);
        throw new Error('Invalid share code format');
    }
} 