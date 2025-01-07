#[test_only]
module 0xcafe::json_module_permission_tests {
    use std::json;
    use std::object::{Self, ConstructorRef};
    use std::option::{Self, Option};
    use std::vector;

    struct MyStruct has drop {
        a: u64
    }

    struct HoldByOptionMyStruct has drop {
        a: Option<MyStruct>
    }

    struct HoldByVectorMyStruct has drop {
        a: vector<MyStruct>
    }

    struct HoldByOption has drop {
        a: Option<ConstructorRef>
    }

    struct HoldByVector has drop {
        a: vector<ConstructorRef>
    }

    #[test]
    public fun test_valid_creation() {
        let my_struct = MyStruct { a: 10 };

        let bz = json::marshal(&my_struct);
        let my_struct2 = json::unmarshal<MyStruct>(bz);

        assert!(my_struct.a == my_struct2.a, 1);
    }

    #[test]
    public fun test_valid_creation_with_option() {
        let my_struct = MyStruct { a: 10 };
        let opt = HoldByOptionMyStruct { a: option::some(my_struct) };

        let bz = json::marshal(&opt);
        let opt2 = json::unmarshal<HoldByOptionMyStruct>(bz);

        assert!(option::borrow(&opt.a).a == option::borrow(&opt2.a).a, 1);
    }

    #[test]
    public fun test_valid_creation_with_vector() {
        let my_struct = MyStruct { a: 10 };
        let opt = HoldByVectorMyStruct { a: vector[my_struct] };

        let bz = json::marshal(&opt);
        let opt2 = json::unmarshal<HoldByVectorMyStruct>(bz);

        assert!(
            vector::borrow(&opt.a, 0).a == vector::borrow(&opt2.a, 0).a,
            1
        );
    }

    #[test]
    #[expected_failure(abort_code = 0x10006, location = 0x1::json)]
    public fun test_violate_module_permission_rule() {
        let ref = object::create_object(@std, true);
        let bz = json::marshal(&ref);

        // cannot create ConstructorRef from the other module.
        let _ref2 = json::unmarshal<ConstructorRef>(bz);
    }

    #[test]
    #[expected_failure(abort_code = 0x10006, location = 0x1::json)]
    public fun test_violate_module_permission_rule_with_option() {
        let ref = object::create_object(@std, true);
        let opt = HoldByOption { a: option::some(ref) };
        let bz = json::marshal(&opt);

        // cannot create ConstructorRef from the other module.
        let _ref2 = json::unmarshal<HoldByOption>(bz);
    }

    #[test]
    #[expected_failure(abort_code = 0x10006, location = 0x1::json)]
    public fun test_violate_module_permission_rule_with_vector() {
        let ref = object::create_object(@std, true);
        let opt = HoldByVector { a: vector[ref] };
        let bz = json::marshal(&opt);

        // cannot create ConstructorRef from the other module.
        let _ref2 = json::unmarshal<HoldByVector>(bz);
    }
}
