import { similarityScore } from '@/lib/search';
import { Position, defaultPositionRules } from '@/rules/positions';
import { CompanyCrewMemberType, CompanyType, PositionType } from '@/types/type';
import { useCallback } from 'react';
import { create } from 'zustand';
import { migrateRuleSet } from '@/lib/rules/migrateRules';
import { ModernRule } from '@/types/rules';
import departmentData, { fuzzySearchDepartments as defaultFuzzySearchDepartments } from '@/rules/departments';

type State = {
  selected: number | null;
  crew: (CompanyCrewMemberType & { position: PositionType[] })[];
  refreshKey: number;
  structureRefreshKey: number;
  company?: CompanyType | null;
  loading: boolean;
  search: string;
  count: number;
  positionRules: ModernRule[];
  mergedPositionRules: ModernRule[];
  positionRulesId: null | number;
  structure: Record<
    string,
    { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]
  >;
  searchIndex: Map<string, ModernRule>;
  departmentSearchIndex: Map<string, ModernRule>;
};

type Actions = {
  setSelected: (value: number | null) => void;
  setRefreshKey: () => void;
  setLoading: (value: boolean) => void;
  setCompany: (value?: CompanyType | null) => void;
  setCrew: (value: (CompanyCrewMemberType & { position: PositionType[] })[]) => void;
  setStructure: (
    value: Record<string, { position: string; count: number; prettyDepartment: string; originalDepartment: string }[]>,
  ) => void;
  setSearch: (value: string) => void;
  setCount: (value: number) => void;
  setPositionRules: (value: Position[] | ModernRule[]) => void; // accept both rule types for migration.
  setPositionRulesId: (value: number | null) => void;
  setSearchIndex: (value: Map<string, ModernRule>) => void;
  resetRefreshKeys: () => void;
};

export const useCrewStore = create<State & Actions>((set) => ({
  selected: null,
  crew: [],
  refreshKey: 0,
  structureRefreshKey: 0,
  company: null,
  loading: true,
  search: '',
  count: 0,
  positionRules: [],
  mergedPositionRules: [],
  positionRulesId: null,
  structure: {},
  searchIndex: new Map(),
  departmentSearchIndex: new Map(),

  setCount: (value) => set({ count: value }),
  setSearch: (value) => set({ search: value }),
  setCrew: (value) => set({ crew: value }),
  setCompany: (value) => set({ company: value }),
  setLoading: (value) => set({ loading: value }),
  setSelected: (value) => set({ selected: value }),
  setRefreshKey: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  resetRefreshKeys: () => set({ refreshKey: 0, structureRefreshKey: 0 }),
  setSearchIndex: (value) => set({ searchIndex: value }),
  setPositionRules: (value) => {
    // migrate rules to modern format.
    const modernRules = migrateRuleSet(value);

    // convert default position rules to modern format.
    const defaultModernRules: ModernRule[] = defaultPositionRules.map((rule) => ({
      type: 'position' as const,
      aliases: rule.aliases,
      position: rule.position,
      departments: rule.departments,
      overridePosition: rule.overridePosition || rule.position,
    }));

    const mergedPositionRules: ModernRule[] = [...defaultModernRules];
    const positionIndex = new Map<string, ModernRule>();
    const departmentIndex = new Map<string, ModernRule>();

    for (const rule of modernRules) {
      if (rule.type === 'position') {
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
    }

    // build position search index.
    mergedPositionRules.forEach((item) => {
      if (item.type === 'position' && item.position) {
        positionIndex.set(item.position.toLowerCase(), item);

        if (item.overridePosition) {
          positionIndex.set(item.overridePosition.toLowerCase(), item);
        }

        item.aliases.forEach((alias) => {
          positionIndex.set(alias.toLowerCase(), item);
        });
      }
    });

    // build department search index.
    modernRules.forEach((rule) => {
      if (rule.type === 'department') {
        // index by original department names.
        rule.departments.forEach((dept) => {
          departmentIndex.set(dept.toLowerCase(), rule);
        });

        // index by override department name.
        if (rule.overrideDepartment) {
          departmentIndex.set(rule.overrideDepartment.toLowerCase(), rule);
        }

        // index by aliases.
        rule.aliases.forEach((alias) => {
          departmentIndex.set(alias.toLowerCase(), rule);
        });
      }
    });

    set((state) => ({
      positionRules: modernRules,
      searchIndex: positionIndex,
      departmentSearchIndex: departmentIndex,
      structureRefreshKey: state.structureRefreshKey + 1,
      mergedPositionRules: mergedPositionRules,
    }));
  },
  setPositionRulesId: (value) => set({ positionRulesId: value }),
  setStructure: (value) => set({ structure: value }),
}));

export const useSearchPositions = () => {
  const { searchIndex } = useCrewStore();

  const search = useCallback(
    (query: string): ModernRule | undefined => {
      return searchIndex.get(query?.toLowerCase());
    },
    [searchIndex],
  );

  const fuzzySearch = useCallback(
    (query: string): string[] => {
      if (!query) return [];

      const processedQuery = query.toLowerCase();
      const matches: Array<{ position: string; score: number }> = [];

      searchIndex.forEach((rule, key) => {
        if (rule.type === 'position' && rule.position) {
          if (key === processedQuery) {
            matches.push({ position: rule.position, score: 1.1 });
          } else if (key.includes(processedQuery)) {
            matches.push({ position: rule.position, score: 0.8 });
          } else {
            const score = similarityScore(key, processedQuery);

            if (score > 0.4) {
              matches.push({ position: rule.position, score });
            }
          }
        }
      });

      return Array.from(new Set(matches.sort((a, b) => b.score - a.score).map((match) => match.position)));
    },
    [searchIndex],
  );

  return { search, fuzzySearch };
};

export const useSearchDepartments = () => {
  const { departmentSearchIndex } = useCrewStore();

  const search = useCallback(
    (query: string): ModernRule | undefined => {
      return departmentSearchIndex.get(query?.toLowerCase());
    },
    [departmentSearchIndex],
  );

  const getAllDepartmentSuggestions = useCallback((): string[] => {
    const suggestions = new Set<string>();

    // Add default departments from rules/departments.ts
    departmentData.forEach((dept) => {
      suggestions.add(dept.department);
    });

    // Add custom departments from departmentSearchIndex
    departmentSearchIndex.forEach((rule) => {
      if (rule.type === 'department') {
        // add the override department name.
        if (rule.overrideDepartment) {
          suggestions.add(rule.overrideDepartment);
        }

        // add original department names.
        rule.departments.forEach((dept) => {
          suggestions.add(dept);
        });

        // add aliases.
        rule.aliases.forEach((alias) => {
          suggestions.add(alias);
        });
      }
    });

    return Array.from(suggestions).sort();
  }, [departmentSearchIndex]);

  const fuzzySearchDepartments = useCallback(
    (query: string): string[] => {
      if (!query) return getAllDepartmentSuggestions();

      const processedQuery = query.toLowerCase();
      const matches: Array<{ department: string; score: number }> = [];

      // Search default departments from rules/departments.ts
      const defaultMatches = defaultFuzzySearchDepartments(query);
      defaultMatches.forEach((dept) => {
        matches.push({ department: dept, score: 0.9 }); // Give default departments a good score
      });

      // Search custom departments from departmentSearchIndex
      departmentSearchIndex.forEach((rule, key) => {
        if (rule.type === 'department') {
          const departmentName = rule.overrideDepartment || rule.departments[0] || '';

          if (key === processedQuery) {
            matches.push({ department: departmentName, score: 1.1 });
          } else if (key.includes(processedQuery)) {
            matches.push({ department: departmentName, score: 0.8 });
          } else {
            const score = similarityScore(key, processedQuery);
            if (score > 0.4) {
              matches.push({ department: departmentName, score });
            }
          }
        }
      });

      return Array.from(new Set(matches.sort((a, b) => b.score - a.score).map((match) => match.department)));
    },
    [departmentSearchIndex, getAllDepartmentSuggestions],
  );

  return { search, getAllDepartmentSuggestions, fuzzySearchDepartments };
};
