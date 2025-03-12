import "@stdlib/deploy";
import "@stdlib/ownable";

message(0x7e8764ef) Add {
    queryId: Int as uint64;
    amount: Int as uint32;
}

contract CounterInternal with Ownable, Deployable {
    id: Int as uint32;
    counter: Int as uint32;
    owner: Address;

    init(id: Int, owner: Address) {
        self.id = id;
        self.counter = 0;
        self.owner = owner;
    }

    receive(msg: Add) {
        self.requireOwner();
        self.counter += msg.amount;

        // Notify the caller that the receiver was executed and forward remaining value back
        self.notify("Cashback".asComment());
    }

    get fun counter(): Int {
        return self.counter;
    }

    get fun id(): Int {
        return self.id;
    }
}
