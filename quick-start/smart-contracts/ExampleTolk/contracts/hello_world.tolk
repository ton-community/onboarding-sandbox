// simple counter contract in Tolk language

const OP_INCREASE = 0x7e8764ef;  // arbitrary 32-bit number, equal to OP_INCREASE in wrappers/CounterContract.ts

// load_data retrieves variables from TVM storage cell
// impure because of writting into global variables
fun loadData(): (int, int, int) {
    var ds = getContractData().beginParse();

    // id is required to be able to create different instances of counters
    // since addresses in TON depend on the initial state of the contract
    var ctxID = ds.loadUint(32);
    var ctxCounter = ds.loadUint(32);
    var ctxCounterExt = ds.loadUint(256);

    ds.assertEndOfSlice();

    return (ctxID, ctxCounter, ctxCounterExt);
}

// saveData stores storage variables as a cell into persistent storage
fun saveData(ctxID: int, ctxCounter: int, ctxCounterExt: int) {
    setContractData(
        beginCell()
        .storeUint(ctxID, 32)
        .storeUint(ctxCounter, 32)
        .storeUint(ctxCounterExt, 256)
        .endCell()
    );
}

// onInternalMessage is the main entrypoint; it's called when a contract receives an internal message from other contracts
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { // ignore all empty messages
        return;
    }

    var cs: slice = msgFull.beginParse();
    val flags = cs.loadMessageFlags();
    if (isMessageBounced(flags)) { // ignore all bounced messages
        return;
    }

    var (ctxID, ctxCounter, ctxCounterExt) = loadData(); // here we populate the storage variables

    val op = msgBody.loadMessageOp(); // by convention, the first 32 bits of incoming message is the op
    val queryID = msgBody.loadMessageQueryId(); // also by convention, the next 64 bits contain the "query id", although this is not always the case

    if (op == OP_INCREASE) {
        val increaseBy = msgBody.loadUint(32);
        ctxCounter += increaseBy;
        saveData(ctxID, ctxCounter, ctxCounterExt);
        return;
    }

    throw 0xffff; // if the message contains an op that is not known to this contract, we throw
}

fun acceptExternalMessage(): void
    asm "ACCEPT";

fun onExternalMessage(inMsg: slice) {
    acceptExternalMessage();
    var (ctxId, ctxCounter, ctxCounterExt) = loadData();

    var queryId = inMsg.loadUint(64);
    var addr = inMsg.loadAddress();
    var coins = inMsg.loadCoins();
    var increaseBy = inMsg.loadUint(32);

    var msg = beginCell()
        .storeUint(0x18, 6)
        .storeSlice(addr)
        .storeCoins(coins)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(OP_INCREASE, 32)
        .storeUint(queryId, 64)
        .storeUint(increaseBy, 32);
    sendRawMessage(msg.endCell(), 0);

    ctxCounterExt += increaseBy;
    saveData(ctxId, ctxCounter, ctxCounterExt);

    return ();
}

// get methods are a means to conveniently read contract data using, for example, HTTP APIs
// note that unlike in many other smart contract VMs, get methods cannot be called by other contracts

get get_counter(): int {
    var (_, ctxCounter, _) = loadData();
    return ctxCounter;
}

get get_id(): int {
    var (ctxID, _, _) = loadData();
    return ctxID;
}

get get_counters(): (int, int) {
    var (_, ctxCounter, ctxCounterExt) = loadData();
    return (ctxCounter, ctxCounterExt);
}

