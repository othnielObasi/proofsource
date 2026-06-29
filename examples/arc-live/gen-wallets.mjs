import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
for (const role of ['BUYER', 'SELLER']) {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  console.log(`${role}_PRIVATE_KEY=${key}`);
  console.log(`${role}_ADDRESS=${account.address}`);
  console.log('');
}
