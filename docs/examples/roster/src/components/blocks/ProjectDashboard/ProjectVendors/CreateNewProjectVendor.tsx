'use client';

import React, { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input/input';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { NewEntityItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewEntityItem';
import { CustomTagSelector } from '@/components/blocks/ProjectDashboard/ProjectEntities/CustomTagSelector';
import { NewPointOfContactItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewPointOfContactItem';
import { CompanyEntityType } from '@/types/type';
import { AutoCompleteEntity } from '@/components/blocks/ProjectDashboard/ProjectEntities/AutoCompleteEntity';
import { LocationInput } from '@/components/blocks/CallSheet/Locations/LocationInput';
import { toast } from 'sonner';
import { handleLogoUpload } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleLogoUpload';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { NewEntityInfo } from '@/components/blocks/ProjectDashboard/ProjectEntities/CreateNewProjectEntity';
import { handleCroppedLogo } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleCroppedLogo';
import { ImageCropModal } from '@/components/blocks/CallCard/ImageCropModal';

export type NewVendorInfo = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  type: string;
  subtype: string;
  logo: string;
};

type Props = {
  companyVendors: CompanyEntityType[];
  projectVendors: CompanyEntityType[];
  onCancel: () => void;
  newVendorInfo: NewVendorInfo;
  setNewVendorInfo: (a: any) => void;
  noEntities: boolean;
  setRefreshKey: Dispatch<SetStateAction<number>>;
  setTempLogoFile: (file: File | null) => void;
  tempLogoPreviewUrl: string | null;
  setTempLogoPreviewUrl: (url: string | null) => void;
};

export const CreateNewProjectVendor: FC<Props> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<string>('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [showEntityContactInfo, setShowEntityContactInfo] = useState(false);
  const [showAddPointOfContact, setShowAddPointOfContact] = useState(false);
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [userInputWebsite, setUserInputWebsite] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);

  useEffect(() => {
    //-- check if a logo already exists (either temp or uploaded).
    //-- so we don't overwrite it if the name or website changes.
    if (props.newVendorInfo.name && !props.newVendorInfo.website) {
      setUserInputWebsite('www.' + props.newVendorInfo.name.toLowerCase().trim().replaceAll(' ', '') + '.com');
    }

    if (!props.newVendorInfo.name && !props.newVendorInfo.website) {
      setUserInputWebsite('');
    }

    const fetchLogo = async () => {
      //-- don't replace existing logo if it's already a blob or supabase url.
      if (props.newVendorInfo.logo?.toLowerCase().includes('supabase')) return;
      if (props.newVendorInfo.logo?.toLowerCase().includes('blob')) return;

      if (userInputWebsite) {
        //-- store the website input in the ref without triggering a re-render.
        websiteInputRef.current = userInputWebsite;

        //-- sanitize url before processing.
        let url = userInputWebsite;

        //-- strip http/https if present.
        if (url.includes('http://') || url.includes('https://')) {
          url = url.replace(/^https?:\/\//, '');
        }

        //-- strip www. prefix if present.
        if (url.includes('www.')) {
          url = url.replace(/www\./, '');
        }

        url = url.split('/')[0].split('?')[0];

        props.setNewVendorInfo((p: any) => {
          if (p.logo?.includes('blob')) return p;

          return {
            ...p,
            logo: `https://logo.clearbit.com/${url}` ?? '',
          };
        });

        return;
      } else {
        const url = props.newVendorInfo.name.toLowerCase().trim().replaceAll(' ', '');

        props.setNewVendorInfo((p: any) => {
          //-- only update logo if no blob url is present.
          if (p.logo?.includes('blob')) return p;

          return {
            ...p,
            logo: `https://logo.clearbit.com/${url}.com` ?? '',
          };
        });
      }
    };

    const debounce = setTimeout(fetchLogo, 750);

    return () => clearTimeout(debounce);
  }, [props.newVendorInfo.name, userInputWebsite]);

  const supabase = createClient();

  const handleVendorClick = (entity: Omit<CompanyEntityType, 'id'>) => {
    for (const key of Object.keys(entity)) {
      //-- do not inherit the id of the company_entity suggestion.
      if (key === 'id') continue;

      if (entity[key as keyof Omit<CompanyEntityType, 'id'>]) {
        props.setNewVendorInfo((p: any) => {
          return {
            ...p,
            [key]: entity[key as keyof Omit<CompanyEntityType, 'id'>],
          };
        });
        // props.newEntityInfo[key as keyof NewEntityInfo] =
        //   entity[key as keyof CompanyEntityType] ?? "";
      }
    }

    setRefreshKey((p) => p + 1);
  };

  const cleanLogoUrl = (url: string) => {
    if (!url) return '';

    if (url.includes('https://logo.clearbit.com/')) {
      return props.newVendorInfo.logo.split('https://logo.clearbit.com/')[1];
    }

    if (url.includes('http://logo.clearbit.com/')) {
      return props.newVendorInfo.logo.split('http://logo.clearbit.com/')[1];
    }

    return url;
  };

  const handleRemoveTempLogo = () => {
    //-- revoke any existing object url.
    if (props.tempLogoPreviewUrl && props.tempLogoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(props.tempLogoPreviewUrl);
    }

    //-- reset the states.
    props.setTempLogoFile(null);
    props.setTempLogoPreviewUrl(null);

    //-- also clear the logo from entity info.
    props.setNewVendorInfo((prev: NewEntityInfo) => ({
      ...prev,
      logo: null,
    }));

    return;
  };

  return (
    <div className={cn('p-6 flex flex-col gap-3 h-full overflow-hidden transition-all duration-300 ease-in-out')}>
      <div className="flex flex-col w-full p-0">
        {props.noEntities && (
          <div
            onClick={props.onCancel}
            className="flex items-center w-[75px] gap-3 cursor-pointer pt-0 pb-3 text-white/80 hover:text-white/100"
          >
            <Icon name="chevron" className="w-4 h-4 rotate-180" />
            <div className="text-lg">Back</div>
          </div>
        )}

        <div className={cn('flex items-center justify-between w-full px-0', !showAddPointOfContact && 'justify-start')}>
          <NewEntityItem newEntityInfo={props.newVendorInfo} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-scroll">
        <div className="py-0 pb-4 flex flex-1 flex-col gap-3 rounded-[26px] shadow min-h-[400px]">
          {/* company name */}
          <div className="">
            <div className="pb-1 text-sm text-white/70">Company name</div>

            <AutoCompleteEntity
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              entitySuggestions={props.companyVendors}
              onChange={(v) => {
                props.setNewVendorInfo((p: any) => {
                  return {
                    ...p,
                    name: v ?? '',
                  };
                });
              }}
              onEntityClick={handleVendorClick}
              placeholder="e.g., Quixote"
            />
          </div>

          {/* website */}
          <div className="">
            <div className="pb-1 text-sm text-white/70">Company website</div>

            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                setUserInputWebsite(e.target?.value ?? '');

                props.setNewVendorInfo((p: any) => {
                  return {
                    ...p,
                    website: e.target.value ?? '',
                  };
                });
              }}
              value={userInputWebsite}
              placeholder="Enter vendor website URL..."
            />
          </div>

          {/* logo stuff */}
          <div className="">
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Logo</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>

              {/*{showLogoInput && (*/}
              {/*  <div*/}
              {/*    className="group flex items-center justify-center relative top-[-2px] w-[14px] h-[14px] bg-zinc-700 rounded-full cursor-pointer hover:bg-zinc-650"*/}
              {/*    onClick={() => setShowLogoInput(false)}*/}
              {/*  >*/}
              {/*    <Icon*/}
              {/*      name="cross"*/}
              {/*      className="w-[10px] h-[10px] text-white text-opacity-70 group-hover:text-opacity-100"*/}
              {/*    />*/}
              {/*  </div>*/}
              {/*)}*/}
            </div>

            {showLogoInput ? (
              <div className="flex items-center gap-2">
                {/* hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleLogoUpload(e, {
                      setSelectedFile,
                      setLogoCropModalOpen,
                    })
                  }
                />

                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="group flex items-center justify-center gap-1.5 min-w-[140px] h-[40px] py-1 px-3 text-lime-300/80 cursor-pointer hover:text-lime-300/100"
                >
                  <Icon name="upload" className="w-3 h-3 text-lime-300/80 group-hover:text-lime-300/100" />
                  {props.newVendorInfo?.logo?.includes('blob') ? 'Replace Logo' : 'Upload Logo'}
                </button>

                {props.newVendorInfo?.logo?.includes('blob') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveTempLogo();
                    }}
                    className="group relative left-[-15px] flex items-center justify-center gap-1.5 h-[40px] py-1 px-3 text-red-500/80 cursor-pointer hover:text-red-500/100"
                  >
                    <Icon name="bin" className="w-4 h-4 text-red-500/80 group-hover:text-red-500/100" />
                    Remove Logo
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center w-full">
                {isLoading ? (
                  <div className="flex items-center justify-center w-full h-[40px] rounded-lg bg-zinc-900/70 border border-white/10">
                    <LoadingIndicator size="small" />
                  </div>
                ) : (
                  <div
                    onClick={() => setShowLogoInput(true)}
                    className="group flex items-center justify-center gap-1.5 h-[40px] py-1 px-3 text-lime-300/80 text-sm cursor-pointer hover:text-lime-300/100"
                  >
                    <Icon name="upload" className="w-3 h-3 text-lime-300/80 group-hover:text-lime-300/100" />
                    {props.newVendorInfo.logo ? 'Edit/Replace Logo' : 'Add/Upload Logo'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* type */}
          <div className="">
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Type</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
            </div>

            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                props.setNewVendorInfo((p: any) => {
                  return {
                    ...p,
                    subtype: e.target.value ?? '',
                  };
                });
              }}
              value={props.newVendorInfo.subtype ?? ''}
              placeholder="e.g., Camera"
            />
          </div>

          {/* address */}
          <div>
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Address</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
            </div>

            <LocationInput
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              // classNameSuggestionsList="max-h-[100px]"
              placeholder="Search address..."
              value={props.newVendorInfo.address}
              onChange={(v: string) => {
                props.setNewVendorInfo((p: any) => {
                  return {
                    ...p,
                    address: v,
                  };
                });
              }}
              setNewEntityInfo={props.setNewVendorInfo}
              setNewLocation={(location) => {
                props.setNewVendorInfo((p: any) => {
                  return {
                    ...p,
                    address: location?.formatted_address as string,
                  };
                });

                setRefreshKey((p) => p + 1);
              }}
              // autoFocus
              bypassPlacesApi
            />
          </div>

          {/* phone */}
          <div className="flex justify-between w-full">
            <div className="w-[48%]">
              <div className="flex items-center gap-1">
                <div className="pb-1 text-sm text-white/70">Phone</div>
                {/*<div className="relative top-[-2px] text-sm text-white/40">*/}
                {/*  (optional)*/}
                {/*</div>*/}
              </div>

              <PhoneInput
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(newPhone) => {
                  props.setNewVendorInfo((p: any) => {
                    return {
                      ...p,
                      phone: newPhone,
                    };
                  });
                }}
                value={props.newVendorInfo.phone}
                defaultCountry="US"
                placeholder="e.g., (555) 867-5309"
              />
            </div>

            {/* email */}
            <div className="w-[48%]">
              <div className="flex items-center gap-1">
                <div className="pb-1 text-sm text-white/70">Email</div>
                {/*<div className="relative top-[-2px] text-sm text-white/40">*/}
                {/*  (optional)*/}
                {/*</div>*/}
              </div>

              <input
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(e) => {
                  props.setNewVendorInfo((p: any) => {
                    return {
                      ...p,
                      email: e.target.value,
                    };
                  });
                }}
                value={props.newVendorInfo.email}
                placeholder="e.g., you@email.com"
              />
            </div>
          </div>
        </div>
      </div>

      <ImageCropModal
        isOpen={logoCropModalOpen}
        onClose={() => setLogoCropModalOpen(false)}
        file={selectedFile}
        onCropComplete={(croppedFile) =>
          handleCroppedLogo({
            croppedFile,
            setLogoCropModalOpen,
            setNewEntityInfo: props.setNewVendorInfo,
            setTempLogoFile: props.setTempLogoFile,
            setTempLogoPreviewUrl: props.setTempLogoPreviewUrl,
          })
        }
        options={{ freeform: true }}
      />
    </div>
  );
};
