import { WebSocketProvider, Interface } from 'ethers';
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const abi = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));

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
  
      const tweet = `🧙‍♀️ A new Dem Witches lobby was created!
  
  🎮 Game ID: ${gameId}
  👤 Host: ${host}
  💰 Buy-In: ${Number(gameBuyIn) / 1e18} $APE
  🧑‍🤝‍🧑 Max Players: ${maxPlayers}
  
  Join the chaos. #DemWitches #ApeChain`;
  
      await rwClient.v2.tweet(tweet);
      console.log('✅ Tweeted:', tweet);
    } catch (err) {
      console.error('❌ Failed to decode GameCreated log:', err);
    }
  });
  
