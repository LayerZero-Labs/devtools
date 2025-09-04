// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperAssetAmount } from "../../contracts/interfaces/IHyperLiquidComposer.sol";

import { Test, console } from "forge-std/Test.sol";

contract TypeConversionTest is Test {
    int8 MIN_DECIMAL_DIFF = -2;
    int8 MAX_DECIMAL_DIFF = 8;

    uint64 MAX_TRANSFER_PER_TX = type(uint64).max;

    function setUp() public {}

    function test_into_assetBridgeAddress() public pure {
        uint64 coreIndexId = 1;
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

    function test_into_hyperAssetAmount_decimal_diff_leq_zero(
        uint256 amount,
        uint64 bridgeSupply,
        int8 evmExtraWeiDecimals
    ) public view {
        // Skip condition based on the decimal count
        evmExtraWeiDecimals = int8(bound(evmExtraWeiDecimals, MIN_DECIMAL_DIFF, 0));
        vm.assume(amount > 1e12); // shared decimals

        uint256 scale = 10 ** uint8(-1 * evmExtraWeiDecimals);
        vm.assume(amount < bridgeSupply / scale);

        IHyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_hyperAssetAmount(
            amount,
            bridgeSupply,
            evmExtraWeiDecimals
        );

        assertEq(amounts.evm, amounts.core / scale, "evm and core amounts should differ by a factor of scale");
    }

    function test_into_hyperAssetAmount_decimal_diff_gt_zero(
        uint256 amount,
        uint64 bridgeSupply,
        int8 evmExtraWeiDecimals
    ) public view {
        evmExtraWeiDecimals = int8(bound(evmExtraWeiDecimals, 0, MAX_DECIMAL_DIFF));
        vm.assume(amount > 1e12); // shared decimals

        uint256 scale = 10 ** uint8(evmExtraWeiDecimals);
        vm.assume(amount < bridgeSupply * scale);

        IHyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_hyperAssetAmount(
            amount,
            bridgeSupply,
            evmExtraWeiDecimals
        );

        assertEq(amounts.evm, scale * amounts.core, "evm and core amounts should differ by a factor of scale");
    }
}
