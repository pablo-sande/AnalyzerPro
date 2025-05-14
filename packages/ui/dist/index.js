// src/components/Button.tsx
import { jsx } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx(
    "button",
    {
      className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`,
      ...props,
      children
    }
  );
};

// src/components/Card.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var Card = ({ children, className = "" }) => {
  return /* @__PURE__ */ jsx2("div", { className: `bg-white rounded-lg shadow-md p-6 ${className}`, children });
};

// src/components/Table.tsx
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var Table = ({ headers, rows, className = "" }) => {
  return /* @__PURE__ */ jsx3("div", { className: `overflow-x-auto ${className}`, children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
    /* @__PURE__ */ jsx3("thead", { className: "bg-gray-50", children: /* @__PURE__ */ jsx3("tr", { children: headers.map((header, index) => /* @__PURE__ */ jsx3(
      "th",
      {
        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        children: header
      },
      index
    )) }) }),
    /* @__PURE__ */ jsx3("tbody", { className: "bg-white divide-y divide-gray-200", children: rows.map((row, rowIndex) => /* @__PURE__ */ jsx3("tr", { children: row.map((cell, cellIndex) => /* @__PURE__ */ jsx3(
      "td",
      {
        className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
        children: cell
      },
      cellIndex
    )) }, rowIndex)) })
  ] }) });
};
export {
  Button,
  Card,
  Table
};
//# sourceMappingURL=index.js.map