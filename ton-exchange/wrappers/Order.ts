import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type OrderConfig = {
    status: number;
    base: number;
    quote: number;
    side: number;
    quantity: number;
    price: number;
    creatorAddress: Address;
    walletAddress: Address;
    orderId: number;
    orderCode: Cell;
};

export function orderConfigToCell(config: OrderConfig): Cell {
    return beginCell()
            .storeUint(config.status, 8)
            .storeUint(config.base, 32)
            .storeUint(config.quote, 32)
            .storeUint(config.side, 8)
            .storeUint(config.quantity, 64)
            .storeUint(config.price, 32)
            .storeAddress(config.creatorAddress)
            .storeAddress(config.walletAddress)
            .storeUint(config.orderId, 32)
            .storeRef(config.orderCode)
    .endCell();
}

export class Order implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromConfig(config: OrderConfig, code: Cell, workchain = 0) {
        const data = orderConfigToCell(config);
        const init = { code, data };
        return new Order(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}