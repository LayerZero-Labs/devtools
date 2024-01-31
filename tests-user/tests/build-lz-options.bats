# This will be run at the start every test,
# similar to beforeEach() in jest
setup() {
    # Load bats-assert and bats-support
    load "../lib/bats-support/load.bash"
    load "../lib/bats-assert/load.bash"
}

@test "should output version" {
    npx --yes build-lz-options --version
}

@test "should not have binding problems" {
    run npx --yes build-lz-options --version

    refute_output --partial "Failed to load bindings"
}