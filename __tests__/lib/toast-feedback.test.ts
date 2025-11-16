import { createLoadingToast, resolveToast } from '@/lib/toast-feedback';
import { toast, updateToast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  updateToast: jest.fn(),
}));

describe('toast feedback helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a loading toast with default options', () => {
    createLoadingToast('Loading', 'Please wait');
    expect(toast).toHaveBeenCalledWith({
      title: 'Loading',
      description: 'Please wait',
      status: 'loading',
      duration: 60000,
      closeLabel: 'Dismiss',
    });
  });

  it('resolves a toast with appropriate variant for status', () => {
    resolveToast({ toastId: '123', title: 'Done', description: 'All set', status: 'success' });
    expect(updateToast).toHaveBeenCalledWith({
      id: '123',
      title: 'Done',
      description: 'All set',
      status: 'success',
      variant: 'default',
      duration: 4500,
    });
  });

  it('uses destructive variant for error status', () => {
    resolveToast({ toastId: 'x', title: 'Oops', status: 'error', description: undefined });
    expect(updateToast).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'x', variant: 'destructive', status: 'error' })
    );
  });
});
