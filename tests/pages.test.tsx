import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import App from '../src/App';

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.scrollTo = (() => {}) as any;
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
});

beforeEach(() => {
  cleanup();
  window.location.hash = '';
  localStorage.clear();
});

const route = async (hash: string) => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

describe('routes', () => {
  it('renders the home hero with the frame concept', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Italian mindset/i).length).toBeGreaterThan(0);
  });

  it('renders the shop grid with products', async () => {
    render(<App />);
    await route('#/shop');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/POPLIN SHIRT|HEAVYWEIGHT/i).length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('renders the product page with the Lens and the Italian/Egyptian badge', async () => {
    render(<App />);
    await route('#/product/molfet-p1');
    await waitFor(() => expect(screen.getAllByText(/BABY BLUE CLASSIC POPLIN SHIRT/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Designed with an Italian mindset/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Italian mindset. Egyptian hands/i).length).toBeGreaterThan(0);
  });

  it('builds a look in the Limitless Mix studio', async () => {
    render(<App />);
    await route('#/mix');
    await waitFor(() => expect(screen.getAllByText(/One piece per category/i).length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText(/Add the look/i).length).toBeGreaterThan(0));
  });

  it('renders the 404 microcopy', async () => {
    render(<App />);
    await route('#/nowhere');
    await waitFor(() => expect(screen.getByText(/edge of the map/i)).toBeTruthy());
  });

  it('renders the brand page', async () => {
    render(<App />);
    await route('#/about');
    await waitFor(() => expect(screen.getByText(/A name, a slogan and an open circle/i)).toBeTruthy());
  });
});
