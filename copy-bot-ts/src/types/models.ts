enum TransactionType {
    SWAP = 'SWAP',
    TRANSFER = 'TRANSFER'
}
export interface transaction {
    type: TransactionType;
    source: string;
    description: string;
    timestamp: number;
    signature: string;
    from_account: string;
    to_account: string;
    from_mint: string;
    from_token_amount: number;
    to_mint: string;
    to_token_amount: number;
}
