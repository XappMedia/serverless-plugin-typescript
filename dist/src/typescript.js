"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs = require("fs-p");
const _ = require("lodash");
const path = require("path");
function makeDefaultTypescriptConfig() {
    const defaultTypescriptConfig = {
        preserveConstEnums: true,
        strictNullChecks: true,
        sourceMap: true,
        target: ts.ScriptTarget.ES5,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        lib: ['lib.es2015.d.ts'],
        rootDir: './',
    };
    return defaultTypescriptConfig;
}
exports.makeDefaultTypescriptConfig = makeDefaultTypescriptConfig;
function extractFileNames(functions) {
    return _.values(functions)
        .map(fn => fn.handler)
        .map(h => {
        const fnName = _.last(h.split('.'));
        const fnNameLastAppearanceIndex = h.lastIndexOf(fnName);
        // replace only last instance to allow the same name for file and handler
        return h.substring(0, fnNameLastAppearanceIndex) + 'ts';
    });
}
exports.extractFileNames = extractFileNames;
function run(fileNames, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const program = ts.createProgram(fileNames, options);
        const emitResult = program.emit();
        const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        allDiagnostics.forEach(diagnostic => {
            if (!diagnostic.file) {
                console.log(diagnostic);
            }
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        });
        if (emitResult.emitSkipped) {
            throw new Error('Typescript compilation failed');
        }
        return fileNames.map(f => f.replace(/\.ts$/, '.js'));
    });
}
exports.run = run;
function getTypescriptConfig(cwd) {
    const configFilePath = path.join(cwd, 'tsconfig.json');
    if (fs.existsSync(configFilePath)) {
        const configFileText = fs.readFileSync(configFilePath).toString();
        const result = ts.parseConfigFileTextToJson(configFilePath, configFileText);
        if (result.error) {
            throw new Error(JSON.stringify(result.error));
        }
        const configParseResult = ts.parseJsonConfigFileContent(result.config, ts.sys, path.dirname(configFilePath));
        if (configParseResult.errors.length > 0) {
            throw new Error(JSON.stringify(configParseResult.errors));
        }
        console.log(`Using local tsconfig.json`);
        return configParseResult.options;
    }
    return makeDefaultTypescriptConfig();
}
exports.getTypescriptConfig = getTypescriptConfig;
//# sourceMappingURL=typescript.js.map