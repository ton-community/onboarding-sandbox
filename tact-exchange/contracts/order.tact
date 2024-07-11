import "@stdlib/ownable";

import "./imports/constants.tact";
import "./imports/jetton.tact";
import "./imports/types.tact";
import "./imports/messages.tact";


@name(get_data)
native getData(): Cell?;

struct OrderData {
    status: Int as uint8;
    creatorJettonAddress: Address?;
    opponentJettonAddress: Address?;
    
    creatorJettonAmount: Int as coins = 0;
    opponentJettonAmount: Int as coins = 0;

    orderId: Int as uint32;
    owner: Address; // deployer
    orderCreatorAddress: Address?;
    jettonWalletCode: Cell;
}

contract Order with Ownable, JettonValidator {
    status: Int as uint8;
    creatorJettonAddress: Address?;
    opponentJettonAddress: Address?;
    
    creatorJettonAmount: Int as coins = 0;
    opponentJettonAmount: Int as coins = 0;

    orderId: Int as uint32;
    owner: Address; // deployer
    orderCreatorAddress: Address?;
    jettonWalletCode: Cell;

    init(deployerAddress: Address, orderId: Int, jettonWalletCode: Cell) {
        self.status = OrderStatusNotInited;

        self.owner = deployerAddress;
        self.orderId = orderId;
        self.jettonWalletCode = jettonWalletCode;
    }

    receive() {}

    receive(msg: InitOrder) {
        self.requireOwner();
        self.creatorJettonAddress = msg.creatorJettonAddress;
        self.opponentJettonAddress = msg.opponentJettonAddress;
        self.opponentJettonAmount = msg.opponentJettonAmount;
        self.orderCreatorAddress = msg.orderCreatorAddress;
        self.status = OrderStatusInited;
    }

    receive(msg: TokenNotification) {
        if (self.status == OrderStatusInited && msg.fromAddress == self.owner) {
            self.creatorJettonAmount = msg.jettonAmount;
            self.status = OrderStatusFilled;
            return;
        }

        if (self.status == OrderStatusFilled) {
            // TODO: close order
            return;
        }
    }
    
    get fun orderData(): OrderData {
        return OrderData.fromCell(getData());
    }
}
