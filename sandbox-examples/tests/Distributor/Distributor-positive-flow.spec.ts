import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Dictionary, toNano } from '@ton/core';
import { Distributor } from '../../wrappers/Distributor';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { findTransactionRequired, flattenTransaction } from '@ton/test-utils';

describe('Distributor positive flow', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let firstUser: SandboxContract<TreasuryContract>;
    let secondUser: SandboxContract<TreasuryContract>;
    let distributor: SandboxContract<Distributor>;

    beforeAll(async () => {
        code = await compile('Distributor');
        blockchain = await Blockchain.create();

        owner = await blockchain.treasury('owner');
        firstUser = await blockchain.treasury('firstUser');
        secondUser = await blockchain.treasury('secondUser');

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

    it('should get owner', async () => {
        const ownerFromContract = await distributor.getOwner();

        expect(ownerFromContract).toEqualAddress(owner.address);
    });

    it('should get shares dict', async () => {
        const shares = await distributor.getShares();

        expect(shares.keys().length).toEqual(0);
    });

    it('should add firstUser', async () => {
        const result = await distributor.sendAddUser(owner.getSender(), {
            value: toNano('0.05'),
            userAddress: firstUser.address
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            success: true
        });

        const shares = await distributor.getShares();

        expect(shares.keys()[0]).toEqualAddress(firstUser.address);
    });

    it('should share coins to one user', async () => {
        const result = await distributor.sendShareCoins(owner.getSender(), {
            value: toNano('10')
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            outMessagesCount: 1,
            success: true
        });
        expect(result.transactions).toHaveTransaction({
            from: distributor.address,
            on: firstUser.address,
            op: 0x0,
            success: true
        });
    });

    it('should add secondUser', async () => {
        const result = await distributor.sendAddUser(owner.getSender(), {
            value: toNano('0.05'),
            userAddress: secondUser.address
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            success: true
        });

        const shares = await distributor.getShares();

        expect(
            shares.keys().some((addr) => secondUser.address.equals(addr))
        ).toBeTruthy();
    });


    it('should share coins to 2 users', async () => {
        const result = await distributor.sendShareCoins(owner.getSender(), {
            value: toNano('10')
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            on: distributor.address,
            success: true,
            outMessagesCount: 2
        });
        expect(result.transactions).toHaveTransaction({
            from: distributor.address,
            on: firstUser.address,
            op: 0x0,
            success: true
        });
        expect(result.transactions).toHaveTransaction({
            from: distributor.address,
            on: secondUser.address,
            op: 0x0,
            success: true
        });
        const firstUserTransaction = findTransactionRequired(result.transactions, { on: firstUser.address });
        const secondUserTransaction = findTransactionRequired(result.transactions, { on: secondUser.address });

        expect(flattenTransaction(firstUserTransaction).value).toEqual(flattenTransaction(secondUserTransaction).value);
    });
});
