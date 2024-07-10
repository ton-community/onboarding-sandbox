message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    jettonAmount: Int as coins;
    fromAddress: Address;
    forwardPayload: Slice as remaining;
}

message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

struct JettonWalletData {
    balance: Int as coins;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
}

fun calculateJettonWalletAddress(ownerAddress: Address, jettonMasterAddress: Address, jettonWalletCode: Cell): Address {
    let initData = JettonWalletData{
        balance: 0,
        ownerAddress,
        jettonMasterAddress,
        jettonWalletCode,
    };

    return contractAddress(StateInit{code: jettonWalletCode, data: initData.toCell()});
}

trait JettonValidator {
    jettonWalletCode: Cell;

    fun assertJettonIsValid(jettonAddress: Address, jettonMasterAddress: Address) {
        let calculatedAddress = calculateJettonWalletAddress(myAddress(), jettonMasterAddress, self.jettonWalletCode);
        nativeThrowUnless(999, jettonAddress == calculatedAddress);
    }
}