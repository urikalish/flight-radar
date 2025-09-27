import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/client/index.ts',
    output: {
        dir: 'dist-client',
        format: 'es',
        sourcemap: !production,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
    },
    plugins: [
        replace({
            preventAssignment: true,
            'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        }),
        nodeResolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.client.json',
            sourceMap: !production,
            inlineSources: !production,
        }),
        production &&
            terser({
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            }),
    ].filter(Boolean),
    watch: {
        clearScreen: false,
    },
};
