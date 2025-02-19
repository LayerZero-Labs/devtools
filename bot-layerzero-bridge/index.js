import { AptosClient } from 'aptos';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const APTOS_NODE_URL = 'https://aptos.testnet.bardock.movementlabs.xyz/v1';
const L2_ESCROW_ADDRESS = process.env.L2_ESCROW_ADDRESS;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const L1_RATE_LIMIT = parseFloat(process.env.L1_RATE_LIMIT); // Daily limit in MOVE
const L1_OAPP = process.env.L1_OAPP;
const L2_OAPP = process.env.L2_OAPP;
const NETWORK = process.env.NETWORK || 'Unknown Network'; // Default to prevent crashes

const client = new AptosClient(APTOS_NODE_URL);

// Threshold levels based on multiples of L1 rate limit
const THRESHOLDS = {
    WARN: 3.5,
    ALERT: 3.2,
    CRITICAL: 3.0,
    OVERDUE: 2.9,
};

let lastAlertLevel = null; // Track last sent alert

async function getBalance() {
    try {
        const payload = {
            function: '0x1::coin::balance',
            type_arguments: ['0x1::aptos_coin::AptosCoin'],
            arguments: [L2_ESCROW_ADDRESS],
        };

        const response = await client.view(payload);
        if (response.length > 0) {
            return parseFloat(response[0]) / 100000000; // Convert to MOVE
        }
        throw new Error('No balance found.');
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        return null;
    }
}

async function checkThresholds(balance) {
    const currentMultiplier = balance / L1_RATE_LIMIT;

    let alertMessage = null;
    let alertLevel = null;
    let sendRepeatedAlerts = false;

    if (currentMultiplier < THRESHOLDS.OVERDUE) {
        alertMessage =
            `🚨 *URGENT: L2 Escrow Critically Low* 🚨\n` +
            `The L2 escrow balance is *${balance.toFixed(2)} MOVE* (below 2.9x daily limit). Immediate top-up required!\n` +
            `🔗 *Network:* ${NETWORK}\n` +
            `🔷 *L1 OApp:* ${L1_OAPP}\n` +
            `🔶 *L2 OApp:* ${L2_OAPP}\n` +
            `⚠️ Take action now to avoid issues!`;
        alertLevel = 'OVERDUE';
        sendRepeatedAlerts = true;
    } else if (currentMultiplier < THRESHOLDS.CRITICAL) {
        alertMessage =
            `⚠️ *Critical Alert: L2 Escrow Needs Topping Up* ⚠️\n` +
            `Current balance: *${balance.toFixed(2)} MOVE* (below 3x daily limit).\n` +
            `💡 Consider topping it up to 4x the daily rate.\n` +
            `🔗 *Network:* ${NETWORK}\n` +
            `🔷 *L1 OApp:* \`${L1_OAPP}\`\n` +
            `🔶 *L2 OApp:* \`${L2_OAPP}\``;
        alertLevel = 'CRITICAL';
    } else if (currentMultiplier < THRESHOLDS.ALERT) {
        alertMessage =
            `🔴 *Warning: L2 Escrow Dropping* 🔴\n` +
            `Balance has dropped to *${balance.toFixed(2)} MOVE* (below o3.2x daily limit). Keep an eye on it.\n` +
            `🔗 *Network:* ${NETWORK}\n` +
            `🔷 *L1 OApp:* \`${L1_OAPP}\`\n` +
            `🔶 *L2 OApp:* \`${L2_OAPP}\``;
        alertLevel = 'ALERT';
    } else if (currentMultiplier < THRESHOLDS.WARN) {
        alertMessage =
            `🟡 *Caution: L2 Escrow Lowering* 🟡\n` +
            `Balance is now at *${balance.toFixed(2)} MOVE* (3.5x daily limit).\n` +
            `🔗 *Network:* ${NETWORK}\n` +
            `🔷 *L1 OApp:* \`${L1_OAPP}\`\n` +
            `🔶 *L2 OApp:* \`${L2_OAPP}\``;
        alertLevel = 'WARN';
    }

    if (alertMessage) {
        // If overdue, send alerts every 10 minutes. Otherwise, only send once per threshold level.
        if (sendRepeatedAlerts || alertLevel !== lastAlertLevel) {
            lastAlertLevel = alertLevel;
            // Console log instead of postToSlack to avoid posting to Slack until ready
            console.log(alertMessage);
            //await postToSlack(alertMessage);
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function postToSlack(message) {
    try {
        await axios.post(SLACK_WEBHOOK_URL, {
            text: message,
        });
        console.log('Posted to Slack:', message);
    } catch (error) {
        console.error('Error posting to Slack:', error.message);
    }
}

async function monitorEscrow() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const balance = await getBalance();
        if (balance !== null) {
            console.log(`Current balance: ${balance.toFixed(2)} MOVE`);
            await checkThresholds(balance);
        }
        await new Promise((resolve) => setTimeout(resolve, 600000)); // Check every 10 minutes
    }
}

monitorEscrow().catch(console.error);
