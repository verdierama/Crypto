import { writeFileSync } from 'fs';
import { readFileSync } from 'fs';
import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
/*
async function checkPrivateKey(file:string) {
    // Get the private key from the file
    const privateKey = getPrivateKeyFromFile(file);
    const keypair = Keypair.fromSecretKey(privateKey);

    // Connect to the Solana network
    const connection = new Connection('https://api.mainnet-beta.solana.com');

    // Get the balance of the account
    const balance = await connection.getBalance(keypair.publicKey);

    console.log('Balance:', balance);
}

checkPrivateKey().catch(console.error);
*/

function getPrivateKeyFromFile(fileName: string): Uint8Array {
    // Read the file content
    const fileContent = readFileSync(fileName, 'utf8');

    // Extract the private key
    const privateKeyString = fileContent.split('\n')[1].split(': ')[1];
    const privateKey = new Uint8Array(privateKeyString.split(',').map(Number));

    return privateKey;
}



async function createWallet() {
    // Generate a new keypair
    const keypair = Keypair.generate();

    // Connect to the Solana network
    const connection = new Connection('https://api.mainnet-beta.solana.com');

    // Get the balance of the new wallet
    const balance = await connection.getBalance(keypair.publicKey);

    // Store the wallet information in a file
    const fileName = `wallet_${keypair.publicKey.toBase58()}.txt`;
    const fileContent = `Public Key: ${keypair.publicKey.toBase58()}\nPrivate Key: ${bs58.encode(keypair.secretKey)}\nBalance: ${balance}`;
    writeFileSync(fileName, fileContent);

    console.log('New wallet created!');
    console.log('Public Key:', keypair.publicKey.toBase58());
    console.log('Private Key:', bs58.encode(keypair.secretKey));
    console.log('Balance:', balance);
}

/* 

Usage:

createWallet().catch(console.error);
const privateKey = getPrivateKeyFromFile('wallet.txt');
const keypair = Keypair.fromSecretKey(privateKey);

*/

/*
const privateKey = getPrivateKeyFromFile('./src/wallets/wallet_8i9eivEZwABoUkJ7bpXmrty1izvNeBppKCXgAuz1cbts.txt');
const keypair = Keypair.fromSecretKey(privateKey);

console.log ('privateKey tostring:', bs58.encode(privateKey));

console.log('Public Key:', keypair.publicKey.toBase58());


const fileName = `./src/wallets/wallet_${keypair.publicKey.toBase58()}_b58.txt`;
const fileContent = `Public Key: ${keypair.publicKey.toBase58()}\nPrivate Key: ${bs58.encode(keypair.secretKey)}\n`;
writeFileSync(fileName, fileContent);
*/


// Store the wallet information in a file



const fileContent = readFileSync('./src/wallets/wallet_8i9eivEZwABoUkJ7bpXmrty1izvNeBppKCXgAuz1cbts_b58.txt', 'utf8');

// Extract the private key
const privateKeyString = fileContent.split('\n')[1].split(': ')[1];
console.log('here you go...'+bs58.decode(privateKeyString));