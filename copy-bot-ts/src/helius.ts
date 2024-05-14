import { Helius } from 'helius-sdk';
import { HELIUS_API_KEY, VM_URL} from './types/constants-private';

// 
//     Check doc from:
//     https://github.com/helius-labs/helius-sdk
//

const helius = new Helius(HELIUS_API_KEY);

helius.getAllWebhooks().then(webhook_list => {
  console.log(webhook_list);
  const webhook_id = webhook_list[0].webhookID;
}).catch(error => {
  console.error(error);
});

helius.deleteWebhook(webhook_id).then(() => { console.log('Webhook deleted') }).catch(error => { console.error(error) });

helius.createWebhook('https://your-webhook-url.com').then(webhook => {
  console.log(webhook);
}).catch(error => {
  console.error(error);
});

// List all webhook

