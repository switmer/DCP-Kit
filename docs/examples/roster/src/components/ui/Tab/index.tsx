import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { useState } from 'react';

export const Tab: React.FC<{
  options: string[];
  selected: string;
  setSelected: (selected: string) => void;
  defaultWidth?: number;
  className?: string;
  selectedBackgroundColor?: string;
  selectedHeight?: string;
}> = ({ options, selected, setSelected, defaultWidth, className, selectedBackgroundColor, selectedHeight }) => {
  const [sliderWidth, setSliderWidth] = useState(defaultWidth ?? 0);
  const [sliderOffsetWidth, setSliderOffsetWidth] = useState(0);
  const refs = options.map(() => React.createRef<HTMLButtonElement>());

  useEffect(() => {
    const selectedRef = refs.find((_ref, index) => options[index] === selected);
    const currentIndex = options.findIndex((option) => option === selected);

    if (selectedRef && selectedRef.current) {
      setSliderWidth(selectedRef.current.offsetWidth);
      if (currentIndex === 0) {
        setSliderOffsetWidth(0);
        return;
      }
      if (currentIndex === 1) {
        setSliderOffsetWidth(refs[0].current?.offsetWidth ?? 0);
        return;
      }

      setSliderOffsetWidth((refs[0].current?.offsetWidth ?? 0) + (refs[1].current?.offsetWidth ?? 0));
    }
  }, [options, refs, selected]);

  return (
    <div
      className={cn(
        'relative h-[38px] p-1 bg-neutral-900 rounded-[56px] backdrop-blur-[36px] items-center flex max-sm:hidden',
        className,
      )}
    >
      <div
        className={cn(`absolute h-[${selectedHeight ?? '30'}px] l-1 px-4 rounded-[56px] duration-150`)}
        style={{
          transform: `translateX(${sliderOffsetWidth}px)`,
          width: sliderWidth,
          backgroundColor: selectedBackgroundColor ?? '#313527',
        }}
      ></div>
      {options?.map((o, i) => (
        <button
          onClick={() => setSelected(o)}
          key={o}
          className={cn(
            'px-4 z-10 h-[30px] rounded-[56px] justify-center items-center text-xs font-600 gap-2 flex stone-300 capitalize cursor-pointer',
            selected === o && 'text-lime-300',
          )}
          ref={refs[i]}
        >
          {o}
        </button>
      ))}
    </div>
  );
};
