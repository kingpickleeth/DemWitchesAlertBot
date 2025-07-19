import { WebSocketProvider, Interface } from 'ethers';
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const abi = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));
const BLOCKED_WALLETS = new Set([
    '0x8435f3f3f84e4747335621ece38d8a4b32830468',
    '0x39a732cc75511b58cbb9f2be67963a69447beaaa',
    '0x6f15e7d28a35f0c39c8dd168becd610070fa0518',
    '0x5b785718eeb5618040cac9e28f9967907393a926',
    '0xd420b8941efcea034312495819a1d9b949d828d7',
    '0x5b12128fff780fe1951dd596786b4daf9bc57c88'
  ]);
  
const ALCHEMY_WS = 'wss://apechain-mainnet.g.alchemy.com/v2/1tRqMT34w5A9-VXPs5HBI';
const CONTRACT_ADDRESS = '0x040478ce54a07ad236e8466021652e549acbfe81';
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
  });
  
const rwClient = twitterClient.readWrite;

const iface = new Interface(abi);
const provider = new WebSocketProvider(ALCHEMY_WS);

// Get correct topic hash for GameCreated
const eventFragment = iface.getEvent('GameCreated');
const gameCreatedTopic = iface.getEvent('GameCreated').topicHash; // ✅ v6 compatible

let lastTweetTime = 0;
const MIN_INTERVAL = 60 * 1000; // 1 minute in ms

// 👂 Filter for ONLY GameCreated events
provider.on({
    address: CONTRACT_ADDRESS,
    topics: [gameCreatedTopic]
  }, async (log) => {
    const now = Date.now();
    if (now - lastTweetTime < MIN_INTERVAL) {
      console.log('⏱️ Skipping tweet: too soon since last post.');
      return;
    }
  
    lastTweetTime = now;
  
    try {
      const parsed = iface.decodeEventLog('GameCreated', log.data, log.topics);
      const { gameId, host, gameBuyIn, maxPlayers } = parsed;
      const hostLower = host.toLowerCase();
      if (BLOCKED_WALLETS.has(hostLower)) {
        console.log(`🚫 Skipping game from blocked wallet: ${host}`);
        return;
      }
      
      const tweet = `🧙‍♀️ A new Dem Witches lobby was created! 🧙‍♀️
  
  🎮 Game ID: ${gameId}
  👤 Host: ${host}
  💰 Buy-In: ${Number(gameBuyIn) / 1e18} $APE
  🧑‍🤝‍🧑 Max Players: ${maxPlayers}

  https://app.demwitches.com
  
  Join the chaos // @DemWitchesGame // #ApeChain`;
  
      await rwClient.v2.tweet(tweet);
      console.log('✅ Tweeted:', tweet);
    } catch (err) {
      console.error('❌ Failed to decode GameCreated log:', err);
    }
  });
  
