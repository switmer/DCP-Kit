//-- transform call sheet data to our pdf format.
import { CallSheetLocationType, CallSheetMemberType, NoteType } from '@/types/type';
import { ProductionContact } from '@/types/sheet';
import { getCardinalDirection } from '@/components/blocks/CallSheet/Weather/getCardinalDirection';

export const mapCallSheetToPDFData = (data: any) => {
  const {
    sheet,
    members,
    files,
    productionContacts,
    weather,
    locations,
    notes,
    productionEntity,
    agencyEntity,
    clientEntity,
    vendorEntities,
    otherEntities,
  } = data;

  const generalCrewCall = sheet.raw_json?.general_crew_call;
  const generalCrewWrap = sheet.raw_json?.general_crew_wrap;

  //-- group members by department.
  const departmentGroups: Record<
    string,
    Array<{
      name: string;
      email: string;
      phone: string;
      title: string;
      call_time: string;
      wrap_time: string;
      department: string;
    }>
  > = {};

  //-- temp type for wrap_time until we support it on member records.
  members.forEach((member: CallSheetMemberType & { wrap_time?: string }) => {
    const dept = member.department || 'Unassigned';

    if (!departmentGroups[dept]) {
      departmentGroups[dept] = [];
    }

    departmentGroups[dept].push({
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      title: member.title ?? '',
      call_time: member?.call_time ? member.call_time : generalCrewCall ? generalCrewCall : '',
      wrap_time: member?.wrap_time ? member.wrap_time : generalCrewWrap ? generalCrewWrap : '',
      department: dept,
    });
  });

  //-- format and sort locations.
  const sortOrder = ['shoot', 'shoot location', 'parking', 'truck parking', 'hospital', 'nearest hospital'];

  const formattedLocations = locations
    .map((loc: CallSheetLocationType & { address: string }) => ({
      name: loc.name,
      type: loc.type,
      phone: '',
      address: loc.address,
      description: loc.description || '',
      instructions_or_notes: loc.instructions || '',
    }))
    .sort((a: CallSheetLocationType & { address: string }, b: CallSheetLocationType & { address: string }) => {
      //-- get the indices from the sortOrder array.
      const indexA = sortOrder.indexOf(a.type as string);
      const indexB = sortOrder.indexOf(b.type as string);

      //-- if type is not in sortOrder, assign a fallback index (end of list).
      //-- this ensures any arbitrary types come after the specified ones.
      const priorityA = indexA === -1 ? sortOrder.length : indexA;
      const priorityB = indexB === -1 ? sortOrder.length : indexB;

      //-- sort by priority index.
      return priorityA - priorityB;
    });

  const shootLocations = formattedLocations.filter(
    (loc: any) => loc.type.toLowerCase() === 'shoot' || loc.type.toLowerCase() === 'shoot location',
  );

  const parkingLocations = formattedLocations.filter((loc: any) => loc.type.toLowerCase() === 'parking');

  const truckParkingLocations = formattedLocations.filter((loc: any) => loc.type.toLowerCase() === 'truck parking');

  const nearestHospital = formattedLocations.filter(
    (loc: any) => loc.type.toLowerCase() === 'hospital' || loc.type.toLowerCase() === 'nearest hospital',
  );

  const filteredOtherLocations = formattedLocations.filter(
    (loc: any) =>
      loc.type.toLowerCase() !== 'shoot' &&
      loc.type.toLowerCase() !== 'shoot location' &&
      loc.type.toLowerCase() !== 'parking' &&
      loc.type.toLowerCase() !== 'truck parking' &&
      loc.type.toLowerCase() !== 'hospital' &&
      loc.type.toLowerCase() !== 'nearest hospital',
  );

  //-- combine the filtered other locations with the overflow locations from the other arrays.
  const otherLocations = [
    ...filteredOtherLocations,
    ...(shootLocations.length > 1 ? shootLocations.slice(1) : []),
    ...(parkingLocations.length > 1 ? parkingLocations.slice(1) : []),
    ...(truckParkingLocations.length > 1 ? truckParkingLocations.slice(1) : []),
  ];

  //-- format notes.
  const formattedNotes = notes.map((note: NoteType) => ({
    title: note.title || 'Note',
    body: note.note || '',
    isHighlighted: note.isHighlighted || false,
    type: note.type,
  }));

  const regularNotes = formattedNotes.filter((note: any) => note.type.toLowerCase().trim() === 'on_page') ?? [];
  const featuredNotes =
    formattedNotes
      .filter((note: any) => note.type.toLowerCase().trim() === 'featured')
      .sort((a: NoteType, b: NoteType) => Number(b.isHighlighted) - Number(a.isHighlighted)) ?? [];

  //-- default filename-safe project name.
  // const projectName = sheet.project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const projectName = sheet.project.name;

  const companyName = sheet.company.name;

  //-- build the final data structure.
  return {
    company_name: companyName,
    people: members.map((member: CallSheetMemberType) => ({
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      title: member.title ?? '',
      location: formattedLocations[0]?.address || '',
      call_time: member.call_time ? member.call_time : generalCrewCall ? generalCrewCall : '',
      wrap_time: member.wrap_time ? member.wrap_time : generalCrewWrap ? generalCrewWrap : '',
      department: member.department ?? '',
    })),
    project_name: projectName,
    job_number: sheet.project.job_number,
    schedule: {
      scenes: sheet.raw_json?.schedule?.scenes ?? sheet.raw_json?.scenes,
      crew_call: sheet.raw_json?.schedule?.crew_call ?? sheet.raw_json?.crew_call,
      meal_times: sheet.raw_json?.schedule?.meal_times ?? sheet.raw_json?.meal_times,
      production_call: sheet.raw_json?.schedule?.production_call ?? sheet.raw_json?.production_call,
      department_calls: sheet.raw_json?.schedule?.department_calls ?? sheet.raw_json?.department_calls,
    },
    full_date: sheet.date,
    production_entity: productionEntity,
    agency_entity: agencyEntity,
    client_entity: clientEntity,
    vendor_entities: vendorEntities ?? [],
    other_entities: otherEntities ?? [],
    shoot_location: shootLocations[0] ?? null,
    parking_location: parkingLocations[0] ?? null,
    truck_parking_location: truckParkingLocations[0] ?? null,
    nearest_hospital: nearestHospital[0] ?? sheet.project.nearest_hospital ?? null,
    other_locations: otherLocations ?? [],
    weather: {
      sunrise: weather?.sunrise ?? null,
      sunset: weather?.sunset ?? null,
      humidity: weather?.humidity ?? null,
      condition: {
        main: weather?.weather[0]?.main ?? null,
        description: weather?.weather[0]?.description ?? null,
      },
      visibility: weather?.visibility ?? null,
      wind: {
        speed: weather?.wind_speed ?? null,
        direction: getCardinalDirection(weather?.wind_deg) ?? null,
      },
      low: weather?.temp?.min ?? null,
      high: weather?.temp?.max ?? null,
    },
    day_of_days: sheet.raw_json?.day_of_days || `Day 1 of ${sheet.project.dates.length}`,
    departments: Object.keys(departmentGroups).map((dept) => ({
      name: dept,
      default_call_time: generalCrewCall,
    })),
    production_contacts:
      (productionContacts &&
        productionContacts.map((contact: ProductionContact & { title: string }) => ({
          name: contact.name,
          phone: contact.phone,
          title: contact.title,
        }))) ||
      [],
    general_crew_call: generalCrewCall,
    featured_notes: featuredNotes,
    agreement: sheet.project.agreement ?? null, //-- NOTE: not currently supported.
    notes_and_instructions: regularNotes,
  };
};
