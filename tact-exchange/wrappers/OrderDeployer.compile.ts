import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/order_deployer.tact',
    options: {
        debug: true,
    },
};
