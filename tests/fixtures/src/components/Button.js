"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
var react_1 = __importDefault(require("react"));
/**
 * Primary UI component for user interaction
 */
var Button = function (_a) {
    var _b = _a.variant, variant = _b === void 0 ? 'primary' : _b, _c = _a.size, size = _c === void 0 ? 'medium' : _c, _d = _a.disabled, disabled = _d === void 0 ? false : _d, children = _a.children, onClick = _a.onClick;
    var baseStyle = "px-4 py-2 rounded font-semibold";
    var variantStyles = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
        tertiary: "bg-transparent text-blue-600 hover:text-blue-800",
    };
    var sizeStyles = {
        small: "text-sm",
        medium: "text-base",
        large: "text-lg px-6 py-3",
    };
    var disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";
    return (react_1.default.createElement("button", { type: "button", className: "".concat(baseStyle, " ").concat(variantStyles[variant], " ").concat(sizeStyles[size], " ").concat(disabledStyle), disabled: disabled, onClick: onClick }, children));
};
exports.Button = Button;
exports.default = exports.Button;
