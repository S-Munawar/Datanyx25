import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 focus:ring-blue-500',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 focus:ring-gray-500',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 focus:ring-green-500',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 focus:ring-yellow-500',
        destructive: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 focus:ring-red-500',
        outline: 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
