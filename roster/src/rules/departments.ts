import { similarityScore } from '@/lib/search';

export const data = [
  {
    department: 'Accounting',
    aliases: [],
  },
  {
    department: 'Agency',
    aliases: [],
  },
  {
    department: 'Animal Wranglers',
    aliases: [],
  },
  {
    department: 'Animals',
    aliases: [],
  },
  {
    department: 'Animation',
    aliases: [],
  },
  {
    department: 'Art',
    aliases: [],
  },
  {
    department: 'Assistant Directors',
    aliases: [],
  },
  {
    department: 'Camera',
    aliases: [],
  },
  {
    department: 'Cast',
    aliases: [],
  },
  {
    department: 'Casting',
    aliases: [],
  },
  {
    department: 'Catering',
    aliases: [],
  },
  {
    department: 'Color',
    aliases: [],
  },
  {
    department: 'Construction',
    aliases: [],
  },
  {
    department: 'Costume / Wardrobe',
    aliases: [],
  },
  {
    department: 'Craft Services',
    aliases: [],
  },
  {
    department: 'Dailies',
    aliases: [],
  },
  {
    department: 'Deliverables',
    aliases: [],
  },
  {
    department: 'Digital Cinema',
    aliases: [],
  },
  {
    department: 'Directing',
    aliases: [],
  },
  {
    department: 'Editorial',
    aliases: [],
  },
  {
    department: 'Electric',
    aliases: [],
  },
  {
    department: 'Graphics',
    aliases: [],
  },
  {
    department: 'Grip',
    aliases: [],
  },
  {
    department: 'Grip & Electric',
    aliases: [],
  },
  {
    department: 'Hair & Makeup',
    aliases: [],
  },
  {
    department: 'Health & Safety',
    aliases: [],
  },
  {
    department: 'Locations',
    aliases: [],
  },
  {
    department: 'Makeup',
    aliases: [],
  },
  {
    department: 'Makeup & Hair',
    aliases: [],
  },
  {
    department: 'Miscellaneous',
    aliases: [],
  },
  {
    department: 'Music',
    aliases: [],
  },
  {
    department: 'Opticals',
    aliases: [],
  },
  {
    department: 'Picture Cars',
    aliases: [],
  },
  {
    department: 'Post',
    aliases: [],
  },
  {
    department: 'Post Production',
    aliases: [],
  },
  {
    department: 'Post-Production',
    aliases: [],
  },
  {
    department: 'Producers',
    aliases: [],
  },
  {
    department: 'Production',
    aliases: [],
  },
  {
    department: 'Projection',
    aliases: [],
  },
  {
    department: 'Property',
    aliases: [],
  },
  {
    department: 'Props',
    aliases: [],
  },
  {
    department: 'Safety',
    aliases: [],
  },
  {
    department: 'Script',
    aliases: [],
  },
  {
    department: 'Set Decoration',
    aliases: [],
  },
  {
    department: 'Sound',
    aliases: [],
  },
  {
    department: 'Sound/Post',
    aliases: [],
  },
  {
    department: 'Special Effects',
    aliases: [],
  },
  {
    department: 'Stunts',
    aliases: [],
  },
  {
    department: 'Transfers',
    aliases: [],
  },
  {
    department: 'Transportation',
    aliases: [],
  },
  {
    department: 'VFX',
    aliases: [],
  },
  {
    department: 'Visual Effects',
    aliases: [],
  },
  {
    department: 'Writers',
    aliases: [],
  },
  {
    department: 'Writing',
    aliases: [],
  },
];

const index = new Map<string, { department: string; aliases: string[] }>();

data.forEach((item) => {
  index.set(item?.department?.toLowerCase(), item);
});

export const searchDepartments = (query: string): { department: string; aliases: string[] } | undefined => {
  return index.get(query?.toLowerCase());
};

export const fuzzySearchDepartments = (query: string): string[] => {
  if (!query) return [];

  const processedQuery = query.toLowerCase();
  const matches: Array<{ department: string; score: number }> = [];

  index.forEach(({ department }, key) => {
    if (key === processedQuery) {
      matches.push({ department, score: 1.1 });
    } else if (key.includes(processedQuery)) {
      matches.push({ department, score: 0.8 });
    } else {
      const score = similarityScore(key, processedQuery);
      if (score > 0.4) {
        matches.push({ department, score });
      }
    }
  });

  // Sort by score and extract just the departments
  return Array.from(new Set(matches.sort((a, b) => b.score - a.score).map((match) => match.department)));
};

export default data;
