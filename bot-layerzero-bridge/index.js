import { AptosClient } from 'aptos';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const APTOS_NODE_URL = 'https://aptos.testnet.bardock.movementlabs.xyz/v1';
const L2_ESCROW_ADDRESS = process.env.L2_ESCROW_ADDRESS;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const client = new AptosClient(APTOS_NODE_URL);

async function getBalance() {
    try {
        const payload = {
            function: '0x1::coin::balance',
            type_arguments: ['0x1::aptos_coin::AptosCoin'],
            arguments: [L2_ESCROW_ADDRESS],
        };

        const response = await client.view(payload);
        if (response.length > 0) {
            return response[0]; // Balance is returned as a string
        }
        throw new Error('No balance found.');
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        return null;
    }
}

async function consoleLog(balance) {
    console.log(`Account balance: ${balance / 100000000} MOVE`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function postToSlack(balance) {
    try {
        await axios.post(SLACK_WEBHOOK_URL, {
            text: `Account balance: ${balance / 100000000} MOVE`,
        });
        console.log('Posted to Slack:', balance);
    } catch (error) {
        console.error('Error posting to Slack:', error.message);
    }
}

async function main() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const balance = await getBalance();
        if (balance) {
            await consoleLog(balance);
            //await postToSlack(balance);
        }
        console.log('Waiting 10 minutes...');
        await new Promise((resolve) => setTimeout(resolve, 600000)); // Wait 10 minutes
    }
}

main().catch(console.error);
