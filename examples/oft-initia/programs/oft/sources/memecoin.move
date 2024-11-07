module my_wallet::Memecoin {
    struct Counter has key {
        value: u64
    }
    struct Test has key {
        value: u64
    }

    const HELLO_WORLD_VALUE: u64 = 42;

    public fun init(account: &signer) {
        move_to(account, Counter { value: 43 });
    }

    public fun hello_world(): u64 {
        HELLO_WORLD_VALUE
    }
}
