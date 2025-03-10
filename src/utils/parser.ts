/* eslint-disable @typescript-eslint/no-unused-vars */
import * as ohm from "ohm-js";
import grammarText from "../sml.ohm?raw";
import { AttributeDefinition, TableDefinition } from "../types/schema";

const grammar = ohm.grammar(grammarText);
const refList: string[][] = [];
let enums: Record<string, string[]> = {};
let lastSeenName = "";

const semantics = grammar.createSemantics().addOperation("eval", {
    _iter(...children) {
        const ruleName = this.child(0)?.ctorName;
        if (children.length === 0) return null;
        if (ruleName === "NoteProp") return children[0].eval();
        if (ruleName === "Property") {
            const propList = children.map(c => c.eval());
            return propList.reduce((acc, obj) => ({ ...acc, ...obj }), {});
        }
        return children.map(c => c.eval());
    },

    Schema: (definitions) => definitions.children.map((def) => def.eval()).filter((def) => def !== null),
    Definition: (def) => def.eval(),
    Table: (_table, name, _as, alias, _open, atts1, note, _newline, atts2, _close): TableDefinition => {
        lastSeenName = name.sourceString;
        const attributes: AttributeDefinition[] = [];
        if (atts1.numChildren > 0) attributes.push(...atts1.eval());
        if (atts2.numChildren > 0) attributes.push(...atts2.eval());
        
        return {
            name: name.sourceString,
            alias: alias.child(0)?.sourceString || undefined,
            note: note.eval() || undefined,
            attributes,
        };
    },
    Enum: (_enum, name, _open, values, _newline, _close): null => {
        const enumValues = values.children.map((val) => val.sourceString);
        enums[name.sourceString] = enumValues;
        return null;
    },
    Relation: (_ref, name, _colon, ref1, arrow, ref2, _newline): null => {
        const refName = name.numChildren > 0 ? name.sourceString : "";
        if (arrow.sourceString === "<") refList.push([refName, ref1.sourceString, ref2.sourceString]);
        else refList.push([refName, ref2.sourceString, ref1.sourceString]);
        return null;
    },
    Attribute: (name, type, _open, props, _delimeter, _close, _newline): AttributeDefinition => {
        const propMap = props.numChildren > 0 ? props.eval()[0] : {};
        if ("RefProp" in propMap) {
            const [arrow, ref] = propMap["RefProp"];
            if (arrow === "<") refList.push(["", `${lastSeenName}.${name.sourceString}`, ref]);
            else refList.push(["", ref, `${lastSeenName}.${name.sourceString}`]);
        }
        
        return {
            name: name.sourceString,
            type: type.sourceString,
            note: propMap.note,

            isPrimaryKey: "pk" in propMap,
            isNullable: !("nn" in propMap),
        };
    },
    Property: (prop): Record<string, number | string | string[]> => {
        if (prop.numChildren === 1) return { [prop.sourceString]: 1 };
        return { [prop.ctorName]: prop.eval() };
    },
    NoteProp: (_prop, _colon, _quote1, value, _quote2): string => value.sourceString,
    RefProp: (_prop, _colon, arrow, ref): string[] => [arrow.sourceString, ref.sourceString],
});

function parse(input: string) {
    refList.length = 0;
    enums = {};
    const match = grammar.match(input);
    if (match.succeeded()) {
        const tables = semantics(match).eval();
        refList.forEach((ref: string[]) => {
            const [name, ref1, ref2] = ref;
            const ref1Table = tables.find((t: TableDefinition) => t.name === ref1.split(".")[0]);
            const ref1Attribute: AttributeDefinition = ref1Table?.attributes.find((a: AttributeDefinition) => a.name === ref1.split(".")[1]);
            if (!ref1Attribute) return;
            ref1Attribute.foreignKey = ref2;
            if (name !== "") ref1Attribute.foreignKeyName = name;
        });

        tables.forEach((table: TableDefinition) => {
            table.attributes.forEach((attribute: AttributeDefinition) => {
                if (attribute.type in enums) attribute.enumValues = enums[attribute.type];
            });
        });

        return tables;
    } else return null;
}

export default parse;
