import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveAgentRouteMock, enqueueSystemEventMock } = vi.hoisted(() => ({
  resolveAgentRouteMock: vi.fn(),
  enqueueSystemEventMock: vi.fn(),
}));

vi.mock('../src/core/lark-client', () => ({
  LarkClient: {
    runtime: {
      channel: {
        reply: {
          resolveEnvelopeFormatOptions: vi.fn(() => ({})),
        },
        routing: {
          resolveAgentRoute: resolveAgentRouteMock,
        },
      },
      system: {
        enqueueSystemEvent: enqueueSystemEventMock,
      },
    },
  },
}));

vi.mock('../src/core/lark-logger', () => ({
  larkLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { buildDispatchContext } from '../src/messaging/inbound/dispatch-context';

const account = {
  accountId: 'default',
  enabled: true,
  configured: true,
  brand: 'feishu',
  appId: 'cli_a',
  appSecret: 'secret',
  config: {},
};

function baseMessage(overrides: Record<string, unknown> = {}) {
  return {
    chatId: 'oc_p2p_a',
    messageId: 'om_1',
    senderId: 'ou_user_a',
    chatType: 'p2p' as const,
    content: 'hello',
    contentType: 'text',
    resources: [],
    mentions: [],
    mentionAll: false,
    rawMessage: {},
    rawSender: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveAgentRouteMock.mockReturnValue({
    agentId: 'main',
    accountId: 'default',
    sessionKey: 'agent:main:feishu:direct:ou_user_a',
  });
});

describe('buildDispatchContext session isolation', () => {
  it('adds p2p chat id to direct-message session keys', () => {
    const dc = buildDispatchContext({
      ctx: baseMessage() as never,
      account: account as never,
      accountScopedCfg: {} as never,
    });

    expect(resolveAgentRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        peer: { kind: 'direct', id: 'ou_user_a' },
      }),
    );
    expect(dc.route.sessionKey).toBe('agent:main:feishu:direct:ou_user_a:chat:oc_p2p_a');
    expect(enqueueSystemEventMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sessionKey: 'agent:main:feishu:direct:ou_user_a:chat:oc_p2p_a' }),
    );
  });

  it('keeps group session keys chat-scoped', () => {
    resolveAgentRouteMock.mockReturnValueOnce({
      agentId: 'main',
      accountId: 'default',
      sessionKey: 'agent:main:feishu:group:oc_group_a',
    });

    const dc = buildDispatchContext({
      ctx: baseMessage({ chatId: 'oc_group_a', chatType: 'group' }) as never,
      account: account as never,
      accountScopedCfg: {} as never,
    });

    expect(dc.route.sessionKey).toBe('agent:main:feishu:group:oc_group_a');
  });
});
