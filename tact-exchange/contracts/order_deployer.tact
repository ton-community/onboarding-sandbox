import "@stdlib/ownable";
import "@stdlib/deploy";

import "./imports/constants.tact";
import "./imports/jetton.tact";
import "./imports/types.tact";

import "./order.tact";

contract OrderDeployer with Ownable, JettonValidator, Deployable {
    owner: Address;
    currentOrderId: Int as uint32;
    jettonWalletCode: Cell;

    init(owner: Address, jettonWalletCode: Cell) {
        self.owner = owner;
        self.currentOrderId = 0;
        self.jettonWalletCode = jettonWalletCode;
    }

    receive(msg: TokenNotification) {
        let queryId = msg.queryId;
        let jettonAmount = msg.jettonAmount;
        let fromAddress = msg.fromAddress;
        let payload = TokenNotificationPayload.fromSlice(msg.forwardPayload);

        self.assertJettonIsValid(sender(), payload.side == SideSell ? payload.baseJettonAddress : payload.quoteJettonAddress);
        nativeThrowIf(715, payload.side == SideSell && (jettonAmount % payload.price != 0));

        let orderStateInit = initOf Order(myAddress(), self.currentOrderId, self.jettonWalletCode);
        let orderAddress = contractAddress(orderStateInit);
        send(SendParameters{
            to: orderAddress,
            value: ton("0.1"),
            mode: 0,
            code: orderStateInit.code,
            data: orderStateInit.data,
        });

        self.currentOrderId += 1;

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
                forwardPayload: msg.forwardPayload,
            }.toCell(),
        });
    }

    get fun orderId(): Int {
        return self.currentOrderId;
    }

    get fun orderAddress(orderId: Int): Address {
        return contractAddress(initOf Order(myAddress(), self.currentOrderId, self.jettonWalletCode))
    }
}
