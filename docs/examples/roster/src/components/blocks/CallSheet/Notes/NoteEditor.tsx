import { AlertDialog } from '@/components/ui/AlertDialog';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { Note } from '@/types/type';
import React, { useEffect, useRef } from 'react';

export const NoteEditor: React.FC<{
  currentNote: Note | undefined;
  updateNote: (field: 'title' | 'note' | 'acknowledgeable' | 'type' | 'isHighlighted', value: string | boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  deleteNote: () => Promise<void>;
  isSettingsView?: boolean;
}> = ({ currentNote, updateNote, textareaRef, deleteNote, isSettingsView = false }) => {
  const acknowledgeableOptions = [
    { value: false, label: 'Swipeable' },
    { value: true, label: 'Must acknowledge' },
  ];
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const adjustHeight = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = 'auto';
      const newHeight = Math.max(textarea.scrollHeight, 42);
      textarea.style.height = `${newHeight}px`;
    };

    if (titleRef.current) {
      adjustHeight(titleRef.current);
    }
  }, [currentNote?.title]);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="p-7 pb-4 flex flex-1 flex-col gap-2 bg-white bg-opacity-5 rounded-[26px] shadow min-h-[400px] max-sm:min-h-[unset] max-sm:h-[50%] max-sm:overflow-y-scroll">
        <>
          <textarea
            ref={titleRef}
            value={currentNote?.title ?? ''}
            placeholder="Title"
            className="text-xl min-h-[42px] placeholder:text-white placeholder:text-opacity-40 placeholder:text-xl bg-transparent leading-none resize-none overflow-hidden max-sm:max-h-[42px] max-sm:overflow-y-scroll"
            onChange={(e) => {
              updateNote('title', e.target.value);
            }}
          />

          <textarea
            ref={textareaRef}
            className="flex-1 text-2xl placeholder:text-white placeholder:text-opacity-40 placeholder:text-2xl placeholder:font-medium bg-transparent resize-none"
            placeholder="Enter note details..."
            value={currentNote?.note ?? ''}
            onChange={(e) => updateNote('note', e.target.value)}
          />

          {currentNote?.acknowledgeable && currentNote.type === 'before_details' && (
            <div className="h-12 mb-2 opacity-30 bg-white/95 rounded-[13px] border border-white/10 justify-center items-center gap-1 inline-flex text-black max-sm:hidden">
              <div className="text-[15px] font-bold">Acknowledge</div>
              <Icon name="arrow-left" className="w-8 h-8 rotate-180" />
            </div>
          )}

          {currentNote?.type === 'before_details' && (
            <div className="flex relative w-full pt-3 border-t border-white border-opacity-10 ">
              <div
                className={cn(
                  'w-1/2 h-8 rounded-[56px] absolute duration-150 bg-accent bg-opacity-10',
                  currentNote?.acknowledgeable ? 'translate-x-full' : 'translate-x-0',
                )}
              ></div>
              <>
                {acknowledgeableOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => updateNote('acknowledgeable', option.value)}
                    className={cn(
                      'text-xs h-8 flex-1 w-1/2 max-w-1/2 duration-150',
                      currentNote?.acknowledgeable === option.value ? 'text-accent' : 'text-white text-opacity-60',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            </div>
          )}
        </>
      </div>

      {!!currentNote && (
        <div
          className={cn(
            'flex justify-end items-center',
            currentNote.type !== 'before_details' && !isSettingsView && 'justify-between',
          )}
        >
          {currentNote.type !== 'before_details' && !isSettingsView && (
            <div className="flex gap-3">
              <Tooltip
                className="max-w-[300px]"
                content="Featured notes will be displayed in the header of the call sheet rather than the notes table near the crew."
              >
                <div className="flex gap items-center">
                  <div
                    onClick={() => {
                      updateNote('type', currentNote?.type === 'featured' ? 'on_page' : 'featured');
                    }}
                    className={cn(
                      'relative flex items-center w-[34px] h-[18px] bg-zinc-600 rounded-full cursor-pointer',
                      currentNote?.type === 'featured' && 'bg-lime-300',
                    )}
                  >
                    <div
                      className={cn(
                        'relative left-[2px] w-[14px] h-[14px] rounded-full bg-zinc-900 transition-all duration-150',
                        currentNote?.type === 'featured' && 'left-[18px]',
                      )}
                    />
                  </div>
                  <div className="text-sm text-white/40 pl-[8px]">Featured</div>
                </div>
              </Tooltip>

              <Tooltip
                className="max-w-[300px]"
                content="Highlighted notes will show on the call sheet with a high-contrast background color."
              >
                <div className="flex gap items-center">
                  <div
                    onClick={() => {
                      updateNote('isHighlighted', !currentNote?.isHighlighted);
                    }}
                    className={cn(
                      'relative flex items-center w-[34px] h-[18px] bg-zinc-600 rounded-full cursor-pointer',
                      currentNote?.isHighlighted && 'bg-lime-300',
                    )}
                  >
                    <div
                      className={cn(
                        'relative left-[2px] w-[14px] h-[14px] rounded-full bg-zinc-900 transition-all duration-150',
                        currentNote?.isHighlighted && 'left-[18px]',
                      )}
                    />
                  </div>
                  <div className="text-sm text-white/40 pl-[8px]">Highlight</div>
                </div>
              </Tooltip>
            </div>
          )}

          <AlertDialog
            onConfirm={deleteNote}
            onCancel={() => {}}
            title="Are you sure you want to delete this note?"
            description="This cannot be undone. This will permanently remove this note."
            isDelete
            withPortal
          >
            <div className="text-white text-opacity-40 text-sm font-medium flex items-center gap-1 group hover:text-opacity-100 duration-75">
              Delete
              <Icon name="bin" className="w-[18px] h-[18px] group-hover:text-red-400 duration-75" />
            </div>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};
