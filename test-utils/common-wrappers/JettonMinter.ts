import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  StateInit,
  TupleBuilder,
} from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';

export type JettonMinterConfig = {
  adminAddress: Address;
  content: Cell;
  jettonWalletCode: Cell;
};

export class JettonMinter implements Contract {
  static readonly code = Cell.fromBase64(
    'te6ccgECDQEAApwAART/APSkE/S88sgLAQIBYgIDAgLMBAUCA3pgCwwC8dkGOASS+B8ADoaYGAuNhJL4HwfSB9IBj9ABi465D9ABj9ABgBaY/pn/aiaH0AfSBqahhACqk4XUcZmpqbGyiaY4L5cCSBfSB9AGoYEGhAMGuQ/QAYEogaKCF4BQpQKBnkKAJ9ASxni2ZmZPaqcEEIPe7L7yk4XXGBQGBwCTtfBQiAbgqEAmqCgHkKAJ9ASxniwDni2ZkkWRlgIl6AHoAZYBkkHyAODpkZYFlA+X/5Og7wAxkZYKsZ4soAn0BCeW1iWZmZLj9gEBwDY3NwH6APpA+ChUEgZwVCATVBQDyFAE+gJYzxYBzxbMySLIywES9AD0AMsAyfkAcHTIywLKB8v/ydBQBscF8uBKoQNFRchQBPoCWM8WzMzJ7VQB+kAwINcLAcMAkVvjDQgBpoIQLHa5c1JwuuMCNTc3I8ADjhozUDXHBfLgSQP6QDBZyFAE+gJYzxbMzMntVOA1AsAEjhhRJMcF8uBJ1DBDAMhQBPoCWM8WzMzJ7VTgXwWED/LwCQA+ghDVMnbbcIAQyMsFUAPPFiL6AhLLassfyz/JgEL7AAH+Nl8DggiYloAVoBW88uBLAvpA0wAwlcghzxbJkW3ighDRc1QAcIAYyMsFUAXPFiT6AhTLahPLHxTLPyP6RDBwuo4z+ChEA3BUIBNUFAPIUAT6AljPFgHPFszJIsjLARL0APQAywDJ+QBwdMjLAsoHy//J0M8WlmwicAHLAeL0AAoACsmAQPsAAH2tvPaiaH0AfSBqahg2GPwUALgqEAmqCgHkKAJ9ASxniwDni2ZkkWRlgIl6AHoAZYBk/IA4OmRlgWUD5f/k6EAAH68W9qJofQB9IGpqGD+qkEA=',
  );

  static OPCODES = {
    MINT: 21,
    CHANGE_ADMIN: 3,
    CHANGE_CONTENT: 4,
    INTERNAL_TRANSFER: 0x178d4519,
  };

  static configToCell(config: JettonMinterConfig): Cell {
    return beginCell()
      .storeCoins(0)
      .storeAddress(config.adminAddress)
      .storeRef(config.content)
      .storeRef(config.jettonWalletCode)
      .endCell();
  }

  static createFromAddress(address: Address): JettonMinter {
    return new JettonMinter(address);
  }

  static createFromConfig(
    config: JettonMinterConfig,
    code: Cell = JettonMinter.code,
    workchain = 0,
  ) {
    const data = JettonMinter.configToCell(config);
    const init = { code, data };
    return new JettonMinter(contractAddress(workchain, init), init);
  }

  constructor(
    readonly address: Address,
    readonly init?: Maybe<StateInit>,
  ) {
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      excessesAddress: Address;
      jettonAmount: bigint;
      amount: bigint;
      queryId: number;
      value: bigint;
      fwdTonAmount?: bigint;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonMinter.OPCODES.MINT, 32)
        .storeUint(opts.queryId, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.amount)
        .storeRef(
          beginCell()
            .storeUint(JettonMinter.OPCODES.INTERNAL_TRANSFER, 32)
            .storeUint(opts.queryId, 64)
            .storeCoins(opts.jettonAmount)
            .storeAddress(null)
            .storeAddress(opts.excessesAddress)
            .storeCoins(opts.fwdTonAmount ?? 0)
            .storeMaybeRef(null)
            .endCell(),
        )
        .endCell(),
    });
  }

  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      newAdminAddress: Maybe<Address>;
      queryId: number;
      value: bigint;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonMinter.OPCODES.CHANGE_ADMIN, 32)
        .storeUint(opts.queryId, 64)
        .storeAddress(opts.newAdminAddress)
        .endCell(),
    });
  }

  async sendChangeContent(
    provider: ContractProvider,
    via: Sender,
    opts: {
      newContent: Cell;
      queryId: number;
      value: bigint;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonMinter.OPCODES.CHANGE_CONTENT, 32)
        .storeUint(opts.queryId, 64)
        .storeRef(opts.newContent)
        .endCell(),
    });
  }

  async getWalletAddress(
    provider: ContractProvider,
    ownerAddress: Address,
  ): Promise<Address> {
    const builder = new TupleBuilder();
    builder.writeAddress(ownerAddress);

    const { stack } = await provider.get('get_wallet_address', builder.build());

    return stack.readAddress();
  }

  async getWalletData(provider: ContractProvider): Promise<{
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
  }> {
    const { stack } = await provider.get('get_jetton_data', []);

    return {
      totalSupply: stack.readBigNumber(),
      mintable: stack.readBoolean(),
      adminAddress: stack.readAddress(),
      jettonContent: stack.readCell(),
      jettonWalletCode: stack.readCell(),
    };
  }
}
