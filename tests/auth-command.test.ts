import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getTicketMock,
  getLarkAccountMock,
  fromAccountMock,
  getAppInfoMock,
  getAppGrantedScopesMock,
  getStoredTokenMock,
  tokenStatusMock,
  filterSensitiveScopesMock,
  triggerOnboardingMock,
} = vi.hoisted(() => ({
  getTicketMock: vi.fn(),
  getLarkAccountMock: vi.fn(),
  fromAccountMock: vi.fn(),
  getAppInfoMock: vi.fn(),
  getAppGrantedScopesMock: vi.fn(),
  getStoredTokenMock: vi.fn(),
  tokenStatusMock: vi.fn(),
  filterSensitiveScopesMock: vi.fn((scopes: string[]) => scopes),
  triggerOnboardingMock: vi.fn(),
}));

vi.mock('../src/core/lark-ticket', () => ({
  getTicket: getTicketMock,
}));

vi.mock('../src/core/accounts', () => ({
  getLarkAccount: getLarkAccountMock,
}));

vi.mock('../src/core/lark-client', () => ({
  LarkClient: {
    fromAccount: fromAccountMock,
  },
}));

vi.mock('../src/core/app-scope-checker', () => ({
  getAppInfo: getAppInfoMock,
  getAppGrantedScopes: getAppGrantedScopesMock,
}));

vi.mock('../src/core/token-store', () => ({
  getStoredToken: getStoredTokenMock,
  tokenStatus: tokenStatusMock,
}));

vi.mock('../src/core/tool-scopes', () => ({
  filterSensitiveScopes: filterSensitiveScopesMock,
}));

vi.mock('../src/tools/onboarding-auth', () => ({
  triggerOnboarding: triggerOnboardingMock,
}));

import { runFeishuAuth } from '../src/commands/auth';

const account = {
  configured: true,
  accountId: 'default',
  appId: 'cli_a',
  appSecret: 'secret',
  brand: 'feishu',
};

beforeEach(() => {
  vi.clearAllMocks();

  getTicketMock.mockReturnValue({
    accountId: 'default',
    senderOpenId: 'ou_user',
  });
  getLarkAccountMock.mockReturnValue(account);
  fromAccountMock.mockReturnValue({ sdk: {} });
  getAppInfoMock.mockResolvedValue({});
  getAppGrantedScopesMock.mockImplementation(async (_sdk, _appId, tokenType?: string) => {
    if (tokenType === 'user') return ['im:message'];
    return ['offline_access', 'im:message'];
  });
  getStoredTokenMock.mockResolvedValue(null);
  tokenStatusMock.mockReturnValue('valid');
  triggerOnboardingMock.mockResolvedValue(undefined);
});

describe('/feishu auth command', () => {
  it('starts authorization for the sender without requiring app owner access', async () => {
    const result = await runFeishuAuth({} as never, 'en_us');

    expect(result).toBe('✅ Authorization request sent');
    expect(triggerOnboardingMock).toHaveBeenCalledTimes(1);
    expect(triggerOnboardingMock).toHaveBeenCalledWith({
      cfg: {},
      userOpenId: 'ou_user',
      accountId: 'default',
      requireOwner: false,
    });
  });

  it('does not send a duplicate auth request when the sender already has all scopes', async () => {
    getStoredTokenMock.mockResolvedValueOnce({
      appId: 'cli_a',
      userOpenId: 'ou_user',
      scope: 'im:message',
    });

    const result = await runFeishuAuth({} as never, 'en_us');

    expect(result).toBe('✅ You have authorized all available permissions (1 total). No re-authorization needed.');
    expect(triggerOnboardingMock).not.toHaveBeenCalled();
  });
});
