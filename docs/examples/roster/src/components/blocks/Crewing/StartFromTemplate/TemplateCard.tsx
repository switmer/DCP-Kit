import React, { FC, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useCrewingStore } from '@/store/crewing';
import { CrewingPositionType } from '@/types/type';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { crewTemplates } from '@/components/blocks/Crewing/StartFromTemplate/templates';
import { useSearchPositions } from '@/store/crew';
import { filterPositions, groupByDepartments } from '@/lib/utils';
import { Position } from '@/rules/positions';

type Props = {
  onStart?: () => void;
  setForcedStage: (stage: 'positions' | 'crew' | 'options' | null) => void;
  size: 'rungun' | 'medium' | 'large' | 'full';
  type?: string;
};

export const TemplateCard: FC<Props> = ({ onStart, setForcedStage, size }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { project, fetchPositions, setRequiredPositions } = useCrewingStore();

  const supabase = createClient();

  const selectedTemplate = crewTemplates[size];
  const positions = selectedTemplate.positions.map((pos) => ({
    ...pos,
    project,
    hiring_status: 'open',
  })) as Partial<CrewingPositionType>[];

  const create = async (updatedPositions: Partial<CrewingPositionType>[]) => {
    const { error } = await supabase.from('crewing_position').insert(updatedPositions);

    await fetchPositions();

    if (error) {
      console.error('Supabase error: ', error);
      toast.error('Something went wrong. Please try again.');

      return;
    }
  };

  const handleClick = () => {
    setRequiredPositions(positions as unknown as CrewingPositionType[]);

    setTimeout(() => {
      create(positions);
      // onStart && onStart();
      // setForcedStage("crew");
    }, 0);
  };

  return (
    <div
      onClick={handleClick}
      className="group flex flex-col justify-between min-w-[180px] w-[295px] h-[105px] [@media(max-width:1050px)]:w-[48%] max-sm:min-w-[160px] px-3 py-3 bg-lime-300/5 border border-lime-300/10 rounded-2xl cursor-pointer hover:bg-lime-300/10"
    >
      <div className="flex justify-between items-center">
        <div className="text-lg group-hover:text-lime-300">{selectedTemplate.size}</div>

        <DropdownMenu open={showDropdown} onOpenChange={() => setShowDropdown(!showDropdown)}>
          <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="flex justify-center items-center">
            <Icon className="w-5 h-5 text-white/80 cursor-pointer" name="dots" />
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              side="bottom"
              align="start"
              hideWhenDetached
              className="w-[290px] p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
              >
                <div>Option 1</div>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex w-[250px] h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-lime-300/80 focus:text-lime-300 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div>Option 2</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-white/50 group-hover:text-lime-300/30">{selectedTemplate.crewSize}</div>

        <Icon
          className="w-8 h-8 text-black/80 cursor-pointer bg-white/40 rounded-full group-hover:bg-lime-300/80"
          name="plus"
        />
      </div>
    </div>
  );
};
