// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperAsset, IHyperAssetAmount } from "../../contracts/interfaces/IHyperLiquidComposerCore.sol";

import { Test, console } from "forge-std/Test.sol";

contract TypeConversionTest is Test {
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

    function test_into_hyperAssetAmount_without_overflow(uint64 amount, uint8 _coreDecimals) public {
        // Skip condition based on the decimal count
        // BASE_DECIMALS >= _coreDecimals + 5 for all non 0 core decimal values
        _coreDecimals = uint8(bound(_coreDecimals, 1, BASE_DECIMALS - 5));
        uint256 scale = 10 ** (BASE_DECIMALS - _coreDecimals);

        // Skip condition for when we are:
        // 1. under 1 core token
        // 2. over 2^64-1 core tokens
        // [1, 2 ** 64 * 10 ** (weiDifference))
        amount = uint64(bound(amount, scale, type(uint64).max * scale - 1));

        IHyperAsset memory oftAsset = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1),
            coreIndexId: 1,
            decimalDiff: BASE_DECIMALS - _coreDecimals
        });

        IHyperAssetAmount memory amounts = HyperLiquidComposerCodec.into_hyperAssetAmount(
            amount,
            type(uint64).max,
            oftAsset
        );

        assertEq(amounts.evm, amounts.core * scale, "evm and core amounts should differ by a factor of scale");
        assertEq(amounts.dust + amounts.evm, amount, "dust + evm is not equal to the input amount");

        assertEq(amounts.dust, amount % scale, "dust is not equal to the remainder of the input amount");
        assertEq(amounts.evm, amount - (amount % scale), "evm amount is not equal to the input amount");
        assertEq(amounts.core, amount / scale, "core amount is not equal to the input amount");
    }

    function test_into_hyperAssetAmount_with_overflow(
        uint64 amount,
        uint64 maxAmountTransferable,
        uint8 _coreDecimals
    ) public {
        // Skip condition based on the decimal count
        // BASE_DECIMALS >= _coreDecimals + 5 for all non 0 core decimal values
        _coreDecimals = uint8(bound(_coreDecimals, 1, BASE_DECIMALS - 5));
        uint256 scale = 10 ** (BASE_DECIMALS - _coreDecimals);

        // Skip condition for when we are:
        // 1. under 1 core token
        // 2. over 2^64-1 core tokens
        // [1, 2 ** 64 * 10 ** (weiDifference))
        amount = uint64(bound(amount, scale, type(uint64).max * scale - 1));

        IHyperAsset memory oftAsset = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(1),
            coreIndexId: 1,
            decimalDiff: BASE_DECIMALS - _coreDecimals
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

    function test_bytes20_into_address(address _addr) public pure {
        address decodedAddress = abi.decode(bytes.concat(addressToBytes32(_addr)), (address));
        assertEq(decodedAddress, _addr);
    }

    function test_bytes32_into_address(bytes32 _byte32String) public {
        bytes memory byte32String = bytes.concat(_byte32String);
        bool res = this.areFirst12BytesZero(byte32String);

        if (!res) {
            // If we have a non evm address (i.e. a bytes32 string - we do not expect this is decode)
            vm.expectRevert();
            abi.decode(bytes.concat(_byte32String), (address));
        } else {
            // We expect all bytes20 strings to be decoded as an address
            abi.decode(bytes.concat(_byte32String), (address));
        }
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function areFirst12BytesZero(bytes calldata _bytes) external pure returns (bool) {
        bytes memory zeros = hex"000000000000000000000000";
        return keccak256(_bytes[0:12]) == keccak256(zeros);
    }
}
