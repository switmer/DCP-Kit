import { searchDepartments } from '@/rules/departments';
import { Position, defaultPositionRules } from '@/rules/positions';
import { CallSheetMemberType, CompanyCrewMemberType } from '@/types/type';
import { SupabaseClient } from '@supabase/supabase-js';

export const processRole = async (
  member: CallSheetMemberType,
  crew: CompanyCrewMemberType,
  department: string[],
  supabase: SupabaseClient,
  normalizedSearchPositions?: (query: string) => Position | undefined,
) => {
  if (!member?.title || !crew) return;

  let searchPositions = normalizedSearchPositions;

  if (!searchPositions) {
    searchPositions = await setupSearchPositions(supabase, crew.company);
  }

  const foundPosition = searchPositions(member?.title?.trim()?.toLowerCase());

  const normalizedRole = foundPosition ? foundPosition?.position?.toLowerCase() : member.title?.toLowerCase();

  let normalizedDepartment: string[] | null = null;

  if (!!department && department?.length) {
    // if a custom department is provided, always use it.
    normalizedDepartment = department.map((d) => d?.toLowerCase());
  } else if (foundPosition) {
    // only use position's department if no custom department is provided.
    normalizedDepartment = foundPosition?.departments?.map((d) => d?.toLowerCase());
  }

  const { data: positionsData } = await supabase
    .from('position')
    .select()
    .eq('name', normalizedRole)
    .eq('crew', crew.id);

  const position = positionsData?.[0] ?? {};

  const payload = {
    ...position,
    name: normalizedRole,
    crew: crew.id,
    company: crew.company,
    known: !!searchPositions(normalizedRole),
  };

  if (normalizedDepartment) {
    payload.department = [...new Set([...(position?.department ?? []), ...normalizedDepartment])];
  }

  const { data } = await supabase.from('position').upsert(payload);

  return !!data;
};

const setupSearchPositions = async (supabase: SupabaseClient, company?: string | null) => {
  const searchIndex = new Map<string, Position>();

  const { data: positionRules } = await supabase.from('crew_rule_set').select().eq('company', company).single();

  const mergedPositionRules: Position[] = [...defaultPositionRules];

  const rules = !!positionRules?.rule_set && Array.isArray(positionRules?.rule_set) ? positionRules?.rule_set : [];

  for (const rule of rules) {
    const existingIndex = mergedPositionRules.findIndex((pos) => pos.position === rule.overridePosition);
    if (existingIndex !== -1) {
      mergedPositionRules[existingIndex] = {
        ...mergedPositionRules[existingIndex],
        ...rule,
      };
    } else {
      mergedPositionRules.push(rule);
    }
  }

  mergedPositionRules.forEach((item) => {
    searchIndex.set(item.position?.toLowerCase(), item);

    item.aliases.forEach((alias) => {
      searchIndex.set(alias?.toLowerCase(), item);
    });
  });

  return (query: string): Position | undefined => {
    return searchIndex.get(query?.toLowerCase());
  };
};
