// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

import { OAppSender } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { HypePrecompileMock } from "@layerzerolabs/hyperliquid-composer/test/mocks/HypePrecompileMock.sol";
import { SpotBalancePrecompileMock } from "@layerzerolabs/hyperliquid-composer/test/mocks/SpotBalancePrecompileMock.sol";
import { HyperLiquidComposerCodec } from "@layerzerolabs/hyperliquid-composer/contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperAsset } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MyHyperLiquidComposer } from "../../contracts/MyHyperLiquidComposer.sol";
import { MyOFT } from "../../contracts/MyOFT.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { console } from "forge-std/console.sol";

contract MyHyperLiquidOFTTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    IHyperAsset public OFT;
    IHyperAsset public HYPE;

    uint32 internal constant SRC_EID = 1;
    uint32 internal constant DST_EID = 2;

    string internal constant SRC_OFT_NAME = "srcOFT";
    string internal constant SRC_OFT_SYMBOL = "srcOFT";
    string internal constant DST_OFT_NAME = "dstOFT";
    string internal constant DST_OFT_SYMBOL = "dstOFT";

    int64 internal constant OFT_DECIMALS_EVM = 18;
    int64 internal constant OFT_DECIMALS_HYPECORE = 6;
    int64 internal constant WEI_DIFF = OFT_DECIMALS_EVM - OFT_DECIMALS_HYPECORE;

    // https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant HYPERLIQUID_PRECOMPILE = 0x2222222222222222222222222222222222222222;
    address public constant SPOT_BALANCE_PRECOMPILE = 0x0000000000000000000000000000000000000801;
    MyOFT internal srcOFT;
    MyOFT internal dstOFT;

    MyHyperLiquidComposer internal dstLZComposer;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");
    uint64 public oftHlIndexId = 1;
    uint64 public hypeHlIndexId = 1105;

    uint256 public initialBalance = 100 ether;
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        OFT = IHyperAsset({
            assetBridgeAddress: HyperLiquidComposerCodec.into_assetBridgeAddress(oftHlIndexId),
            coreIndexId: oftHlIndexId,
            decimalDiff: OFT_DECIMALS_EVM - OFT_DECIMALS_HYPECORE
        });

        HYPE = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: hypeHlIndexId,
            decimalDiff: 10
        });

        HypePrecompileMock hypePrecompileMock = new HypePrecompileMock();
        vm.etch(HYPERLIQUID_PRECOMPILE, address(hypePrecompileMock).code);

        SpotBalancePrecompileMock spotBalancePrecompileMock = new SpotBalancePrecompileMock();
        vm.etch(SPOT_BALANCE_PRECOMPILE, address(spotBalancePrecompileMock).code);

        spotBalancePrecompileMock.setSpotBalance(OFT.assetBridgeAddress, oftHlIndexId, type(uint64).max);
        spotBalancePrecompileMock.setSpotBalance(HYPE.assetBridgeAddress, hypeHlIndexId, type(uint64).max);

        vm.deal(userA, initialNativeBalance);
        vm.deal(userB, initialNativeBalance);

        super.setUp();

        setUpEndpoints(2, LibraryType.UltraLightNode);

        srcOFT = new MyOFT(SRC_OFT_NAME, SRC_OFT_SYMBOL, address(endpoints[SRC_EID]), address(this));
        dstOFT = new MyOFT(DST_OFT_NAME, DST_OFT_SYMBOL, address(endpoints[DST_EID]), address(this));

        dstLZComposer = new MyHyperLiquidComposer(address(endpoints[DST_EID]), address(dstOFT), oftHlIndexId, WEI_DIFF);

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(srcOFT);
        ofts[1] = address(dstOFT);
        this.wireOApps(ofts);

        // mint tokens
        deal(address(srcOFT), userA, initialBalance);
    }

    function test_deployment() public view {
        assertEq(srcOFT.owner(), address(this));
        assertEq(dstOFT.owner(), address(this));

        assertEq(srcOFT.balanceOf(userA), initialBalance);

        assertEq(srcOFT.token(), address(srcOFT));
        assertEq(dstOFT.token(), address(dstOFT));

        (bytes4 interfaceId, ) = srcOFT.oftVersion();
        bytes4 expectedId = 0x02e49c2c;
        assertEq(interfaceId, expectedId);
    }

    function test_send_oft_no_compose_msg(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory composeMsg = "";

        assertEq(srcOFT.balanceOf(userA), initialBalance);
        assertEq(dstOFT.balanceOf(userB), 0);

        (, OFTReceipt memory oftReceipt) = send_oft_AB(options, composeMsg, userB);

        assert_post_lz_receive_state(userA, userB, address(dstOFT), oftReceipt);
    }

    function send_oft_AB(
        bytes memory options,
        bytes memory composeMsg,
        address to
    ) public returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        uint256 tokensToSend = 1 ether;

        SendParam memory sendParam = SendParam(
            DST_EID,
            addressToBytes32(to),
            tokensToSend,
            (tokensToSend * 9_500) / 10_000, // allow 1% slippage
            options,
            composeMsg,
            ""
        );

        MessagingFee memory fee = srcOFT.quoteSend(sendParam, false);

        vm.startPrank(userA);
        srcOFT.approve(address(srcOFT), sendParam.amountLD);
        (msgReceipt, oftReceipt) = srcOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        verifyPackets(DST_EID, addressToBytes32(address(dstOFT)));
    }

    function assert_post_lz_receive_state(
        address shouldLooseTokens,
        address shouldGainTokens,
        address shouldNotChange,
        OFTReceipt memory oftReceipt
    ) public view {
        assertEq(srcOFT.balanceOf(shouldLooseTokens), initialBalance - oftReceipt.amountSentLD);
        assertEq(dstOFT.balanceOf(shouldGainTokens), oftReceipt.amountReceivedLD);
        assertEq(dstOFT.balanceOf(shouldNotChange), 0);
    }
}
