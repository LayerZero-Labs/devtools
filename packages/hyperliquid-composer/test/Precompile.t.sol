// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test, console } from "forge-std/Test.sol";

import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

import { IHyperAsset, IHyperAssetAmount } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";
import { IHyperLiquidComposerCore } from "../contracts/interfaces/IHyperLiquidComposerCore.sol";
import { IHYPEPrecompile } from "../contracts/interfaces/IHYPEPrecompile.sol";

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { SpotBalancePrecompileMock } from "./mocks/SpotBalancePrecompileMock.sol";
import { HypePrecompileMock } from "./mocks/HypePrecompileMock.sol";
import { OFTMock } from "./mocks/OFTMock.sol";

import { TypeConversionTest } from "./ComposerCodec/TypeConversion.t.sol";
contract PrecompileTest is Test {
    IHyperAsset public ALICE;
    IHyperAsset public HYPE;
    OFTMock public oft;
    HyperLiquidComposer public hyperLiquidComposer;
    TypeConversionTest public typeConversionTest;

    address public constant HL_LZ_ENDPOINT_V2 = 0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1;
    address public constant HLP_PRECOMPILE_WRITE = 0x3333333333333333333333333333333333333333;
    address public constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    uint64 public constant AMOUNT_TO_SEND = 1e18;
    uint64 public constant AMOUNT_TO_FUND = 100 gwei;
    uint64 public constant DUST = 1 wei;

    function setUp() public {
        // Skip test if fork fails
        try vm.createSelectFork("https://rpc.hyperliquid-testnet.xyz/evm") {} catch {
            console.log("Forking testnet https://rpc.hyperliquid-testnet.xyz/evm failed");
            vm.skip(true);
        }

        ALICE = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1231),
            coreIndexId: 1231,
            decimalDiff: 18 - 6
        });

        HYPE = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: 1105,
            decimalDiff: 18 - 10
        });

        vm.etch(HLP_PRECOMPILE_READ_SPOT_BALANCE, address(new SpotBalancePrecompileMock()).code);
        oft = new OFTMock("test", "test", HL_LZ_ENDPOINT_V2, msg.sender);
        hyperLiquidComposer = new HyperLiquidComposer(
            HL_LZ_ENDPOINT_V2,
            address(oft),
            ALICE.coreIndexId,
            ALICE.decimalDiff
        );
        typeConversionTest = new TypeConversionTest();
    }

    function test_hype_precompile_fallback() public {
        vm.expectEmit(HYPE.assetBridgeAddress);
        emit IHYPEPrecompile.Received(address(this), AMOUNT_TO_FUND);

        uint256 balanceBefore = HYPE.assetBridgeAddress.balance;
        (bool success, ) = HYPE.assetBridgeAddress.call{ value: AMOUNT_TO_FUND }("");
        assertEq(success, true, "HYPE precompile call failed");
        assertEq(HYPE.assetBridgeAddress.balance, balanceBefore + AMOUNT_TO_FUND);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_spotBalancePrecompile(uint64 _balance) public {
        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            ALICE.assetBridgeAddress,
            ALICE.coreIndexId,
            _balance
        );

        (bool success, bytes memory data) = HLP_PRECOMPILE_READ_SPOT_BALANCE.staticcall(
            abi.encode(ALICE.assetBridgeAddress, ALICE.coreIndexId)
        );

        assertEq(success, true, "Spot balance precompile call failed");
        assertEq(abi.decode(data, (uint64)), _balance);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_balanceOfHyperCore(address _address, bool _isOFT, uint64 _balance) public {
        IHyperAsset memory asset;
        if (_isOFT) {
            asset = ALICE;
        } else {
            asset = HYPE;
        }

        SpotBalancePrecompileMock(HLP_PRECOMPILE_READ_SPOT_BALANCE).setSpotBalance(
            _address,
            asset.coreIndexId,
            _balance
        );

        uint64 balance = hyperLiquidComposer.balanceOfHyperCore(_address, asset.coreIndexId);

        assertEq(balance, _balance);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_quoteHyperCoreAmount_decimal_diff_greater_zero(uint64 _amount, bool _isOFT) public view {
        uint64 maxTransferableAmount = type(uint64).max;
        IHyperAsset memory asset;
        if (_isOFT) {
            asset = ALICE;
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
