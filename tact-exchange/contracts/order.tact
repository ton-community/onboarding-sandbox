import "@stdlib/ownable";

import "./imports/constants.tact";
import "./imports/jetton.tact";
import "./imports/types.tact";

struct OrderData {
    status: Int as uint8;
    baseWalletAddress: Address?;
    quoteWalletAddress: Address?;

    side: Int as uint8 = 0;
    quantity: Int as coins = 0;
    price: Int as coins = 0;

    orderId: Int as uint32;
    owner: Address; // deployer
    orderCreatorAddress: Address?;
    jettonWalletCode: Cell;

    expirationTimeT: Int? as uint64;
}

contract Order with Ownable, JettonValidator {
    status: Int as uint8;
    baseWalletAddress: Address?;
    quoteWalletAddress: Address?;

    side: Int as uint8 = 0;
    quantity: Int as coins = 0;
    price: Int as coins = 0;

    orderId: Int as uint32;
    owner: Address; // deployer
    orderCreatorAddress: Address?;
    jettonWalletCode: Cell;

    expirationTimeT: Int? as uint64;

    init(deployerAddress: Address, orderId: Int, jettonWalletCode: Cell) {
        self.status = OrderStatusNotInited;

        self.owner = deployerAddress;
        self.orderId = orderId;
        self.jettonWalletCode = jettonWalletCode;
    }

    receive(msg: TokenNotification) {
        let queryId = msg.queryId;
        let jettonAmount = msg.jettonAmount;
        let fromAddress = msg.fromAddress;
        let payload = TokenNotificationPayload.fromSlice(msg.forwardPayload);

        self.assertJettonIsValid(sender(), payload.side == SideSell ? payload.baseJettonAddress : payload.quoteJettonAddress);
        dump(queryId);
    }
    
    get fun orderData(): OrderData {
        return OrderData.fromCell(self.toCell());
    }
}
