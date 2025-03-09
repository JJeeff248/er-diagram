import { useEffect, useRef } from "react";


function checkIsPrimaryKey(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        lowerText.includes("primary key") ||
        lowerText.includes("pk") ||
        lowerText.includes("[pk]") ||
        lowerText === "pk"
    );
}


function checkIsNotNull(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        lowerText.includes("not null") ||
        lowerText.includes("nn") ||
        lowerText.includes("[nn]") ||
        lowerText === "nn"
    );
}


function checkIsForeignKey(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        lowerText.includes("foreign key") ||
        lowerText.includes("fk") ||
        lowerText.includes("[fk]") ||
        lowerText === "fk" ||
        lowerText.includes("references") ||
        lowerText.includes("ref:") ||
        lowerText.includes("[ref:")
    );
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
    relationType?: "one-to-one" | "one-to-many" | "many-to-many";
}

interface SqlInputPanelProps {
    sqlInput: string;
    onSqlInputChange: (value: string) => void;
    onTablesGenerated: (tables: TableDefinition[]) => void;
}

export function SqlInputPanel({
    sqlInput,
    onSqlInputChange,
    onTablesGenerated,
}: SqlInputPanelProps) {
    
    const isFirstRender = useRef(true);
    const prevSqlInput = useRef(sqlInput);

    
    useEffect(() => {
        
        if (isFirstRender.current) {
            isFirstRender.current = false;
            prevSqlInput.current = sqlInput;
            return;
        }

        
        if (sqlInput !== prevSqlInput.current && sqlInput.trim() !== "") {
            prevSqlInput.current = sqlInput;
            handleGenerateDiagram();
        }
    }, [sqlInput]);

    const handleGenerateDiagram = () => {
        const tables = parseSql(sqlInput);
        onTablesGenerated(tables);
    };

    return (
        <div className="sql-input-panel">
            <textarea
                value={sqlInput}
                onChange={(e) => onSqlInputChange(e.target.value)}
                placeholder="Enter SQL"
            />
            <button onClick={handleGenerateDiagram}>Generate Diagram</button>
        </div>
    );
}

function parseSql(sql: string): TableDefinition[] {
    
    if (sql.toLowerCase().includes("create table")) {
        return parseTraditionalSql(sql);
    } else if (sql.includes("Enum") || sql.includes("enum")) {
        return parseDbml(sql);
    } else {
        return parseSimplifiedSql(sql);
    }
}

function parseDbml(sql: string): TableDefinition[] {
    const tables: TableDefinition[] = [];
    const enums: Record<string, string[]> = {};

    
    const enumPattern = /Enum\s+(\w+)\s*\{([^}]*)\}/gi;
    let enumMatch;

    while ((enumMatch = enumPattern.exec(sql)) !== null) {
        const enumName = enumMatch[1];
        const enumContent = enumMatch[2];

        
        const enumValues = enumContent
            .split("\n")
            .map((line) => {
                
                return line
                    .trim()
                    .replace(/['"]/g, "")
                    .replace(/,$/g, "")
                    .trim();
            })
            .filter((line) => line.length > 0);

        enums[enumName] = enumValues;
    }

    
    const tablePattern = /Table\s+(\w+)\s*\{([^}]*)\}/gi;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(sql)) !== null) {
        const tableName = tableMatch[1];
        const tableContent = tableMatch[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        
        const lines = tableContent.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            
            const columnPattern =
                /(\w+)\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s*(?:\[(.*)\])?/;
            const columnMatch = line.match(columnPattern);

            if (columnMatch) {
                const colName = columnMatch[1];
                const colType = columnMatch[2];
                const options = columnMatch[3] || "";

                const isPrimaryKey = checkIsPrimaryKey(options);
                const isNullable = !checkIsNotNull(options);

                
                const isEnum = Object.keys(enums).includes(colType);

                columns.push({
                    name: colName,
                    type: colType,
                    isPrimaryKey,
                    isNullable,
                    isEnum,
                    enumValues: isEnum ? enums[colType] : undefined,
                });
            }
        }

        tables.push({
            name: tableName,
            columns,
            foreignKeys,
        });
    }

    
    const refPattern = /ref:\s*(\w+)\.(\w+)\s*([<\->])\s*(\w+)\.(\w+)/gi;
    let refMatch;

    while ((refMatch = refPattern.exec(sql)) !== null) {
        const sourceTable = refMatch[1];
        const sourceColumn = refMatch[2];
        const relationType = refMatch[3];
        const targetTable = refMatch[4];
        const targetColumn = refMatch[5];

        
        const targetTableIndex = tables.findIndex(
            (t) => t.name === targetTable
        );

        if (targetTableIndex >= 0) {
            let relType: "one-to-one" | "one-to-many" | "many-to-many" =
                "one-to-one";

            if (relationType === "<") {
                relType = "one-to-many";
            } else if (relationType === ">") {
                
                tables[targetTableIndex].foreignKeys.push({
                    column: targetColumn,
                    referenceTable: sourceTable,
                    referenceColumn: sourceColumn,
                    relationType: "one-to-many",
                });
                continue;
            }

            tables[targetTableIndex].foreignKeys.push({
                column: targetColumn,
                referenceTable: sourceTable,
                referenceColumn: sourceColumn,
                relationType: relType,
            });
        }
    }

    return tables;
}

function parseSimplifiedSql(sql: string): TableDefinition[] {
    const tables: TableDefinition[] = [];
    const enums: Record<string, string[]> = {};

    
    const enumRegex = /enum\s+(\w+)\s*\{\s*([^}]*)\s*\}/gi;
    let enumMatch;

    while ((enumMatch = enumRegex.exec(sql)) !== null) {
        const enumName = enumMatch[1];
        const enumValues = enumMatch[2]
            .split(",")
            .map((v) => v.trim().replace(/['"]/g, ""))
            .filter((v) => v.length > 0);

        enums[enumName] = enumValues;
    }

    
    const tablePattern = /Table\s+(\w+)\s*\{([^}]*)\}/g;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(sql)) !== null) {
        const tableName = tableMatch[1];
        const tableContent = tableMatch[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        
        const lines = tableContent.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            
            
            const columnMatch = line.match(
                /(\w+)\s+(\w+(?:\(\d+\))?)\s*(?:\[(.*)\])?/
            );
            if (columnMatch) {
                const name = columnMatch[1];
                const type = columnMatch[2];
                const constraints = columnMatch[3] || "";

                const isPrimaryKey = checkIsPrimaryKey(constraints);
                const isNullable = !checkIsNotNull(constraints);

                
                const isEnum = Object.keys(enums).includes(type);

                columns.push({
                    name,
                    type,
                    isPrimaryKey,
                    isNullable,
                    isEnum,
                    enumValues: isEnum ? enums[type] : undefined,
                });
            }

            
            
            const refPattern = /(?:ref:|fk:)?\s*(\w+)\s*([<>])\s*(\w+)\.(\w+)/i;
            const refMatch = line.match(refPattern);
            if (refMatch) {
                const column = refMatch[1];
                const direction = refMatch[2];
                const referenceTable = refMatch[3];
                const referenceColumn = refMatch[4];

                
                if (direction === ">") {
                    foreignKeys.push({
                        column,
                        referenceTable,
                        referenceColumn,
                        relationType: "one-to-many",
                    });
                }
            }
        }

        tables.push({
            name: tableName,
            columns,
            foreignKeys,
        });
    }

    
    const globalRefPattern =
        /(?:ref:|fk:)?\s*(\w+)\.(\w+)\s*([<>])\s*(\w+)\.(\w+)/gi;
    let globalRefMatch;

    while ((globalRefMatch = globalRefPattern.exec(sql)) !== null) {
        const sourceTable = globalRefMatch[1];
        const sourceColumn = globalRefMatch[2];
        const direction = globalRefMatch[3];
        const targetTable = globalRefMatch[4];
        const targetColumn = globalRefMatch[5];

        
        const sourceTableIndex = tables.findIndex(
            (t) => t.name === sourceTable
        );
        const targetTableIndex = tables.findIndex(
            (t) => t.name === targetTable
        );

        if (sourceTableIndex >= 0 && targetTableIndex >= 0) {
            if (direction === ">") {
                
                tables[sourceTableIndex].foreignKeys.push({
                    column: sourceColumn,
                    referenceTable: targetTable,
                    referenceColumn: targetColumn,
                    relationType: "one-to-many",
                });
            } else {
                
                tables[targetTableIndex].foreignKeys.push({
                    column: targetColumn,
                    referenceTable: sourceTable,
                    referenceColumn: sourceColumn,
                    relationType: "one-to-many",
                });
            }
        }
    }

    return tables;
}

function parseTraditionalSql(sql: string): TableDefinition[] {
    const tables: TableDefinition[] = [];
    const enums: Record<string, string[]> = {};

    
    const enumPattern =
        /CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(\s*((?:'[^']*'(?:\s*,\s*'[^']*')*)\s*)\)/gi;
    let enumMatch;

    while ((enumMatch = enumPattern.exec(sql)) !== null) {
        const enumName = enumMatch[1];
        const enumValuesStr = enumMatch[2];

        
        const enumValues = enumValuesStr
            .split(",")
            .map((v) => v.trim().replace(/^'|'$/g, ""))
            .filter((v) => v.length > 0);

        enums[enumName] = enumValues;
    }

    
    const createTablePattern =
        /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)(?:\)[^)]*?;)/gi;
    let match;

    while ((match = createTablePattern.exec(sql)) !== null) {
        const tableName = match[1];
        const tableContent = match[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        
        const columnLines = tableContent.split(",");

        for (let line of columnLines) {
            line = line.trim();

            
            if (checkIsForeignKey(line)) {
                
                const fkPattern =
                    /(?:FOREIGN\s+KEY|FK)\s*\(\s*[`"]?(\w+)[`"]?\s*\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i;
                const fkMatch = line.match(fkPattern);

                if (fkMatch) {
                    foreignKeys.push({
                        column: fkMatch[1],
                        referenceTable: fkMatch[2],
                        referenceColumn: fkMatch[3],
                    });
                }
                continue;
            }

            
            const columnPattern =
                /[`"]?(\w+)[`"]?\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s*((?:NOT NULL|NN)?)?\s*((?:PRIMARY KEY|PK)?)?/i;
            const columnMatch = line.match(columnPattern);

            if (columnMatch) {
                const name = columnMatch[1];
                const type = columnMatch[2];
                const notNullFlag = columnMatch[3] || "";
                const pkFlag = columnMatch[4] || "";

                
                const isNullable = !checkIsNotNull(notNullFlag);
                const isPrimaryKey =
                    checkIsPrimaryKey(pkFlag) ||
                    name.toLowerCase().startsWith("pk_");

                
                const isEnum = Object.keys(enums).includes(type);

                columns.push({
                    name,
                    type,
                    isNullable,
                    isPrimaryKey,
                    isEnum,
                    enumValues: isEnum ? enums[type] : undefined,
                });
            }
        }

        tables.push({
            name: tableName,
            columns,
            foreignKeys,
        });
    }

    return tables;
}
