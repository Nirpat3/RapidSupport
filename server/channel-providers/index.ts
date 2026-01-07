import type { ChannelProvider, ChannelProviderFactory } from './types';
import { MetaCloudProvider } from './meta-cloud-provider';
import { TwilioProvider } from './twilio-provider';

export * from './types';
export { MetaCloudProvider } from './meta-cloud-provider';
export { TwilioProvider } from './twilio-provider';

class ChannelProviderFactoryImpl implements ChannelProviderFactory {
  private providers: Map<string, ChannelProvider> = new Map();

  constructor() {
    this.providers.set('meta_cloud', new MetaCloudProvider());
    this.providers.set('twilio', new TwilioProvider());
  }

  getProvider(providerName: 'meta_cloud' | 'twilio'): ChannelProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    return provider;
  }
}

export const channelProviderFactory = new ChannelProviderFactoryImpl();
