// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperAsset, IHyperAssetAmount } from "../../contracts/interfaces/IHyperLiquidComposerCore.sol";

import { Test, console } from "forge-std/Test.sol";

contract TypeConversionTest is Test {
    int8 MIN_DECIMAL_DIFF = -2;
    int8 MAX_DECIMAL_DIFF = 8;

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

    function test_into_hyperAssetAmount_decimal_diff_leq_zero(
        uint64 amount,
        uint64 maxAmountTransferable,
        int8 evmExtraWeiDecimals
    ) public {
        // Skip condition based on the decimal count
        evmExtraWeiDecimals = int8(bound(evmExtraWeiDecimals, MIN_DECIMAL_DIFF, 0));

        uint256 scale = 10 ** uint8(-1 * evmExtraWeiDecimals);

        // Skip condition for when we are:
        // 1. under 1 core token
        // 2. over 2^64-1 core tokens
        // [1, 2 ** 64 * 10 ** (weiDifference))
        amount = uint64(bound(amount, 0, type(uint64).max * scale - 1));

        IHyperAsset memory oftAsset = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1),
            coreIndexId: 1,
            decimalDiff: evmExtraWeiDecimals
        });

        IHyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_hyperAssetAmount(
            amount,
            maxAmountTransferable,
            oftAsset
        );

        uint256 expectedDust = 0;
        uint256 expectedEvm = amount;
        uint256 expectedCore = amount * scale;

        if (amount * scale > maxAmountTransferable) {
            expectedCore = maxAmountTransferable;
            expectedEvm = expectedCore / scale;
            expectedDust = amount - expectedEvm;
        }

        assertEq(amounts.dust, expectedDust, "dust should be zero");
        assertEq(amounts.dust + amounts.evm, amount, "dust + evm is not equal to the input amount");
        assertEq(amounts.evm, amounts.core / scale, "evm and core amounts should differ by a factor of scale");
        assertEq(amounts.core, expectedCore, "core amount is not equal to the input amount");
    }
    function test_into_hyperAssetAmount_decimal_diff_gt_zero(
        uint64 amount,
        uint64 maxAmountTransferable,
        int8 evmExtraWeiDecimals
    ) public {
        // Skip condition based on the decimal count
        evmExtraWeiDecimals = int8(bound(evmExtraWeiDecimals, 1, MAX_DECIMAL_DIFF));
        uint256 scale = 10 ** uint8(evmExtraWeiDecimals);

        // Skip condition for when we are:
        // 1. under 1 core token
        // 2. over 2^64-1 core tokens
        // [1, 2 ** 64 * 10 ** (weiDifference))
        amount = uint64(bound(amount, scale, type(uint64).max * scale - 1));

        IHyperAsset memory oftAsset = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1),
            coreIndexId: 1,
            decimalDiff: evmExtraWeiDecimals
        });

        IHyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_hyperAssetAmount(
            amount,
            maxAmountTransferable,
            oftAsset
        );

        uint256 expectedDust = amount % scale;
        uint256 expectedEvm = amount - expectedDust;
        uint256 expectedCore = amount / scale;

        assertEq(amounts.evm, amounts.core * scale, "evm and core amounts should differ by a factor of scale");
        assertEq(amounts.dust + amounts.evm, amount, "dust + evm is not equal to the input amount");

        if (amount > maxAmountTransferable * scale) {
            uint256 overflowAmount = amount - (maxAmountTransferable * scale) - expectedDust;
            expectedDust += overflowAmount;
            expectedEvm -= overflowAmount;
            expectedCore -= overflowAmount / scale;
        }

        assertEq(amounts.dust, expectedDust, "dust is not equal to the remainder of the input amount");
        assertEq(amounts.evm, expectedEvm, "evm amount is not equal to the input amount");
        assertEq(amounts.core, expectedCore, "core amount is not equal to the input amount");
    }
}
