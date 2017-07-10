"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("../src/typescript");
const functions = {
    hello: {
        handler: 'my-folder/hello.handler',
        package: {
            include: [],
            exclude: []
        }
    },
    world: {
        handler: 'my-folder/my-subfolder/world.handler',
        package: {
            include: [],
            exclude: []
        }
    },
    create: {
        handler: 'create.create',
        package: {
            include: [],
            exclude: []
        }
    },
};
describe('extractFileName', () => {
    it('get function filenames from serverless service', () => {
        expect(typescript_1.extractFileNames(functions)).toEqual([
            'my-folder/hello.ts',
            'my-folder/my-subfolder/world.ts',
            'create.ts',
        ]);
    });
});
//# sourceMappingURL=typescript.extractFileName.test.js.map