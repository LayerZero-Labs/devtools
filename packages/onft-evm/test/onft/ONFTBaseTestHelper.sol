// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

abstract contract ONFTBaseTestHelper is TestHelperOz5 {
    uint256 internal constant INITIAL_NATIVE_BALANCE = 1000 ether;

    uint32 internal constant A_EID = 1;
    uint32 internal constant B_EID = 2;
    uint32 internal constant C_EID = 3;
    uint32 internal constant D_EID = 4;
    uint8 internal constant NUM_ENDPOINTS = 4;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");
    address internal david = makeAddr("david");

    function setUp() public virtual override {
        super.setUp();
        setUpEndpoints(NUM_ENDPOINTS, LibraryType.UltraLightNode);
        _deal();
    }

    /// @dev deal initial native balance to alice, bob, charlie
    function _deal() internal virtual {
        vm.deal(alice, INITIAL_NATIVE_BALANCE);
        vm.deal(bob, INITIAL_NATIVE_BALANCE);
        vm.deal(charlie, INITIAL_NATIVE_BALANCE);
        vm.deal(david, INITIAL_NATIVE_BALANCE);
    }

    function sliceUintArray(uint[] memory array, uint start, uint end) public pure returns (uint[] memory) {
        if (start == end) return new uint[](0);
        require(end <= array.length, "end index out of bounds");

        uint length = end - start;
        uint[] memory slicedArray = new uint[](length);

        for (uint i = 0; i < length; i++) {
            slicedArray[i] = array[start + i];
        }

        return slicedArray;
    }
}
