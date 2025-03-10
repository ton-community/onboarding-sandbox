import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano, beginCell, SendMode, storeMessageRelaxed, internal } from '@ton/core';
import { CounterInternal } from '../wrappers/CounterInternal';
import { HelloWorld } from '../wrappers/HelloWorld';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { KeyPair, getSecureRandomBytes, keyPairFromSeed } from '@ton/crypto';

describe('CounterInternal', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CounterInternal');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counterInternal: SandboxContract<CounterInternal>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        counterInternal = blockchain.openContract(
            CounterInternal.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                    owner: deployer.address,
                },
                code
            )
        );

        const deployResult = await counterInternal.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counterInternal.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and counterInternal are ready to use
    });

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);


            const counterBefore = await counterInternal.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await counterInternal.sendIncrease(deployer.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: counterInternal.address,
                success: true,
            });

            const counterAfter = await counterInternal.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });
    it('should retrieve correct values from get methods', async () => {
        // Check initial counter value
        const counter = await counterInternal.getCounter();
        expect(counter).toBe(0);

        // Check ID value
        const id = await counterInternal.getID();
        expect(id).toBe(0);

        // Check owner address
        const ownerAddress = await counterInternal.getOwnerAddress();
        expect(ownerAddress.equals(deployer.address)).toBe(true);
    });

});

describe('Integration with HelloWorld', () => {
    let codeHelloWorld: Cell;
    let codeCounterInternal: Cell;
    let blockchain: Blockchain;
    let helloWorld: SandboxContract<HelloWorld>;
    let counterInternal: SandboxContract<CounterInternal>;
    let keyPair: KeyPair;
    
    beforeAll(async () => {
        codeHelloWorld = await compile('HelloWorld');
        codeCounterInternal = await compile('CounterInternal');
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
            success: true,
        });
        
        // Deploy CounterInternal with HelloWorld as the owner
        counterInternal = blockchain.openContract(
            CounterInternal.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                    owner: helloWorld.address, // Set HelloWorld as the owner
                },
                codeCounterInternal
            )
        );
        
        const deployerCounter = await blockchain.treasury('deployerCounter');
        const deployResultCounter = await counterInternal.sendDeploy(deployerCounter.getSender(), toNano('1.00'));
        
        expect(deployResultCounter.transactions).toHaveTransaction({
            from: deployerCounter.address,
            to: counterInternal.address,
            deploy: true,
            success: true,
        });
    });
    
    it('should only allow owner to increment counter', async () => {
        // Verify owner is correctly set to HelloWorld
        const ownerAddress = await counterInternal.getOwnerAddress();
        expect(ownerAddress.equals(helloWorld.address)).toBe(true);
        
        // Get initial counter value
        const counterBefore = await counterInternal.getCounter();
        
        // Try to increase counter from a non-owner account (should fail)
        const nonOwner = await blockchain.treasury('nonOwner');
        const increaseBy = 5;
        
        const nonOwnerResult = await counterInternal.sendIncrease(nonOwner.getSender(), {
            increaseBy,
            value: toNano('0.05'),
        });
        
        // This should fail since only the owner should be able to increment
        expect(nonOwnerResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: counterInternal.address,
            success: false,
            exitCode: 42, // The error code thrown in the contract
        });
        
        // Counter should remain unchanged
        const counterAfterNonOwner = await counterInternal.getCounter();
        expect(counterAfterNonOwner).toBe(counterBefore);
        
        // Create internal message to increase counter that will be sent from HelloWorld
        const internalMessageBody = beginCell()
            .storeUint(0x7e8764ef, 32) // op::increase opcode
            .storeUint(0, 64) // queryID = 0
            .storeUint(increaseBy, 32) // increaseBy
            .endCell();

        const messageToSend = beginCell().store(storeMessageRelaxed(internal({
            to: counterInternal.address,
            value: toNano(0.01),
            body: internalMessageBody,
            bounce: true,
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
            success: true,
        });
        
        // Verify the internal message was sent from HelloWorld to CounterInternal
        expect(result.transactions).toHaveTransaction({
            from: helloWorld.address,
            to: counterInternal.address,
            success: true,
        });
        
        // Verify the counter was increased
        const counterAfter = await counterInternal.getCounter();
        expect(counterAfter).toBe(counterBefore + increaseBy);
    });
});