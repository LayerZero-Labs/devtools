module oft::counter {
    use std::signer;

    struct Counter has key {
        value: u64
    }

    fun init_module(account: &signer) {
        move_to(account, Counter { value: 0 });
    }

    #[view]
    public fun get_value(): u64 acquires Counter {
        borrow_global<Counter>(@oft).value
    }
}