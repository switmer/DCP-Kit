import { z } from "zod";

export const CallsheetSchema = z.object({
  day_of_days: z.string(),
  full_date: z.string(),
  general_crew_call: z.string().optional(),
  job_name: z.string(),
  locations: z.array(
    z.object({
      description: z.string(),
      name: z.string(),
      address: z.string(),
      instructions_or_notes: z.string(),
      type: z.enum([
        "shoot location",
        "hospital",
        "parking",
        "production office",
        "basecamp",
      ]),
      phone: z.string().nullable(),
    })
  ),
  notes_and_instructions: z.array(
    z.object({
      title: z.string().optional(),
      body: z.string(),
    })
  ),
  schedule: z.object({
    crew_call: z.string(),
    department_calls: z.object({
      art: z.string(),
      camera: z.string(),
      grip_electric: z.string(),
      makeup: z.string(),
    }),
    production_call: z.string(),
    meal_times: z.object({
      breakfast: z.string(),
      lunch: z.string(),
      dinner: z.string(),
    }),
    scenes: z.array(
      z.object({
        description: z.string(),
        number: z.string(),
      })
    ),
  }),
  weather: z.object({
    condition: z.string(),
    humidity: z.string(),
    sunrise: z.string(),
    sunset: z.string(),
    temperature: z.object({
      evening: z.string(),
      morning: z.string(),
      noon: z.string(),
    }),
  }),
  key_contacts: z.array(
    z.object({
      name: z.string(),
      phone: z.string().optional(),
      title: z.string().optional(),
    })
  ),
  departments: z.array(
    z.object({
      default_call_time: z.string().optional(),
      name: z.string(),
    })
  ),
});

export const PeopleSchema = z.object({
  people: z.array(
    z.object({
      call_time: z.string().optional(),
      email: z.string().optional(),
      location: z.string().optional(),
      name: z.string(),
      phone: z.string().optional(),
      title: z.string().optional(),
      department: z.string().optional(),
    })
  ),
});

export type JSONSchema = z.infer<typeof CallsheetSchema> &
  z.infer<typeof PeopleSchema>;
