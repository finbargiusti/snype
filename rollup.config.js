import typescript from 'rollup-plugin-typescript2';

export default {
    input: './client/src/ts/index.ts',
    plugins: [
        typescript({
            abortOnError: false
        })
    ],
    output: {
        format: 'iife',
        file: './client/js/bundle.js',
        name: '', // Empty string here to create an unnamed IIFE
    }
}