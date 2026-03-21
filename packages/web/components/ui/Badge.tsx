'use client';

interface BadgeProps {
  variant?: 'default' | 'success' | 'destructive' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  default: 'bg-ap-accent/10 text-ap-accent border border-ap-accent/20',
  success: 'bg-ap-success/10 text-ap-success border border-ap-success/20',
  destructive: 'bg-ap-error/10 text-ap-error border border-ap-error/20',
  secondary: 'bg-ap-elevated text-ap-text-secondary border border-ap-border',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
