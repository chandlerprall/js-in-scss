import { buildFs } from './hrx';
import { processScss, ScssJsRuntime } from '../src';
import { parse, Node } from 'gonzales-pe';
import glob from 'glob';
import path from 'path';

import { Script } from 'vm';

const originalCreateElement = document.createElement;

let _stylesheet: CSSStyleSheet = new CSSStyleSheet();
beforeEach(() => {
    document.createElement = jest.fn(tagname => {
        if (tagname !== 'style') {
            throw new Error(`Unexpected element creation: ${tagname}`);
        }
        _stylesheet = new CSSStyleSheet();
        const style = <HTMLStyleElement> originalCreateElement.call(document, 'style');
        Object.defineProperty(
            style,
            'sheet',
            {
                get() {
                    return _stylesheet;
                }
            }
        );
        return style;
    });
});

afterEach(() => {
    document.createElement = originalCreateElement;
});

const extraNodes = new Set(['space']);
function cleanNodes<T extends Node>(node: T): T {
    if (Array.isArray(node.content)) {
        for (let i = 0; i < node.content.length; i++) {
            const item = node.content[i];

            if (item && typeof item.type === 'string') {
                if (extraNodes.has(item.type)) {
                    node.content = [...node.content.slice(0, i), ...node.content.slice(i+1)];
                    i--;
                } else {
                    cleanNodes(item);
                }
            }
        }
    }

    // remove location information
    delete node.start;
    delete node.end;

    return node;
}
function getCleanCssAst(cssText: string) {
    const ast = parse(cssText, { syntax: 'css' });
    return cleanNodes(ast);
}

describe('scss spec', () => {
    const specFiles = glob.sync('*.hrx', { cwd: path.join(__dirname, 'scss-spec'), realpath: true });

    for (let i = 0; i < specFiles.length; i++) {
        const specPath = specFiles[i];
        const specName = path.basename(specPath);

        it(specName, () => {
            const fs = buildFs(specName);
            const source = fs.readFileSync('/input.scss').toString();
            const result = processScss(source, '');

            const container = new Script(`
            const input = ${result};
            const runtime = new ScssJsRuntime(input);
        `);
            container.runInNewContext({
                ScssJsRuntime,
                console: {
                    log(...args: any[]) {
                            console.log(...args)
                    }
                }
            });

            const specAst = getCleanCssAst(fs.readFileSync('/output.css').toString());
            const resultAst = getCleanCssAst(Array.prototype.map.call(_stylesheet.cssRules, rule => rule.cssText).join('\n'));

            expect(specAst).toEqual(resultAst);
        });
    }
});