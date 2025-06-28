import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MentalLLaMAModelProvider } from './MentalLLaMAModelProvider';
import { getEnv } from '@/config/env.config';

// Mock getEnv
vi.mock('@/config/env.config', () => ({
  getEnv: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('MentalLLaMAModelProvider', () => {
  const mockApiKey = 'test-api-key';
  const mockEndpoint7B = 'http://localhost/v1/chat/completions-7b';
  const mockEndpoint13B = 'http://localhost/v1/chat/completions-13b';

  beforeEach(() => {
    vi.mocked(getEnv).mockReturnValue({
      MENTALLAMA_API_KEY: mockApiKey,
      MENTALLAMA_ENDPOINT_URL_7B: mockEndpoint7B,
      MENTALLAMA_ENDPOINT_URL_13B: mockEndpoint13B,
      // other env vars if needed by logger or other parts
    } as any);

    // Stub global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with 7B model configuration by default', () => {
    const provider = new MentalLLaMAModelProvider();
    expect(provider.getModelTier()).toBe('7B');
    expect(provider.getModelConfig()).toEqual({
      modelId: 'mentalllama-chat-7B',
      endpointUrl: mockEndpoint7B,
      apiKey: mockApiKey,
      providerType: 'custom_api',
    });
  });

  it('should initialize with 13B model configuration', () => {
    const provider = new MentalLLaMAModelProvider('13B');
    expect(provider.getModelTier()).toBe('13B');
    expect(provider.getModelConfig()).toEqual({
      modelId: 'mentalllama-chat-13B',
      endpointUrl: mockEndpoint13B,
      apiKey: mockApiKey,
      providerType: 'custom_api',
    });
  });

  it('should throw error if API key is missing', () => {
    vi.mocked(getEnv).mockReturnValue({
      MENTALLAMA_ENDPOINT_URL_7B: mockEndpoint7B,
    } as any);
    expect(() => new MentalLLaMAModelProvider()).toThrow(
      'MentalLLaMA model mock-mentalllama-7B is not properly configured for actual API calls'
    );
  });

  it('should throw error if endpoint URL is missing for 7B model', () => {
    vi.mocked(getEnv).mockReturnValue({
      MENTALLAMA_API_KEY: mockApiKey,
    } as any);
    expect(() => new MentalLLaMAModelProvider('7B')).toThrow(
      'MentalLLaMA model mock-mentalllama-7B is not properly configured for actual API calls'
    );
  });

  it('should throw error if endpoint URL is missing for 13B model', () => {
    vi.mocked(getEnv).mockReturnValue({
      MENTALLAMA_API_KEY: mockApiKey,
      MENTALLAMA_ENDPOINT_URL_7B: mockEndpoint7B, // Provide 7B but test 13B
    } as any);
     // For 13B, MENTALLAMA_ENDPOINT_URL_13B is needed. If it's undefined, constructor uses it.
    expect(() => new MentalLLaMAModelProvider('13B')).toThrow(
       'MentalLLaMA model mock-mentalllama-13B is not properly configured for actual API calls'
    );
  });


  describe('chat method', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const options = { temperature: 0.5 };

    it('should make a successful API call and return content', async () => {
      const provider = new MentalLLaMAModelProvider();
      const mockResponse = {
        choices: [{ message: { content: 'Hi there!' } }],
      };
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.chat(messages, options);

      expect(fetch).toHaveBeenCalledWith(mockEndpoint7B, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockApiKey}`,
        },
        body: JSON.stringify({
          model: 'mentalllama-chat-7B',
          messages,
          ...options,
        }),
      });
      expect(result).toBe('Hi there!');
    });

    it('should throw an error if API request fails (response not ok)', async () => {
      const provider = new MentalLLaMAModelProvider();
      (fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.chat(messages, options)).rejects.toThrow(
        'API request to mentalllama-chat-7B failed with status 500: Internal Server Error'
      );
    });

    it('should throw an error if API response has invalid structure', async () => {
      const provider = new MentalLLaMAModelProvider();
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}), // Invalid structure
      });

      await expect(provider.chat(messages, options)).rejects.toThrow(
        'Invalid response structure from MentalLLaMA API.'
      );
    });

    it('should throw an error if fetch itself fails (network error)', async () => {
      const provider = new MentalLLaMAModelProvider();
      (fetch as vi.Mock).mockRejectedValue(new Error('Network connection failed'));

      await expect(provider.chat(messages, options)).rejects.toThrow(
        'Network connection failed'
      );
    });

    it('should throw error if called when not configured (e.g. API key missing)', async () => {
        vi.mocked(getEnv).mockReturnValue({ MENTALLAMA_ENDPOINT_URL_7B: mockEndpoint7B } as any); // API key missing
        // Constructor will already log a warning and set modelId to mock-*
        // The chat method will then throw because endpointUrl or apiKey is missing from modelConfig, or modelId starts with mock-
        // To directly test the throw in chat, we'd need to bypass constructor logic or make modelConfig mutable.
        // For now, let's test that constructing and then calling chat throws.

        let provider: MentalLLaMAModelProvider;
        try {
            provider = new MentalLLaMAModelProvider(); // This might not throw if mock- is allowed by constructor
        } catch (e) {
            // If constructor throws, that's one way to fail.
             expect(e.message).toContain('not properly configured');
             return; // Test ends here
        }
        // If constructor didn't throw (e.g. it created a mock config)
        // then chat() should throw.
         await expect(provider.chat(messages, options)).rejects.toThrow(
           'MentalLLaMA model mock-mentalllama-7B is not properly configured for actual API calls'
        );
    });
  });
});
