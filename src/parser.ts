import { Node, Nodes, parse } from 'gonzales-pe';
import * as babel from '@babel/core';
import template, { TemplateBuilder } from '@babel/template';

function getStringFromValueNode(node: Nodes.Value) {
    const [contentNode] = node.content;
    if (contentNode.type === 'ident') {
        return contentNode.content;
    } else if (contentNode.type === 'dimension') {
        return contentNode.content[0].content + contentNode.content[1].content
    } else {
        // Variable
        return getStringFromVariableNode(contentNode);
    }
}

function getStringFromVariableNode(node: Nodes.Variable) {
    const [contentNode] = node.content;
    const variableName = contentNode.type === 'ident' ? contentNode.content : contentNode.content[0].content + contentNode.content[1].content;
    return `$${variableName}`;
}

const Preparers: {[key: string]: (node: Node) => babel.types.BaseNode | babel.types.BaseNode[]} = {};

const buildRuleset: ReturnType<TemplateBuilder<babel.types.ExpressionStatement>> = <any> template(`
    (context) => {
        context.pushSelectors(%%selector%%);
        
        const rulelist = %%rulelist%%;
        if (Object.keys(rulelist).length > 0) {
            context.emitRulelist(rulelist);
        }
        context.popSelectors();
    }
`);
Preparers.ruleset = _node => {
    const node = <Nodes.Ruleset> _node;

    const [selector, block] = node.content;

    return buildRuleset({
        selector: prepareNode(selector),
        rulelist: prepareNode(block),
    }).expression;
};

// const buildSelector: ReturnType<TemplateBuilder<babel.types.ExpressionStatement>> = <any> template(`
//     (context) => {
//         return %%selectors%%;
//     }
// `);
Preparers.selector = _node => {
    const node = <Nodes.Selector> _node;
    // @ts-ignore-next-line
    return babel.types.arrayExpression(node.content.map(prepareNode));
    // return buildSelector({
    //     // @ts-ignore-next-line
    //     selectors: babel.types.arrayExpression(node.content.map(prepareNode))
    // }).expression;
}

Preparers.class = _node => {
    const node = <Nodes.Class> _node;
    const stringLiteral = <babel.types.StringLiteral> prepareNode(node.content[0]);
    stringLiteral.value = `.${stringLiteral.value}`;
    return stringLiteral;
}

Preparers.typeSelector = _node => {
    const node = <Nodes.TypeSelector> _node;
    const parts = node.content.map(ident => ident.content);
    return babel.types.stringLiteral(parts.join(''))
}

Preparers.ident = _node => {
    const node = <Nodes.Ident> _node;
    return babel.types.stringLiteral(node.content);
}

const buildBlock: ReturnType<TemplateBuilder<babel.types.ExpressionStatement>> = <any> template(`
    ((context) => {
        const subblocks = %%subblocks%%;
        for (let i = 0; i < subblocks.length; i++) {
            subblocks[i](context);
        }
        
        return %%localRules%%;
    })(context)
`);
Preparers.block = _node => {
    const node = <Nodes.Block> _node;
    const declarations = <Nodes.Declaration[]> node.content.filter(node => node.type === 'declaration');
    const rulesets = <Nodes.Ruleset[]> node.content.filter(node => node.type === 'ruleset');

    const localRules = babel.types.objectExpression(
        // @ts-ignore-next-line
        declarations.map(prepareNode)
    );

    if (rulesets.length > 0) {
        return buildBlock({
            localRules,
            // @ts-ignore-next-line
            subblocks: babel.types.arrayExpression(rulesets.map(prepareNode)),
        }).expression;
    } else {
        return localRules;
    }
}

Preparers.declaration = _node => {
    const node = <Nodes.Declaration> _node;
    const [property, value] = node.content;
    return babel.types.objectProperty(
        babel.types.stringLiteral(property.content.map(ident => ident.content).join('')),
        // @ts-ignore-next-line
        prepareNode(value)
    )
}

Preparers.value = _node => {
    const node = <Nodes.Value> _node;
    const value = getStringFromValueNode(node);
    return babel.types.stringLiteral(value)
}

function prepareNode(node: Node) {
    if (Preparers.hasOwnProperty(node.type)) {
        return Preparers[node.type](node);
    } else {
        throw new Error(`Could not process node of type "${node.type}"`);
    }
}

const extraNodes = new Set(['space', 'declarationDelimiter', 'propertyDelimiter']);
function removeExtraNodes<T extends Node>(node: T): T {
    if (Array.isArray(node.content)) {
        for (let i = 0; i < node.content.length; i++) {
            const item = node.content[i];
            if (item && typeof item.type === 'string') {
                if (extraNodes.has(item.type)) {
                    node.content = [...node.content.slice(0, i), ...node.content.slice(i+1)];
                    i--;
                } else {
                    removeExtraNodes(item);
                }
            }
        }
    }
    return node;
}

const buildSetVariables: ReturnType<TemplateBuilder<babel.types.ExpressionStatement>> = <any> template(`
    context => context.setVariables(%%variables%%);
`);
export function processScss(source: string, scopeClass: string): string {
    const ast = removeExtraNodes(parse(source, { syntax: 'scss' }));

    // find top-level variable declarations
    const variables: babel.types.ObjectProperty[] = [];
    for (let i = 0; i < ast.content.length; i++) {
        const item = ast.content[i];
        if (item.type === 'declaration') {
            ast.content = [...ast.content.slice(0, i), ...ast.content.slice(i+1)];
            i--;

            const [property, value] = item.content;
            const variableNode = <Nodes.Variable> property.content[0];
            const variableName = getStringFromVariableNode(variableNode);
            const valueString = getStringFromValueNode(value);

            variables.push(babel.types.objectProperty(
                babel.types.stringLiteral(variableName),
                babel.types.stringLiteral(valueString)
            ));
        }
    }

    // expands each RulesetNode into a callable function, each will take override variables, if present
    const parts: any[] = [
        buildSetVariables({ variables: babel.types.objectExpression(variables) }).expression
    ];

    for (let i = 0; i < ast.content.length; i++) {
        const node = ast.content[i];
        const nodeFn: babel.types.Expression = <any> prepareNode(node);
        parts.push(nodeFn);
        // parts.push(buildInvoker({ invokee: nodeFn }));
    }

    // @ts-ignore-next-line
    let code = babel.transformFromAstSync(babel.types.program([
        babel.types.expressionStatement(babel.types.arrayExpression(parts))
    ])).code;

    // strip the trailing semicolon
    code = code!.replace(/;$/, '');

    return code;
}