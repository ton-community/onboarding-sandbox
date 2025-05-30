import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from '@ton/core';
import { sign } from '@ton/crypto'


export type HelloWorldConfig = {
    id: number;
    ctxCounter: number;
    ctxCounterExt: bigint;
};
export function helloWorldConfigToCell(config: HelloWorldConfig): Cell {
    return beginCell()
        .storeUint(config.id, 32)
        .storeUint(config.ctxCounter, 32)
        .storeUint(config.ctxCounterExt, 256)
    .endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
};

export class HelloWorld implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new HelloWorld(address);
    }

    static createFromConfig(config: HelloWorldConfig, code: Cell, workchain = 0) {
        const data = helloWorldConfigToCell(config);
        const init = { code, data };
        return new HelloWorld(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async sendExternalIncrease(
        provider: ContractProvider,
        opts: {
            increaseBy: number;
            value: bigint;
            addr: Address;
            queryID?: number;
        }
    ) {
        const message = beginCell()
            .storeUint(opts.queryID ?? 0, 64)
            .storeAddress(opts.addr)
            .storeCoins(opts.value)
            .storeUint(opts.increaseBy, 32)
        .endCell()

        return await provider.external(message);
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
    }

    async getCounters(provider: ContractProvider) : Promise<[number, bigint]> {
        const result = await provider.get('get_counters', []);
        const ctxCounter = result.stack.readNumber();
        const ctxCounterExt = result.stack.readBigNumber();

        return [ctxCounter, ctxCounterExt]
    }
}
