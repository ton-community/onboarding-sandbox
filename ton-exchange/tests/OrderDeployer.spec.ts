import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, beginCell, Cell, toNano} from '@ton/core';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';
import {JettonMinter} from '../wrappers/JettonMinter';
import {Order} from '../wrappers/Order';
import {OrderDeployer} from '../wrappers/OrderDeployer';

describe('OrderDeployer', () => {
  let orderDeployerCode: Cell;
  let orderCode: Cell;
  let tonOrderCode: Cell;
  let jettonWalletCode: Cell;
  let jettonMinterCode: Cell;

  let orderAddress: Address;

  let firstJettonMinter: SandboxContract<JettonMinter>;
  let secondJettonMinter: SandboxContract<JettonMinter>;

  let blockchain: Blockchain;

  let deployer: SandboxContract<TreasuryContract>;
  let orderDeployer: SandboxContract<OrderDeployer>;
  let order: SandboxContract<Order>;

  let seller: SandboxContract<TreasuryContract>;
  let buyer: SandboxContract<TreasuryContract>;

  let orderDeployerJettonWallet: SandboxContract<JettonWallet>;
  let orderJettonWallet: SandboxContract<JettonWallet>;
  let sellerJettonWallet: SandboxContract<JettonWallet>;
  let sellerSecondJettonWallet: SandboxContract<JettonWallet>;
  let buyerJettonWallet: SandboxContract<JettonWallet>;
  let buyerSecondJettonWallet: SandboxContract<JettonWallet>;

  const totalAmount = 10000n;

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

    firstJettonMinter = blockchain.openContract(
      JettonMinter.createFromConfig(
        {
          jettonWalletCode,
          adminAddress: deployer.address,
          content: beginCell().storeStringTail('firstminter').endCell(),
        },
        jettonMinterCode
      )
    );
    await firstJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
    await firstJettonMinter.sendMint(deployer.getSender(), {
      jettonAmount: totalAmount,
      queryId: 9,
      toAddress: seller.address,
      amount: toNano(1),
      value: toNano(2),
    });

    secondJettonMinter = blockchain.openContract(
      JettonMinter.createFromConfig(
        {
          jettonWalletCode,
          adminAddress: deployer.address,
          content: beginCell().storeStringTail('secondminter').endCell(),
        },
        jettonMinterCode
      )
    );
    await secondJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
    await secondJettonMinter.sendMint(deployer.getSender(), {
      jettonAmount: totalAmount,
      queryId: 9,
      toAddress: buyer.address,
      amount: toNano(1),
      value: toNano(2),
    });

    sellerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await firstJettonMinter.getWalletAddress(seller.address)
      )
    );
    sellerSecondJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await secondJettonMinter.getWalletAddress(seller.address)
      )
    );
    buyerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await secondJettonMinter.getWalletAddress(buyer.address)
      )
    );
    buyerSecondJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await firstJettonMinter.getWalletAddress(buyer.address)
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

    const orderDeployerData = await orderDeployer.getOrderDeployerData();

    expect(orderDeployerData.orderId).toEqual(0);
    expect(orderDeployerData.admin).toEqualAddress(deployer.address);

    orderDeployerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await firstJettonMinter.getWalletAddress(orderDeployer.address)
      )
    );
  });

  it('should create order', async () => {
    const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
    const side = 0;
    const price = 5;
    const jettonAmount = 100n;

    const result = await sellerJettonWallet.sendTransfer(seller.getSender(), {
      value: toNano(1),
      fwdAmount: toNano(0.6),
      queryId: 9,
      jettonAmount,
      toAddress: orderDeployer.address,
      forwardPayload: beginCell()
        .storeUint(0x26de15e1, 32)
        .storeRef(
          beginCell()
            .storeAddress(firstJettonMinter.address) // base_jetton_address
            .storeAddress(secondJettonMinter.address) // quote_jetton_address
            .storeUint(side, 1)
            .storeUint(price, 32)
            .storeUint(expirationTime, 64)
            .endCell()
        )
        .endCell()
        .asSlice(),
    });

    const orderDeployerData = await orderDeployer.getOrderDeployerData();
    expect(orderDeployerData.orderId).toEqual(1);

    const {address: newOrderAddress} = await orderDeployer.getOrderAddress(
      0,
      0
    );
    orderAddress = newOrderAddress;

    const orderJettonWalletAddress =
      await firstJettonMinter.getWalletAddress(orderAddress);
    orderJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(orderJettonWalletAddress)
    );

    expect(result.transactions).toHaveTransaction({
      from: seller.address,
      to: sellerJettonWallet.address,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: orderDeployerJettonWallet.address,
      to: orderDeployer.address,
      success: true,
    });
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

    order = blockchain.openContract(Order.createFromAddress(newOrderAddress));
    const orderData = await order.getOrderData();

    expect(orderData.status).toEqual(2);
    expect(orderData.price).toEqual(price);
    expect(orderData.quantity).toEqual(Number(jettonAmount));
    expect(orderData.expirationTime).toEqual(expirationTime);

    const orderJettonAmount = await orderJettonWallet.getWalletJettonAmount();
    expect(orderJettonAmount).toEqual(jettonAmount);

    const sellerJettonAmount = await sellerJettonWallet.getWalletJettonAmount();
    expect(sellerJettonAmount).toEqual(totalAmount - jettonAmount);
  });

  it('should partially close', async () => {
    const jettonAmount = 300n;
    const side = 1;
    const price = 5;

    const result = await buyerJettonWallet.sendTransfer(buyer.getSender(), {
      value: toNano(2),
      fwdAmount: toNano(1),
      queryId: 9,
      jettonAmount,
      toAddress: order.address,
      forwardPayload: beginCell()
        .storeUint(side, 1)
        .storeUint(price, 32)
        .endCell()
        .asSlice(),
    });

    const orderJettonWalletAddress =
      await secondJettonMinter.getWalletAddress(orderAddress);
    const buyerOrderJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(orderJettonWalletAddress)
    );

    expect(result.transactions).toHaveTransaction({
      from: buyer.address,
      to: buyerJettonWallet.address,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: buyerJettonWallet.address,
      to: buyerOrderJettonWallet.address,
      success: true,
      deploy: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: buyerOrderJettonWallet.address,
      to: order.address,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: buyerOrderJettonWallet.address,
      to: sellerSecondJettonWallet.address,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: orderJettonWallet.address,
      to: buyerSecondJettonWallet.address,
      success: true,
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(2);

    const orderJettonAmount = await orderJettonWallet.getWalletJettonAmount();
    expect(orderJettonAmount).toEqual(40n);

    const buyerJettonAmount = await buyerJettonWallet.getWalletJettonAmount();
    expect(buyerJettonAmount).toEqual(totalAmount - jettonAmount);

    const buyerSecondJettonAmount =
      await buyerSecondJettonWallet.getWalletJettonAmount();
    expect(buyerSecondJettonAmount).toEqual(60n);

    const sellerSecondJettonAmount =
      await sellerSecondJettonWallet.getWalletJettonAmount();
    expect(sellerSecondJettonAmount).toEqual(jettonAmount);
  });

  it('should fully close', async () => {
    const jettonAmount = 600n; // need 200 to close, but check jetton excess
    const side = 1;
    const price = 5;

    await buyerJettonWallet.sendTransfer(buyer.getSender(), {
      value: toNano(2),
      fwdAmount: toNano(1),
      queryId: 9,
      jettonAmount,
      toAddress: order.address,
      forwardPayload: beginCell()
        .storeUint(side, 1)
        .storeUint(price, 32)
        .endCell()
        .asSlice(),
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(3);

    const orderJettonAmount = await orderJettonWallet.getWalletJettonAmount();
    expect(orderJettonAmount).toEqual(0n);

    const buyerJettonAmount = await buyerJettonWallet.getWalletJettonAmount();
    expect(buyerJettonAmount).toEqual(totalAmount - 500n);

    const buyerSecondJettonAmount =
      await buyerSecondJettonWallet.getWalletJettonAmount();
    expect(buyerSecondJettonAmount).toEqual(100n);

    const sellerSecondJettonAmount =
      await sellerSecondJettonWallet.getWalletJettonAmount();
    expect(sellerSecondJettonAmount).toEqual(500n);
  });

  it('should not create order - invalid payload', async () => {
    const side = 0;
    const price = 5;
    const jettonAmount = 100n;

    let sellerJettonAmount = await sellerJettonWallet.getWalletJettonAmount();
    expect(sellerJettonAmount).toEqual(totalAmount - jettonAmount);

    // invalid payload - no timestamp
    const result = await sellerJettonWallet.sendTransfer(seller.getSender(), {
      value: toNano(1),
      fwdAmount: toNano(0.6),
      queryId: 9,
      jettonAmount,
      toAddress: orderDeployer.address,
      forwardPayload: beginCell()
        .storeUint(0x26de15e1, 32)
        .storeRef(
          beginCell()
            .storeAddress(firstJettonMinter.address) // base_jetton_address
            .storeAddress(secondJettonMinter.address) // quote_jetton_address
            .storeUint(side, 1)
            .storeUint(price, 32)
            .endCell()
        )
        .endCell()
        .asSlice(),
    });

    const orderDeployerData = await orderDeployer.getOrderDeployerData();
    expect(orderDeployerData.orderId).toEqual(1);

    expect(result.transactions).toHaveTransaction({
      from: orderDeployerJettonWallet.address,
      to: orderDeployer.address,
      success: true,
      exitCode: 714,
    });

    sellerJettonAmount = await sellerJettonWallet.getWalletJettonAmount();
    expect(sellerJettonAmount).toEqual(totalAmount - jettonAmount);
  });
});
