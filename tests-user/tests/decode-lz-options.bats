# This will be run at the start of this testing suite,
# similar to beforeAll() in jest
setup() {
    # Load bats-assert and bats-support
    load "../lib/bats-support/load.bash"
    load "../lib/bats-assert/load.bash"
}

@test "should output version" {
    npx --yes decode-lz-options --version
}