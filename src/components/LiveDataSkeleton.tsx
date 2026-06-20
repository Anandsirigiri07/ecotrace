import React from 'react';

export const LiveDataSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    {/* Grid status skeleton */}
    <div className="h-16 bg-gray-200 rounded-2xl w-full" />
    {/* Weather card skeleton */}
    <div className="h-20 bg-gray-200 rounded-2xl w-full" />
    {/* Score ring skeleton */}
    <div className="h-48 bg-gray-200 rounded-full w-48 mx-auto" />
  </div>
);

interface CardSkeletonProps {
  height?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  height = 'h-16' 
}) => (
  <div className={`animate-pulse ${height} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-2xl w-full`} 
    aria-label="Loading..."
    role="status"
  />
);
