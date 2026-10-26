import React from 'react';

interface PHPLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const PHPLogo: React.FC<PHPLogoProps> = ({ 
  className = '', 
  size = 'md',
}) => {
  const getDims = () => {
    switch (size) {
      case 'sm':
        return 'h-8 max-w-[160px]';
      case 'md':
        return 'h-12 max-w-[220px]';
      case 'lg':
        return 'h-16 max-w-[280px]';
      case 'hero':
        return 'h-24 max-w-[380px]';
      default:
        return 'h-12 max-w-[220px]';
    }
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/assets/aistudio/Copy_of_PHP_RH2_7079f4f2.png"
        alt="PHP Repair Hub"
        className={`${getDims()} w-auto object-contain`}
      />
    </div>
  );
};
