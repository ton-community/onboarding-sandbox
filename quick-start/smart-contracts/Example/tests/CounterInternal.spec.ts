import { Blockchain, SandboxContract } from '@ton/sandbox';
import { beginCell, Cell, internal, SendMode, storeMessageRelaxed, toNano } from '@ton/core';
import { CounterInternal, storeAdd } from '../wrappers/CounterInternal';
import { HelloWorld } from '../wrappers/HelloWorld';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { getSecureRandomBytes, KeyPair, keyPairFromSeed } from '@ton/crypto';

describe('CounterInternal', () => {
    let codeHelloWorld: Cell;
    let blockchain: Blockchain;
    let helloWorld: SandboxContract<HelloWorld>;
    let counterInternal: SandboxContract<CounterInternal>;
    let keyPair: KeyPair;

    beforeAll(async () => {
        codeHelloWorld = await compile('HelloWorld');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // Generate a key pair for HelloWorld
        const seed = await getSecureRandomBytes(32);
        keyPair = keyPairFromSeed(seed);

        // Deploy HelloWorld contract
        helloWorld = blockchain.openContract(
            HelloWorld.createFromConfig(
                {
                    id: 0,
                    seqno: 0,
                    publicKey: keyPair.publicKey
                },
                codeHelloWorld
            )
        );

        const deployerHello = await blockchain.treasury('deployerHello');
        const deployResultHello = await helloWorld.sendDeploy(deployerHello.getSender(), toNano('1.00'));

        expect(deployResultHello.transactions).toHaveTransaction({
            from: deployerHello.address,
            to: helloWorld.address,
            deploy: true,
            success: true
        });

        // Deploy CounterInternal with HelloWorld as the owner
        counterInternal = blockchain.openContract(
            await CounterInternal.fromInit(0n, helloWorld.address)
        );

        const deployerCounter = await blockchain.treasury('deployerCounter');
        const deployResultCounter = await counterInternal.send(deployerCounter.getSender(), { value: toNano('1.00') }, {
            $$type: 'Deploy',
            queryId: 0n
        });

        expect(deployResultCounter.transactions).toHaveTransaction({
            from: deployerCounter.address,
            to: counterInternal.address,
            deploy: true,
            success: true
        });
    });

    it('should fail if not owner call increment', async () => {
        // Verify owner is correctly set to HelloWorld
        const ownerAddress = await counterInternal.getOwner();
        expect(ownerAddress.equals(helloWorld.address)).toBe(true);

        // Get initial counter value
        const counterBefore = await counterInternal.getCounter();

        // Try to increase counter from a non-owner account (should fail)
        const nonOwner = await blockchain.treasury('nonOwner');
        const increaseBy = 5n;

        const nonOwnerResult = await counterInternal.send(nonOwner.getSender(), {
            value: toNano('0.05')
        }, {
            $$type: 'Add',
            amount: increaseBy,
            queryId: 0n
        });

        // This should fail since only the owner should be able to increment
        expect(nonOwnerResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: counterInternal.address,
            success: false,
            exitCode: 132 // The error code thrown in the contract, Access Denied
        });

        // Counter should remain unchanged
        const counterAfterNonOwner = await counterInternal.getCounter();
        expect(counterAfterNonOwner).toBe(counterBefore);
    });

    it('should increment from HelloWorld contract', async () => {
        const increaseBy = 5n;
        const counterBefore = await counterInternal.getCounter();

        // Create internal message to increase counter that will be sent from HelloWorld
        const internalMessageBody = beginCell().store(storeAdd({
            $$type: 'Add',
            amount: increaseBy,
            queryId: 0n
        })).endCell();

        const messageToSend = beginCell().store(storeMessageRelaxed(internal({
            to: counterInternal.address,
            value: toNano(0.01),
            body: internalMessageBody,
            bounce: true
        }))).endCell();

        // Send external message to HelloWorld that contains internal message to CounterInternal
        const result = await helloWorld.sendExternal({
            mode: SendMode.PAY_GAS_SEPARATELY,
            message: messageToSend,
            secret_key: keyPair.secretKey
        });

        // Verify the external message was processed successfully
        expect(result.transactions).toHaveTransaction({
            from: undefined, // External messages have no 'from' address
            to: helloWorld.address,
            success: true
        });

        // Verify the internal message was sent from HelloWorld to CounterInternal
        expect(result.transactions).toHaveTransaction({
            from: helloWorld.address,
            to: counterInternal.address,
            success: true
        });

        // Verify the counter was increased
        const counterAfter = await counterInternal.getCounter();
        expect(counterAfter).toBe(counterBefore + increaseBy);
    });
});
