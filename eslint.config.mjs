// eslint.config.mjs
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
    // Base JavaScript configuration
    js.configs.recommended,

    // Global ignores
    {
        ignores: [
            '**/dist/**',
            '**/dist-client/**',
            '**/node_modules/**',
            '**/coverage/**',
            '**/*.min.js',
            '**/*.d.ts',
            '**/build/**',
            '**/.git/**',
            '**/tmp/**',
        ],
    },

    // TypeScript configuration for all TS files
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                google: 'readonly',
                centerLat: 'writable',
                centerLng: 'writable',
                ...globals.es2022,
                ...globals.node,
            },
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            prettier,
        },
        rules: {
            // TypeScript-ESLint recommended rules (without type-checking)
            ...tsPlugin.configs['recommended'].rules,

            // Prettier integration
            'prettier/prettier': 'error',

            // TypeScript specific rules
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // Disable base rules that are extended by TypeScript rules
            'no-unused-vars': 'off',
            'no-use-before-define': 'off',
            'no-shadow': 'off',
            'no-redeclare': 'off',

            // General ESLint rules
            'no-console': [
                'warn',
                {
                    allow: ['warn', 'error', 'info'],
                },
            ],
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
            'prefer-arrow-callback': 'error',
            'no-param-reassign': ['error', { props: false }],
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
        },
    },

    // JavaScript configuration files
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            prettier,
        },
        rules: {
            'prettier/prettier': 'error',
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
            'prefer-arrow-callback': 'error',
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
        },
    },

    // Client-side TypeScript files
    {
        files: ['src/client/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        rules: {
            'no-console': 'error',
        },
    },

    // Server-side TypeScript files
    {
        files: ['src/server/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2022,
                NodeJS: 'readonly',
            },
        },
    },

    // Test files
    {
        files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },

    // Apply Prettier config last to override conflicting rules
    prettierConfig,
];
