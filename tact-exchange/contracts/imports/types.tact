struct TokenNotificationPayload {
    baseJettonAddress: Address;
    quoteJettonAddress: Address;
    side: Int as uint8;
    price: Int as coins;
}