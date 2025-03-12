// simple counter contract in Tolk language

const OP_INCREASE = 0x7e8764ef;  // arbitrary 32-bit number, equal to OP_INCREASE in wrappers/CounterContract.ts

// load_data retrieves variables from TVM storage cell
// impure because of writting into global variables
fun loadData(): (int, int, int) {
    var ds = getContractData().beginParse();

    // id is required to be able to create different instances of counters
    // since addresses in TON depend on the initial state of the contract
    var ctxID = ds.loadUint(32);
    var seqno = ds.loadUint(32);
    var public_key = ds.loadUint(256);

    ds.assertEndOfSlice();

    return (ctxID, seqno, public_key);
}

// saveData stores storage variables as a cell into persistent storage
fun saveData(ctxID: int, seqno: int, public_key: int) {
    setContractData(
        beginCell()
        .storeUint(ctxID, 32)
        .storeUint(seqno, 32)
        .storeUint(public_key, 256)
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

    var (ctxID, seqno, public_key) = loadData(); // here we populate the storage variables

    val op = msgBody.loadMessageOp(); // by convention, the first 32 bits of incoming message is the op
    val queryID = msgBody.loadMessageQueryId(); // also by convention, the next 64 bits contain the "query id", although this is not always the case

    if (op == OP_INCREASE) {
        val increaseBy = msgBody.loadUint(32);
        seqno += increaseBy;
        saveData(ctxID, seqno, public_key);
        return;
    }

    throw 0xffff; // if the message contains an op that is not known to this contract, we throw
}

fun acceptExternalMessage(): void
    asm "ACCEPT";

fun onExternalMessage(inMsg: slice) {
    var signature = inMsg.loadBits(512);
    var cs = inMsg;
    var (ctx_id, msg_seqno) = (cs.loadUint(32), cs.loadUint(32));

    // retrieves stored data for validation checks
    var (stored_id, stored_seqno, public_key) = loadData();
    // replay protection mechanism through seqno chack and incrementing
    assert(msg_seqno == stored_seqno, 33);
    // id field for multiply addresess with same private_key 
    assert(ctx_id == stored_id, 34);
    // ed25519 signature check
    assert(isSignatureValid(sliceHash(inMsg), signature, public_key), 35);
    // accepting message after all checks
    acceptExternalMessage();
    // sending serialized on client side messages 
    while (!cs.isEndOfSliceRefs()) {
        var mode = cs.loadUint(8);
        sendRawMessage(cs.loadRef(), mode);
    }
    saveData(stored_id, stored_seqno + 1, public_key);
}

// get methods are a means to conveniently read contract data using, for example, HTTP APIs
// note that unlike in many other smart contract VMs, get methods cannot be called by other contracts

get currentCounter(): int {
    var (_, seqno, _) = loadData();
    return seqno;
}

get initialId(): int {
    var (ctxID, _, _) = loadData();
    return ctxID;
}

get get_seqno_public_key(): (int, int) {
    var (_, seqno, public_key) = loadData();
    return (seqno, public_key);
}

