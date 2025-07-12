// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// OApp imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOVaultComposer, FailedState } from "../../contracts/interfaces/IOVaultComposer.sol";
import { OVaultComposer } from "../../contracts/OVaultComposer.sol";

import { OVaultComposerBaseTest } from "./OVaultComposer_Base.t.sol";
import { console } from "forge-std/console.sol";

contract OVaultComposerE2ETest is OVaultComposerBaseTest {
    using OptionsBuilder for bytes;

    /// @dev Not profiled
    uint128 constant lzReceiveGasValue = 800_000;
    uint128 constant lzComposeGasValue = 800_000;

    /// @dev Seems to consume about 2.2 gwei
    uint128 constant lzComposeMsgValue = 0.000025 ether;

    function setUp() public virtual override {
        super.setUp();

        vm.deal(userA, 1000 ether);
    }

    function test_E2E_ethereum_to_polygon() public {
        (uint256 shareTokensToReceive, ) = _removeDustWithOffset(TOKENS_TO_SEND * 2, -1);

        deal(address(assetOFT_eth), userA, TOKENS_TO_SEND);

        (uint256 mintAssets, ) = _setTradeRatioAssetToShare(1, 2);

        address composerAddress = address(OVaultComposerArb);
        uint256 initialPolygonBalance = shareOFT_pol.balanceOf(userA);

        /// @dev This is the send param that is passed as the compose payload to the final OFT
        SendParam memory arbToPolSendParam = SendParam(
            POL_EID,
            addressToBytes32(userA),
            0,
            shareTokensToReceive,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(lzReceiveGasValue, 0),
            "",
            ""
        );
        bytes memory composePayload = abi.encode(arbToPolSendParam);

        /// @dev Building the NativeMesh ETH -> NativeMesh Arb send param
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(lzReceiveGasValue, 0)
            .addExecutorLzComposeOption(0, lzComposeGasValue, lzComposeMsgValue);

        SendParam memory ethToArbSendParam = SendParam(
            ARB_EID,
            addressToBytes32(composerAddress),
            TOKENS_TO_SEND,
            (TOKENS_TO_SEND * 9995) / 10000,
            options,
            composePayload,
            ""
        );

        MessagingFee memory fee = assetOFT_eth.quoteSend(ethToArbSendParam, false);

        vm.startPrank(userA);
        assetOFT_eth.send{ value: fee.nativeFee }(ethToArbSendParam, fee, payable(address(this)));
        vm.stopPrank();

        assertEq(assetOFT_arb.balanceOf(address(oVault_arb)), assetOFT_arb.totalSupply(), mintAssets);

        verifyPackets(ARB_EID, addressToBytes32(address(assetOFT_arb)));

        assertEq(
            assetOFT_arb.balanceOf(composerAddress) + assetOFT_arb.balanceOf(address(oVault_arb)),
            assetOFT_arb.totalSupply(),
            mintAssets + TOKENS_TO_SEND
        );

        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            TOKENS_TO_SEND,
            abi.encodePacked(addressToBytes32(userA), composePayload)
        );

        vm.prank(arbEndpoint);
        vm.deal(address(arbEndpoint), 1000 ether);
        OVaultComposerArb.lzCompose{ value: lzComposeMsgValue, gas: lzComposeGasValue }(
            address(assetOFT_arb),
            addressToBytes32(address(assetOFT_arb)),
            composeMsg,
            address(this),
            ""
        );

        assertEq(
            assetOFT_arb.balanceOf(composerAddress),
            0,
            "composerAddress should have the no tokens after lzCompose on arb"
        );

        verifyPackets(POL_EID, addressToBytes32(address(shareOFT_pol)));
        uint256 finalPolygonBalance = shareOFT_pol.balanceOf(userA);

        assertEq(
            finalPolygonBalance - initialPolygonBalance,
            shareTokensToReceive,
            "userA should have all tokens after lzReceive on polygon share oft"
        );
    }
}
