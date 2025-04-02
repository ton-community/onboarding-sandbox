import { Address, toNano } from '@ton/core';
import { CounterInternal } from '../wrappers/CounterInternal';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('CounterInternal address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const counterInternal = provider.open(CounterInternal.fromAddress(address));

    const counterBefore = await counterInternal.getCounter();

    await counterInternal.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Add',
            queryId: 0n,
            amount: 1n,
        }
    );

    ui.write('Waiting for counter to increase...');

    let counterAfter = await counterInternal.getCounter();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await counterInternal.getCounter();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
}
