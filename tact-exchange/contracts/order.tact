import "@stdlib/ownable";

import "./imports/constants.tact";
import "./imports/jetton.tact";
import "./imports/types.tact";
import "./imports/messages.tact";


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
            self.assertJettonIsValid(sender(), self.opponentJettonAddress!!);
            nativeThrowUnless(910, msg.jettonAmount == self.opponentJettonAmount);

            send(SendParameters{
                to: sender(),
                value: ton("0.2"),
                body: TokenTransfer{
                    queryId: msg.queryId,
                    amount: msg.jettonAmount,
                    destination: self.orderCreatorAddress!!,
                    responseDestination: self.orderCreatorAddress!!,
                    customPayload: null,
                    forwardTonAmount: 1,
                    forwardPayload: beginCell().storeUint(0, 1).endCell().beginParse(), // TODO: THIS IS BAD FOR GAS OMG IDK HOW TO FIX IT IN TACT
                }.toCell(),
            });

            let orderFirstJettonWalletAddress = self.calculateMyJettonAddress(self.creatorJettonAddress!!);

            send(SendParameters{
                to: orderFirstJettonWalletAddress,
                value: ton("0.2"),
                body: TokenTransfer{
                    queryId: msg.queryId,
                    amount: self.creatorJettonAmount,
                    destination: msg.fromAddress,
                    responseDestination: msg.fromAddress,
                    customPayload: null,
                    forwardTonAmount: 1,
                    forwardPayload: beginCell().storeUint(0, 1).endCell().beginParse(), // TODO: THIS IS BAD FOR GAS OMG IDK HOW TO FIX IT IN TACT
                }.toCell(),
            });

            self.status = OrderStatusClosed;
            return;
        }

        nativeThrow(911);
    }

    get fun orderData(): OrderData {
        return OrderData{
            status: self.status,
            creatorJettonAddress: self.creatorJettonAddress,
            opponentJettonAddress: self.opponentJettonAddress,
            creatorJettonAmount: self.creatorJettonAmount,
            opponentJettonAmount: self.opponentJettonAmount,
            orderId: self.orderId,
            owner: self.owner,
            orderCreatorAddress: self.orderCreatorAddress,
            jettonWalletCode: self.jettonWalletCode,
        };
    }
}
