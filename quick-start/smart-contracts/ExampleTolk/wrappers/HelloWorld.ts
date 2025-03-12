import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { sign } from '@ton/crypto'

export type HelloWorldConfig = {
    id: number;
    seqno: number;
    publicKey: Buffer;
};
export function helloWorldConfigToCell(config: HelloWorldConfig): Cell {
    return beginCell()
        .storeUint(config.id, 32)
        .storeUint(config.seqno, 32)
        .storeBuffer(config.publicKey)
    .endCell();
}

export const Opcodes = {
    OP_INCREASE: 0x7e8764ef,
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
                .storeUint(Opcodes.OP_INCREASE, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async sendExternal(
        provider: ContractProvider,
        opts: {
            mode: number
            message: Cell,
            secret_key: Buffer
        }
    ) {
        const seqno = await this.getCounter(provider)
        const id = await this.getID(provider) 
    
        const toSign = beginCell()
            .storeUint(id, 32)
            .storeUint(seqno, 32)
            .storeUint(opts.mode, 8)
            .storeRef(opts.message)
    
        const signature = sign(toSign.endCell().hash(), opts.secret_key)
    
        return await provider.external(beginCell()
            .storeBuffer(signature)
            .storeBuilder(toSign)
        .endCell()
        );
    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('currentCounter', []);
        return result.stack.readNumber();
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('initialId', []);
        return result.stack.readNumber();
    }

    async getSeqnoPKey(provider: ContractProvider) {
        const result = await provider.get('get_seqno_public_key', []);
        const seqno = result.stack.readNumber();
        const publicKeyBigInt = result.stack.readBigNumber();

        // Convert BigInt to Buffer (32 bytes)
        const publicKeyHex = publicKeyBigInt.toString(16).padStart(64, '0');

        const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');

        return [seqno, publicKeyBuffer]
    }
}
