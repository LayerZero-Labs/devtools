// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";
import { HyperliquidBaseTest } from "./HyperliquidBase.t.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposer, IHyperAssetAmount } from "../contracts/interfaces/IHyperLiquidComposer.sol";
import { IHYPEPrecompile } from "../contracts/interfaces/IHYPEPrecompile.sol";

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";
import { HypePrecompileMock } from "./mocks/HypePrecompileMock.sol";
import { OFTMock } from "./mocks/OFTMock.sol";

import { TypeConversionTest } from "./ComposerCodec/TypeConversion.t.sol";
contract PrecompileTest is HyperliquidBaseTest {
    function setUp() public override {
        super.setUp();
    }

    function test_hype_precompile_fallback() public {
        vm.expectEmit(HYPE.assetBridgeAddress);
        emit IHYPEPrecompile.Received(address(this), AMOUNT_TO_FUND);

        uint256 balanceBefore = HYPE.assetBridgeAddress.balance;
        (bool success, ) = HYPE.assetBridgeAddress.call{ value: AMOUNT_TO_FUND }("");
        assertEq(success, true, "HYPE precompile call failed");
        assertEq(HYPE.assetBridgeAddress.balance, balanceBefore + AMOUNT_TO_FUND);
    }

    function test_spotBalancePrecompile(uint64 _balance) public {
        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ERC20.assetBridgeAddress,
            ERC20.coreIndexId,
            _balance
        );

        (bool success, bytes memory data) = HLP_PRECOMPILE_READ_SPOT_BALANCE.staticcall(
            abi.encode(ERC20.assetBridgeAddress, ERC20.coreIndexId)
        );

        assertEq(success, true, "Spot balance precompile call failed");
        assertEq(abi.decode(data, (uint64)), _balance);
    }

    function test_balanceOfHyperCore(address _address, bool _isOFT, uint64 _balance) public {
        IHyperAsset memory asset;
        if (_isOFT) {
            asset = ERC20;
        } else {
            asset = HYPE;
        }

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            _address,
            asset.coreIndexId,
            _balance
        );

        uint64 balance = hyperLiquidComposer.spotBalance(_address, asset.coreIndexId).total;

        assertEq(balance, _balance);
    }

    function test_quoteHyperCoreAmount_decimal_diff_greater_zero(uint64 _amount, bool _isOFT) public view {
        uint64 maxTransferableAmount = type(uint64).max;
        IHyperAsset memory asset;
        if (_isOFT) {
            asset = ERC20;
        } else {
            asset = HYPE;
        }

        typeConversionTest.test_into_hyperAssetAmount_decimal_diff_gt_zero(
            _amount,
            maxTransferableAmount,
            int8(18 - asset.decimalDiff)
        );
    }
}
