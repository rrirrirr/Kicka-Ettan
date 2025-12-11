import { createContext, useContext, useEffect, ReactNode } from 'react';
import posthog from 'posthog-js';

interface PostHogContextType {
  posthog: typeof posthog | null;
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
}

const PostHogContext = createContext<PostHogContextType>({
  posthog: null,
  trackEvent: () => { },
  identify: () => { },
});

interface PostHogProviderProps {
  children: ReactNode;
  apiKey?: string;
  apiHost?: string;
}

export function PostHogProvider({ children, apiKey, apiHost }: PostHogProviderProps) {
  useEffect(() => {
    // Skip PostHog entirely in development mode
    if (import.meta.env.DEV) {
      return;
    }

    // Only initialize PostHog if API key is provided
    if (!apiKey) {
      console.warn('PostHog API key not provided, analytics will be disabled');
      return;
    }

    // Initialize PostHog
    posthog.init(apiKey, {
      api_host: apiHost || 'https://us.i.posthog.com',
      person_profiles: 'identified_only', // Only create profiles for identified users
      loaded: (_posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog loaded successfully');
        }
      },
      // Capture pageviews automatically
      capture_pageview: true,
      capture_pageleave: true,
    });

    // Cleanup on unmount
    return () => {
      posthog.reset();
    };
  }, [apiKey, apiHost]);

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (apiKey) {
      posthog.capture(eventName, properties);
    }
  };

  const identify = (distinctId: string, properties?: Record<string, unknown>) => {
    if (apiKey) {
      posthog.identify(distinctId, properties);
    }
  };

  return (
    <PostHogContext.Provider value={{ posthog: apiKey ? posthog : null, trackEvent, identify }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}
