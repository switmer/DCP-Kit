"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var ajv_1 = __importDefault(require("ajv"));
var fast_json_patch_1 = require("fast-json-patch");
var commander_1 = require("commander");
var ajv = new ajv_1.default({ allErrors: true });
function readJSON(filePath) {
    return JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
}
function writeJSON(filePath, data) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
function validateWithSchema(data, schemaPath) {
    var schema = readJSON(schemaPath);
    var validate = ajv.compile(schema);
    if (!validate(data)) {
        throw new Error('Schema validation failed: ' + ajv.errorsText(validate.errors));
    }
}
var program = new commander_1.Command();
program
    .argument('<ir>', 'Input IR JSON file')
    .argument('<patch>', 'JSON Patch file')
    .argument('<output>', 'Output mutated IR file')
    .option('--undo <undo>', 'Write undo patch to this file')
    .option('--schema <schema>', 'Path to schema for validation', 'schemas/manifest.schema.json')
    .action(function (ir, patch, output, options) {
    var irData = readJSON(ir);
    var patchData = readJSON(patch);
    var original = JSON.parse(JSON.stringify(irData));
    var mutated = (0, fast_json_patch_1.applyPatch)(irData, patchData, true, false).newDocument;
    // Validate mutated IR
    validateWithSchema(mutated, options.schema);
    // Write mutated IR
    writeJSON(output, mutated);
    console.log("\u2705 Mutated IR written to ".concat(output));
    // Optionally write undo patch
    if (options.undo) {
        var undoPatch = (0, fast_json_patch_1.compare)(mutated, original);
        writeJSON(options.undo, undoPatch);
        console.log("\u21A9\uFE0F  Undo patch written to ".concat(options.undo));
    }
});
program.parse(process.argv);
