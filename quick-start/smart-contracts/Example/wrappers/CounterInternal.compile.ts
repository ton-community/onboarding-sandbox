import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/counter_internal.tact',
    options: {
        debug: true,
    },
};
