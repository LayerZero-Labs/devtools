

-include .env

ifeq ($(network),local)
	VERIFICATION_SETTING := --chain-id 1 --watch --etherscan-api-key $(ETHERSCAN_API_KEY) --verifier-url https://api-amoy.polygonscan.com/api
	NETWORK_ARGS := --rpc-url $(LOCAL_RPC_URL) --broadcast --verify -vvvv
	TEST_NETWORK_ARGS := --fork-url $(LOCAL_RPC_URL)
endif

ifeq ($(network),fuji)
	VERIFICATION_SETTING := --chain-id 43113 --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract
	NETWORK_ARGS := --rpc-url $(AVALANCHE_FUJI_URL) $(VERIFICATION_SETTING) --broadcast --verify -vvvv
	TEST_NETWORK_ARGS := --fork-url $(AVALANCHE_FUJI_URL)
endif

ifeq ($(network),amoy)
	VERIFICATION_SETTING := --chain-id 80002 --verifier-url https://api-amoy.polygonscan.com/api --etherscan-api-key $(POLYGONSCAN_API_KEY)
	NETWORK_ARGS := --rpc-url $(POLYGON_AMOY_RPC) --broadcast --verify $(VERIFICATION_SETTING) -vvvv
	TEST_NETWORK_ARGS := --fork-url $(POLYGON_AMOY_RPC) 
endif


ifneq ($(constructor_signature),)	
	CONSTRUCTOR_COMMAND := $(shell cast abi-encode "$(constructor_signature)" $(input_parameters))
	VERIFY_COMMAND := $(contract_address) $(contract) $(VERIFICATION_SETTING) --constructor-args $(CONSTRUCTOR_COMMAND)
else
	VERIFY_COMMAND := $(contract_address) $(contract) $(VERIFICATION_SETTING)
endif

ifneq ($(test),)
	TEST_ARGS := --mt $(test)
endif

run_test:;
	forge test $(TEST_ARGS) $(TEST_NETWORK_ARGS) -vvvvv

run_coverage:;
	forge coverage --mp "test/unit/*" --report lcov

coverage_report:;
	lcov --remove lcov.info "/test/*" "/script/*" -o lcov.info && genhtml lcov.info --branch-coverage --output-dir coverage

deploy_proxy:;
	forge script deploy/OmniCallRealTest.s.sol $(NETWORK_ARGS)

verify:;	
	forge verify-contract $(VERIFY_COMMAND)

	