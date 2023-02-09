import { cli } from "cli-ux";
import fs from "fs";
import path from "path";

export const promptToProceed = async (msg: string, noPrompt: boolean = false) => {
	if (!noPrompt) {
		const proceed = await cli.prompt(`${msg} Y/N`);
		if (!["y", "yes"].includes(proceed.toLowerCase())) {
			console.log("Aborting...");
			process.exit(0);
		}
	}
}

export const arrayToCsv = (columns: string[], data: any) => 
	columns.join(",").concat("\n").concat(data.map((row: any) => row
		.map(String) // convert every value to String
		.map((v: any) => (v === "undefined" ? "" : v))
		.map((v: any) => v.replace(/"/g, '""')) // escape double colons
		.map((v: any) => `"${v}"`) // quote it
		.join(",") // comma-separated
	)
	.join("\r\n") // rows starting on new lines
);

export const writeToCsv = async (fileName: string, columns: string[], transactionByNetwork: any[]) => {
	const data = transactionByNetwork.reduce((acc, { network, transactions }) => {
		transactions.forEach((tx: any) => {
			acc.push([
				network,
				...columns.map((key) => {
					const keys = key.split("/");
					for (const field in tx) {
						if (keys.includes(field)) {
							if (typeof tx[field] === "object") {
								return JSON.stringify(tx[field]);
							} else {
								return tx[field];
							}
						}
					}
				}),
			]);
		});
		return acc;
	}, []);
	fs.writeFileSync(fileName, arrayToCsv(["network"].concat(columns), data));
	console.log(`Full configuration written to: ${fileName}`);
};
