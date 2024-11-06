module MyOFT {
    struct Counter has key {
        value: u64
    }

    public fun init(account: &signer) {
        move_to(account, Counter { value: 42 });
    }
}
