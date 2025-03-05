import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano, beginCell, SendMode } from '@ton/core';
import { HelloWorld } from '../wrappers/HelloWorld';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { KeyPair, getSecureRandomBytes, keyPairFromSeed } from '@ton/crypto';

describe('HelloWorld', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('HelloWorld');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let helloWorld: SandboxContract<HelloWorld>;
    let keyPair: KeyPair;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        // Generate a key pair for signing external messages
        const seed = await getSecureRandomBytes(32);
        keyPair = keyPairFromSeed(seed);
        
        helloWorld = blockchain.openContract(
            HelloWorld.createFromConfig(
                {
                    id: 0,
                    seqno: 0,
                    public_key: keyPair.publicKey
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await helloWorld.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: helloWorld.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and helloWorld are ready to use
    });

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await helloWorld.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await helloWorld.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: helloWorld.address,
                success: true,
            });

            const counterAfter = await helloWorld.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });

    it('should correctly initialize and return the initial data', async () => {
        // Define the expected initial values (same as in beforeEach)
        const expectedConfig = {
            id: 0,
            counter: 0,
            seqno: 0,
            public_key: keyPair.publicKey
        };

        // Log the initial configuration values before verification
        console.log('Initial configuration values (before deployment):');
        console.log('- ID:', expectedConfig.id);
        console.log('- Counter:', expectedConfig.counter);
        console.log('- Seqno:', expectedConfig.seqno);
        console.log('- Public Key:', expectedConfig.public_key.toString());

        console.log('Retrieved values after deployment:');
        // Verify counter value
        const counter = await helloWorld.getCounter();
        console.log('- Counter:', counter);
        expect(counter).toBe(expectedConfig.counter);

        // Verify ID value
        const id = await helloWorld.getID();
        console.log('- ID:', id);
        expect(id).toBe(expectedConfig.id);

        // Verify seqno and public_key values
        const [seqno, publicKey] = await helloWorld.getSeqnoPKey();
        console.log('- Seqno:', seqno);
        console.log('- Public Key:', publicKey.toString());
        expect(seqno).toBe(expectedConfig.seqno);
        expect(publicKey).toEqual(expectedConfig.public_key);
    });

    it('should send an external message containing an internal message', async () => {
        const receiver = await blockchain.treasury('receiver');
        
        const internalMessage = beginCell()
            .storeUint(0, 32) // Simple message with no specific opcode
            .storeUint(0, 64) // queryID = 0
            .storeStringTail('Hello from external message!')
            .endCell();
        
        const messageToSend = beginCell()
            .storeUint(0x18, 6) // internal message info
            .storeAddress(receiver.address) // destination address
            .storeCoins(toNano('0.01')) // amount to send
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1) // default message headers
            .storeRef(internalMessage) // store the message content as a reference
            .endCell();

        const receiverBalanceBefore = await receiver.getBalance();

        const result = await helloWorld.sendExternal({
            mode: SendMode.PAY_GAS_SEPARATELY,
            message: messageToSend,
            secret_key: keyPair.secretKey
        });

        expect(result.transactions).toHaveTransaction({
            from: undefined, // External messages have no 'from' address
            to: helloWorld.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: helloWorld.address,
            to: receiver.address,
            success: true,
        });

        const receiverBalanceAfter = await receiver.getBalance();

        expect(receiverBalanceAfter).toBeGreaterThan(receiverBalanceBefore);
        const [seqnoAfter] = await helloWorld.getSeqnoPKey();
        expect(seqnoAfter).toBe(1); // Since it should start from 0 and increment to 1
    });
});


