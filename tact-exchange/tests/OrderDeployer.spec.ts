import { Blockchain, prettyLogTransactions, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { Order } from '../wrappers/Order';
import { OrderDeployer, storeTokenNotificationPayload } from '../wrappers/OrderDeployer';

describe('OrderDeployer', () => {
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
    let sellerFirstJettonWallet: SandboxContract<JettonWallet>;
    let sellerSecondJettonWallet: SandboxContract<JettonWallet>;
    let buyerSecondJettonWallet: SandboxContract<JettonWallet>;
    let buyerFirstJettonWallet: SandboxContract<JettonWallet>;

    const firstAmount = 1000n;
    const secondAmount = 2000n;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        [
            jettonMinterCode,
            jettonWalletCode
        ] = await Promise.all([
            compile('JettonMinter'),
            compile('JettonWallet')
        ]);

        deployer = await blockchain.treasury('deployer');
        seller = await blockchain.treasury('seller');
        buyer = await blockchain.treasury('buyer');

        orderDeployer = blockchain.openContract(
            await OrderDeployer.fromInit(
                deployer.address, jettonWalletCode
            )
        );

        firstJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    jettonWalletCode,
                    adminAddress: deployer.address,
                    content: beginCell().storeStringTail('firstminter').endCell()
                },
                jettonMinterCode
            )
        );
        await firstJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
        await firstJettonMinter.sendMint(deployer.getSender(), {
            jettonAmount: firstAmount,
            queryId: 9,
            toAddress: seller.address,
            amount: toNano(1),
            value: toNano(2)
        });

        secondJettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    jettonWalletCode,
                    adminAddress: deployer.address,
                    content: beginCell().storeStringTail('secondminter').endCell()
                },
                jettonMinterCode
            )
        );
        await secondJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
        await secondJettonMinter.sendMint(deployer.getSender(), {
            jettonAmount: secondAmount,
            queryId: 9,
            toAddress: buyer.address,
            amount: toNano(1),
            value: toNano(2)
        });

        sellerFirstJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(
                await firstJettonMinter.getWalletAddress(seller.address)
            )
        );
        sellerSecondJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(
                await secondJettonMinter.getWalletAddress(seller.address)
            )
        );
        buyerSecondJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(
                await secondJettonMinter.getWalletAddress(buyer.address)
            )
        );
        buyerFirstJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(
                await firstJettonMinter.getWalletAddress(buyer.address)
            )
        );
    });

    it('should deploy', async () => {
        const { transactions } = await orderDeployer.send(
            deployer.getSender(),
            {
                value: toNano(0.05)
            },
            { $$type: 'Deploy', queryId: 0n }
        );
        expect(transactions).toHaveTransaction({
            from: deployer.address,
            to: orderDeployer.address,
            deploy: true,
            success: true
        });

        const orderId = await orderDeployer.getOrderId();
        const admin = await orderDeployer.getOwner();

        expect(orderId).toEqual(0n);
        expect(admin).toEqualAddress(deployer.address);

        orderDeployerJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(
                await firstJettonMinter.getWalletAddress(orderDeployer.address)
            )
        );
    });

    it('should create order', async () => {
        const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
        const price = 5;

        const result = await sellerFirstJettonWallet.sendTransfer(seller.getSender(), {
            value: toNano(2),
            fwdAmount: toNano(1),
            queryId: 9,
            jettonAmount: firstAmount,
            toAddress: orderDeployer.address,
            forwardPayload: beginCell().store(storeTokenNotificationPayload({
                $$type: 'TokenNotificationPayload',
                creatorJettonAddress: firstJettonMinter.address,
                opponentJettonAddress: secondJettonMinter.address,
                opponentJettonAmount: secondAmount,
            })).endCell()
        });

        orderAddress = await orderDeployer.getOrderAddress(0n);

        const orderJettonWalletAddress = await firstJettonMinter.getWalletAddress(orderAddress);
        orderJettonWallet = blockchain.openContract(
            JettonWallet.createFromAddress(orderJettonWalletAddress)
        );

        expect(result.transactions).toHaveTransaction({
            from: seller.address,
            to: sellerFirstJettonWallet.address,
            success: true
        });
        expect(result.transactions).toHaveTransaction({
            from: orderDeployerJettonWallet.address,
            to: orderDeployer.address,
            success: true
        });
        expect(result.transactions).toHaveTransaction({
            from: orderDeployer.address,
            to: orderAddress,
            deploy: true,
            success: true
        });
        expect(result.transactions).toHaveTransaction({
            from: orderDeployerJettonWallet.address,
            to: orderJettonWallet.address,
            success: true
        });

        const orderId = await orderDeployer.getOrderId();
        expect(orderId).toEqual(1n);

        order = blockchain.openContract(Order.fromAddress(orderAddress));
        const orderData = await order.getOrderData();

        expect(orderData.status).toEqual(2n);
        expect(orderData.opponentJettonAmount).toEqual(secondAmount);
        expect(orderData.creatorJettonAmount).toEqual(firstAmount);
        expect(orderData.creatorJettonAddress).toEqualAddress(firstJettonMinter.address);
        expect(orderData.opponentJettonAddress).toEqualAddress(secondJettonMinter.address);
        expect(orderData.orderCreatorAddress).toEqualAddress(seller.address);

        const orderJettonAmount = await orderJettonWallet.getWalletJettonAmount();
        expect(orderJettonAmount).toEqual(firstAmount);

        const sellerJettonAmount = await sellerFirstJettonWallet.getWalletJettonAmount();
        expect(sellerJettonAmount).toEqual(0n);
    });

    it('should close', async () => {
        const result = await buyerSecondJettonWallet.sendTransferSlice(buyer.getSender(), {
            value: toNano(2),
            fwdAmount: toNano(1),
            queryId: 9,
            jettonAmount: secondAmount,
            toAddress: order.address,
            forwardPayload: beginCell().storeUint(1, 1).endCell().beginParse()
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: buyerSecondJettonWallet.address,
            success: true
        });

        const orderData = await order.getOrderData();
        expect(orderData.status).toEqual(3n);

        const sellerSecondJettonAmount = await sellerSecondJettonWallet.getWalletJettonAmount();
        expect(sellerSecondJettonAmount).toEqual(secondAmount);

        expect(result.transactions).toHaveTransaction({
            from: buyerFirstJettonWallet.address,
            to: buyer.address,
        });

        const buyerFirstJettonAmount = await buyerFirstJettonWallet.getWalletJettonAmount();
        expect(buyerFirstJettonAmount).toEqual(firstAmount);
    });
});
