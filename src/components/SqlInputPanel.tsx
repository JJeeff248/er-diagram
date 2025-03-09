// import { useState } from "react";

// Helper function to check for primary key notation in different formats
function checkIsPrimaryKey(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        lowerText.includes("primary key") ||
        lowerText.includes("pk") ||
        lowerText.includes("[pk]") ||
        lowerText === "pk"
    );
}

// Helper function to check for not null notation in different formats
function checkIsNotNull(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
        lowerText.includes("not null") ||
        lowerText.includes("nn") ||
        lowerText.includes("[nn]") ||
        lowerText === "nn"
    );
}

// Helper function to check for foreign key notation
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
    // Match both traditional SQL, simplified syntax, and DBML
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

    // Parse Enums first
    const enumPattern = /Enum\s+(\w+)\s*\{([^}]*)\}/gi;
    let enumMatch;

    while ((enumMatch = enumPattern.exec(sql)) !== null) {
        const enumName = enumMatch[1];
        const enumContent = enumMatch[2];

        // Split by lines and get enum values
        const enumValues = enumContent
            .split("\n")
            .map((line) => {
                // Clean up the line by removing quotes, commas and extra whitespace
                return line
                    .trim()
                    .replace(/['"]/g, "")
                    .replace(/,$/g, "")
                    .trim();
            })
            .filter((line) => line.length > 0);

        enums[enumName] = enumValues;
    }

    // Parse Tables
    const tablePattern = /Table\s+(\w+)\s*\{([^}]*)\}/gi;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(sql)) !== null) {
        const tableName = tableMatch[1];
        const tableContent = tableMatch[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        // Split by lines
        const lines = tableContent.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Basic column pattern: name type [options]
            const columnPattern =
                /(\w+)\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s*(?:\[(.*)\])?/;
            const columnMatch = line.match(columnPattern);

            if (columnMatch) {
                const colName = columnMatch[1];
                const colType = columnMatch[2];
                const options = columnMatch[3] || "";

                const isPrimaryKey = checkIsPrimaryKey(options);
                const isNullable = !checkIsNotNull(options);

                // Check if this is an enum type
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

    // Parse references
    const refPattern = /ref:\s*(\w+)\.(\w+)\s*([<\->])\s*(\w+)\.(\w+)/gi;
    let refMatch;

    while ((refMatch = refPattern.exec(sql)) !== null) {
        const sourceTable = refMatch[1];
        const sourceColumn = refMatch[2];
        const relationType = refMatch[3];
        const targetTable = refMatch[4];
        const targetColumn = refMatch[5];

        // Find the table to add the foreign key to
        const targetTableIndex = tables.findIndex(
            (t) => t.name === targetTable
        );

        if (targetTableIndex >= 0) {
            let relType: "one-to-one" | "one-to-many" | "many-to-many" =
                "one-to-one";

            if (relationType === "<") {
                relType = "one-to-many";
            } else if (relationType === ">") {
                // Swap source and target since the arrow points the other way
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

    // First, extract any enum declarations
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

    // Match the "Table Name {...}" pattern
    const tablePattern = /Table\s+(\w+)\s*\{([^}]*)\}/g;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(sql)) !== null) {
        const tableName = tableMatch[1];
        const tableContent = tableMatch[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        // Split by lines
        const lines = tableContent.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Check for column definitions
            // Format: name type [constraints]
            const columnMatch = line.match(
                /(\w+)\s+(\w+(?:\(\d+\))?)\s*(?:\[(.*)\])?/
            );
            if (columnMatch) {
                const name = columnMatch[1];
                const type = columnMatch[2];
                const constraints = columnMatch[3] || "";

                const isPrimaryKey = checkIsPrimaryKey(constraints);
                const isNullable = !checkIsNotNull(constraints);

                // Check if this is an enum type
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

            // Check for foreign key definitions with more flexible syntax
            // Also support "fk" shorthand
            const refPattern = /(?:ref:|fk:)?\s*(\w+)\s*([<>])\s*(\w+)\.(\w+)/i;
            const refMatch = line.match(refPattern);
            if (refMatch) {
                const column = refMatch[1];
                const direction = refMatch[2];
                const referenceTable = refMatch[3];
                const referenceColumn = refMatch[4];

                // If the direction is '>', it means this table references the other table
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

    // Check for references defined outside of tables with more flexible syntax
    const globalRefPattern =
        /(?:ref:|fk:)?\s*(\w+)\.(\w+)\s*([<>])\s*(\w+)\.(\w+)/gi;
    let globalRefMatch;

    while ((globalRefMatch = globalRefPattern.exec(sql)) !== null) {
        const sourceTable = globalRefMatch[1];
        const sourceColumn = globalRefMatch[2];
        const direction = globalRefMatch[3];
        const targetTable = globalRefMatch[4];
        const targetColumn = globalRefMatch[5];

        // Only process if both tables exist
        const sourceTableIndex = tables.findIndex(
            (t) => t.name === sourceTable
        );
        const targetTableIndex = tables.findIndex(
            (t) => t.name === targetTable
        );

        if (sourceTableIndex >= 0 && targetTableIndex >= 0) {
            if (direction === ">") {
                // Source references target
                tables[sourceTableIndex].foreignKeys.push({
                    column: sourceColumn,
                    referenceTable: targetTable,
                    referenceColumn: targetColumn,
                    relationType: "one-to-many",
                });
            } else {
                // Target references source
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

    // First extract CREATE TYPE or ENUM definitions
    const enumPattern =
        /CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(\s*((?:'[^']*'(?:\s*,\s*'[^']*')*)\s*)\)/gi;
    let enumMatch;

    while ((enumMatch = enumPattern.exec(sql)) !== null) {
        const enumName = enumMatch[1];
        const enumValuesStr = enumMatch[2];

        // Extract values by splitting on commas and cleaning up quotes
        const enumValues = enumValuesStr
            .split(",")
            .map((v) => v.trim().replace(/^'|'$/g, ""))
            .filter((v) => v.length > 0);

        enums[enumName] = enumValues;
    }

    // Split SQL by CREATE TABLE statements
    const createTablePattern =
        /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)(?:\)[^)]*?;)/gi;
    let match;

    while ((match = createTablePattern.exec(sql)) !== null) {
        const tableName = match[1];
        const tableContent = match[2];

        const columns: ColumnDefinition[] = [];
        const foreignKeys: ForeignKeyDefinition[] = [];

        // Parse columns
        const columnLines = tableContent.split(",");

        for (let line of columnLines) {
            line = line.trim();

            // Check for foreign key constraint with more flexibility
            if (checkIsForeignKey(line)) {
                // Support both traditional and shorthand foreign key syntax
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

            // Parse normal column with extended pattern for shortcuts
            const columnPattern =
                /[`"]?(\w+)[`"]?\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s*((?:NOT NULL|NN)?)?\s*((?:PRIMARY KEY|PK)?)?/i;
            const columnMatch = line.match(columnPattern);

            if (columnMatch) {
                const name = columnMatch[1];
                const type = columnMatch[2];
                const notNullFlag = columnMatch[3] || "";
                const pkFlag = columnMatch[4] || "";

                // Check for shortened notations
                const isNullable = !checkIsNotNull(notNullFlag);
                const isPrimaryKey =
                    checkIsPrimaryKey(pkFlag) ||
                    name.toLowerCase().startsWith("pk_");

                // Check if this is an enum type
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
