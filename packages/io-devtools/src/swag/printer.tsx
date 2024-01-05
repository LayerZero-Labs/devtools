import React from "react";
import { render } from "ink";
import { Logo } from "./components/logo";
import { RecordList, RecordData, Record } from "./components/record";

export const printLogo = () => render(<Logo />).unmount();

export const printRecord = (data: RecordData) =>
  render(<Record data={data} />).unmount();

export const printRecords = (data: RecordData[]) =>
  render(<RecordList data={data} />).unmount();
