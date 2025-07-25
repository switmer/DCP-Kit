import { FC } from 'react';
import { ProjectType } from '@/types/type';
import { InfoCard } from '@/components/blocks/ProjectDashboard/ProjectInfoCards/InfoCard';
import { ProjectDashViewT } from '@/components/blocks/ProjectDashboard';

type Props = {
  project: ProjectType;
  setView: (view: ProjectDashViewT) => void;
  numCrew?: number | null;
  numPositions?: number | null;
  numDaysRemaining?: number | null;
  numFiles?: number | null;
  numLocations?: number | null;
};

export const ProjectInfoCards: FC<Props> = (props) => {
  return (
    <div className="flex items-center gap-3">
      {(props.numCrew || props.numPositions) && (
        <InfoCard setView={props.setView} numCrew={props.numCrew ?? 0} numPositions={props.numPositions ?? 0} />
      )}
      {props.numDaysRemaining && props.numDaysRemaining > 0 && (
        <InfoCard setView={props.setView} numDaysRemaining={props.numDaysRemaining} />
      )}
      {props.numFiles && props.numFiles > 0 && <InfoCard setView={props.setView} numFiles={props.numFiles} />}
      {props.numLocations && props.numLocations > 0 && (
        <InfoCard setView={props.setView} numLocations={props.numLocations} />
      )}
    </div>
  );
};
