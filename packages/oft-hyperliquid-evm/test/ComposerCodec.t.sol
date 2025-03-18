// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";
import { HyperAsset, HyperAssetAmount } from "../contracts/interfaces/IHyperLiquidComposer.sol";

import { Test, console } from "forge-std/Test.sol";

contract ComposerCodecTest is Test {
    uint8 public constant BASE_DECIMALS = 18;

    function setUp() public {}

    function test_into_assetBridgeAddress() public pure {
        uint256 coreIndexId = 1;
        address assetBridgeAddress = HyperLiquidComposerCodec.into_assetBridgeAddress(coreIndexId);
        assertEq(assetBridgeAddress, 0x2000000000000000000000000000000000000001);
    }

    function test_into_tokenId() public pure {
        address assetBridgeAddress = 0x2000000000000000000000000000000000000001;
        uint256 tokenId = HyperLiquidComposerCodec.into_tokenId(assetBridgeAddress);
        assertEq(tokenId, 1);
    }

    function test_tokenId_assetBridgeAddress_equivalence(uint64 _coreIndexId) public pure {
        address assetBridgeAddress = HyperLiquidComposerCodec.into_assetBridgeAddress(_coreIndexId);
        uint256 tokenId = HyperLiquidComposerCodec.into_tokenId(assetBridgeAddress);
        assertEq(tokenId, _coreIndexId);
    }

    function test_into_core_amount_and_dust(uint256 amount, uint8 _coreDecimals) public pure {
        // Skip condition based on the decimal count
        // BASE_DECIMALS >= _coreDecimals + 5 for all non 0 core decimal values
        vm.assume(_coreDecimals != 0 && BASE_DECIMALS - 5 >= _coreDecimals);
        uint256 scale = 10 ** (BASE_DECIMALS - _coreDecimals);

        // Skip condition for when we are:
        // 1. under 1 core token
        // 2. over 2^64 core tokens
        // [1, 2 ** 64 * 10 ** (weiDifference)]
        vm.assume(amount > scale && amount < 2 ** 64 * scale);

        HyperAsset memory oftAsset = HyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1),
            coreIndexId: 1,
            decimalDiff: BASE_DECIMALS - _coreDecimals
        });

        HyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_core_amount_and_dust(amount, oftAsset);

        assertEq(amounts.dust, amount % scale, "dust is not equal to the remainder of the input amount");
        assertEq(amounts.evm, amount - (amount % scale), "evm amount is not equal to the input amount");
        assertEq(amounts.core, amount / scale, "core amount is not equal to the input amount");
    }
}
