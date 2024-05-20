import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Dictionary, toNano } from '@ton/core';
import { Distributor, ExitCode } from '../../wrappers/Distributor';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { filterTransactions } from '@ton/test-utils/dist/test/transaction';
import { randomAddress } from '@ton/test-utils';

describe('Distributor negative', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let distributor: SandboxContract<Distributor>;

    beforeAll(async () => {
        code = await compile('Distributor');

        blockchain = await Blockchain.create();

        owner = await blockchain.treasury('owner');

        distributor = blockchain.openContract(
            Distributor.createFromConfig(
                {
                    owner: owner.address,
                    shares: Dictionary.empty()
                },
                code
            )
        );
    });

    it('should deploy', async () => {
        const deployResult = await distributor.sendDeploy(owner.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            deploy: true,
            success: true
        });
    });

    it('should not add user as not owner', async () => {
        const notOwner = await blockchain.treasury(`not-owner`);

        const result = await distributor.sendAddUser(notOwner.getSender(), {
            value: toNano('0.5'),
            userAddress: randomAddress()
        });

        expect(result.transactions).toHaveTransaction({
            from: notOwner.address,
            on: distributor.address,
            success: false,
            exitCode: ExitCode.MUST_BE_OWNER
        });
    });

    it('should add 255 users', async () => {
        // 255 is action list limit
        for (let i = 0; i < 255; ++i) {
            const userAddress = randomAddress();
            const result = await distributor.sendAddUser(owner.getSender(), {
                value: toNano('0.5'),
                userAddress,
            });
            expect(result.transactions).toHaveTransaction({
                from: owner.address,
                on: distributor.address,
                success: true
            });
        }
    });

    it('should not add one more user', async () => {
        const userAddress = randomAddress();

        const result = await distributor.sendAddUser(owner.getSender(), {
            value: toNano('0.5'),
            userAddress,
        });
        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            success: false,
            exitCode: ExitCode.SHARES_SIZE_EXCEEDED_LIMIT
        });
    });

    it('should share money to 255 users', async () => {
        const result = await distributor.sendShareCoins(owner.getSender(), {
            value: toNano('1000')
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            success: true
        });

        printTransactionFees(result.transactions);

        const transferTransaction = filterTransactions(result.transactions, { op: 0x0 });
        expect(transferTransaction.length).toEqual(255);
    });
});
