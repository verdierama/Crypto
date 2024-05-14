import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import winston from 'winston';
import { VM_URL } from './types/constants-private';
import { SECRET_KEY } from './types/constants-private';
import { SOLANA_ENDPOINT } from './types/constants-private';

import { transaction } from './types/models';

const SOLMINT = 'So11111111111111111111111111111111111111112'

// jupiter related modules

console.log('Entering index');
import { LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { ArbBot, SwapToken } from './jupiter-trading-bot';
import dotenv from "dotenv";
import bs58 from 'bs58';

dotenv.config({
    path: ".env",
});

const defaultConfig = {
    solanaEndpoint: clusterApiUrl("mainnet-beta"),
    jupiter: "https://quote-api.jup.ag/v6",
};

// Create logger

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} - ${info.level} : ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({
        level: 'info',
      }),
      new winston.transports.File({ 
        filename: 'info.log',
        level: 'info',
      }),
      new winston.transports.File({ 
        filename: 'debug.log',
        level: 'debug',
      }),
  ],
});

export default logger;

const app = express();

app.use(express.json());

app.get('/ping', (req, res) => {
    const asciiArt = `
    +--------------+
    |     pong     |
    +--------------+
    `;
    res.status(200).send(asciiArt);
});

app.get('/logs', (req, res) => {
    const logFilePath = path.join('.', 'info.log'); // Adjust the path to your log file as needed
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('An error occurred while reading the log file');
            return;
        }
        res.send('<pre>' + data + '</pre>'); // Wrap the log data in <pre> tags for better formatting in the browser
    });
});

app.post('/', (req, res) => {

    logger.debug('Received webhook notification with full payload: ' + JSON.stringify(req.body, null, 2));
    
    if (!req.body || !Array.isArray(req.body)) {
        logger.debug('Error: webhook notification is not a list');
        return;
    } else {
        const notif = req.body[0];

    //  Check the type of transaction
    //  Only SWAP is processed for now

        logger.info('Processing transaction: ' + notif['description'])
        if (notif['type'] === 'SWAP') {
            const transaction = extractTransactionFromJSON(notif);
            const transactionString = JSON.stringify(transaction, null, 2);
            logger.info('transaction data: ' + transactionString);
        } else if (notif['type'] === 'TRANSFER') {
            logger.info('Processing TRANSFER transaction');
        } else {
            logger.error(`Unknown transaction type: ${notif['type']}`);
        }
    }
    res.status(200).send('');

});

function extractTransactionFromJSON(notification: any): transaction {
    return {
        type: notification['type'],
        source: notification['source'],
        description: notification['description'],
        timestamp: notification['timestamp'],
        signature: notification['signature'],
        from_account: notification['tokenTransfers'][0]['fromUserAccount'],
        to_account: notification['tokenTransfers'][0]['toUserAccount'],
        from_mint: notification['tokenTransfers'][0]['mint'],
        from_token_amount: notification['tokenTransfers'][0]['tokenAmount'],
        to_mint: notification['tokenTransfers'][1]['mint'],
        to_token_amount: notification['tokenTransfers'][1]['tokenAmount'],
    };
}
/*
function processTransaction(transaction: transaction) {
    if (transaction.type === TransactionType.SWAP) {
        logger.info('Processing SWAP transaction');
    } else if (transaction.type === TransactionType.TRANSFER) {
        logger.info('Processing TRANSFER transaction');
    } else {
        logger.error('Unknown transaction type');
    }
}
*/
// Middleware pour analyser les corps de requête JSON
/*app.use(express.json()); 

app.use((req, res, next) => {
    logger.debug('Middleware - Received request with body: ' + JSON.stringify(req.body));
    next();
});
*/

const parts = VM_URL.split(":");
const port = parts[2].slice(0, -1); // extract port number from URL
//console.log('Next is Server listening on port ');
    app.listen(parseInt(port), () => {
    console.log('Server listening on port ' + port);
});


const secretKeyBytes = bs58.decode(SECRET_KEY)

//console.log('Private Key:', bs58.decode(SECRET_KEY));    


/*
for (let i = 0; i < secretKeyHex.length; i += 2) {
  const byte = parseInt(secretKeyHex.substr(i, 2), 16);
  secretKeyBytes.push(byte);
  }
  */  

  const formattedSecretKey = "[" + secretKeyBytes.join(", ") + "]";
  console.log(formattedSecretKey);
    

let decodedSecretKey = Uint8Array.from(JSON.parse(formattedSecretKey));


const bot = new ArbBot({
//    solanaEndpoint: SOLANA_ENDPOINT ?? defaultConfig.solanaEndpoint,
    solanaEndpoint: SOLANA_ENDPOINT,
    metisEndpoint: process.env.METIS_ENDPOINT ?? defaultConfig.jupiter,
    secretKey: decodedSecretKey,
    firstTradePrice: 0.11 * LAMPORTS_PER_SOL,
    targetGainPercentage: 1.5,
    //initialInputToken: SwapToken.USDC,
    initialInputToken: SwapToken.SOL,
    initialInputAmount: 1_000_000,
//    initialInputAmount: 10_000_000,
});

bot.init();

