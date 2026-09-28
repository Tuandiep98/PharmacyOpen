import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Mô phỏng phải thuần và tất định: cấm nguồn ngẫu nhiên/thời gian thực và API trình duyệt.
    files: ['packages/simulation/src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Dùng RNG có seed (rng.ts).' },
        { object: 'Date', property: 'now', message: 'Dùng đồng hồ mô phỏng (state.timeMs).' },
        { object: 'performance', property: 'now', message: 'Dùng đồng hồ mô phỏng (state.timeMs).' },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator', 'setTimeout', 'setInterval'],
      'no-restricted-syntax': ['error', { selector: "NewExpression[callee.name='Date']", message: 'Dùng đồng hồ mô phỏng.' }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/web/public/sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
);
