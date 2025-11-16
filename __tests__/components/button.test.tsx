import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
  });

  it('applies variant and size classes from buttonVariants', () => {
    const variant = 'outline';
    const size = 'lg';
    const { container } = render(
      <Button variant={variant} size={size}>
        Outline Large
      </Button>
    );
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toBeInTheDocument();

    const expectedClassList = buttonVariants({ variant, size }).split(' ');
    expectedClassList.forEach((expectedClass) => {
      if (!expectedClass) return;
      expect(button).toHaveClass(expectedClass);
    });
  });

  it('merges custom className with generated variants', () => {
    const customClass = 'tracking-wide';
    const { container } = render(
      <Button className={customClass}>Custom Class</Button>
    );
    const button = container.querySelector('[data-slot="button"]');
    expect(button).toHaveClass(customClass);
  });

  it('supports rendering as child elements via Slot', () => {
    render(
      <Button asChild>
        <a href="/dashboard">Dashboard link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /dashboard link/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveAttribute('data-slot', 'button');
  });
});
