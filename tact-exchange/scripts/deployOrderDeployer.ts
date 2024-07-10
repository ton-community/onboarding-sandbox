import { toNano } from '@ton/core';
import { OrderDeployer } from '../wrappers/OrderDeployer';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const orderDeployer = provider.open(await OrderDeployer.fromInit());

    await orderDeployer.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(orderDeployer.address);

    // run methods on `orderDeployer`
}
