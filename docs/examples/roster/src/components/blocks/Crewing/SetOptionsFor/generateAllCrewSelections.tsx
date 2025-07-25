import { CompanyCrewMemberType, CrewingPositionType } from "@/types/type";

export const generateAllCrewSelections = (
  requiredPositions: CrewingPositionType[],
  selectedCrew: { [key: string]: CompanyCrewMemberType[] },
  crewingPositions: CrewingPositionType[]
) => {
  const createPositionNameToIdMap = () => {
    if (!crewingPositions) return;

    return crewingPositions.reduce((acc: { [key: string]: number }, pos) => {
      acc[pos.position?.toLowerCase() as string] = pos.id;

      return acc;
    }, {});
  };

  const currentCrew = requiredPositions
    .map((pos) => ({
      role: pos.position,
      crew: pos
        .crewing_position_crew!.map((crewMember) => crewMember.crew)
        .filter((id): id is number => id !== null),
    }))
    .filter((member) => member.crew.length > 0);

  const positionMap = createPositionNameToIdMap();

  if (!positionMap) return;

  const allCrewSelections: {
    crewing_position: number;
    crew: number;
    priority: number;
  }[] = [];

  if (currentCrew.length > 0) {
    for (const role in selectedCrew) {
      if (selectedCrew.hasOwnProperty(role)) {
        const matchingCrew = currentCrew.find(
          (member) => member.role!.toLowerCase() === role.toLowerCase()
        );

        if (matchingCrew) {
          const positionId = positionMap[role.toLowerCase()];

          if (positionId !== undefined) {
            matchingCrew.crew.slice(0, 4).forEach((id, i) => {
              allCrewSelections.push({
                crewing_position: positionId,
                crew: id,
                priority: i,
              });
            });
          }
        }
      }
    }
  } else {
    for (const role in selectedCrew) {
      if (selectedCrew.hasOwnProperty(role)) {
        const positionId = positionMap[role.toLowerCase()];

        if (positionId !== undefined) {
          const crewMembers = selectedCrew[role].slice(0, 4);

          for (let i = 0; i < crewMembers.length; i++) {
            const crewMember = crewMembers[i];

            allCrewSelections.push({
              crewing_position: positionId,
              crew: crewMember.id,
              priority: i,
            });
          }
        }
      }
    }
  }

  return allCrewSelections;
};
