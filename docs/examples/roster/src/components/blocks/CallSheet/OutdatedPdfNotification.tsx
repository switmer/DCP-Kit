import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface OutdatedPdfNotificationProps {
  onRegenerateClick: () => void;
  className?: string;
}

export const OutdatedPdfNotification: React.FC<OutdatedPdfNotificationProps> = ({ onRegenerateClick, className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between w-full p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg mb-4',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon name="alert" className="w-5 h-5 text-yellow-400" />
        <span className="text-white text-sm">
          The call sheet has been updated since the last PDF was generated. The PDF may not reflect the latest changes.
        </span>
      </div>
      {/*<Button*/}
      {/*  variant="accent"*/}
      {/*  className="h-9 px-4"*/}
      {/*  onClick={onRegenerateClick}*/}
      {/*>*/}
      {/*  <Icon name="refresh" className="w-4 h-4 mr-2" />*/}
      {/*  Regenerate PDF*/}
      {/*</Button>*/}
    </div>
  );
};
