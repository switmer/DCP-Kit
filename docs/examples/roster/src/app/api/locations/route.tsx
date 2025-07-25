import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const companyId = cookies().get('activeCompany')?.value;

  if (!companyId) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const { data, error } = await supabase.from('location').select('*').eq('company', companyId);

  if (error) {
    return NextResponse.json({ data: null, error });
  }

  // Group locations by city and state
  const groupedLocations: Record<string, number[]> = {};

  data.forEach((location) => {
    try {
      let city = null;
      let state = null;

      if (location.places_json) {
        const placesData = JSON.parse(location.places_json as string);
        const addressComponents = placesData.address_components || [];

        // Find city (locality) and state (administrative_area_level_1) from address components
        addressComponents.forEach((component: any) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
        });
      }

      // Use location fields if they exist
      city = location.city || city;
      state = location.state || state;

      // If we have both city and state, use them for grouping
      if (city && state) {
        const key = `${city}, ${state}`;
        if (!groupedLocations[key]) {
          groupedLocations[key] = [];
        }
        groupedLocations[key].push(location.id);
      } else if (city) {
        const key = city;
        if (!groupedLocations[key]) {
          groupedLocations[key] = [];
        }
        groupedLocations[key].push(location.id);
      }
    } catch (e) {
      //
    }
  });

  const groupedLocationsArray = Object.entries(groupedLocations).map(([label, locationIds]) => {
    const statePart = label.includes(',') ? label.split(',')[1].trim() : '';
    const cityPart = label.includes(',') ? label.split(',')[0].trim() : label;

    return {
      label,
      locationIds,
      _sortData: {
        state: statePart,
        city: cityPart,
      },
    };
  });

  groupedLocationsArray.sort((a, b) => {
    const stateCompare = (a._sortData.state || '').localeCompare(b._sortData.state || '');
    if (stateCompare !== 0) return stateCompare;

    return (a._sortData.city || '').localeCompare(b._sortData.city || '');
  });

  const finalLocationsArray = groupedLocationsArray.map(({ label, locationIds }) => ({
    label,
    locationIds,
  }));

  return NextResponse.json({
    data: finalLocationsArray,
    error,
  });
}
