module my_wallet::MyOFT {
    struct Counter has key {
        value: u64
    }
    struct test has key {
        value: u64
    }

    public fun init(account: &signer) {
        move_to(account, Counter { value: 43 });
    }
}
