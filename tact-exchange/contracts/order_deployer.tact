import "@stdlib/ownable";
import "@stdlib/deploy";

import "./imports/constants.tact";
import "./imports/jetton.tact";
import "./imports/types.tact";
import "./imports/messages.tact";

import "./order.tact";

contract OrderDeployer with Ownable, JettonValidator, Deployable {
    owner: Address;
    nextOrderId: Int as uint32;
    jettonWalletCode: Cell;

    init(owner: Address, jettonWalletCode: Cell) {
        self.owner = owner;
        self.nextOrderId = 0;
        self.jettonWalletCode = jettonWalletCode;
    }

    receive(msg: TokenNotification) {
        let queryId = msg.queryId;
        let jettonAmount = msg.jettonAmount;
        let fromAddress = msg.fromAddress;
        let payload = TokenNotificationPayload.fromCell(msg.forwardPayload.loadRef()); // TODO: ask is load ref good or not

        self.assertJettonIsValid(sender(), payload.creatorJettonAddress);

        let orderStateInit = initOf Order(myAddress(), self.nextOrderId, self.jettonWalletCode);
        let orderAddress = contractAddress(orderStateInit);

        send(SendParameters{
            to: orderAddress,
            value: ton("0.2"),
            mode: 0,
            code: orderStateInit.code,
            data: orderStateInit.data,
            body: InitOrder{
                creatorJettonAddress: payload.creatorJettonAddress,
                opponentJettonAddress: payload.opponentJettonAddress,
                opponentJettonAmount: payload.opponentJettonAmount,
                orderCreatorAddress: fromAddress,
            }.toCell(),
        });

        dump("INIT");

        self.nextOrderId += 1;

        send(SendParameters{
            to: sender(), // sender - jetton wallet address
            value: ton("0.3"),
            mode: 0,
            body: TokenTransfer{
                queryId,
                amount: jettonAmount,
                destination: orderAddress,
                responseDestination: fromAddress,
                customPayload: null,
                forwardTonAmount: ton("0.1"),
                forwardPayload: beginCell().storeUint(0, 1).endCell().beginParse(), // TODO: THIS IS BAD FOR GAS OMG IDK HOW TO FIX IT IN TACT
            }.toCell(),
        });
    }

    get fun orderId(): Int {
        return self.nextOrderId;
    }

    get fun orderAddress(orderId: Int): Address {
        return contractAddress(initOf Order(myAddress(), orderId, self.jettonWalletCode))
    }
}
