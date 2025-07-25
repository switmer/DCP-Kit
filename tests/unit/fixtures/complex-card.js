"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexCard = void 0;
var react_1 = __importDefault(require("react"));
var ComplexCard = function (_a) {
    var _b = _a.variant, variant = _b === void 0 ? 'default' : _b, _c = _a.size, size = _c === void 0 ? 'md' : _c, _d = _a.interactive, interactive = _d === void 0 ? false : _d, _e = _a.className, className = _e === void 0 ? '' : _e, children = _a.children, header = _a.header, footer = _a.footer, actions = _a.actions, _f = _a.loading, loading = _f === void 0 ? false : _f, _g = _a.disabled, disabled = _g === void 0 ? false : _g, onClick = _a.onClick, testId = _a["data-testid"], props = __rest(_a, ["variant", "size", "interactive", "className", "children", "header", "footer", "actions", "loading", "disabled", "onClick", 'data-testid']);
    var baseClasses = 'card';
    var variantClasses = {
        default: 'card--default',
        outlined: 'card--outlined',
        filled: 'card--filled',
        elevated: 'card--elevated'
    };
    var sizeClasses = {
        sm: 'card--sm',
        md: 'card--md',
        lg: 'card--lg',
        xl: 'card--xl'
    };
    var combinedClassName = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        interactive && 'card--interactive',
        loading && 'card--loading',
        disabled && 'card--disabled',
        className
    ].filter(Boolean).join(' ');
    return (react_1.default.createElement("div", __assign({ className: combinedClassName, onClick: interactive && !disabled ? onClick : undefined, "data-testid": testId }, props),
        header && (react_1.default.createElement("div", { className: "card__header" }, header)),
        react_1.default.createElement("div", { className: "card__content" }, loading ? (react_1.default.createElement("div", { className: "card__loading" }, "Loading...")) : (children)),
        actions && actions.length > 0 && (react_1.default.createElement("div", { className: "card__actions" }, actions.map(function (action, index) { return (react_1.default.createElement("button", { key: index, className: "btn btn--".concat(action.variant || 'secondary'), onClick: action.onClick, disabled: disabled }, action.label)); }))),
        footer && (react_1.default.createElement("div", { className: "card__footer" }, footer))));
};
exports.ComplexCard = ComplexCard;
exports.default = exports.ComplexCard;
