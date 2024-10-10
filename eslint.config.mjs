import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    rules: {
      "no-undef": 0,
      "no-unused-vars": 1,
    },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
];
