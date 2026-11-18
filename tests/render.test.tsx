import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.scrollTo = (() => {}) as any;
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
});

describe('storefront', () => {
  it('renders the hero and the slogan', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Style Without Limits/i).length).toBeGreaterThan(0);
  });
});
