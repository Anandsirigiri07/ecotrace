import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * SectionHeader standardizes headings across views, enforcing heading hierarchies (h1-h4)
 * and providing optional descriptive subtitles.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  level = 2,
  className = '',
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  const getHeadingStyle = () => {
    switch (level) {
      case 1:
        return "text-2xl md:text-3xl font-black text-primary dark:text-white tracking-tight";
      case 2:
        return "text-lg md:text-xl font-extrabold text-primary dark:text-white tracking-tight";
      case 3:
        return "text-sm md:text-base font-extrabold text-primary dark:text-white uppercase tracking-wider";
      default:
        return "text-xs font-bold text-textPrimary dark:text-white uppercase tracking-wider";
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <HeadingTag className={getHeadingStyle()}>
        {title}
      </HeadingTag>
      {subtitle && (
        <p className="text-xs text-textSecondary dark:text-gray-400 font-semibold leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
