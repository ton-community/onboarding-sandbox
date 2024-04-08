import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Order } from "../wrappers/Order";
import { JettonWallet } from "../wrappers/JettonWallet";
import { JettonMinter } from "../wrappers/JettonMinter";


describe('Order', () => {
  let orderCode: Cell;
  let jettonWalletCode: Cell;
  let jettonMinterCode: Cell;

  let firstJettonMinter: SandboxContract<JettonMinter>;
  let secondJettonMinter: SandboxContract<JettonMinter>;

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;

  let order: SandboxContract<Order>;

  let seller: SandboxContract<TreasuryContract>;
  let buyer: SandboxContract<TreasuryContract>;

  let deployerFirstJettonWaller: SandboxContract<JettonWallet>;
  let orderFirstJettonWaller: SandboxContract<JettonWallet>;

  let sellerFirstJettonWallet: SandboxContract<JettonWallet>;
  let buyerFirstJettonWallet: SandboxContract<JettonWallet>;

  let sellerSecondJettonWallet: SandboxContract<JettonWallet>;
  let buyerSecondJettonWallet: SandboxContract<JettonWallet>;

  let jettonAmount = 100000n;
  let jettonToSell = 100n;

  beforeAll(async () => {
    blockchain = await Blockchain.create();

    [orderCode, jettonMinterCode, jettonWalletCode] = await Promise.all([
      compile('Order'),
      compile('JettonMinter'),
      compile('JettonWallet'),
    ]);

    deployer = await blockchain.treasury('deployer');
    seller = await blockchain.treasury('seller');
    buyer = await blockchain.treasury('buyer');


    firstJettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
      jettonWalletCode,
      adminAddress: deployer.address,
      content: beginCell().storeStringTail('first').endCell(),
    }, jettonMinterCode));

    secondJettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
      jettonWalletCode,
      adminAddress: deployer.address,
      content: beginCell().storeStringTail('second').endCell(),
    }, jettonMinterCode));

    await firstJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
    await secondJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));

    await firstJettonMinter.sendMint(deployer.getSender(), {
      jettonAmount,
      queryId: 9,
      toAddress: deployer.address,
      amount: toNano(1),
      value: toNano(2),
    });
    await secondJettonMinter.sendMint(deployer.getSender(), {
      jettonAmount,
      queryId: 9,
      toAddress: buyer.address,
      amount: toNano(1),
      value: toNano(2),
    });

    deployerFirstJettonWaller = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(deployer.address)));

    sellerFirstJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(seller.address)));
    buyerFirstJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(buyer.address)));

    sellerSecondJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await secondJettonMinter.getWalletAddress(seller.address)));
    buyerSecondJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await secondJettonMinter.getWalletAddress(buyer.address)));

    order = blockchain.openContract(Order.createFromConfig({
      status: 0,
      side: 0,
      quantity: 0,
      price: 0,
      deployerAddress: deployer.address,
      orderId: 1,
      orderCode,
      jettonWalletCode,
      expirationTime: 0,
    }, orderCode));
    orderFirstJettonWaller = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(order.address)));

  });

  it('should deploy', async () => {
    await order.sendDeploy(deployer.getSender(), toNano(1), {
      queryId: 9,
      creatorAddress: seller.address,
    });

    const orderData = await order.getOrderData();
    expect(orderData.creatorAddress).toEqualAddress(seller.address);
  });

  it('should fill after deploy', async () => {
    const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
    const side = 0;
    const price = 5;

    // emulating that it was sent from deployer
    await deployerFirstJettonWaller.sendTransfer(deployer.getSender(), {
      jettonAmount: jettonToSell,
      queryId: 9,
      toAddress: order.address,
      value: toNano(1),
      fwdAmount: toNano(0.1),
      forwardPayload: beginCell()
        .storeRef(beginCell()
          .storeAddress(firstJettonMinter.address) // base_jetton_address
          .storeAddress(secondJettonMinter.address) // quote_jetton_address
          .endCell(),
        )
        .storeUint(side, 1)
        .storeUint(price, 32)
        .storeUint(expirationTime, 64)
        .endCell()
        .asSlice(),
    });


    const orderData = await order.getOrderData();

    expect(orderData.status).toEqual(2);
    expect(orderData.side).toEqual(side);
    expect(orderData.price).toEqual(price);
    expect(orderData.expirationTime).toEqual(expirationTime);

    const orderJettonAmount = await orderFirstJettonWaller.getWalletJettonAmount();
    expect(orderJettonAmount).toEqual(jettonToSell);
  });

  it('should partially close', async () => {
    const side = 1;
    const price = 5;

    let jettonToBuy = 300n;
    
    const res = await buyerSecondJettonWallet.sendTransfer(buyer.getSender(), {
      jettonAmount: jettonToBuy,
      queryId: 9,
      toAddress: order.address,
      value: toNano(1),
      fwdAmount: toNano(0.2),
      forwardPayload: beginCell()
        .storeUint(side, 1)
        .storeUint(price, 32)
        .endCell()
        .asSlice(),
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(2); // partial closing

    const orderFirstJettonAmount = await orderFirstJettonWaller.getWalletJettonAmount();
    expect(orderFirstJettonAmount).toEqual(40n); // (price*jettonToSell-jettonToBuy)/price

    const buyerFirstJettonAmount = await buyerFirstJettonWallet.getWalletJettonAmount();
    expect(buyerFirstJettonAmount).toEqual(60n); // jettonToBuy / price

    const buyerSecondJettonAmount = await buyerSecondJettonWallet.getWalletJettonAmount();
    expect(buyerSecondJettonAmount).toEqual(jettonAmount - jettonToBuy);

    const sellerSecondJettonAmount = await sellerSecondJettonWallet.getWalletJettonAmount();
    expect(sellerSecondJettonAmount).toEqual(jettonToBuy);
  });

  it('should fully close', async () => {
    const side = 1;
    const price = 5;

    let jettonToBuy = 200n;
    
    const res = await buyerSecondJettonWallet.sendTransfer(buyer.getSender(), {
      jettonAmount: jettonToBuy,
      queryId: 9,
      toAddress: order.address,
      value: toNano(1),
      fwdAmount: toNano(0.2),
      forwardPayload: beginCell()
        .storeUint(side, 1)
        .storeUint(price, 32)
        .endCell()
        .asSlice(),
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(3); // partial closing

    const orderFirstJettonAmount = await orderFirstJettonWaller.getWalletJettonAmount();
    expect(orderFirstJettonAmount).toEqual(40n - 40n);

    const buyerFirstJettonAmount = await buyerFirstJettonWallet.getWalletJettonAmount();
    expect(buyerFirstJettonAmount).toEqual(60n + 40n);

    const buyerSecondJettonAmount = await buyerSecondJettonWallet.getWalletJettonAmount();
    expect(buyerSecondJettonAmount).toEqual(jettonAmount - 500n);

    const sellerSecondJettonAmount = await sellerSecondJettonWallet.getWalletJettonAmount();
    expect(sellerSecondJettonAmount).toEqual(500n);
  });

});
