import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DashboardUserControls } from '@/app/dashboard/user-controls';
import { DASHBOARD_ACCOUNT_EVENT } from '@/app/dashboard/account-event';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/toast-feedback', () => ({
  createLoadingToast: jest.fn(),
  resolveToast: jest.fn(),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div>{open ? children : null}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const { useRouter } = jest.requireMock('next/navigation');
const { createLoadingToast, resolveToast } = jest.requireMock('@/lib/toast-feedback');
const originalFetch = global.fetch;

describe('DashboardUserControls', () => {
  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'admin',
    personRecordId: 'IND-001',
  } as const;

  const renderComponent = (overrides = {}) =>
    render(<DashboardUserControls user={{ ...baseUser, ...overrides }} />);

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), refresh: jest.fn() });
    (createLoadingToast as jest.Mock).mockReturnValue('toast-1');
    (resolveToast as jest.Mock).mockReturnValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any) = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('displays the current role', () => {
    renderComponent();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('dispatches dashboard event when account button clicked with record id', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /my account/i }));

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.at(-1)?.[0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect((event as CustomEvent).type).toBe(DASHBOARD_ACCOUNT_EVENT);
    expect((event as CustomEvent).detail).toEqual({ recordId: 'IND-001' });
    dispatchSpy.mockRestore();
  });

  it('opens alert dialog when no record id is available', async () => {
    const user = userEvent.setup();
    renderComponent({ personRecordId: null });

    expect(screen.queryByText('Account overview')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /my account/i }));
    expect(screen.getByText('Account overview')).toBeInTheDocument();
  });

  it('handles logout success and redirects to login', async () => {
    const push = jest.fn();
    const refresh = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push, refresh });
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      expect(resolveToast).toHaveBeenCalledWith(
        expect.objectContaining({ toastId: 'toast-1', status: 'success' })
      );
      expect(push).toHaveBeenCalledWith('/login');
      expect(refresh).toHaveBeenCalled();
    });
  });
});
