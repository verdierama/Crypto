import { Helius, TransactionType } from 'helius-sdk';
import { HELIUS_API_KEY, VM_URL, WALLET_HF} from '../types/constants';

// 
//     Check doc from:
//     https://github.com/helius-labs/helius-sdk
//

class WebhookHelius {
  private helius: Helius;
  private addresses: string[];
  private targetUrl: string;

  constructor(targetUrl: string, apiKey: string, addresses: string[]) {
    this.helius = new Helius(apiKey);
    this.addresses = addresses;
    this.targetUrl = targetUrl;
  }
  async dumpWebhooks(): Promise<void> { 
    try {
      const webhookList = await this.helius.getAllWebhooks();
      console.log('webhook dump is:', webhookList);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
     
  async getWebhookID(): Promise<string> {
    try {
      const webhookList = await this.helius.getAllWebhooks();
      console.log('webhook list is:' + webhookList);
      return webhookList[0].webhookID;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteWebhook(webhookID: string): Promise<void> {
    try {
      await this.helius.deleteWebhook(webhookID);
      console.log('Webhook deleted');
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async createWebhook(): Promise<void> {
    try {
      await this.helius.createWebhook({
        accountAddresses: this.addresses, 
        transactionTypes: [TransactionType.SWAP], 
        webhookURL: this.targetUrl, 
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  // Add additional methods here for handling SOL addresses
}

const webhookHelius = new WebhookHelius(VM_URL, HELIUS_API_KEY,[WALLET_HF]);
webhookHelius.dumpWebhooks()


/*
webhookHelius.getWebhookID()
  .then(webhookID => {
    console.log('Webhook ID:', webhookID);
    return webhookHelius.deleteWebhook(webhookID);
  })
  .then(() => {
//    console.log('Webhook deleted'); 
    return webhookHelius.createWebhook();
  })
  .then(() => {
    console.log('Webhook created');
  })
  .catch(error => {
    console.error(error);
  });
*/




/* 
const apiKey = HELIUS_API_KEY; // Replace with your actual API key
const addresses = ['address1', 'address2', 'address3']; // Replace with your SOL addresses
const webhookHelius = new WebhookHelius(apiKey, addresses);
async function getWebhookID(): Promise<string> {
  try {
    const webhookList = await helius.getAllWebhooks();
    console.log(webhookList);
    return webhookList[0].webhookID;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function deleteWebhook(webhookID: string): Promise<void> {
  try {
    await helius.deleteWebhook(webhookID);
    console.log('Webhook deleted');
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function createWebhook(webhookURL: string): Promise<void> {
  try {
    await helius.createWebhook({ url: webhookURL });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
*/ 

// List all webhook

