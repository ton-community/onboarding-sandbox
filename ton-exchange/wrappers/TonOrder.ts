import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from '@ton/core';
import {Maybe} from '@ton/ton/dist/utils/maybe';

export type TonOrderConfig = {
  status: number;
  side: number;
  quantity: number;
  price: number;
  orderId: number;
  deployerAddress: Address;
  jettonMasterAddress?: Maybe<Address>;
  creatorAddress?: Maybe<Address>;
  orderCode: Cell;
  jettonWalletCode: Cell;
  expirationTime: number;
};

function tonOrderConfigToCell(config: TonOrderConfig): Cell {
  const addressesCell = beginCell()
    .storeAddress(config.deployerAddress)
    .storeAddress(config.jettonMasterAddress)
    .storeAddress(config.creatorAddress)
    .endCell();

  return beginCell()
    .storeUint(config.status, 3)
    .storeUint(config.side, 1)
    .storeCoins(config.quantity)
    .storeUint(config.price, 64)
    .storeUint(config.orderId, 32)
    .storeRef(addressesCell)
    .storeRef(config.orderCode)
    .storeRef(config.jettonWalletCode)
    .storeUint(config.expirationTime, 64)
    .endCell();
}

export class TonOrder implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: {code: Cell; data: Cell}
  ) {}

  static createFromAddress(address: Address) {
    return new TonOrder(address);
  }

  static createFromConfig(config: TonOrderConfig, code: Cell, workchain = 0) {
    const data = tonOrderConfigToCell(config);
    const init = {code, data};
    return new TonOrder(contractAddress(workchain, init), init);
  }

  async sendDeploy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    opts: {
      side: number;
      queryId: number;
      quantity: number;
      price: number;
      jettonMasterAddress: Address;
      creatorAddress: Address;
      expirationTime: number;
    }
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x26de17e3, 32)
        .storeUint(opts.queryId, 64)
        .storeUint(opts.side, 1)
        .storeCoins(opts.quantity)
        .storeUint(opts.price, 64)
        .storeAddress(opts.jettonMasterAddress)
        .storeAddress(opts.creatorAddress)
        .storeUint(opts.expirationTime, 64)
        .endCell(),
    });
  }

  async sendClose(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint | string;
      queryId: number;
    }
  ) {
    const body = beginCell()
      .storeUint(0x26de17e4, 32)
      .storeUint(opts.queryId, 64)
      .endCell();

    // console.log(body.toString());

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body,
    });
  }

  async getOrderData(provider: ContractProvider) {
    const {stack} = await provider.get('get_order_data', []);

    const status = stack.readNumber();
    const side = stack.readNumber();
    const quantity = stack.readNumber();
    const price = stack.readNumber();
    const orderId = stack.readNumber();
    const deployerAddress = stack.readAddressOpt();
    const creatorAddress = stack.readAddressOpt();
    const jettonMasterAddress = stack.readAddressOpt();
    const orderCode = stack.readCell();
    const jettonWalletCode = stack.readCell();
    const expirationTime = stack.readNumber();

    return {
      status,
      side,
      quantity,
      price,
      orderId,
      deployerAddress,
      jettonMasterAddress,
      creatorAddress,
      orderCode,
      jettonWalletCode,
      expirationTime,
    };
  }

  async getState(provider: ContractProvider) {
    return provider.getState();
  }
}
