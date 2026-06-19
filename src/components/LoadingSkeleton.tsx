import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'ring' | 'card' | 'chart' | 'line' | 'list';
  count?: number;
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'ring':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-md space-y-4 w-full" aria-hidden="true">
            <div className="w-40 h-40 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white"></div>
            </div>
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>
        );
      case 'chart':
        return (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 w-full" aria-hidden="true">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-48 w-full bg-gray-150 rounded animate-pulse flex items-end space-x-2 px-4">
              <div className="h-24 w-full bg-gray-200 rounded-t"></div>
              <div className="h-32 w-full bg-gray-200 rounded-t"></div>
              <div className="h-16 w-full bg-gray-200 rounded-t"></div>
              <div className="h-40 w-full bg-gray-200 rounded-t"></div>
              <div className="h-28 w-full bg-gray-200 rounded-t"></div>
            </div>
          </div>
        );
      case 'line':
        return (
          <div className="space-y-2 w-full" aria-hidden="true">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-3 w-full" aria-hidden="true">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'card':
      default:
        return (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 w-full" aria-hidden="true">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {variant === 'list' ? renderSkeleton() : (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(count)].map((_, i) => (
            <React.Fragment key={i}>
              {renderSkeleton()}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
export default LoadingSkeleton;
