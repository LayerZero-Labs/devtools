module initia_std::json {
    use std::vector;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    /// JSONValue is a struct to hold any JSON value which is unknown at compile time.
    struct JSONValue has copy, drop {
        value: vector<u8>
    }

    /// JSONObject is a struct to hold any json object which is unknown at compile time.
    struct JSONObject has copy, drop {
        elems: vector<Element>
    }

    /// Element is a struct to hold key-value pair in JSON object.
    struct Element has copy, drop {
        key: vector<u8>,
        value: vector<u8>
    }

    /// Unmarshal JSON value to the given type.
    public fun unmarshal_json_value<T: drop>(json_value: JSONValue): T {
        unmarshal_internal(json_value.value)
    }

    /// Get the list of keys from the JSON object.
    public fun keys(obj: &JSONObject): vector<String> {
        vector::map_ref(
            &obj.elems,
            |elem| {
                use_elem(elem);
                string::utf8(elem.key)
            }
        )
    }

    /// Get the value of the given key from the JSON object.
    public fun get_elem<T: drop>(obj: &JSONObject, key: String): Option<T> {
        let key_bytes = string::bytes(&key);
        let (found, idx) = vector::find(
            &obj.elems,
            |elem| {
                use_elem(elem);
                elem.key == *key_bytes
            }
        );

        if (!found) {
            return option::none()
        };

        let elem = vector::borrow(&obj.elems, idx);
        option::some(unmarshal_internal<T>(elem.value))
    }

    /// Set or overwrite the element in the JSON object.
    public fun set_elem<T: drop>(
        obj: &mut JSONObject, key: String, value: &T
    ) {
        let key_bytes = string::bytes(&key);
        let (found, idx) = vector::find(
            &obj.elems,
            |elem| {
                use_elem(elem);
                elem.key == *key_bytes
            }
        );

        if (!found) {
            vector::push_back(
                &mut obj.elems,
                Element { key: *key_bytes, value: marshal(value) }
            );
        } else {
            let elem = vector::borrow_mut(&mut obj.elems, idx);
            elem.value = marshal(value);
        }
    }

    //
    // (only on compiler v1) for preventing compile error; because of inferring type issue
    //
    inline fun use_elem(_elem: &Element) {}

    /// Marshal data to JSON bytes.
    ///
    /// NOTE: key `_type_` is converted to `@type`
    /// NOTE: key `_move_` is converted to `move`
    /// NOTE: key `_signer_` is converted to `signer`
    public fun marshal<T: drop>(value: &T): vector<u8> {
        marshal_internal(value)
    }

    /// Marshal data to JSON string.
    ///
    /// NOTE: key `_type_` is converted to `@type`
    /// NOTE: key `_move_` is converted to `move`
    /// /// NOTE: key `_signer_` is converted to `signer`
    public fun marshal_to_string<T: drop>(value: &T): String {
        marshal_to_string_internal(value)
    }

    /// Unmarshal JSON bytes to the given struct.
    ///
    /// NOTE: key `@type` is converted to `_type_`
    /// NOTE: key `move` is converted to `_move_`
    /// NOTE: key `signer` is converted to `_signer_`
    public fun unmarshal<T: drop>(json: vector<u8>): T {
        unmarshal_internal(json)
    }

    native fun marshal_internal<T: drop>(value: &T): vector<u8>;
    native fun marshal_to_string_internal<T: drop>(value: &T): String;
    native fun unmarshal_internal<T: drop>(json: vector<u8>): T;

    #[test_only]
    use std::biguint::{Self, BigUint};

    #[test_only]
    use std::bigdecimal::{Self, BigDecimal};

    #[test_only]
    struct TestObject has copy, drop {
        a: u64,
        b: bool,
        c: vector<u8>,
        d: address,
        e: Option<TestObject2>,
        f: Option<TestObject2>,
        _type_: String,
        _move_: String,
        _signer_: String,
        biguint: BigUint,
        bigdecimal: BigDecimal
    }

    #[test_only]
    struct TestObject2 has copy, drop {
        a: u64,
        b: bool,
        c: vector<u8>
    }

    #[test_only]
    struct EmptyObject has copy, drop {}

    #[test]
    fun test_json_empty_marshal_unmarshal_empty() {
        let json = marshal(&EmptyObject {});
        assert!(json == b"{}", 1);

        let val = unmarshal<EmptyObject>(json);
        assert!(val == EmptyObject {}, 2);
    }

    #[test]
    fun test_json_marshal_unmarshal_u64() {
        let json = marshal(&10u64);
        assert!(json == b"\"10\"", 1);

        let val = unmarshal<u64>(json);
        assert!(val == 10u64, 2);
    }

    #[test]
    fun test_json_marshal_unmarshal_vector_u8() {
        let json = marshal(&vector[1u8, 2u8, 3u8]);
        assert!(json == b"\"010203\"", 1);

        let val = unmarshal<vector<u8>>(json);
        assert!(val == vector[1u8, 2u8, 3u8], 2);
    }

    #[test]
    fun test_json_marshal_unmarshal() {
        let obj = TestObject {
            a: 42,
            b: true,
            c: vector[1, 2, 3],
            d: @0x1,
            e: option::some(TestObject2 { a: 42, b: true, c: vector[1, 2, 3] }),
            f: option::none(),
            _type_: string::utf8(b"/cosmos.gov.v1.MsgVote"),
            _move_: string::utf8(b"move"),
            _signer_: string::utf8(b"signer"),
            biguint: biguint::from_u64(42),
            bigdecimal: bigdecimal::from_ratio_u64(123, 10000)
        };

        let json = marshal(&obj);
        assert!(
            json
                == b"{\"@type\":\"/cosmos.gov.v1.MsgVote\",\"a\":\"42\",\"b\":true,\"bigdecimal\":\"0.0123\",\"biguint\":\"42\",\"c\":\"010203\",\"d\":\"0x1\",\"e\":{\"a\":\"42\",\"b\":true,\"c\":\"010203\"},\"f\":null,\"move\":\"move\",\"signer\":\"signer\"}",
            1
        );

        let obj2 = unmarshal<TestObject>(json);
        let json2 = marshal<TestObject>(&obj2);
        assert!(json2 == json, 1);

        let json_val = unmarshal<JSONValue>(json);
        let json3 = marshal(&json_val);
        assert!(json3 == json, 2);

        let obj3 = unmarshal_json_value<TestObject>(json_val);
        let json4 = marshal(&obj3);
        assert!(json4 == json, 3);

        let json_obj = unmarshal<JSONObject>(json);
        let json5 = marshal(&json_obj);
        assert!(json5 == json, 4);

        assert!(
            option::extract(
                &mut get_elem<u64>(&json_obj, string::utf8(b"a"))
            ) == 42,
            4
        );
        assert!(
            option::extract(
                &mut get_elem<bool>(&json_obj, string::utf8(b"b"))
            ) == true,
            5
        );
        assert!(
            option::extract(
                &mut get_elem<vector<u8>>(&json_obj, string::utf8(b"c"))
            ) == vector[1, 2, 3],
            6
        );
        assert!(
            option::extract(
                &mut get_elem<address>(&json_obj, string::utf8(b"d"))
            ) == @0x1,
            7
        );

        set_elem(&mut json_obj, string::utf8(b"c"), &string::utf8(b"hello"));
        assert!(
            option::extract(
                &mut get_elem<String>(&json_obj, string::utf8(b"c"))
            ) == string::utf8(b"hello"),
            8
        );

        let json5 = marshal(&json_obj);
        assert!(
            json5
                == b"{\"@type\":\"/cosmos.gov.v1.MsgVote\",\"a\":\"42\",\"b\":true,\"bigdecimal\":\"0.0123\",\"biguint\":\"42\",\"c\":\"hello\",\"d\":\"0x1\",\"e\":{\"a\":\"42\",\"b\":true,\"c\":\"010203\"},\"f\":null,\"move\":\"move\",\"signer\":\"signer\"}",
            9
        );
    }

    #[test_only]
    use std::object::{Self, ConstructorRef};

    #[test]
    #[expected_failure(abort_code = 0x10006, location = Self)]
    /// cannot create other module's struct resource.
    public fun test_json_module_permission() {
        let ref = object::create_object(@std, true);
        let bz = marshal(&ref);
        let _ref2 = unmarshal<ConstructorRef>(bz);
    }
}
