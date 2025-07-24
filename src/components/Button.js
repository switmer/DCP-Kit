"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
var react_1 = __importDefault(require("react"));
/**
 * A simple button component
 */
var Button = function (_a) {
    var _b = _a.variant, variant = _b === void 0 ? 'primary' : _b, children = _a.children, onClick = _a.onClick;
    return (react_1.default.createElement("button", { className: "button button--".concat(variant), onClick: onClick }, children));
};
exports.Button = Button;
