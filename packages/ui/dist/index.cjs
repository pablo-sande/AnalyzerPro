"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Button: () => Button,
  Card: () => Card,
  Table: () => Table
});
module.exports = __toCommonJS(index_exports);

// src/components/Button.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const baseStyles = "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500"
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`,
      ...props,
      children
    }
  );
};

// src/components/Card.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var Card = ({ children, className = "" }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `bg-white rounded-lg shadow-md p-6 ${className}`, children });
};

// src/components/Table.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var Table = ({ headers, rows, className = "" }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: `overflow-x-auto ${className}`, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { className: "min-w-full divide-y divide-gray-200", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { className: "bg-gray-50", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tr", { children: headers.map((header, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "th",
      {
        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        children: header
      },
      index
    )) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tbody", { className: "bg-white divide-y divide-gray-200", children: rows.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tr", { children: row.map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "td",
      {
        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
        children: cell
      },
      cellIndex
    )) }, rowIndex)) })
  ] }) });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Button,
  Card,
  Table
});
//# sourceMappingURL=index.cjs.map