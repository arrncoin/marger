const test = require('node:test');
const assert = require('node:assert/strict');
const { JuleTikClient, createTikTokLive } = require('../src/integrations/tiktok/juleTikSdk');

test('JuleTikClient exposes a valid lifecycle and event contract', () => {
  const client = new JuleTikClient({ uniqueId: 'demo_user' });

  assert.equal(client.username, 'demo_user');
  assert.equal(client.connected, false);
  assert.equal(typeof client.connect, 'function');
  assert.equal(typeof client.disconnect, 'function');
  assert.equal(typeof client.on, 'function');

  const chatPayload = client.normalizeChatPayload({
    user: { uniqueId: '@tester', nickname: 'Tester' },
    message: 'hello world',
    timestamp: 1710000000000,
  });

  assert.equal(chatPayload.type, 'chat');
  assert.equal(chatPayload.chat.comment, 'hello world');
  assert.equal(chatPayload.user.uniqueId, 'tester');

  const giftPayload = client.normalizeGiftPayload({
    user: { uniqueId: '@giver', nickname: 'Giver' },
    giftName: 'Rose',
    diamondCount: 500,
    repeatCount: 2,
    timestamp: 1710000001000,
  });

  assert.equal(giftPayload.type, 'gift');
  assert.equal(giftPayload.gift.giftName, 'Rose');
  assert.equal(giftPayload.gift.diamondCount, 500);

  client.disconnect();
  assert.equal(client.connected, false);
});

test('createTikTokLive returns a working client factory instance', () => {
  const client = createTikTokLive({ username: '@factory_user' });
  assert.equal(client.username, 'factory_user');
  assert.equal(typeof client.connect, 'function');
  assert.equal(typeof client.destroy, 'function');
  client.disconnect();
});

test('connect rejects empty usernames before any network call', async () => {
  const client = new JuleTikClient({});
  await assert.rejects(() => client.connect(), /Tiktok username is required/);
});
