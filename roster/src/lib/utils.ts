import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addHours, addMinutes, format, parse } from 'date-fns';
import { Position } from '@/rules/positions';
import { CallSheetMemberType, ProjectMemberType, ProjectPositionType } from '@/types/type';
import { ModernRule } from '@/types/rules';
import { useCallback } from 'react';
import { useSearchDepartments } from '@/store/crew';
import { searchDepartments } from '@/rules/departments';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getGreeting = () => {
  const currentTime = parseInt(format(new Date(), 'H'));

  let greeting = '';

  if (currentTime >= 5 && currentTime < 12) {
    greeting = 'Good morning';
  } else if (currentTime >= 12 && currentTime < 17) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }

  return greeting;
};

export const makeInitials = (name?: string) => {
  const words = name?.split(' ') ?? [];

  let initials = '';

  if (!words) return '-';

  for (const word of words) {
    if (word.length > 0 && initials.length < 2) {
      initials += word[0]?.toUpperCase();
    }
  }

  return initials;
};

export const formatSheetDate = (dateString: string, type: 'str' | 'obj'): Date | string => {
  try {
    const parsedDate = parse(dateString, 'MM/dd/yy', new Date());

    return type === 'str' ? format(parsedDate, 'EEE, MMM d') : parsedDate;
  } catch (err) {
    if (type === 'obj') {
      throw err;
    }

    return dateString;
  }
};

export const formatSheetDatePastJob = (dateString: string) => {
  try {
    const parsedDate = parse(dateString, 'MM/dd/yy', new Date());

    return format(parsedDate, 'EEE, MMM d, yyyy');
  } catch (err) {
    return dateString;
  }
};

export function formatDateRange(dateArray: string[]) {
  if (!dateArray || dateArray.length === 0) {
    return '';
  }

  const dates = dateArray
    .map((dateStr) => {
      try {
        const parsedDate = parse(dateStr, 'MM/dd/yy', new Date());
        if (isNaN(parsedDate.getTime())) {
          return null;
        }
        return parsedDate;
      } catch (error) {
        return null;
      }
    })
    .filter((date): date is Date => date !== null);

  if (dates.length === 0) {
    return '';
  }

  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];

  try {
    const formattedEarliest = format(earliestDate, 'MMM d');
    const formattedLatest = format(latestDate, 'MMM d');

    if (formattedEarliest === formattedLatest) {
      return formattedEarliest;
    } else {
      return `${formattedEarliest} - ${formattedLatest}`;
    }
  } catch (error) {
    return '';
  }
}

export function geocodeAddress(address: string) {
  if (!address) return;
  return fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`,
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0];
      } else {
        console.error('Geocoding failed:', data.status);
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

export const makeName = (name?: string) => {
  if (!name) return [];

  const spaceIndex = name?.indexOf(' ') ?? -1;
  let first_name = null,
    last_name = null;

  if (spaceIndex !== -1) {
    first_name = name?.substring(0, spaceIndex);
    last_name = name?.substring(spaceIndex + 1);
  } else {
    first_name = name;
  }

  return [first_name, last_name];
};

export function capitalizeString(name: string) {
  if (!name?.trim()) return '';

  name = name?.trim().toLowerCase();

  let newName = '';
  const words = name.split(' ');

  for (let i = 0; i < words.length; i++) {
    if (words[i]) {
      newName += words[i][0].toUpperCase() + words[i].slice(1);
    }
    if (i < words.length - 1) newName += ' ';
  }

  return newName?.trim();
}

export const stringToParam = (str: string) => {
  return encodeURIComponent(str.replace(/ /g, '-')?.toLowerCase());
};

export const paramToString = (str: string) => {
  return decodeURIComponent(str.replace(/-/g, ' ')?.toLocaleLowerCase());
};

type DepartmentGroup = { [key: string]: Position[] };

export const groupByDepartments = (positions: Position[]): DepartmentGroup => {
  return positions.reduce((acc, position) => {
    position.departments.forEach((department) => {
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(position);
    });
    return acc;
  }, {} as DepartmentGroup);
};

export type ModernRuleDepartmentGroup = {
  [department: string]: ModernRule[];
};

export const groupModernRulesByDepartments = (rules: ModernRule[]): ModernRuleDepartmentGroup => {
  return rules.reduce((acc, rule) => {
    rule.departments.forEach((department) => {
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(rule);
    });

    return acc;
  }, {} as ModernRuleDepartmentGroup);
};

export const filterPositions = (positions: Position[], query: string) => {
  const lowerCaseQuery = query.toLowerCase();

  return positions.filter((position) => {
    const positionMatches = position.position.toLowerCase().includes(lowerCaseQuery);
    const aliasesMatches = position.aliases.some((alias) => alias.toLowerCase().includes(lowerCaseQuery));
    const departmentsMatches = position.departments.some((department) =>
      department.toLowerCase().includes(lowerCaseQuery),
    );

    return positionMatches || aliasesMatches || departmentsMatches;
  });
};

export const filterModernRules = (rules: ModernRule[], query: string) => {
  const lowerCaseQuery = query.toLowerCase();

  return rules.filter((rule) => {
    // for position rules, check position and overridePosition.
    if (rule.type === 'position') {
      const positionMatches = rule.position?.toLowerCase().includes(lowerCaseQuery) || false;
      const overrideMatches = rule.overridePosition?.toLowerCase().includes(lowerCaseQuery) || false;
      const aliasesMatches = rule.aliases.some((alias) => alias.toLowerCase().includes(lowerCaseQuery));
      const departmentsMatches = rule.departments.some((department) =>
        department.toLowerCase().includes(lowerCaseQuery),
      );

      return positionMatches || overrideMatches || aliasesMatches || departmentsMatches;
    }

    // for department rules, check departments and overrideDepartment.
    if (rule.type === 'department') {
      const departmentMatches = rule.departments.some((department) =>
        department.toLowerCase().includes(lowerCaseQuery),
      );
      const overrideDepartmentMatches = rule.overrideDepartment?.toLowerCase().includes(lowerCaseQuery) || false;
      const aliasesMatches = rule.aliases.some((alias) => alias.toLowerCase().includes(lowerCaseQuery));

      return departmentMatches || overrideDepartmentMatches || aliasesMatches;
    }

    return false;
  });
};

export const useDepartmentSuggestions = () => {
  const { getAllDepartmentSuggestions, fuzzySearchDepartments } = useSearchDepartments();

  const getDepartmentSuggestions = useCallback(
    (query?: string): string[] => {
      // get custom department suggestions from rules.
      const customSuggestions = query ? fuzzySearchDepartments(query) : getAllDepartmentSuggestions();

      // get default department suggestions.
      const defaultDepartments = Object.values(searchDepartments || {})
        .map((dept) => dept.department)
        .filter((dept) => !query || dept.toLowerCase().includes(query.toLowerCase()));

      // combine and deduplicate, prioritizing custom rules.
      const allSuggestions = [...customSuggestions];

      defaultDepartments.forEach((dept) => {
        if (!allSuggestions.some((suggestion) => suggestion.toLowerCase() === dept.toLowerCase())) {
          allSuggestions.push(dept);
        }
      });

      return allSuggestions.sort();
    },
    [getAllDepartmentSuggestions, fuzzySearchDepartments],
  );

  return { getDepartmentSuggestions };
};

/* ----------------- GET CALL TIME ----------------- */

export function getFormattedTime(callTime: string, generalCrewCall: string): string {
  try {
    const parsedTime = parse(callTime || generalCrewCall || '', 'h:mm a', new Date());

    return format(parsedTime, 'h:mm a');
  } catch {
    return callTime;
  }
}

export function getAdjustedCallTime(time: string, callPush: { hours: number; minutes: number }): string {
  if (!time || !callPush) return time;

  try {
    const originalTime = parse(time, 'h:mmaaaaa', new Date());

    let newTime = addHours(originalTime, callPush.hours ?? 0);
    newTime = addMinutes(newTime, callPush.minutes ?? 0);

    return format(newTime, 'h:mmaaaaa');
  } catch {
    return time;
  }
}

/* ----------------- CALL SHEET ----------------- */

/* TEMPORARY: USE PROJECT MEMBER DATA INSTEAD OF CALL SHEET MEMBER */
export const normalizeCallSheetMember = (member: any) => {
  if (!member) return null;

  if (!member?.project_position?.project_member) {
    return {
      ...member,
      department: member?.project_position?.department,
      title: member?.project_position?.title,
    };
  }

  return {
    ...member,
    name: member?.project_position?.project_member?.name,
    email: member?.project_position?.project_member?.email,
    phone: member?.project_position?.project_member?.phone,
    department: member?.project_position?.department,
    title: member?.project_position?.title,
    crew_member: member?.project_position?.project_member?.crew,
  };
};

export const normalizeDepartment = (raw: string) => {
  const dept = raw.toLowerCase();
  if (["lighting", "lights", "light"].includes(dept)) return "Electric";
  return raw;
};
