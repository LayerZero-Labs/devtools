import React from "react";
import { render } from "ink";
import { Logo } from "./components/logo";

export const printLogo = () => render(<Logo />).unmount();
