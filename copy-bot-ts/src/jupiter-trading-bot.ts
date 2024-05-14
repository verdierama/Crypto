// origin: https://www.quicknode.com/guides/solana-development/3rd-party-integrations/jupiter-api-trading-bot
import { Keypair, Connection, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL, TransactionInstruction, AddressLookupTableAccount, TransactionMessage } from "@solana/web3.js";
import { createJupiterApiClient, DefaultApi, ResponseError, QuoteGetRequest, QuoteResponse, Instruction, AccountMeta } from '@jup-ag/api';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as fs from 'fs';
import * as path from 'path';

const ENDPOINT = 'https://www.jupiterapi.com'; // 👈 Replace with your Metis Key or a public one https://www.jupiterapi.com/ <= prevered (alv)
const CONFIG = {
    basePath: ENDPOINT
};

export enum SwapToken {
    SOL,
    USDC
}

interface LogSwapArgs {
    inputToken: string;
    inAmount: string;
    outputToken: string;
    outAmount: string;
    txId: string;
    timestamp: string;
}

interface ArbBotConfig {
    solanaEndpoint: string; // e.g., "https://ex-am-ple.solana-mainnet.quiknode.pro/123456/"
    metisEndpoint: string;  // e.g., "https://jupiter-swap-api.quiknode.pro/123456/"
    secretKey: Uint8Array;
    firstTradePrice: number; // e.g. 94 USDC/SOL
    targetGainPercentage?: number;
    checkInterval?: number;
    initialInputToken: SwapToken;
    initialInputAmount: number;
}

interface NextTrade extends QuoteGetRequest {
    nextTradeThreshold: number;
}

export class ArbBot {
    private solanaConnection: Connection;
    private jupiterApi: DefaultApi;
    private wallet: Keypair;
//    private usdcMint: PublicKey = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    private usdcMint: PublicKey = new PublicKey("YZY7BWVbMmjFTzQGdUoWKNJnBMPaGSb4EbybjLdxQmt"); // hack with Rune token
    private solMint: PublicKey = new PublicKey("So11111111111111111111111111111111111111112");
    private usdcTokenAccount: PublicKey;
    private solBalance: number = 0;
    private usdcBalance: number = 0;
    private checkInterval: number = 1000 * 10; 
    private lastCheck: number = 0;
    private priceWatchIntervalId?: NodeJS.Timeout;
    private targetGainPercentage: number = 1;
    private nextTrade: NextTrade;
    private waitingForConfirmation: boolean = false;

    constructor(config: ArbBotConfig) {
        const { 
            solanaEndpoint, 
            metisEndpoint, 
            secretKey, 
            targetGainPercentage,
            checkInterval,
            initialInputToken,
            initialInputAmount,
            firstTradePrice
        } = config;
        console.log('Entering ArbBotconstructor');
        this.solanaConnection = new Connection(solanaEndpoint);
        //console.log('solanaconnection :', this.solanaConnection);
        this.jupiterApi = createJupiterApiClient({ basePath: metisEndpoint });
        this.wallet = Keypair.fromSecretKey(secretKey);
        this.usdcTokenAccount = getAssociatedTokenAddressSync(this.usdcMint, this.wallet.publicKey);
        if (targetGainPercentage) { this.targetGainPercentage = targetGainPercentage }
        if (checkInterval) { this.checkInterval = checkInterval }
        this.nextTrade = {
            inputMint: initialInputToken === SwapToken.SOL ? this.solMint.toBase58() : this.usdcMint.toBase58(),
            outputMint: initialInputToken === SwapToken.SOL ? this.usdcMint.toBase58() : this.solMint.toBase58(),
            amount: initialInputAmount,
            nextTradeThreshold: firstTradePrice,
        };
    }

    async init(): Promise<void> {
        console.log(`🤖 Initiating arb bot for wallet: ${this.wallet.publicKey.toBase58()}.`)
        await this.refreshBalances();
        console.log(`🏦 Current balances:\nSOL: ${this.solBalance / LAMPORTS_PER_SOL},\nRUNE: ${this.usdcBalance}`); // hack with Rune token
        //console.log(`🏦 Current balances:\nSOL: ${this.solBalance / LAMPORTS_PER_SOL},\nUSDC: ${this.usdcBalance}`);
        //this.initiatePriceWatch();
    }
private instructionDataToTransactionInstruction (
    instruction: Instruction | undefined
) {
    if (instruction === null || instruction === undefined) return null;
    return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key: AccountMeta) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, "base64"),
    });
};

private async getAdressLookupTableAccounts (
    keys: string[], connection: Connection
): Promise<AddressLookupTableAccount[]> {
    const addressLookupTableAccountInfos =
        await connection.getMultipleAccountsInfo(
            keys.map((key) => new PublicKey(key))
        );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
        const addressLookupTableAddress = keys[index];
        if (accountInfo) {
            const addressLookupTableAccount = new AddressLookupTableAccount({
                key: new PublicKey(addressLookupTableAddress),
                state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            acc.push(addressLookupTableAccount);
        }

        return acc;
    }, new Array<AddressLookupTableAccount>());
};

private async updateNextTrade(lastTrade: QuoteResponse): Promise<void> {
    const priceChange = this.targetGainPercentage / 100;
    this.nextTrade = {
        inputMint: this.nextTrade.outputMint,
        outputMint: this.nextTrade.inputMint,
        amount: parseInt(lastTrade.outAmount),
        nextTradeThreshold: parseInt(lastTrade.inAmount) * (1 + priceChange),
    };
}

private terminateSession(reason: string): void {
    console.warn(`❌ Terminating bot...${reason}`);
    console.log(`Current balances:\nSOL: ${this.solBalance / LAMPORTS_PER_SOL},\nUSDC: ${this.usdcBalance}`);
    if (this.priceWatchIntervalId) {
        clearInterval(this.priceWatchIntervalId);
        this.priceWatchIntervalId = undefined; // Clear the reference to the interval
    }
    setTimeout(() => {
        console.log('Bot has been terminated.');
        process.exit(1);
    }, 1000);
}

private async refreshBalances(): Promise<void> {
    try {
        const results = await Promise.allSettled([
            this.solanaConnection.getBalance(this.wallet.publicKey),
            this.solanaConnection.getTokenAccountBalance(this.usdcTokenAccount)
        ]);

        const solBalanceResult = results[0];
        const usdcBalanceResult = results[1];

        if (solBalanceResult.status === 'fulfilled') {
            this.solBalance = solBalanceResult.value;
        } else {
            console.error('Error fetching SOL balance:', solBalanceResult.reason);
        }

        if (usdcBalanceResult.status === 'fulfilled') {
            this.usdcBalance = usdcBalanceResult.value.value.uiAmount ?? 0;
        } else {
            this.usdcBalance = 0;
        }

//        if (this.solBalance < LAMPORTS_PER_SOL / 100) {
        if (this.solBalance < LAMPORTS_PER_SOL / 1000) {
            this.terminateSession("Low SOL balance.");
        }
    } catch (error) {
        console.error('Unexpected error during balance refresh:', error);
    }
}

private async logSwap(args: LogSwapArgs): Promise<void> {
    const { inputToken, inAmount, outputToken, outAmount, txId, timestamp } = args;
    const logEntry = {
        inputToken,
        inAmount,
        outputToken,
        outAmount,
        txId,
        timestamp,
    };
}

private async postTransactionProcessing(quote: QuoteResponse, txid: string): Promise<void> {
    const { inputMint, inAmount, outputMint, outAmount } = quote;
    await this.updateNextTrade(quote);
    await this.refreshBalances();
    await this.logSwap({ inputToken: inputMint, inAmount, outputToken: outputMint, outAmount, txId: txid, timestamp: new Date().toISOString() });
}

private async executeSwap(route: QuoteResponse): Promise<void> {
    console.log('Entering executSwap');
    try {
        const {
            computeBudgetInstructions,
            setupInstructions,
            swapInstruction,
            cleanupInstruction,
            addressLookupTableAddresses,
        } = await this.jupiterApi.swapInstructionsPost({
            swapRequest: {
                quoteResponse: route,
                userPublicKey: this.wallet.publicKey.toBase58(),
                prioritizationFeeLamports: 'auto'
            },
        });

        const instructions: TransactionInstruction[] = [
            ...computeBudgetInstructions.map(this.instructionDataToTransactionInstruction),
            ...setupInstructions.map(this.instructionDataToTransactionInstruction),
            this.instructionDataToTransactionInstruction(swapInstruction),
            this.instructionDataToTransactionInstruction(cleanupInstruction),
        ].filter((ix) => ix !== null) as TransactionInstruction[];

        const addressLookupTableAccounts = await this.getAdressLookupTableAccounts(
            addressLookupTableAddresses,
            this.solanaConnection
        );

        const { blockhash, lastValidBlockHeight } = await this.solanaConnection.getLatestBlockhash();

        const messageV0 = new TransactionMessage({
            payerKey: this.wallet.publicKey,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message(addressLookupTableAccounts);

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([this.wallet]);

        const rawTransaction = transaction.serialize();
        const txid = await this.solanaConnection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
        });
        const confirmation = await this.solanaConnection.confirmTransaction({ signature: txid, blockhash, lastValidBlockHeight }, 'confirmed');
        if (confirmation.value.err) {
            throw new Error('Transaction failed');
        }            
        await this.postTransactionProcessing(route, txid);
    } catch (error) {
        if (error instanceof ResponseError) {
            console.log(await error.response.json());
        }
        else {
            console.error(error);
        }
        throw new Error('Unable to execute swap');
    } finally {
        this.waitingForConfirmation = false;
    }
}
}