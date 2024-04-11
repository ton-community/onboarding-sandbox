import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {beginCell, Cell, toNano} from '@ton/core';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';
import {JettonMinter} from '../wrappers/JettonMinter';
import {TonOrder} from '../wrappers/TonOrder';
import {OrderDeployer} from '../wrappers/OrderDeployer';

describe('OrderDeployer.TonOrder', () => {
  let orderDeployerCode;
  let orderCode: Cell;
  let tonOrderCode: Cell;
  let jettonWalletCode: Cell;
  let jettonMinterCode: Cell;

  let jettonMinter: SandboxContract<JettonMinter>;

  let blockchain: Blockchain;

  let deployer: SandboxContract<TreasuryContract>;
  let orderDeployer: SandboxContract<OrderDeployer>;
  let order: SandboxContract<TonOrder>;

  let seller: SandboxContract<TreasuryContract>;
  let buyer: SandboxContract<TreasuryContract>;

  let orderDeployerJettonWallet: SandboxContract<JettonWallet>;
  let sellerJettonWallet: SandboxContract<JettonWallet>;

  const jettonAmount = 10n;

  beforeAll(async () => {
    blockchain = await Blockchain.create();

    [
      orderDeployerCode,
      orderCode,
      tonOrderCode,
      jettonMinterCode,
      jettonWalletCode,
    ] = await Promise.all([
      compile('OrderDeployer'),
      compile('Order'),
      compile('TonOrder'),
      compile('JettonMinter'),
      compile('JettonWallet'),
    ]);
    deployer = await blockchain.treasury('deployer');
    seller = await blockchain.treasury('seller');
    buyer = await blockchain.treasury('buyer');

    orderDeployer = blockchain.openContract(
      OrderDeployer.createFromConfig(
        {
          tonOrderCode,
          orderCode,
          jettonWalletCode,
          admin: deployer.address,
          orderId: 0,
        },
        orderDeployerCode
      )
    );
    jettonMinter = blockchain.openContract(
      JettonMinter.createFromConfig(
        {
          jettonWalletCode,
          adminAddress: deployer.address,
          content: beginCell().storeStringTail('minter').endCell(),
        },
        jettonMinterCode
      )
    );
    await jettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));

    await jettonMinter.sendMint(deployer.getSender(), {
      jettonAmount,
      queryId: 9,
      toAddress: seller.address,
      amount: toNano(1),
      value: toNano(2),
    });

    sellerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await jettonMinter.getWalletAddress(seller.address)
      )
    );
  });

  it('should deploy', async () => {
    const {transactions} = await orderDeployer.sendDeploy(
      deployer.getSender(),
      toNano(0.05)
    );
    expect(transactions).toHaveTransaction({
      from: deployer.address,
      to: orderDeployer.address,
      deploy: true,
      success: true,
    });

    orderDeployerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await jettonMinter.getWalletAddress(orderDeployer.address)
      )
    );
  });

  it('should create order by jetton', async () => {
    const price = 10;
    const expirationTime = Math.ceil(Date.now() / 1000) + 1000;

    const result = await sellerJettonWallet.sendTransfer(seller.getSender(), {
      value: toNano(2),
      fwdAmount: toNano(0.6),
      queryId: 9,
      jettonAmount,
      toAddress: orderDeployer.address,
      forwardPayload: beginCell()
        .storeUint(0x26de15e2, 32)
        .storeRef(
          beginCell()
            .storeAddress(jettonMinter.address)
            .storeUint(price, 32)
            .storeUint(expirationTime, 64)
            .endCell()
        )
        .endCell()
        .asSlice(),
    });

    const {address: newOrderAddress} = await orderDeployer.getOrderAddress(
      0,
      1
    );
    const orderJettonWalletAddress =
      await jettonMinter.getWalletAddress(newOrderAddress);
    const orderJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(orderJettonWalletAddress)
    );

    expect(result.transactions).toHaveTransaction({
      from: orderDeployer.address,
      to: newOrderAddress,
      deploy: true,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: orderDeployerJettonWallet.address,
      to: orderJettonWallet.address,
      success: true,
    });

    const order = blockchain.openContract(
      TonOrder.createFromAddress(newOrderAddress)
    );
    const orderData = await order.getOrderData();

    expect(orderData.status).toEqual(2);
    expect(orderData.price).toEqual(price);
    expect(orderData.quantity).toEqual(Number(jettonAmount));
    expect(orderData.expirationTime).toEqual(expirationTime);
  });

  it('should create order ton', async () => {
    const price = 1000;
    const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
    const tonAmount = toNano(1n);

    const result = await orderDeployer.sendCreateTonOrder(buyer.getSender(), {
      value: toNano(2),
      queryId: 9,
      tonAmount,
      expirationTime,
      price,
      jettonMasterAddress: jettonMinter.address,
    });

    const {address: newOrderAddress} = await orderDeployer.getOrderAddress(
      1,
      1
    );
    expect(result.transactions).toHaveTransaction({
      from: orderDeployer.address,
      to: newOrderAddress,
      deploy: true,
      success: true,
    });

    order = blockchain.openContract(
      TonOrder.createFromAddress(newOrderAddress)
    );

    const orderData = await order.getOrderData();

    expect(orderData.status).toEqual(2);
    expect(orderData.price).toEqual(price);
    expect(orderData.quantity).toEqual(Number(tonAmount) / price);
    expect(orderData.expirationTime).toEqual(expirationTime);
  });
});
