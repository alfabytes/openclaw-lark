import { describe, expect, it } from 'vitest';
import { parseMessageEvent } from '../src/messaging/inbound/parse';

function baseEvent(overrides: Partial<{ sender_type: string }> = {}) {
  return {
    sender: {
      sender_id: { open_id: 'ou_sender' },
      ...(overrides.sender_type ? { sender_type: overrides.sender_type } : {}),
    },
    message: {
      message_id: 'msg_1',
      chat_id: 'oc_test',
      chat_type: 'p2p' as const,
      message_type: 'text',
      content: JSON.stringify({ text: 'hi' }),
    },
  };
}

function eventWithSenderId(senderId: { open_id?: string; user_id?: string; union_id?: string }) {
  return {
    sender: {
      sender_id: senderId,
      sender_type: 'user',
    },
    message: {
      message_id: 'msg_1',
      chat_id: 'oc_test',
      chat_type: 'p2p' as const,
      message_type: 'text',
      content: JSON.stringify({ text: 'hi' }),
    },
  };
}

describe('parseMessageEvent senderIsBot', () => {
  it('returns true when sender_type === "bot" (Feishu canonical value)', async () => {
    const ctx = await parseMessageEvent(baseEvent({ sender_type: 'bot' }));
    expect(ctx.senderIsBot).toBe(true);
  });

  it('returns true when sender_type === "app" (defensive legacy fallback)', async () => {
    const ctx = await parseMessageEvent(baseEvent({ sender_type: 'app' }));
    expect(ctx.senderIsBot).toBe(true);
  });

  it('returns false when sender_type === "user"', async () => {
    const ctx = await parseMessageEvent(baseEvent({ sender_type: 'user' }));
    expect(ctx.senderIsBot).toBe(false);
  });

  it('returns false when sender_type is missing', async () => {
    const ctx = await parseMessageEvent(baseEvent());
    expect(ctx.senderIsBot).toBe(false);
  });
});

describe('parseMessageEvent senderId fallback', () => {
  it('uses open_id when present', async () => {
    const ctx = await parseMessageEvent(eventWithSenderId({ open_id: 'ou_sender', user_id: 'user_sender' }));
    expect(ctx.senderId).toBe('ou_sender');
  });

  it('falls back to user_id when open_id is missing', async () => {
    const ctx = await parseMessageEvent(eventWithSenderId({ user_id: 'user_sender' }));
    expect(ctx.senderId).toBe('user_sender');
  });

  it('falls back to union_id when open_id and user_id are missing', async () => {
    const ctx = await parseMessageEvent(eventWithSenderId({ union_id: 'on_sender' }));
    expect(ctx.senderId).toBe('on_sender');
  });
});
