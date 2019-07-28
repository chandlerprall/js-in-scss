type ScssPart = (context: ScssJsRuntime) => void;

type Selectors = string[];
type SelectorsCallable = (context: ScssJsRuntime) => Selectors;

type Rulelist = {[key: string]: string};
type RulelistCallable = (context: ScssJsRuntime) => Rulelist;

interface Variables {
    [key: string]: string;
}

export const runtimes: ScssJsRuntime[] = [];

export class ScssJsRuntime {
    selectors: Array<string[]> = [];
    styleElement = document.createElement('style');
    stylesheet: CSSStyleSheet;
    parts: ScssPart[] = [];
    originalVariables: Variables = {};
    variables: Variables = {};

    constructor(_parts: ScssPart[]) {
        document.head.appendChild(this.styleElement);
        this.stylesheet = <CSSStyleSheet> this.styleElement.sheet;

        const [setOriginalVariables, ...parts] = _parts;
        this.parts = parts;
        setOriginalVariables(this);
        this.originalVariables = this.variables;
        this.processBlocks();
        runtimes.push(this);
    }

    private processBlocks() {
        for (let i = 0; i < this.parts.length; i++) {
            this.processBlock(this.parts[i]);
        }
    }

    private clear() {
        while(this.stylesheet.cssRules.length > 0) {
            this.stylesheet.removeRule(0);
        }
    }

    renderWithVariables(variables: Variables) {
        this.setVariables({
            ...this.originalVariables,
            ...variables,
        });
        this.clear();
        this.processBlocks();
    }

    setVariables(variables: Variables) {
        this.variables = variables;
    }

    processBlock = (block: ScssPart) => {
        block(this);
    };

    pushSelectors = (selectors: SelectorsCallable | Selectors) => {
        if (typeof selectors === 'function') {

        } else {
            this.selectors.push(selectors);
        }
    }

    popSelectors = () => {
        this.selectors.pop();
    }

    emitRulelist = (rulelist: RulelistCallable | Rulelist) => {
        if (typeof rulelist === 'function') {

        } else {
            const selectors = this.buildSelectors();

            const rules = [];
            const keys = Object.keys(rulelist);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                let value = rulelist[key];

                if (value[0] === '$') {
                   value = this.getValueForVariable(value);
                }
                rules.push(`${key}: ${value}`);
            }

            for (let i = 0; i < selectors.length; i++) {
                this.stylesheet.insertRule(`${selectors[i]} { ${rules.join(';')} }`);
            }
        }
    }

    private getValueForVariable(variableName: string) {
        if (this.variables.hasOwnProperty(variableName)) {
            return this.variables[variableName];
        } else {
            throw new Error(`Unknown variable ${variableName}`);
        }
    }

    private buildSelectors() {
        let selectors = [];

        // start building the selectors
        const selectorGroup = this.selectors[this.selectors.length - 1];
        for (let i = 0; i < selectorGroup.length; i++) {
            selectors.push(selectorGroup[i]);
        }

        for (let i = this.selectors.length - 2; i >= 0; i--) {
            // expand & prepend this group of selectors to the existing selectors
            const expandedSelectors = [];

            const group = this.selectors[i];
            for (let j = 0; j < group.length; j++) {
                for (let k = 0; k < selectors.length; k++) {
                    expandedSelectors.push(`${group[j]} ${selectors[k]}`);
                }
            }

            selectors = expandedSelectors;
        }

        return selectors;
    }
}