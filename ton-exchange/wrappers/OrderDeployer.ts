import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  TupleBuilder,
} from '@ton/core';

export type OrderDeployerConfig = {
  admin: Address;
  orderId: number;
  orderCode: Cell;
  jettonWalletCode: Cell;
  tonOrderCode: Cell;
};

export function orderDeployerConfigToCell(config: OrderDeployerConfig): Cell {
  return beginCell()
    .storeAddress(config.admin)
    .storeUint(config.orderId, 32)
    .storeRef(config.orderCode)
    .storeRef(config.jettonWalletCode)
    .storeRef(config.tonOrderCode)
    .endCell();
}

export class OrderDeployer implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: {code: Cell; data: Cell}
  ) {}

  static createFromAddress(address: Address) {
    return new OrderDeployer(address);
  }

  static createFromConfig(
    config: OrderDeployerConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = orderDeployerConfigToCell(config);
    const init = {code, data};
    return new OrderDeployer(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendCreateTonOrder(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryId: number;
      jettonMasterAddress: Address;
      tonAmount: bigint;
      price: number;
      expirationTime: number;
    }
  ) {

    const body = beginCell()
      .storeUint(0x26de17e2, 32)
      .storeUint(opts.queryId, 64)
      .storeAddress(opts.jettonMasterAddress)
      .storeCoins(opts.tonAmount)
      .storeUint(opts.price, 64)
      .storeUint(opts.expirationTime, 64)
    .endCell();

    // console.log(body.toString());

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body,
    });
  }

  async getOrderDeployerData(
    provider: ContractProvider
  ): Promise<OrderDeployerConfig> {
    const res = await provider.get('get_order_deployer_data', []);
    return {
      admin: res.stack.readAddress(),
      orderId: res.stack.readNumber(),
      orderCode: res.stack.readCell(),
      jettonWalletCode: res.stack.readCell(),
      tonOrderCode: res.stack.readCell(),
    };
  }

  async getOrderAddress(
    provider: ContractProvider,
    orderId: number,
    orderType: number
  ): Promise<{address: Address}> {
    const builder = new TupleBuilder();
    builder.writeNumber(orderId);
    builder.writeNumber(orderType);
    const res = await provider.get('get_order_address', builder.build());
    return {
      address: res.stack.readAddress(),
    };
  }
}
