module initia_std::event {
    /// Emit an event with payload `msg` by using `handle_ref`'s key and counter.
    public fun emit<T: drop>(msg: T) {
        emit_event<T>(&msg);
    }

    /// Log `msg` with the event stream identified by `T`
    native fun emit_event<T: drop>(msg: &T);

    #[test_only]
    native public fun emitted_events<T: drop>(): vector<T>;

    #[test_only]
    public fun was_event_emitted<T: drop>(msg: &T): bool {
        use std::vector;
        vector::contains(&emitted_events<T>(), msg)
    }

    #[test_only]
    struct TestEvent has copy, drop {
        value: u64
    }

    #[test_only]
    struct TestEvent2 has copy, drop {
        value: u64
    }

    #[test]
    public fun test_event_emitted() {
        let msg1 = TestEvent { value: 123 };
        let msg2 = TestEvent { value: 456 };
        let msg3 = TestEvent2 { value: 789 };
        emit(msg1);
        emit(msg2);
        emit(msg3);

        assert!(was_event_emitted(&msg1), 1);
        assert!(was_event_emitted(&msg2), 2);
        assert!(was_event_emitted(&msg3), 3);
    }
}
