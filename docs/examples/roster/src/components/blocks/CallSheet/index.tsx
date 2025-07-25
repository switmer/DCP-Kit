'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parse } from 'date-fns';
import { CallSheetLoading } from './CallSheetLoading';

import { toast } from 'sonner';
import axios from 'axios';
import Link from 'next/link';
import slugify from '@sindresorhus/slugify';

import { DepartmentRow, DepartmentTable } from '@/components/ui/Department';
import { Icon } from '@/components/ui/Icon';
import { ProductionContacts } from './ProductionContacts';
import { Tab } from '@/components/ui/Tab';
import { PersonCard } from '@/components/ui/PersonCard';
import { CallCardPreview } from './CallCardPreview';
import { Notes } from './Notes';
import { CallSheetSegments } from './CallSheetSegments';
import { MinimizePdf } from '@/components/ui/Pdf/Minimize';
import { FloatingMenu } from './FloatingMenu';
import {
  CallSheetMemberType,
  CallSheetType,
  CompanyEntityType,
  CompanyPolicy,
  FileAttachment,
  Note,
  ProjectEntityType,
} from '@/types/type';
import { debounce } from 'lodash';
import { CallSheetTitle } from './Title';
import { ShootDates } from '@/components/blocks/CallSheet/ShootDates';
import { useCallSheetStore } from '@/store/callsheet';
import { cn } from '@/lib/utils';
import { LocationCards } from '@/components/blocks/CallSheet/Locations/LocationCards';
import { Files } from './Files';
import { AddCallSheetMember } from './AddMember';
import { MinimizeEmpty } from '@/components/ui/Pdf/MinimizeEmpty';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { SheetWithAdditionalData } from '@/components/blocks/CallSheet/RefreshableCallSheet';
import { ReorderDepartments } from './ReorderDepartments';
import { TableCell, TableRow } from '@/components/ui/Table';
import { fetchWeatherData } from '@/components/blocks/CallSheet/Weather/fetchWeatherData';
import { checkCallSheetPdfTimestamp } from '@/lib/checkCallSheetPdfTimestamp';
import { Sortable, SortableItem, SortableDragHandle } from '@/components/ui/Sortable';

const formatSheetDate = (date: string) => {
  try {
    const inputDate = parse(date, 'MM/dd/yy', new Date());

    if (isNaN(inputDate.getTime())) return date;

    return format(inputDate, 'EEE, MMM d');
  } catch {
    return date;
  }
};

let timeout: string | number | NodeJS.Timeout | undefined;

//-- NOTE: global variable to change template through console.
// declare global {
//   interface Window {
//     pdfTempOverride?: string;
//   }
// }

// (window as Window).pdfTempOverride = 'mdrn';
//-- NOTE ----------------------------------

export const CallSheet: React.FC<{
  src?: string | null;
  sheet: SheetWithAdditionalData;
  // project: any;
  forceLive?: boolean;
  refreshSheet?: () => void;
}> = ({ src, ...rest }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'sent' | 'confirmed' | 'failed'>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sheet, setSheet] = useState<any>(rest?.sheet);
  const [_startedPolling, setStartedPolling] = useState(false);
  const [loading, setLoading] = useState(sheet?.status !== 'ready');
  // const [loadingReparse, setLoadingReparse] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusedMember, setFocusedMember] = useState<string | null>(null);
  const [subscribedToChanges, setSubscribedToChanges] = useState(false);
  const [isPdfOutdated, setIsPdfOutdated] = useState(false);
  const [productionContacts, setProductionContacts] = useState<{
    [key: string]: {
      name: string;
      phone: string;
      email?: string;
      order?: number;
    };
  }>(sheet?.raw_json?.key_contacts ?? {});
  const [contactInfoVisible, setContactInfoVisible] = useState(sheet?.project?.contact_info_visible);

  const [weatherLocation, setWeatherLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [sheetLocations, setSheetLocations] = useState<any[] | null>(null); //--TODO: properly type this.
  const [sheetNotes, setSheetNotes] = useState<Note[]>([]);
  const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicy[]>([]);
  const [sheetFiles, setSheetFiles] = useState<FileAttachment[]>([]);

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const [generatedPdfSrc, setGeneratedPdfSrc] = useState<string | null>(null);

  // const router = useRouter();
  const supabase = createClient();

  const { callPush, members, fetchMembers: fm } = useCallSheetStore();

  const fetchMembers = useCallback(async () => {
    if (!sheet?.id) return;

    await fm(sheet.id);

    setMembersLoading(false);
  }, [fm, sheet?.id]);

  const fetchSheetLocations = useCallback(async () => {
    const { data: callSheetLocations, error: callSheetLocationsError } = await supabase
      .from('call_sheet_location')
      .select()
      .eq('call_sheet', sheet?.id)
      .order('order', { ascending: true });

    if (callSheetLocationsError) {
      toast.error('Something went wrong fetching sheet locations.');
      console.error('Error: ', callSheetLocationsError);

      return;
    }

    //-- flatten address from location to the root level.
    const flattenedData = await Promise.all(
      callSheetLocations.map(async (call_sheet_location) => {
        if (!call_sheet_location) return;

        const { data: location, error: locationError } = await supabase
          .from('location')
          .select()
          .eq('id', call_sheet_location.location as number);

        if (!location || locationError) {
          toast.error('Something went wrong fetching related location.');
          console.error('Error: ', locationError);

          return;
        }

        return {
          ...call_sheet_location,
          address: location[0].address,
        };
      }),
    );

    setSheetLocations(flattenedData);
  }, [sheet?.project?.id, supabase, refreshKey]);

  const checkPdfOutdated = useCallback(async () => {
    if (!sheet?.id) return;

    try {
      const { isOutdated } = await checkCallSheetPdfTimestamp(supabase, sheet.id);
      setIsPdfOutdated(isOutdated);
    } catch (error) {
      console.error('Error checking PDF timestamp:', error);
    }
  }, [sheet?.id, supabase]);

  useEffect(() => {
    fetchProductionContacts();
    fetchSheetLocations();
    fetchSheetNotes();
    fetchPolicies();
    fetchSheetFiles();
    checkPdfOutdated();
  }, [fetchSheetLocations, refreshKey, sheet?.id, checkPdfOutdated]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setFocusedMemberDebounced = useCallback(
    debounce((value: string | null) => {
      setFocusedMember(value);
    }, 150),
    [setFocusedMember],
  );

  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const toggleCheckedContactInfoVisible = async (visible: boolean) => {
    const { error } = await supabase
      .from('call_sheet_member')
      .update({
        contact_info_visible: visible,
      })
      .in('id', checked);

    if (error) {
      toast.error('Something went wrong updating crew contact info visibility. Please try again.');
    }

    toast.success('Contact visibility updated for selected crew.');
  };

  const fetchProductionContacts = useCallback(() => {
    setLoading(true);

    supabase
      .from('call_sheet')
      .select('raw_json')
      .eq('id', sheet?.id)
      .then(({ data, error }) => {
        if (!data || error) {
          toast.error('Something went wrong fetching production contacts.');
          console.error('Error: ', error);

          return;
        }

        //@ts-ignore
        setProductionContacts(data[0].raw_json?.key_contacts);
      });

    setLoading(false);
  }, [sheet?.id, supabase, refreshKey]);

  const fetchSheetNotes = useCallback(() => {
    setLoading(true);

    supabase
      .from('note')
      .select()
      .eq('call_sheet', sheet?.id)
      .order('priority', { ascending: true })
      .then(({ data }) => {
        if (!data) return;

        setSheetNotes(data);
      });

    setLoading(false);
  }, [sheet?.id]);

  const fetchPolicies = useCallback(() => {
    setLoading(true);

    supabase
      .from('company_policy')
      .select()
      .eq('company', sheet?.company.id)
      .then(({ data }) => {
        if (!data) return;

        setCompanyPolicies(data);
      });

    setLoading(false);
  }, [sheet?.company.id]);

  const fetchSheetFiles = useCallback(() => {
    setLoading(true);

    supabase
      .from('file')
      .select()
      .eq('call_sheet', sheet?.id)
      .then(({ data }) => {
        if (!data || !data.length) {
          setLoading(false);

          return;
        }

        setSheetFiles(data);
      });

    setLoading(false);
  }, [supabase, sheet?.id, refreshKey]);

  const sendDepartmentCards = async (ids: string[]) => {
    // If no call sheet exists or the PDF is outdated, generate one first
    if (!sheet.src || isPdfOutdated) {
      // Generate a call sheet first
      await handleMakePDFClick(sheet);
    }

    // Send the call cards
    await sendCallCards(ids);
  };

  const sendCallCards = async (ids: string[]) => {
    await axios
      .post('/sms/call-card/bulk', {
        ids,
      })
      .then(() => {
        const sentTo = ids.filter((id) => members.find((m) => m.id === id)?.status === 'pending').length;

        toast.success(`Sent ${sentTo} call card${sentTo !== 1 ? 's' : ''}.`, {
          icon: <Icon name="checkmark" className="w-6 h-6 text-lime-300" />,
        });

        fetchMembers();
      })
      .catch((error) => {
        console.error('Error sending call cards:', error);
        toast.error('Something went wrong.');
      });
  };

  useEffect(() => {
    setChecked([]);
  }, [activeTab]);

  useEffect(() => {
    if (sheet?.status !== 'ready') return;

    fetchMembers();
  }, [fetchMembers, sheet, supabase]);

  useEffect(() => {
    if (!refreshKey) return;

    fetchMembers();
  }, [refreshKey]);

  useEffect(() => {
    if (subscribedToChanges || !sheet?.id) return;

    supabase
      .channel('call_sheet_member')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sheet_member',
          filter: `call_sheet=eq.${sheet?.id}`,
        },
        () => {
          fetchMembers();
        },
      )
      .subscribe();

    setSubscribedToChanges(true);
  }, [fetchMembers]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredMembers = useMemo(() => {
    if (activeTab === 'all') return members;

    if (activeTab === 'pending') {
      return members.filter((m) => m.status === 'pending');
    }

    if (activeTab === 'sent') {
      return members.filter((m) => m.status === 'sent-call-card');
    }

    if (activeTab === 'confirmed') {
      return members.filter((m) => m.status === 'confirmed');
    }

    if (activeTab === 'failed') {
      return members.filter((m) => m.status === 'call-card-sms-failed');
    }

    return members;
  }, [members, activeTab]);

  const productionEntities = sheet?.project?.project_entity.filter(
    (ent: ProjectEntityType) => ent.type?.toLowerCase() === 'production company',
  );

  const agencyEntities = sheet?.project?.project_entity.filter(
    (ent: ProjectEntityType) => ent.type?.toLowerCase() === 'agency',
  );

  const clientEntities = sheet?.project?.project_entity.filter(
    (ent: ProjectEntityType) => ent.type?.toLowerCase() === 'client',
  );

  const vendorEntities = sheet?.project?.project_entity.filter(
    (ent: ProjectEntityType) => ent.type?.toLowerCase() === 'vendor',
  );

  const otherEntities = sheet?.project?.project_entity.filter(
    (ent: ProjectEntityType) =>
      ent.type?.toLowerCase() !== 'production company' &&
      ent.type?.toLowerCase() !== 'agency' &&
      ent.type?.toLowerCase() !== 'client',
  );

  const productionEntity = productionEntities?.[0] ?? null;
  const agencyEntity = agencyEntities?.[0] ?? null;
  const clientEntity = clientEntities?.[0] ?? null;
  const vendorEntity = vendorEntities?.[0] ?? null;

  const entityNames = [productionEntity?.name, agencyEntity?.name, clientEntity?.name].filter(Boolean);

  if (vendorEntities && vendorEntities.length > 1) {
    const vendorEntitiesNames = vendorEntities.map((ent: CompanyEntityType) => ent.name);

    entityNames.push(...vendorEntitiesNames);
  } else {
    entityNames.push(vendorEntity?.name);
  }

  const departments = useMemo(() => {
    if (!members || !members.length) return [];

    // Get unique departments from members
    const departmentSet = new Set<string>();
    members.forEach((member) => {
      if (member.project_position?.department) {
        departmentSet.add(member.project_position.department);
      }
    });

    // Get department order information
    const departmentOrderMap = new Map<string, number>();
    members.forEach((member) => {
      const dept = member.project_position?.department;
      if (dept) {
        const order = member.project_position?.department_order ?? Number.MAX_SAFE_INTEGER;
        departmentOrderMap.set(dept, Math.min(order, departmentOrderMap.get(dept) || Number.MAX_SAFE_INTEGER));
      }
    });

    // Sort departments based on minimum department_order
    return Array.from(departmentSet).sort((a, b) => {
      const orderA = departmentOrderMap.get(a) ?? Number.MAX_SAFE_INTEGER;
      const orderB = departmentOrderMap.get(b) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [members]);

  //-- collect all project entities.
  const displayEntities = useMemo(() => {
    const entities = [];

    //-- build array in this order: production -> client -> agency -> vendors.
    // if (productionEntity) entities.push(productionEntity);
    if (clientEntity) entities.push(clientEntity);
    if (agencyEntity) entities.push(agencyEntity);

    //-- make sure to get all vendor entities, as there might be more than one.
    if (vendorEntity) {
      if (vendorEntities.length > 1) {
        //-- if we have multiple vendor entities, add each one individually.
        vendorEntities.forEach((entity: CompanyEntityType) => entities.push(entity));
      } else {
        entities.push(vendorEntity);
      }
    }

    return entities;
  }, [agencyEntity, clientEntity, vendorEntity, vendorEntities]);

  const additionalDepartments = useMemo(() => {
    if (!sheet) return [];

    const uniqueDepartments = new Set<string>();

    members.forEach((member) => {
      if (entityNames.includes(member.department)) return;

      if (!!member.department && !departments.includes(member.department)) {
        uniqueDepartments.add(member.department);
      }
    });

    return Array.from(uniqueDepartments);
  }, [departments, members, sheet, productionEntity, agencyEntity, clientEntity]);

  //-- pre-filter members by department, including entity "departments".
  const membersByDepartment = useMemo(() => {
    const result: { [key: string]: any[] } = {};

    //-- regular department filtering.
    [...departments, ...additionalDepartments].forEach((dept) => {
      result[dept] = filteredMembers
        .filter((m) => m.department === dept)
        .sort((a, b) => a.project_position?.department_order - b.project_position?.department_order);
    });

    //-- entity "department" filtering.
    displayEntities.forEach((entity) => {
      //-- get all entity_point_of_contact records for this entity.
      const entityContacts = entity.entity_point_of_contact || [];

      //-- filter members by department matching entity name.
      const entityMembers = filteredMembers.filter((m) => m.department === entity.name);

      //-- identify members that are also entity contacts.
      const membersWithEntityContact = entityMembers.map((member) => {
        //-- check if this member matches any entity contact by name, email, or phone.
        const isEntityContact = entityContacts.some(
          (contact: CallSheetMemberType) =>
            (member.name && contact.name && member.name.toLowerCase() === contact.name.toLowerCase()) ||
            (member.email && contact.email && member.email.toLowerCase() === contact.email.toLowerCase()) ||
            (member.phone && contact.phone && member.phone === contact.phone),
        );

        return {
          ...member,
          isEntityContact,
        };
      });

      //-- sort members to prioritize those with entity_point_of_contact associations.
      result[entity.name] = membersWithEntityContact.sort((a, b) => {
        if (a.isEntityContact && !b.isEntityContact) return -1;
        if (!a.isEntityContact && b.isEntityContact) return 1;

        return a.order - b.order;
      });
    });

    return result;
  }, [filteredMembers, departments, additionalDepartments, displayEntities]);

  const updateCrewContactInfoVisible = (visible: boolean) => {
    supabase
      .from('project')
      .update({
        contact_info_visible: visible,
      })
      .eq('id', sheet.project.id)
      .then(({ error }) => {
        if (error) {
          toast.error('Something went wrong.');

          return;
        }

        toast.success('Crew contact info visibility updated.');
      });
  };

  const uploadGeneratedCallSheet = async (pdfBlob: Blob, companyId: string, projectName?: string) => {
    //-- create a unique filename.
    const timestamp = new Date().getTime();
    const filename = `call-sheet--${slugify(projectName ?? '')}-${timestamp}.pdf`;

    //-- storage path - ensure companyId is a valid string and not undefined or null
    const safeCompanyId = companyId || 'default';
    const storagePath = `${safeCompanyId}/${filename}`;

    try {
      //-- upload the blob to supabase storage.
      const { error: uploadError } = await supabase.storage.from('call-sheets').upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true, //-- whether we overwrite an existing file or not.
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      //-- create or update the call_sheet record.
      const { data: recordData, error: recordError } = await supabase
        .from('call_sheet')
        .upsert({
          id: sheet.id,
          src: storagePath,
          company: companyId,
          status: 'ready',
        })
        .select()
        .single();

      if (!recordData || recordError) {
        console.error('Record error:', recordError);
        throw new Error(`Database update failed: ${recordError ? recordError.message : 'No record data returned'}`);
      }

      const { error: genSheetPDFError } = await supabase.from('generated_call_sheet_pdfs').insert({
        call_sheet_id: recordData.id,
        src: storagePath,
        call_sheet_updated_at: recordData.updated_at,
      });

      if (genSheetPDFError) {
        console.error('Error:', genSheetPDFError);
        throw new Error(
          `Database update failed: ${genSheetPDFError ? genSheetPDFError.message : 'No generated pdf record data returned'}`,
        );
      }

      return {
        success: true,
        callSheetId: recordData.id,
        path: storagePath,
      };
    } catch (error) {
      console.error('Error uploading call sheet:', error);
      toast.error('Something went wrong uploading the call sheet. Please try again.');

      return {
        success: false,
        error,
      };
    }
  };

  const handleMakePDFClick = async (sheet: SheetWithAdditionalData) => {
    if (!sheet) {
      return;
    }

    setIsLoading(true);

    try {
      const weatherInfo = weatherLocation ? await fetchWeatherData(rest.sheet.date, weatherLocation) : null;

      //-- convert image url to base64 data url.
      const imageUrlToBase64 = async (url: string) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();

          return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;

            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.error('Error converting image to base64: ', err);

          return null;
        }
      };

      //-- if production entity has a logo, convert it to base64.
      if (productionEntity?.logo) {
        productionEntity.logo = await imageUrlToBase64(productionEntity.logo);
      }

      //-- same process for client entity logo.
      if (clientEntity?.logo) {
        clientEntity.logo = await imageUrlToBase64(clientEntity.logo);
      }

      const entityMembers = displayEntities.map((entity) => membersByDepartment[entity.name]);

      //-- filter out members that belong to the production company entity.
      const filteredMembers = productionEntity
        ? members.filter((member) => member.department !== productionEntity.name)
        : members;

      const sheetData = {
        sheet: sheet,
        members: filteredMembers,
        files: sheetFiles,
        productionContacts: productionContacts,
        weather: weatherInfo && !weatherInfo.error ? weatherInfo : null,
        locations: sheetLocations,
        notes: sheetNotes,
        productionEntity: productionEntity,
        agencyEntity: agencyEntity,
        clientEntity: clientEntity,
        vendorEntities: vendorEntities,
        otherEntities: otherEntities ?? [],
      };

      //-- check if global template variable has been set.
      const checkTemplateOverride = (input: string) => {
        let template = input.toLowerCase().trim();

        if (!template || (template !== 'advd' && template !== 'clsc' && template !== 'bsct')) {
          (window as any).pdfTempOverride = 'advd';

          return (window as any).pdfTempOverride;
        }

        return template;
      };

      try {
        const response = await axios.post(
          '/api/make-callsheet-pdf',
          {
            data: {
              sheetData,
              options: {
                // template: checkTemplateOverride((window as any)?.pdfTempOverride) ?? 'advd',
                template: 'mdrn',
              },
            },
          },
          {
            responseType: 'blob',
          },
        );

        const blob = new Blob([response.data], { type: 'application/pdf' });

        const result = await uploadGeneratedCallSheet(blob, sheet.company.id, sheet.project.name as string);

        if (result.success) {
          toast.success('Call sheet generated and uploaded successfully.');

          //-- update the local sheet state with the new src value.
          setSheet((prevSheet: CallSheetType) => {
            const updatedSheet = {
              ...prevSheet,
              src: result.path,
            };
            return updatedSheet;
          });
        } else {
          console.error('Failed to upload call sheet: ', result.error);
          toast.error('Failed to upload call sheet. Please try again.');
        }
      } catch (error: any) {
        console.error('Failed to create sheet PDF: ', error);

        // More detailed error message based on the error type
        if (error.response && error.response.status === 500) {
          toast.error('Server error while creating the PDF. Please try again later.');
        } else if (error.message && error.message.includes('Network Error')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`Error creating the sheet PDF: ${error.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
        // fetchSheetFiles();
        if (rest.refreshSheet) {
          rest.refreshSheet();
        }

        // check if the pdf is still outdated after regenerating.
        checkPdfOutdated();
      }
    } catch (error) {
      console.error('Error in handleMakePDFClick:', error);
      toast.error('Something went wrong. Please try again.');

      setIsLoading(false);
    }
  };

  const [localDepartments, setLocalDepartments] = useState<{ id: string; department: string }[]>([]);

  useEffect(() => {
    if (departments.length || additionalDepartments.length) {
      const allDepts = [...departments, ...additionalDepartments];
      setLocalDepartments(allDepts.map((dept) => ({ id: dept, department: dept })));
    }
  }, [departments, additionalDepartments]);

  const handleDepartmentReorder = useCallback(
    async (newOrder: { id: string; department: string }[]) => {
      try {
        // Update local state immediately for visual feedback
        setLocalDepartments(newOrder);

        // Prepare update data
        let globalOrder = 1;
        const updates: { id: number; department_order: number }[] = [];
        const processedIds = new Set<number>(); // Track which IDs we've already processed

        for (const { department } of newOrder) {
          const deptMembers = members.filter((m) => (m.project_position?.department || m.department) === department);

          for (const member of deptMembers) {
            if (member.project_position?.id && !processedIds.has(member.project_position.id)) {
              updates.push({
                id: member.project_position.id,
                department_order: globalOrder++,
              });
              processedIds.add(member.project_position.id);
            }
          }
        }

        if (updates.length > 0) {
          const { error } = await supabase.from('project_position').upsert(updates, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

          if (error) {
            console.error('Error updating department order:', error);
            throw error;
          }

          fetchMembers();
          setRefreshKey((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Error updating department order:', error);

        setLocalDepartments(departments.map((dept) => ({ id: dept, department: dept })));
        toast.error('Failed to update department order');
      }
    },
    [departments, members, supabase, fetchMembers, setRefreshKey],
  );

  const handleMemberReorder = useCallback(
    async (department: string, newOrder: CallSheetMemberType[]) => {
      try {
        // Create updates array for project_position records
        const updates = newOrder
          /* @ts-ignore */
          .filter((member) => member.project_position?.id)
          .map((member, index) => ({
            /* @ts-ignore */
            id: member.project_position?.id,
            department_order: index + 1,
          }));

        if (updates.length > 0) {
          // Send updates to database
          const { error } = await supabase.from('project_position').upsert(updates, { onConflict: 'id' });

          if (error) {
            throw error;
          }
        }

        // Don't trigger a full refetch here, the local state is already updated
        // Just update refreshKey to indicate a change happened
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        toast.error('Failed to update member order');
      }
    },
    [supabase, setRefreshKey],
  );

  if (!isMounted) return null;

  if (loading) {
    return (
      <>
        <CallSheetLoading src={src} sheetSrc={sheet?.src} status={sheet?.status} />
      </>
    );
  }

  return (
    <div className="max-w-[calc(100vw-133px)] max-sm:max-w-[100vw]">
      <div className="flex flex-1 justify-center relative">
        <div className="flex w-full flex-col gap-3 items-start max-sm:w-screen max-sm:overflow-x-hidden max-sm:px-4 max-sm:bg-dashboard-empty-gradient">
          <div className="flex flex-col gap-6 sticky top-0 z-10 bg-background w-full bg-opacity-50 backdrop-blur-md pt-4 sm:pt-12 max-sm:max-w-screen max-sm:overflow-y-auto max-sm:gap-4">
            <div className="hidden w-full max-sm:flex">
              <Link href={'/'}>
                <Icon name="arrow-left" className="relative -left-2 h-10 w-10 text-white font-bold" />
              </Link>
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex gap-2 items-center max-sm:hidden">
                <Link
                  href={'/'}
                  className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
                >
                  <Icon name="home" className="w-5 h-5" />

                  {sheet?.company?.name}
                </Link>

                <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

                <div className="flex text-zinc-600 duration-100 text-sm leading-none gap-2 items-center">
                  <Link
                    href={`/project/${sheet?.project?.slug}`}
                    className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
                  >
                    {sheet?.project?.name}
                  </Link>
                </div>

                <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

                <div className="text-white text-sm">
                  {!loading && sheet?.raw_json?.full_date && formatSheetDate(sheet?.raw_json?.full_date)}
                </div>
              </div>

              <div className="flex items-center gap-2 pr-6 max-sm:pb-4">
                {/* create call sheet button */}
                <Button
                  variant="outlineAccent"
                  className={cn('w-[200px] h-[42px]', isLoading && 'border-opacity-10 cursor-not-allowed')}
                  onClick={() => handleMakePDFClick(sheet)}
                  disabled={isLoading}
                >
                  {!isLoading ? (
                    <>
                      <Icon name="file" className="w-5 h-5" />
                      <div className="">Generate Call Sheet</div>
                    </>
                  ) : (
                    <LoadingIndicator size="small" />
                  )}
                </Button>

                {/* add crew button */}
                <AddCallSheetMember
                  sheetId={sheet?.id}
                  projectId={sheet?.project?.id}
                  onSave={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </div>

            <CallSheetTitle job_name={sheet?.raw_json?.job_name} sheet={sheet} />

            <ShootDates sheet={sheet} loading={loading} />
          </div>

          <div
            className={cn(
              'flex flex-col gap-3 w-full overflow-x-scroll',
              !productionContacts &&
                sheetLocations?.length === 0 &&
                sheetNotes.length === 0 &&
                sheetFiles.length === 0 &&
                'flex-row max-sm:flex-col',
            )}
          >
            <ProductionContacts
              members={members}
              contacts={productionContacts}
              call={sheet?.raw_json?.general_crew_call}
              sheetId={sheet?.id}
              onUpdate={() => setRefreshKey((k) => k + 1)}
              setRefreshKey={setRefreshKey}
            />

            <LocationCards
              sheetLocations={sheetLocations}
              callSheet={sheet?.id}
              project={sheet?.project?.id}
              onLocationsSaved={fetchSheetLocations}
              weatherLocation={weatherLocation}
              setWeatherLocation={setWeatherLocation}
              setRefreshKey={setRefreshKey}
            />

            <Notes
              callSheet={sheet?.id}
              project={sheet?.project?.id}
              sheetNotes={sheetNotes}
              companyPolicies={companyPolicies}
              setRefreshKey={setRefreshKey}
            />

            <Files callSheet={sheet?.id} project={sheet?.project?.id} sheetFiles={sheetFiles} />
          </div>

          <div className="flex gap-2 items-center w-full sticky top-[224px] z-20 flex-wrap bg-background bg-opacity-50 backdrop-blur-md">
            <div className="text-white text-[28px] font-normal max-sm:hidden">Crew</div>

            <Tab
              options={['list', 'grid']}
              selected={view}
              setSelected={setView as (arg0: string) => void}
              defaultWidth={51}
            />

            <CallSheetSegments members={members} active={activeTab} setActive={setActiveTab} />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 h-11 px-2 rounded-xl opacity-80">
                <div className="text-center text-[11px] text-white/70 font-medium uppercase leading-[13px]">
                  Crew contact
                  <br />
                  info visible
                </div>

                <div className="flex items-center cursor-pointer">
                  <div
                    className={cn(
                      'flex justify-center items-center w-[40px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tl-md rounded-bl-md',
                      contactInfoVisible && 'bg-lime-300/80 text-black',
                    )}
                    onClick={() => {
                      if (!contactInfoVisible) {
                        setContactInfoVisible(true);
                        updateCrewContactInfoVisible(true);
                      }
                    }}
                  >
                    YES
                  </div>

                  <div
                    className={cn(
                      'flex justify-center items-center w-[40px] h-[28px] bg-[#2a2a2a] text-[12px] text-white/60 font-bold text-center rounded-tr-md rounded-br-md cursor-pointer',
                      !contactInfoVisible && 'bg-red-500/80 text-white/100',
                    )}
                    onClick={() => {
                      if (contactInfoVisible) {
                        setContactInfoVisible(false);
                        updateCrewContactInfoVisible(false);
                      }
                    }}
                  >
                    NO
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-callsheet-segments-line-gradient h-[1px] absolute left-0 right-0 bottom-0"></div>
          </div>

          {filteredMembers.length === 0 && (
            <div className="flex items-center justify-center w-full rounded-xl border-[3px] border-white/20 border-dashed">
              <AddCallSheetMember
                className={cn(
                  'flex flex-col items-center justify-center min-w-[590px] h-[180px] p-2 text-sm text-white/40 hover:text-white/100 bg-zinc-950 cursor-pointer hover:bg-zinc-950 hover:border-zinc-500/55 font-bold uppercase max-sm:min-w-[unset] max-sm:w-[calc(100vw-50px)]',
                )}
                // style={{ width: "100%" }}
                iconClassName="w-8 h-8"
                sheetId={sheet?.id}
                projectId={sheet?.project?.id}
                onSave={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          )}

          {view === 'grid' && (
            <div className="w-full grid sm:grid-cols-2 xl:grid-cols-3 gap-8 self-start">
              {filteredMembers.map((p) => (
                <PersonCard
                  isHistorical={rest.forceLive ? false : sheet.historical}
                  person={p}
                  key={p.id}
                  onClick={() => setFocusedMemberDebounced(p.id)}
                  generalCall={sheet?.raw_json?.general_crew_call}
                />
              ))}
            </div>
          )}

          {view === 'list' && (
            <div className="w-full flex flex-col self-start">
              <div className="flex flex-col flex-1 gap-6 max-sm:mb-[125px]">
                <Sortable value={localDepartments} onValueChange={handleDepartmentReorder}>
                  {localDepartments.map((deptItem) => {
                    const d = deptItem.department;

                    const currentMembers = membersByDepartment[d] || [];
                    const currentMembersIds = currentMembers.map((c) => c.id);
                    const department = sheet?.raw_json?.people?.[d];

                    if (currentMembers.length === 0) return null;

                    const isChecked = () => {
                      if (!currentMembersIds.length) return false;

                      if (currentMembersIds.every((c) => checked.includes(c))) {
                        return true;
                      }

                      if (currentMembersIds.some((c) => checked.includes(c))) {
                        return 'indeterminate';
                      }

                      return false;
                    };

                    return (
                      <SortableItem key={deptItem.id} value={deptItem.id}>
                        <DepartmentTable
                          isHistorical={rest.forceLive ? false : sheet.historical}
                          isEntity={false}
                          isTalent={d.toLowerCase().trim() === 'talent'}
                          hasCallSheet={!!sheet.src}
                          isPdfOutdated={isPdfOutdated}
                          title={d?.replaceAll('_', ' ')}
                          callTime={
                            department?.default_call_time ??
                            sheet?.raw_json?.departments?.find((dept: any) => dept.name === d)?.default_call_time
                          }
                          count={currentMembersIds?.length}
                          key={d}
                          loading={loading || membersLoading}
                          customPrefix={
                            <SortableDragHandle variant="ghost" className="cursor-grab mr-2">
                              <Icon className="w-6 h-6 text-white opacity-50 hover:opacity-100" name="drag" />
                            </SortableDragHandle>
                          }
                          checked={isChecked()}
                          setChecked={(check) => {
                            if (check) {
                              setChecked([...checked, ...currentMembersIds]);

                              return;
                            }

                            setChecked(checked.filter((c) => !currentMembersIds.includes(c)));
                          }}
                          checkedCount={
                            checked
                              .filter((c) => currentMembersIds.includes(c))
                              .filter((c) => members.find((m) => m.id === c)?.status === 'pending').length
                          }
                          pendingCount={currentMembers.filter((c) => c.status === 'pending').length}
                          sentCount={currentMembers.filter((c) => !!c.sent_at).length}
                          confirmedCount={currentMembers.filter((c) => !!c.confirmed_at).length}
                          onSend={async (onlyChecked = false) => {
                            await sendDepartmentCards(
                              !onlyChecked ? currentMembersIds : checked.filter((c) => currentMembersIds.includes(c)),
                            );
                          }}
                          sheetId={sheet?.id}
                          projectId={sheet?.project?.id}
                          setRefreshKey={setRefreshKey}
                        >
                          <Sortable
                            value={currentMembers}
                            onValueChange={(newOrder) => handleMemberReorder(d, newOrder)}
                          >
                            {currentMembers.map((m) => (
                              <DepartmentRow
                                key={m.id}
                                isHistorical={rest.forceLive ? false : sheet.historical}
                                isEntity={false}
                                generalCall={sheet?.raw_json?.general_crew_call}
                                person={m}
                                checked={checked.includes(m.id)}
                                setChecked={(check) => {
                                  if (check) {
                                    setChecked([...checked, m.id]);
                                    return;
                                  }
                                  setChecked(checked.filter((c) => c !== m.id));
                                }}
                                onClick={() => {
                                  setFocusedMemberDebounced(m.id);
                                }}
                                customPrefix={
                                  <SortableDragHandle
                                    variant="ghost"
                                    className="cursor-grab opacity-40 hover:opacity-100"
                                  >
                                    <Icon className="w-4 h-4 text-white" name="drag" />
                                  </SortableDragHandle>
                                }
                              />
                            ))}
                          </Sortable>
                        </DepartmentTable>
                      </SortableItem>
                    );
                  })}
                </Sortable>

                {/* entity department tables */}
                {displayEntities.map((entity) => {
                  const entityMembers = membersByDepartment[entity.name] || [];
                  const entityMemberIds = entityMembers.map((m) => m.id);

                  return (
                    <DepartmentTable
                      key={entity.id}
                      isHistorical={rest.forceLive ? false : sheet.historical}
                      isEntity={true}
                      entityId={entity.id}
                      hasCallSheet={!!sheet.src}
                      isPdfOutdated={isPdfOutdated}
                      title={entity.name}
                      callTime={sheet?.raw_json?.general_crew_call}
                      count={entityMembers.length}
                      loading={loading || membersLoading}
                      checked={(() => {
                        if (!entityMemberIds.length) return false;
                        if (entityMemberIds.every((c) => checked.includes(c))) return true;
                        if (entityMemberIds.some((c) => checked.includes(c))) return 'indeterminate';

                        return false;
                      })()}
                      setChecked={(check) => {
                        if (check) {
                          setChecked([...checked, ...entityMemberIds]);

                          return;
                        }

                        setChecked(checked.filter((c) => !entityMemberIds.includes(c)));
                      }}
                      checkedCount={
                        checked
                          .filter((c) => entityMemberIds.includes(c))
                          .filter((c) => members.find((m) => m.id === c)?.status === 'pending').length
                      }
                      pendingCount={entityMembers.filter((m) => m.status === 'pending').length}
                      sentCount={entityMembers.filter((m) => !!m.sent_at).length}
                      confirmedCount={entityMembers.filter((m) => !!m.confirmed_at).length}
                      onSend={async (onlyChecked = false) => {
                        await sendDepartmentCards(onlyChecked ? [] : entityMemberIds);
                      }}
                      sheetId={sheet?.id}
                      projectId={sheet?.project?.id}
                      setRefreshKey={setRefreshKey}
                    >
                      {entityMembers.length > 0 ? (
                        entityMembers
                          .sort((a, b) => {
                            if (a.isKey && !b.isKey) return -1;
                            if (!a.isKey && b.isKey) return 1;

                            return a.order - b.order;
                          })
                          .map((m) => (
                            <DepartmentRow
                              key={m.id}
                              isHistorical={rest.forceLive ? false : sheet.historical}
                              generalCall={sheet?.raw_json?.general_crew_call}
                              person={m}
                              checked={checked.includes(m.id)}
                              setChecked={(check) => {
                                if (check) {
                                  setChecked([...checked, m.id]);

                                  return;
                                }
                                setChecked(checked.filter((c) => c !== m.id));
                              }}
                              onClick={() => {
                                setFocusedMemberDebounced(m.id);
                              }}
                              isEntity={true}
                            />
                          ))
                      ) : (
                        <TableRow className="border-b border-zinc-600 border-opacity-20">
                          <TableCell colSpan={7} className="h-12 py-2 text-center text-white text-opacity-60">
                            No contacts added yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </DepartmentTable>
                  );
                })}

                {(() => {
                  const membersWithoutDepartment = filteredMembers
                    .filter((m) => !m.department)
                    .sort((a, b) => a.order - b.order);

                  if (!membersWithoutDepartment.length) return null;

                  const currentMembersIds = membersWithoutDepartment.map((c) => c.id);

                  const isChecked = () => {
                    if (!currentMembersIds.length) return false;
                    if (currentMembersIds.every((c) => checked.includes(c))) {
                      return true;
                    }
                    if (currentMembersIds.some((c) => checked.includes(c))) {
                      return 'indeterminate';
                    }
                    return false;
                  };

                  return (
                    <DepartmentTable
                      isHistorical={rest.forceLive ? false : sheet.historical}
                      title="Unassigned Department"
                      callTime={sheet?.raw_json?.general_crew_call}
                      hasCallSheet={!!sheet.src}
                      isPdfOutdated={isPdfOutdated}
                      count={currentMembersIds?.length}
                      key="unassigned"
                      loading={loading || membersLoading}
                      checked={isChecked()}
                      setChecked={(check) => {
                        if (check) {
                          setChecked([...checked, ...currentMembersIds]);
                          return;
                        }
                        setChecked(checked.filter((c) => !currentMembersIds.includes(c)));
                      }}
                      checkedCount={
                        checked
                          .filter((c) => currentMembersIds.includes(c))
                          .filter((c) => members.find((m) => m.id === c)?.status === 'pending').length
                      }
                      pendingCount={membersWithoutDepartment.filter((c) => c.status === 'pending').length}
                      sentCount={membersWithoutDepartment.filter((c) => !!c.sent_at).length}
                      confirmedCount={membersWithoutDepartment.filter((c) => !!c.confirmed_at).length}
                      onSend={async (onlyChecked = false) => {
                        await sendDepartmentCards(
                          !onlyChecked ? currentMembersIds : checked.filter((c) => currentMembersIds.includes(c)),
                        );
                      }}
                      sheetId={sheet?.id}
                      projectId={sheet?.project?.id}
                      setRefreshKey={setRefreshKey}
                    >
                      {membersWithoutDepartment.map((m) => (
                        <DepartmentRow
                          isHistorical={rest.forceLive ? false : sheet.historical}
                          generalCall={sheet?.raw_json?.general_crew_call}
                          key={m.id}
                          person={m}
                          checked={checked.includes(m.id)}
                          setChecked={(check) => {
                            if (check) {
                              setChecked([...checked, m.id]);
                              return;
                            }
                            setChecked(checked.filter((c) => c !== m.id));
                          }}
                          onClick={() => {
                            setFocusedMemberDebounced(m.id);
                          }}
                        />
                      ))}
                    </DepartmentTable>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {src ? (
          <MinimizePdf
            className="max-h-[calc(100vh-24px)] max-sm:hidden"
            sheetSrc={callPush?.src ?? sheet.src ?? src}
            isLoading={isLoading}
            isPdfOutdated={isPdfOutdated}
            onRegenerateClick={() => handleMakePDFClick(sheet)}
          />
        ) : (
          <MinimizeEmpty handleMakePDFClick={() => handleMakePDFClick(sheet)} isLoading={isLoading} />
        )}
      </div>

      <CallCardPreview
        {...{
          // contactInfoVisible: rest.sheet.project.contact_info_visible ?? true,
          focusedMember,
          setFocusedMember: setFocusedMemberDebounced,
          members,
          sheet,
          forceLive: rest.forceLive,
          departments,
          onUpdate: () => setRefreshKey((k) => k + 1),
          entityNames,
        }}
      />

      <FloatingMenu
        {...{
          focusedMember,
          checked,
          setChecked,
          sendCallCards: sendDepartmentCards,
          members,
          activeTab,
          toggleCheckedContactInfoVisible,
          hasCallSheet: !!sheet.src,
          isPdfOutdated,
        }}
      />
    </div>
  );
};
