import {Script} from "forge-std/Script.sol";
import {MOVEOFTAdapter} from "../contracts/MOVEOFTAdapter.sol";

contract MOVEOFTAdapterScript is Script {
    
    MOVEOFTAdapter public adapter;
    address public move;
    address public lzEndpoint;
    address public delegate;
    uint32 public movementEid;

    function run() public {

        MOVEOFTAdapter.RateLimitConfig[] memory rateLimitConfigs = new MOVEOFTAdapter.RateLimitConfig[](2);
        rateLimitConfig[0] = MOVEOFTAdapter.RateLimitConfig({
            eid: movementEid,
            maxAmount: 10000000 * 10**1e8,
            window: 1 days
        });
        rateLimitConfig[1] = MOVEOFTAdapter.RateLimitConfig({
            eid: 1,
            maxAmount: 0,
            window: 1 days
        });
        // Deploy the adapter
        adapter = new MOVEOFTAdapter(
                move,
                lzEndpoint,
                delegate,
                rateLimitConfigs
            );
        
        
    }
}