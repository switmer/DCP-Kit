'use client';

import React, { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input/input';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { NewEntityItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewEntityItem';
import { CompanyEntityType } from '@/types/type';
import { AutoCompleteEntity } from '@/components/blocks/ProjectDashboard/ProjectEntities/AutoCompleteEntity';
import { LocationInput } from '@/components/blocks/CallSheet/Locations/LocationInput';
import { NewVendorInfo } from '@/components/blocks/ProjectDashboard/ProjectVendors/CreateNewProjectVendor';
import { NewEntityInfo } from '@/components/blocks/ProjectDashboard/ProjectEntities/EditProjectEntity';
import { handleLogoUpload } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleLogoUpload';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { handleCroppedLogo } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleCroppedLogo';
import { ImageCropModal } from '@/components/blocks/CallCard/ImageCropModal';

export type EntityTypeType = 'Agency' | 'Client';

type Props = {
  selectedVendor: CompanyEntityType;
  companyVendors: CompanyEntityType[];
  projectVendors: CompanyEntityType[];
  onCancel: () => void;
  newVendorInfo: NewVendorInfo;
  setNewVendorInfo: (a: any) => void;
  noEntities: boolean;
  addCustomTagCallback?: (tag: string) => void;
  setRefreshKey: Dispatch<SetStateAction<number>>;
  setTempLogoFile: (file: File | null) => void;
  tempLogoPreviewUrl: string | null;
  setTempLogoPreviewUrl: (url: string | null) => void;
};

export const EditProjectVendor: FC<Props> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [showLogoInput, setShowLogoInput] = useState(true);
  const [userInputWebsite, setUserInputWebsite] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);

  const [showEntityContactInfo, setShowEntityContactInfo] = useState(
    !!props.selectedVendor.name || !!props.selectedVendor.address || !!props.selectedVendor.email,
  );

  const [selectedType, setSelectedType] = useState<EntityTypeType>(
    (props.selectedVendor.type as EntityTypeType) ?? (props.newVendorInfo.type as EntityTypeType),
  );

  const [localVendorInfo, setLocalVendorInfo] = useState<NewVendorInfo>({
    id: props.selectedVendor.id || props.newVendorInfo.id,
    name: props.selectedVendor.name || props.newVendorInfo.name || '',
    phone: props.selectedVendor.phone || props.newVendorInfo.phone || '',
    email: props.selectedVendor.email || props.newVendorInfo.email || '',
    website: props.selectedVendor.website || props.newVendorInfo.website || '',
    address: props.selectedVendor.address || props.newVendorInfo.address || '',
    type: props.selectedVendor.type || props.newVendorInfo.type || '',
    subtype: props.selectedVendor.subtype || props.newVendorInfo.subtype || '',
    logo: props.selectedVendor.logo || props.newVendorInfo.logo || '',
  });

  useEffect(() => {
    props.setNewVendorInfo(localVendorInfo);
  }, [localVendorInfo]);

  // const userId = user?.id;
  // const { activeCompany } = useCompanyStore();

  const supabase = createClient();

  const handleVendorClick = (entity: CompanyEntityType) => {
    const newInfo = { ...localVendorInfo };

    for (const key of Object.keys(entity)) {
      if (entity[key as keyof CompanyEntityType]) {
        props.setNewVendorInfo((p: any) => {
          return {
            ...p,
            [key]: entity[key as keyof CompanyEntityType],
          };
        });
      }
    }

    newInfo.id = entity.id || localVendorInfo.id;
    setLocalVendorInfo(newInfo);
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

        <div className={cn('flex items-center justify-between w-full px-0')}>
          <NewEntityItem newEntityInfo={props.newVendorInfo} selectedEntity={props.selectedVendor} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-scroll">
        <div className="py-0 pb-4 flex flex-1 flex-col gap-3 rounded-[26px] shadow min-h-[400px]">
          {/* company name input */}
          <div className="">
            <div className="pb-1 text-sm text-white/70">Company name</div>

            {/*<AutoCompleteEntity*/}
            {/*  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"*/}
            {/*  entitySuggestions={props.companyVendors}*/}
            {/*  onChange={(v) => {*/}
            {/*    setLocalVendorInfo((prev) => ({*/}
            {/*      ...prev,*/}
            {/*      name: v ?? "",*/}
            {/*    }));*/}
            {/*  }}*/}
            {/*  value={localVendorInfo.name}*/}
            {/*  onEntityClick={handleVendorClick}*/}
            {/*  placeholder="e.g., Nike"*/}
            {/*/>*/}

            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                setLocalVendorInfo((prev) => ({
                  ...prev,
                  name: e.target.value,
                }));
              }}
              value={localVendorInfo.name}
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
              value={userInputWebsite !== null ? userInputWebsite : (props.selectedVendor.website ?? '')}
              placeholder="Enter company website URL..."
            />
          </div>

          {/* logo */}
          <div className="">
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Logo</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
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

          <div className="">
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Type</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
            </div>

            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                setLocalVendorInfo((p: any) => {
                  return {
                    ...p,
                    subtype: e.target.value,
                  };
                });
              }}
              value={localVendorInfo.subtype}
              placeholder="e.g., Camera"
            />
          </div>

          {/* address input */}
          <div>
            <div className="flex items-center gap-1">
              <div className="pb-1 text-sm text-white/70">Address</div>
              <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
            </div>

            <LocationInput
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              placeholder="Search address..."
              value={localVendorInfo.address}
              onChange={(v: string) => {
                setLocalVendorInfo((prev) => ({
                  ...prev,
                  address: v,
                }));
              }}
              setNewEntityInfo={props.setNewVendorInfo}
              setNewLocation={(location) => {
                setLocalVendorInfo((prev) => ({
                  ...prev,
                  address: location?.formatted_address || '',
                }));
                setRefreshKey((p) => p + 1);
              }}
              // autoFocus
              bypassPlacesApi
            />
          </div>

          <div className="flex justify-between w-full">
            {/* phone input */}
            <div className="w-[48%]">
              <div className="flex items-center gap-1">
                <div className="pb-1 text-sm text-white/70">Phone</div>
                <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
              </div>

              <PhoneInput
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(newPhone) => {
                  setLocalVendorInfo((prev) => ({
                    ...prev,
                    phone: newPhone || '',
                  }));
                }}
                value={localVendorInfo.phone}
                defaultCountry="US"
                placeholder="e.g., (555) 867-5309"
              />
            </div>

            {/* email input */}
            <div className="w-[48%]">
              <div className="flex items-center gap-1">
                <div className="pb-1 text-sm text-white/70">Email</div>
                <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
              </div>

              <input
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(e) => {
                  setLocalVendorInfo((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }));
                }}
                value={localVendorInfo.email}
                placeholder="e.g., you@example.com"
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
