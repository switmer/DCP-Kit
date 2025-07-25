"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.withHOC = exports.NoPropsInterface = exports.ClassComponent = exports.ProblematicComponent = void 0;
var react_1 = __importDefault(require("react"));
// Arrow function component with destructuring
var ProblematicComponent = function (_a) {
    var id = _a.id, _b = _a.variant, variant = _b === void 0 ? 'a' : _b, onComplexEvent = _a.onComplexEvent, _c = _a.data, data = _c === void 0 ? {} : _c, _d = _a.computed, computed = _d === void 0 ? "computed-".concat(Date.now()) : _d, restProps = __rest(_a, ["id", "variant", "onComplexEvent", "data", "computed"]);
    // Complex logic that might confuse parsers
    var derivedValue = react_1.default.useMemo(function () {
        return Object.keys(data).length > 0 ? 'has-data' : 'no-data';
    }, [data]);
    return (react_1.default.createElement("div", __assign({ id: id, className: "problematic problematic--".concat(variant, " problematic--").concat(derivedValue) }, restProps),
        react_1.default.createElement("span", null, computed),
        data && Object.keys(data).map(function (key) { return (react_1.default.createElement("div", { key: key },
            key,
            ": ",
            String(data[key]))); })));
};
exports.ProblematicComponent = ProblematicComponent;
// Class component for testing different patterns
var ClassComponent = /** @class */ (function (_super) {
    __extends(ClassComponent, _super);
    function ClassComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ClassComponent.prototype.render = function () {
        var _a = this.props, title = _a.title, children = _a.children;
        return (react_1.default.createElement("div", { className: "class-component" },
            react_1.default.createElement("h1", null, title),
            children));
    };
    return ClassComponent;
}(react_1.default.Component));
exports.ClassComponent = ClassComponent;
// Component with no explicit props interface
var NoPropsInterface = function (props) {
    return react_1.default.createElement("div", __assign({}, props), "No explicit props");
};
exports.NoPropsInterface = NoPropsInterface;
// Higher-order component
var withHOC = function (Component) {
    return function (props) { return react_1.default.createElement(Component, __assign({}, props)); };
};
exports.withHOC = withHOC;
exports.default = exports.ProblematicComponent;
