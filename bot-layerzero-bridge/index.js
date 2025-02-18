import { AptosClient } from 'aptos';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const APTOS_NODE_URL = 'https://aptos.testnet.bardock.movementlabs.xyz/v1';
const ACCOUNT_ADDRESS = '0x81cffadc0a1ae311cf9485e0fe85b4679bfa7f10fdebcc740d9b24eeedfc5326';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const client = new AptosClient(APTOS_NODE_URL);

async function getBalance() {
    try {
        const payload = {
            function: '0x1::coin::balance',
            type_arguments: ['0x1::aptos_coin::AptosCoin'],
            arguments: [ACCOUNT_ADDRESS],
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
            await postToSlack(balance);
        }
        console.log('Waiting 10 minutes...');
        await new Promise((resolve) => setTimeout(resolve, 600000)); // Wait 10 minutes
    }
}

main().catch(console.error);
