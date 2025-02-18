// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// MyOApp imports
import { MyOAppRead } from "../../contracts/MyOAppRead.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract MyOAppReadTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    MyOAppRead private aOApp;
    MyOAppRead private bOApp;

    address private userA = address(0x1);

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aOApp = MyOAppRead(
            _deployOApp(type(MyOAppRead).creationCode, abi.encode(address(endpoints[aEid]), address(this), "OAppA"))
        );

        bOApp = MyOAppRead(
            _deployOApp(type(MyOAppRead).creationCode, abi.encode(address(endpoints[bEid]), address(this), "OAppB"))
        );

        address[] memory oapps = new address[](2);
        oapps[0] = address(aOApp);
        oapps[1] = address(bOApp);
        uint32[] memory channels = new uint32[](1);
        channels[0] = DEFAULT_CHANNEL_ID;
        this.wireReadOApps(oapps, channels);
    }

    function test_constructor() public {
        assertEq(aOApp.owner(), address(this));
        assertEq(bOApp.owner(), address(this));

        assertEq(address(aOApp.endpoint()), address(endpoints[aEid]));
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
    }

    function test_send_read() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(1e8, 100, 0);

        MyOAppRead.EvmReadRequest[] memory readRequests = new MyOAppRead.EvmReadRequest[](1);
        readRequests[0] = MyOAppRead.EvmReadRequest({
            appRequestLabel: 1,
            targetEid: aEid,
            isBlockNum: true,
            blockNumOrTimestamp: uint64(block.number),
            confirmations: 1,
            to: address(aOApp)
        });
        MyOAppRead.EvmComputeRequest memory computeRequest = MyOAppRead.EvmComputeRequest({
            computeSetting: 3, // MapReduce
            targetEid: aEid,
            isBlockNum: true,
            blockNumOrTimestamp: uint64(block.number),
            confirmations: 1,
            to: address(aOApp)
        });

        MessagingFee memory fee = aOApp.quote(DEFAULT_CHANNEL_ID, 1, readRequests, computeRequest, options, false);

        assertEq(aOApp.data(), abi.encode("Nothing received yet."));
        assertEq(bOApp.data(), abi.encode("Nothing received yet."));

        vm.prank(userA);
        aOApp.send{ value: fee.nativeFee }(DEFAULT_CHANNEL_ID, 1, readRequests, computeRequest, options);
        verifyPackets(aEid, addressToBytes32(address(aOApp)), 0, address(0x0), abi.encode("Test"));

        assertEq(aOApp.data(), abi.encode("Test"));
    }
}
