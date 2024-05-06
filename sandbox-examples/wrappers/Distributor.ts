import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode
} from '@ton/core';

import crc32 from 'crc-32';

export type DistributorConfig = {
    owner: Address;
    shares: Dictionary<Address, number>;
};

export function distributorConfigToCell(config: DistributorConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeDict(config.shares)
        .endCell();
}

export const Opcode = {
    addUser: crc32.str('op::add_user'),
    shareCoins: crc32.str('op::share_coins')
};

export const ExitCode = {
    MUST_BE_OWNER: 1201,
    SHARES_SIZE_EXCEEDED_LIMIT: 1203
};

export class Distributor implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Distributor(address);
    }

    static createFromConfig(config: DistributorConfig, code: Cell, workchain = 0) {
        const data = distributorConfigToCell(config);
        const init = { code, data };
        return new Distributor(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell()
        });
    }

    async sendAddUser(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId?: number;
            userAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeInt(Opcode.addUser, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.userAddress)
                .endCell()
        });
    }

    async sendShareCoins(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeInt(Opcode.shareCoins, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .endCell()
        });
    }

    async getOwner(provider: ContractProvider) {
        const result = await provider.get('get_owner', []);
        return result.stack.readAddress();
    }

    async getShares(provider: ContractProvider) {
        const result = await provider.get('get_shares', []);
        const cell = result.stack.readCellOpt();
        return Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Uint(1), cell);
    }
}
