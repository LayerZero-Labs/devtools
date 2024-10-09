# This will be run at the start of this testing suite,
# similar to beforeAll() in jest
setup() {
    # Load bats-assert and bats-support
    load "../lib/bats-support/load.bash"
    load "../lib/bats-assert/load.bash"

    # Install the binary so that we avoid race conditions
    npm install -g @layerzerolabs/export-deployments
}

@test "should output version" {
    npx --no @layerzerolabs/export-deployments --version
}

@test "should output help" {
    npx --no @layerzerolabs/export-deployments --help
}