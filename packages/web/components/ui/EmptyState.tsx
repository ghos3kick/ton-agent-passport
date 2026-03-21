'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-ap-text mb-2">{title}</h3>
      {description && <p className="text-ap-text-secondary max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
