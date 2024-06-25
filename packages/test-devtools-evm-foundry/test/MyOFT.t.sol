// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { OFTMock } from "./mocks/OFTMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTCore.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "../contracts/TestHelperOz5.sol";

contract MyOFTTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;

    OFTMock aOFT;
    OFTMock bOFT;

    address public userA = address(0x1);
    address public userB = address(0x2);
    uint256 public initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aOFT = OFTMock(
            _deployOApp(type(OFTMock).creationCode, abi.encode("aOFT", "aOFT", address(endpoints[aEid]), address(this)))
        );

        bOFT = OFTMock(
            _deployOApp(type(OFTMock).creationCode, abi.encode("bOFT", "bOFT", address(endpoints[bEid]), address(this)))
        );

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);

        // mint tokens
        aOFT.mint(userA, initialBalance);
        bOFT.mint(userB, initialBalance);
    }

    function test_verify_execute_receive_simple_send_works() public {
        uint256 tokensToSend = 9 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        vm.prank(userA);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));

        // should revert if more than 10 ether is sent
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0), bytes(""), bytes(""));
    }

    function test_verify_execute_receive_revert() public {
        uint256 tokensToSend = 11 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        vm.prank(userA);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));

        // should revert if more than 10 ether is sent
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0), abi.encodePacked(OFTMock.DummyLzReceiveError.selector, tokensToSend), bytes(""));
    }
}
