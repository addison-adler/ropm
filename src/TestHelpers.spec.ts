import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { createSandbox } from 'sinon';
import { expect } from 'chai';
import { RopmModule } from './prefixer/RopmModule';

export const sinon = createSandbox();

export const tempDir = path.join(process.cwd(), '.tmp');

beforeEach(() => {
    fsExtra.ensureDirSync(tempDir)
    fsExtra.emptyDirSync(tempDir);
});

afterEach(() => {
    fsExtra.ensureDirSync(tempDir)
    fsExtra.emptyDirSync(tempDir);
    fsExtra.removeSync(tempDir);
    sinon.restore();
});

export function file(filePath: string, contents: string) {
    fsExtra.ensureDirSync(path.dirname(filePath));
    fsExtra.writeFileSync(filePath, contents);
}

export function mergePackageJson(dir: string, data: any) {
    let filePath = path.join(dir, 'package.json');
    let packageJson = JSON.parse(
        fsExtra.pathExistsSync(filePath) ? fsExtra.readFileSync(filePath).toString() : '{}'
    );
    packageJson = {
        ...packageJson,
        ...data,
        //deep merge dependencies
        dependencies: {
            ...(packageJson?.dependencies ?? {}),
            ...(data?.dependencies ?? {})
        }
    };
    fsExtra.ensureDirSync(dir);
    fsExtra.writeFileSync(filePath, JSON.stringify(packageJson));
}

export function fsEqual(path: string, expectedText: string) {
    expect(
        trimLeading(
            fsExtra.readFileSync(path).toString()
        )
    ).to.exist.and.to.equal(
        trimLeading(expectedText)
    );
}

export function trim(text: TemplateStringsArray, ...args) {
    return trimLeading(text[0]);
}

/**
 * Helper function to scaffold a project with nested dependencies
 */
export function createProjects(hostDir: string, moduleDir: string, node: DepGraphNode, result = [] as RopmModule[]) {
    //write the package.json for this node
    const packageJson = {
        name: node.name,
        version: node.version ?? '1.0.0',
        keywords: ['ropm'],
        dependencies: {}
    };
    for (const dependency of node?.dependencies ?? []) {
        const alias = dependency.alias ?? dependency.name;
        packageJson.dependencies[alias] = '';
        createProjects(hostDir, path.join(moduleDir, 'node_modules', alias), dependency, result);
    }
    mergePackageJson(moduleDir, packageJson);
    if (hostDir !== moduleDir) {
        result.push(
            new RopmModule(hostDir, moduleDir)
        );
    }
    return result;
}

export interface DepGraphNode {
    alias?: string;
    name: string;
    version?: string;
    dependencies?: Array<DepGraphNode>;
};


/**
 * Trim leading whitespace for every line (to make test writing cleaner
 */
function trimLeading(text: string) {
    if (!text) {
        return text;
    }
    let lines = text.split(/\r?\n/);
    let minIndent = Number.MAX_SAFE_INTEGER;

    //skip leading empty lines
    while (lines[0]?.trim().length === 0) {
        lines.splice(0, 1);
    }

    for (let line of lines) {
        let trimmedLine = line.trimLeft();
        //skip empty lines
        if (trimmedLine.length === 0) {
            continue;
        }
        let leadingSpaceCount = line.length - trimmedLine.length;
        if (leadingSpaceCount < minIndent) {
            minIndent = leadingSpaceCount;
        }
    }

    //apply the trim to each line
    for (let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].substring(minIndent);
    }
    return lines.join('\n');
}

