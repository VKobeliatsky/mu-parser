import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

export default tseslint.config(
  {
    ignores: ["dist/**/*"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
);
