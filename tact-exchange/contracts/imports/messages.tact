message InitOrder {
    creatorJettonAddress: Address;
    opponentJettonAddress: Address;
    opponentJettonAmount: Int as coins;
    orderCreatorAddress: Address;
}