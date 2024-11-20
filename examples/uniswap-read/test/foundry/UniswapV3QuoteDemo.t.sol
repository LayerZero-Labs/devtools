// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// MyOApp imports
import { UniswapV3QuoteDemo } from "../../contracts/UniswapV3QuoteDemo.sol";

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

contract UniswapV3QuoteDemoTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    UniswapV3QuoteDemo private aOApp;

    address private userA = address(0x1);

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aOApp = UniswapV3QuoteDemo(
            payable(
                _deployOApp(
                    type(UniswapV3QuoteDemo).creationCode,
                    abi.encode(address(endpoints[aEid]), DEFAULT_CHANNEL_ID)
                )
            )
        );

        address[] memory oapps = new address[](1);
        oapps[0] = address(aOApp);
        uint32[] memory channels = new uint32[](1);
        channels[0] = DEFAULT_CHANNEL_ID;
        this.wireReadOApps(oapps, channels);
    }

    function test_constructor() public {
        assertEq(aOApp.owner(), address(this));

        assertEq(address(aOApp.endpoint()), address(endpoints[aEid]));
    }
}
