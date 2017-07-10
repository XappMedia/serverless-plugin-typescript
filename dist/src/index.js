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
const path = require("path");
const fs = require("fs-p");
const _ = require("lodash");
const globby = require("globby");
const typescript = require("./typescript");
// Folders
const serverlessFolder = '.serverless';
const buildFolder = '.build';
class ServerlessPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.hooks = {
            'before:offline:start:init': this.beforeCreateDeploymentArtifacts.bind(this),
            'before:package:createDeploymentArtifacts': this.beforeCreateDeploymentArtifacts.bind(this, 'service'),
            'after:package:createDeploymentArtifacts': this.afterCreateDeploymentArtifacts.bind(this, 'service'),
            'before:deploy:function:packageFunction': this.beforeCreateDeploymentArtifacts.bind(this, 'function'),
            'after:deploy:function:packageFunction': this.afterCreateDeploymentArtifacts.bind(this, 'function'),
            'before:invoke:local:invoke': this.beforeCreateDeploymentArtifacts.bind(this),
            'after:invoke:local:invoke': this.cleanup.bind(this),
        };
        this.commands = {
            ts: {
                commands: {
                    invoke: {
                        usage: 'Run a function locally from the tsc output bundle',
                        lifecycleEvents: [
                            'invoke',
                        ],
                        options: {
                            function: {
                                usage: 'Name of the function',
                                shortcut: 'f',
                                required: true,
                            },
                            path: {
                                usage: 'Path to JSON file holding input data',
                                shortcut: 'p',
                            },
                        },
                    },
                },
            },
        };
    }
    beforeCreateDeploymentArtifacts(type) {
        return __awaiter(this, void 0, void 0, function* () {
            this.serverless.cli.log('Compiling with Typescript...');
            // Save original service path and functions
            this.originalServicePath = this.serverless.config.servicePath;
            this.originalFunctions = type === 'function'
                ? _.pick(this.serverless.service.functions, [this.options.function])
                : this.serverless.service.functions;
            // Fake service path so that serverless will know what to zip
            this.serverless.config.servicePath = path.join(this.originalServicePath, buildFolder);
            const tsFileNames = typescript.extractFileNames(this.originalFunctions).map((func) => {
                // the handler syntax can be "currentFolder/subfolder/subfolder/subfolder/.../filename.ts" so we need to remove the first instance of "currentFolder".
                // This assumes that the serverless.yml is in the root directory of the service.
                const firstInstanceOfSlash = func.indexOf('/');
                const subFunc = func.substr(firstInstanceOfSlash);
                return this.originalServicePath + subFunc;
            });
            const tsconfig = typescript.getTypescriptConfig(this.originalServicePath);
            for (const fnName in this.originalFunctions) {
                const fn = this.originalFunctions[fnName];
                fn.package = fn.package || {
                    exclude: [],
                    include: [],
                };
                fn.package.exclude = _.uniq([...fn.package.exclude, 'node_modules/serverless-plugin-typescript']);
            }
            tsconfig.outDir = buildFolder;
            yield typescript.run(tsFileNames, tsconfig);
            // include node_modules into build
            if (!fs.existsSync(path.resolve(path.join(buildFolder, 'node_modules')))) {
                fs.symlinkSync(path.resolve('node_modules'), path.resolve(path.join(buildFolder, 'node_modules')));
            }
            // include package.json into build so Serverless can exlcude devDeps during packaging
            if (!fs.existsSync(path.resolve(path.join(buildFolder, 'package.json')))) {
                fs.symlinkSync(path.resolve('package.json'), path.resolve(path.join(buildFolder, 'package.json')));
            }
            // include any "extras" from the "include" section
            if (this.serverless.service.package.include && this.serverless.service.package.include.length > 0) {
                const files = yield globby(this.serverless.service.package.include);
                for (const filename of files) {
                    const destFileName = path.resolve(path.join(buildFolder, filename));
                    const dirname = path.dirname(destFileName);
                    if (!fs.existsSync(dirname)) {
                        fs.mkdirpSync(dirname);
                    }
                    if (!fs.existsSync(destFileName)) {
                        fs.copySync(path.resolve(filename), path.resolve(path.join(buildFolder, filename)));
                    }
                }
            }
        });
    }
    afterCreateDeploymentArtifacts(type) {
        return __awaiter(this, void 0, void 0, function* () {
            // Copy .build to .serverless
            yield fs.copy(path.join(this.originalServicePath, buildFolder, serverlessFolder), path.join(this.originalServicePath, serverlessFolder));
            const basename = type === 'function'
                ? path.basename(this.originalFunctions[this.options.function].artifact)
                : path.basename(this.serverless.service.package.artifact);
            this.serverless.service.package.artifact = path.join(this.originalServicePath, serverlessFolder, basename);
            // Cleanup after everything is copied
            yield this.cleanup();
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            // Restore service path
            this.serverless.config.servicePath = this.originalServicePath;
            // Remove temp build folder
            fs.removeSync(path.join(this.originalServicePath, buildFolder));
        });
    }
}
module.exports = ServerlessPlugin;
//# sourceMappingURL=index.js.map