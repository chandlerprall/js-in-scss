import {Location} from "gonzales-pe";

declare module "gonzales-pe" {
    interface Location {
        line: number;
        column: number;
    }

    export class Node {
        type: string;
        content: string | any[];
        syntax: 'scss';
        start: Location;
        end: Location;
    }

    class StylesheetNode extends Node {
        type: 'stylesheet';
        content: Array<RulesetNode | DeclarationNode>;
    }

    class RulesetNode extends Node {
        type: 'ruleset';
        content: [SelectorNode, BlockNode];
    }

    class SelectorNode extends Node {
        type: 'selector';
        content: Array<ClassNode | TypeSelectorNode>;
    }

    class BlockNode extends Node {
        type: 'block';
        content: Array<DeclarationNode | RulesetNode>;
    }

    class ClassNode extends Node {
        type: 'class';
        content: [IdentNode];
    }

    class TypeSelectorNode extends Node {
        type: 'typeSelector';
        content: IdentNode[];
    }

    class IdentNode extends Node {
        type: 'ident';
        content: string;
    }

    class DeclarationNode extends Node {
        type: 'declaration';
        content: [PropertyNode, ValueNode];
    }

    class PropertyNode extends Node {
        type: 'property';
        content: [IdentNode | VariableNode];
    }

    class ValueNode extends Node {
        type: 'value';
        content: [IdentNode | DimensionNode | VariableNode];
    }

    class DimensionNode extends Node {
        type: 'dimension';
        content: [NumberNode, IdentNode];
    }

    class NumberNode extends Node {
        type: 'number';
        content: string;
    }

    class VariableNode extends Node {
        type: 'variable';
        content: [IdentNode | DimensionNode];
    }

    export namespace Nodes {
        type Stylesheet = StylesheetNode;
        type Ruleset = RulesetNode;
        type Selector = SelectorNode;
        type Block = BlockNode;
        type TypeSelector = TypeSelectorNode;
        type Class = ClassNode;
        type Ident = IdentNode;
        type Declaration = DeclarationNode;
        type Property = PropertyNode;
        type Value = ValueNode;
        type Dimension = DimensionNode;
        type Number = NumberNode;
        type Variable = VariableNode;
    }

    interface ParseOptions {
        syntax: 'css' | 'less' | 'sass' | 'scss';
    }

    export function parse(source: string, options: ParseOptions): StylesheetNode
}