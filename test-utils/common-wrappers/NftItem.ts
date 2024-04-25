import {
  Address,
  beginCell,
  Builder,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  StateInit,
} from '@ton/core';

export type NftItemConfig = {
  itemIndex: number;
  collectionAddress: Address;
  ownerAddress?: Address;
  content?: Cell;
};

export class NftItem implements Contract {
  static readonly code = Cell.fromBase64(
    'te6ccgECDQEAAdAAART/APSkE/S88sgLAQIBYgIDAgLOBAUACaEfn+AFAgEgBgcCASALDALXDIhxwCSXwPg0NMDAXGwkl8D4PpA+kAx+gAxcdch+gAx+gAw8AIEs44UMGwiNFIyxwXy4ZUB+kDUMBAj8APgBtMf0z+CEF/MPRRSMLqOhzIQN14yQBPgMDQ0NTWCEC/LJqISuuMCXwSED/LwgCAkAET6RDBwuvLhTYAH2UTXHBfLhkfpAIfAB+kDSADH6AIIK+vCAG6EhlFMVoKHeItcLAcMAIJIGoZE24iDC//LhkiGOPoIQBRONkchQCc8WUAvPFnEkSRRURqBwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7ABBHlBAqN1viCgBycIIQi3cXNQXIy/9QBM8WECSAQHCAEMjLBVAHzxZQBfoCFctqEssfyz8ibrOUWM8XAZEy4gHJAfsAAIICjjUm8AGCENUydtsQN0QAbXFwgBDIywVQB88WUAX6AhXLahLLH8s/Im6zlFjPFwGRMuIByQH7AJMwMjTiVQLwAwA7O1E0NM/+kAg10nCAJp/AfpA1DAQJBAj4DBwWW1tgAB0A8jLP1jPFgHPFszJ7VSA=',
  );

  static readonly OPCODES = {
    TRANSFER: 0x5fcc3d14,
  };

  constructor(
    readonly address: Address,
    readonly init?: StateInit,
  ) {
  }

  static createFromAddress(address: Address) {
    return new NftItem(address);
  }

  static createFromConfig(
    config: NftItemConfig,
    code: Cell = NftItem.code,
    workchain = 0,
  ) {
    const data = NftItem.configToCell(config);
    const init = { code, data };
    return new NftItem(contractAddress(workchain, init), init);
  }

  static configToCell(config: NftItemConfig): Cell {
    const builder = beginCell()
      .storeUint(config.itemIndex, 64)
      .storeAddress(config.collectionAddress);

    if (config.ownerAddress) {
      builder.storeAddress(config.ownerAddress);
    }
    if (config.content) {
      builder.storeRef(config.content);
    }

    return builder.endCell();
  }

  async sendDeploy(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      ownerAddress: Address;
      content: Cell;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeAddress(opts.ownerAddress)
        .storeRef(opts.content)
        .endCell(),
    });
  }

  async sendTransferOwnership(
    provider: ContractProvider,
    via: Sender,
    opts: {
      queryId: number;
      value: bigint;
      to: Address;
      responseTo?: Address;
      forwardAmount?: bigint;
      forwardBody?: Cell | Builder;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      body: beginCell()
        .storeUint(NftItem.OPCODES.TRANSFER, 32)
        .storeUint(opts.queryId, 64)
        .storeAddress(opts.to)
        .storeAddress(opts.responseTo)
        .storeMaybeRef(null)
        .storeCoins(opts.forwardAmount ?? 0)
        .storeMaybeRef(opts.forwardBody)
        .endCell(),
    });
  }

  async getNftData(provider: ContractProvider): Promise<{
    init: boolean;
    index: number;
    collectionAddress: Address | null;
    ownerAddress: Address | null;
    individualContent: Cell | null;
  }> {
    const { stack } = await provider.get('get_nft_data', []);

    return {
      init: stack.readBoolean(),
      index: stack.readNumber(),
      collectionAddress: stack.readAddressOpt(),
      ownerAddress: stack.readAddressOpt(),
      individualContent: stack.readCellOpt(),
    };
  }
}
