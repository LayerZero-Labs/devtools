import { Box } from "ink"
import { Logo } from "./branding.js"
import React from "react"
import Spinner from "ink-spinner"

export const Placeholder: React.FC = () => (
    <>
        <Box justifyContent="center">
            <Logo />
        </Box>
        <Box justifyContent="center">
            <Spinner type="dots" />
        </Box>
    </>
)
