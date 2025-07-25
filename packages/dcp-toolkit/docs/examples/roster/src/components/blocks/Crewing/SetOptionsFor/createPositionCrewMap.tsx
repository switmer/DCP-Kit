import { toast } from "sonner";
import {
  CompanyCrewMemberType,
  CrewingPositionCrew,
  CrewingPositionType,
} from "@/types/type";
import { SupabaseClient } from "@supabase/supabase-js";

export const createPositionCrewMap = async (
  supabase: SupabaseClient,
  project: string,
  force?: "positionData" | "crewPositionData"
) => {
  if (!project) return;

  //-- fetch all positions associated with project.
  const { data: positionData, error: positionFetchError } = await supabase
    .from("crewing_position")
    .select()
    .eq("project", project);

  if (!positionData || !!positionFetchError) {
    console.error("Error when fetching position data: ", positionFetchError);
    toast.error("Something went wrong fetching position data.");
  }

  if (positionData === null) return;

  if (force === "positionData") {
    return positionData as CrewingPositionType[];
  }

  const positionCrewMap: { [key: string]: CompanyCrewMemberType[] } = {};
  const positionIdsArray: number[] = [];

  for (const pos of positionData) {
    //-- build keys for our object using position names.
    positionCrewMap[pos.position as string] = [];

    //-- build a separate array of position ids.
    positionIdsArray.push(pos.id);
  }

  //-- fetch all crew associated with array of position ids.
  const { data: crewPositionData, error: crewPositionFetchError } =
    await supabase
      .from("crewing_position_crew")
      .select(
        `
          *
        `
      )
      .in("crewing_position", positionIdsArray);

  if (!crewPositionData || !!crewPositionFetchError) {
    console.error("Error when fetching crew data: ", crewPositionFetchError);
    toast.error("Something went wrong fetching crew data.");

    return positionCrewMap;
  }

  if (crewPositionData === null) {
    return positionCrewMap;
  }

  if (force === "crewPositionData") {
    return crewPositionData as CrewingPositionCrew[];
  }

  const crewMemberIds: number[] = [];

  for (const crewPosition of crewPositionData) {
    if (!crewPosition.crew) return;

    crewMemberIds.push(crewPosition.crew);
  }

  const { data: crewMemberData, error: crewMemberFetchError } = await supabase
    .from("company_crew_member")
    .select()
    .in("id", crewMemberIds);

  if (!crewMemberData || !!crewMemberFetchError) {
    console.error("Error when fetching crew data: ", crewMemberFetchError);
    toast.error("Something went wrong fetching crew data.");

    return positionCrewMap;
  }

  //-- map over crewPositionData and push to associated array in positionCrewMap.
  for (const crewPosition of crewPositionData) {
    //-- find the position name corresponding to the current position id.
    const positionName = positionData.find(
      (pos) => pos.id === crewPosition.crewing_position
    )?.position;

    if (positionName && positionCrewMap[positionName]) {
      const filteredCrew = crewMemberData.filter(
        (crew) => crew.id === crewPosition.crew
      );

      filteredCrew.map((crew) => positionCrewMap[positionName].push(crew));
    }
  }

  // setSelectedCrew(positionCrewMap);

  return positionCrewMap;
};
