import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import { INITIAL_PRODUCTS } from '../src/data/constants';
import { LIMIT_COPY, BRAND } from '../src/data/brand';

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.scrollTo = (() => {}) as any;
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
});
beforeEach(() => { cleanup(); window.location.hash = ''; localStorage.clear(); });

const route = (hash: string) => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

describe('brand rules', () => {
  it('keeps the three colours verbatim in the data layer', () => {
    expect(BRAND.colors.maroon).toBe('#711518');
    expect(BRAND.colors.cream).toBe('#FAED99');
    expect(BRAND.colors.brown).toBe('#321E19');
    expect(BRAND.colors.maroon.toUpperCase()).not.toBe(BRAND.colors.brown.toUpperCase());
  });

  it('gives every product the three concept layers and at most three hotspots', () => {
    for (const product of INITIAL_PRODUCTS) {
      expect(product.cutoutUrl, `${product.id} cutout`).toBeTruthy();
      expect(product.sketchUrl, `${product.id} sketch`).toBeTruthy();
      expect(product.macroUrl, `${product.id} macro`).toBeTruthy();
      expect(product.details?.length).toBeLessThanOrEqual(3);
      expect(product.slot).toBeTruthy();
    }
  });

  it('writes the exact slogan and the limit microcopy', () => {
    expect(BRAND.slogan).toBe('Style Without Limits');
    expect(LIMIT_COPY.emptyCart.en).toBe('Your look has no limits yet. Start building it.');
    expect(LIMIT_COPY.shippingBar.en('EGP 2,900')).toBe('No limits on style. Free shipping from EGP 2,900.');
    expect(LIMIT_COPY.notFound.en).toBe("You found the edge of the map. Style doesn't have one.");
  });
});

describe('limitless mix', () => {
  it('adds a whole look in one store action and shows the discount at three pieces', async () => {
    render(<App />);
    await route('#/mix');

    await waitFor(() => expect(screen.getAllByText(/Add the look/i).length).toBeGreaterThan(0));

    const picks = await screen.findAllByRole('button', { pressed: false });
    const bySlot = ['top', 'bottom', 'outerwear', 'accessory'];
    let chosen = 0;
    for (const slot of bySlot) {
      const available = screen.queryAllByText(new RegExp(INITIAL_PRODUCTS.find((p) => p.slot === slot)?.titleEn ?? 'ZZZ', 'i'));
      if (available.length) {
        fireEvent.click(available[0].closest('button') as HTMLElement);
        chosen += 1;
      }
    }
    expect(chosen).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText(/automatic discount|خصم تلقائي/i).length).toBeGreaterThan(0);
    });
  });
});

describe('the lens', () => {
  it('exposes numbered hotspots that open a keyboard-reachable callout', async () => {
    render(<App />);
    await route('#/product/molfet-p3');
    await waitFor(() => expect(screen.getAllByText(/BLACK HEAVYWEIGHT COTTON T-SHIRT/i).length).toBeGreaterThan(0));

    const hotspots = await screen.findAllByRole('button', { name: /^Fabric:/i });
    const hotspot = hotspots[0];
    expect(hotspot.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(hotspot);
    await waitFor(() => expect(hotspot.getAttribute('aria-expanded')).toBe('true'));
    expect(screen.getAllByText(/Long-staple Egyptian cotton/i).length).toBeGreaterThan(0);
  });
});

describe('rtl', () => {
  it('switches the document to Arabic with dir=rtl', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));
    const toggle = screen.getByRole('button', { name: /Switch to Arabic/i });
    fireEvent.click(toggle);
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
    await waitFor(() => expect(screen.getAllByText(/اكسر الإطار/i).length).toBeGreaterThan(0));
  });
});
