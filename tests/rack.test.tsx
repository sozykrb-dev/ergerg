import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import { INITIAL_PRODUCTS } from '../src/data/constants';
import { parseRoute } from '../src/lib/router';

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
  if (!(window as any).IntersectionObserver) {
    (window as any).IntersectionObserver = class {
      observe() {} unobserve() {} disconnect() {}
      takeRecords() { return []; }
    };
    (globalThis as any).IntersectionObserver = (window as any).IntersectionObserver;
  }
});
beforeEach(() => { cleanup(); window.location.hash = ''; localStorage.clear(); });

const route = (hash: string) => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

describe('rack view', () => {
  it('is a real route', () => {
    expect(parseRoute('#/rack')).toEqual({ name: 'rack' });
    expect(parseRoute('#/rack?x=1')).toEqual({ name: 'rack' });
  });

  it('opens from the header button', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));

    const openers = screen.getAllByRole('button', { name: /Rack view/i });
    expect(openers.length).toBeGreaterThan(0);
    fireEvent.click(openers[0]);

    await waitFor(() => expect(window.location.hash).toBe('#/rack'));
    await waitFor(() => expect(screen.getAllByText(/Everything on the rail/i).length).toBeGreaterThan(0));
  });

  it('hangs clothes only — accessories stay off the rail', async () => {
    render(<App />);
    await route('#/rack');
    await waitFor(() => expect(screen.getAllByText(/Everything on the rail/i).length).toBeGreaterThan(0));

    const rail = await screen.findByRole('list', { name: /Clothing rail/i });
    const garments = INITIAL_PRODUCTS.filter((product) => (product.slot || 'top') !== 'accessory');
    const accessories = INITIAL_PRODUCTS.filter((product) => product.slot === 'accessory');

    // every garment has a hanger (turn button) inside the rail
    const turnButtons = within(rail).getAllByRole('button', { name: /around/i });
    expect(turnButtons.length).toBe(garments.length);

    for (const accessory of accessories) {
      expect(within(rail).queryByText(new RegExp(accessory.titleEn, 'i'))).toBeNull();
    }
  });

  it('turns a garment on the hanger', async () => {
    render(<App />);
    await route('#/rack');
    const rail = await screen.findByRole('list', { name: /Clothing rail/i });
    const first = within(rail).getAllByRole('button', { name: /around/i })[0];

    const stage = first.closest('.mf-rack-item')!.querySelector('.mf-rack-item__turn') as HTMLElement;
    expect(stage.style.transform).toBe('rotateY(0deg)');

    fireEvent.click(first);
    await waitFor(() => expect(stage.style.transform).toBe('rotateY(360deg)'));

    fireEvent.click(first);
    await waitFor(() => expect(stage.style.transform).toBe('rotateY(720deg)'));
  });

  it('filters the rail by slot', async () => {
    render(<App />);
    await route('#/rack');
    await waitFor(() => expect(screen.getAllByText(/Everything on the rail/i).length).toBeGreaterThan(0));

    const bottoms = INITIAL_PRODUCTS.filter((product) => product.slot === 'bottom');
    const tops = INITIAL_PRODUCTS.filter((product) => product.slot === 'top');

    fireEvent.click(screen.getAllByRole('button', { name: /Bottoms/i })[0]);
    await waitFor(() => {
      const rail = screen.getByRole('list', { name: /Clothing rail/i });
      expect(within(rail).getAllByRole('button', { name: /around/i }).length).toBe(bottoms.length);
      expect(within(rail).queryByText(new RegExp(tops[0].titleEn, 'i'))).toBeNull();
    });
  });

  it('keeps the wardrobe working in Arabic', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /Switch to Arabic/i }));
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));

    await route('#/rack');
    await waitFor(() => expect(screen.getAllByText(/كل الهدوم على الشماعة/).length).toBeGreaterThan(0));
  });
});
