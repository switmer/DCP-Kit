export interface Member {
  name: string;
  email: string;
  phone: string | null;
  title: string;
  location: string | null;
  call_time: string;
}

export interface Department {
  members: Member[];
  default_call_time: string;
}

export interface People {
  [department: string]: Department;
}

export interface Temperature {
  noon: string;
  evening: string;
  morning: string;
}

export interface Weather {
  sunset: string;
  sunrise: string;
  humidity: string;
  condition: string;
  temperature: Temperature;
}

export interface Scene {
  number: string;
  description: string;
}

export interface Schedule {
  scenes: Scene[];
  crew_call: string;
  production_call: string;
  department_calls: Record<string, string>;
}

export interface Location {
  name: string;
  address: string;
  parking_instructions: string;
}

export interface Logistics {
  parking: {
    address: string;
    location: string;
    instructions: string;
  };
}

export interface MealTimes {
  lunch: string;
  breakfast: string;
}

export interface ProductionContact {
  name: string;
  phone: string;
}

export interface ProductionContacts {
  UPM: ProductionContact;
  Director: ProductionContact;
  Producer: ProductionContact;
}

export interface Hospital {
  name: string;
  phone: string;
  address: string;
}

export interface SafetyAndClothing {
  notes: string;
}

export interface CallSheetJSON {
  notes: string[];
  people: People;
  weather: Weather;
  job_name: string;
  schedule: Schedule;
  full_date: string;
  locations: {
    primary: Location;
  };
  logistics: Logistics;
  meal_times: MealTimes;
  day_of_days: string;
  key_contacts: ProductionContacts;
  nearest_hospital: Hospital;
  primary_location: string;
  general_crew_call: string;
  production_office: {
    phone: string | null;
    address: string | null;
  };
  safety_and_clothing: SafetyAndClothing;
}
