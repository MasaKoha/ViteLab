import tseslint from 'typescript-eslint';

/**
 * ワークスペース全体で共有する ESLint(flat config) 設定。
 * typescript-eslint の recommended ルールセットをベースにする。
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
