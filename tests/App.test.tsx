import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/app/App';

vi.mock('../src/api/identity', () => ({
  refreshSession: vi.fn().mockRejectedValue(new Error('no session')),
  getMe: vi.fn(),
  staffLogin: vi.fn(),
  staffMfaVerify: vi.fn(),
  logout: vi.fn(),
}));

describe('App route guard', () => {
  it('redirects an anonymous visitor to the login screen', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});
