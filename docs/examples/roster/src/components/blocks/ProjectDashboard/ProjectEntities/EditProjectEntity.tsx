'use client';

import React, { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input/input';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { NewEntityItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewEntityItem';
import { CustomTagSelector } from '@/components/blocks/ProjectDashboard/ProjectEntities/CustomTagSelector';
import { NewPointOfContactItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewPointOfContactItem';
import { CompanyEntityType, EntityPointOfContactType } from '@/types/type';
import { AutoCompleteEntity } from '@/components/blocks/ProjectDashboard/ProjectEntities/AutoCompleteEntity';
import { LocationInput } from '@/components/blocks/CallSheet/Locations/LocationInput';
import { handleLogoUpload } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleLogoUpload';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { handleCroppedLogo } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleCroppedLogo';
import { ImageCropModal } from '@/components/blocks/CallCard/ImageCropModal';

export type NewEntityInfo = {
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

export type NewPointOfContactInfo = {
  name: string;
  phone: string;
  email: string;
  avatar: string;
};

export type EntityTypeType = 'Agency' | 'Client';

type Props = {
  selectedEntity: CompanyEntityType;
  pointOfContact?: EntityPointOfContactType;
  companyEntities: CompanyEntityType[];
  projectEntities: CompanyEntityType[];
  onCancel: () => void;
  newEntityInfo: NewEntityInfo;
  setNewEntityInfo: (a: any) => void;
  newPointOfContactInfo: NewPointOfContactInfo;
  setNewPointOfContactInfo: (a: any) => void;
  noEntities: boolean;
  typeSuggestions: string[];
  addCustomTagCallback?: (tag: string) => void;
  setRefreshKey: Dispatch<SetStateAction<number>>;
  setTempLogoFile: (file: File | null) => void;
  tempLogoPreviewUrl: string | null;
  setTempLogoPreviewUrl: (url: string | null) => void;
};

export const EditProjectEntity: FC<Props> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [showEntityContactInfo, setShowEntityContactInfo] = useState(
    !!props.selectedEntity.name || !!props.selectedEntity.address || !!props.selectedEntity.email,
  );
  const [showAddPointOfContact, setShowAddPointOfContact] = useState(
    !!props?.pointOfContact?.name || !!props?.pointOfContact?.phone || !!props?.pointOfContact?.email,
  );

  const [selectedType, setSelectedType] = useState<EntityTypeType>(
    (props.selectedEntity.type as EntityTypeType) ?? (props.newEntityInfo.type as EntityTypeType),
  );

  const [showLogoInput, setShowLogoInput] = useState(true);
  const [userInputWebsite, setUserInputWebsite] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);

  const [localEntityInfo, setLocalEntityInfo] = useState<NewEntityInfo>({
    id: props.selectedEntity.id || props.newEntityInfo.id,
    name: props.selectedEntity.name || props.newEntityInfo.name || '',
    phone: props.selectedEntity.phone || props.newEntityInfo.phone || '',
    email: props.selectedEntity.email || props.newEntityInfo.email || '',
    website: props.selectedEntity.website || props.newEntityInfo.website || '',
    address: props.selectedEntity.address || props.newEntityInfo.address || '',
    type: props.selectedEntity.type || props.newEntityInfo.type || '',
    subtype: props.selectedEntity.subtype || props.newEntityInfo.subtype || '',
    logo: props.selectedEntity.logo || props.newEntityInfo.logo || '',
  });

  const [localPointOfContactInfo, setLocalPointOfContactInfo] = useState<NewPointOfContactInfo>({
    name: props.pointOfContact?.name || props.newPointOfContactInfo.name || '',
    phone: props.pointOfContact?.phone || props.newPointOfContactInfo.phone || '',
    email: props.pointOfContact?.email || props.newPointOfContactInfo.email || '',
    avatar: props.pointOfContact?.avatar || props.newPointOfContactInfo.avatar || '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    props.setNewEntityInfo(localEntityInfo);
  }, [localEntityInfo]);

  useEffect(() => {
    props.setNewPointOfContactInfo(localPointOfContactInfo);
  }, [localPointOfContactInfo]);

  // const userId = user?.id;
  // const { activeCompany } = useCompanyStore();

  const supabase = createClient();

  const handleEntityClick = (entity: CompanyEntityType) => {
    const newInfo = { ...localEntityInfo };

    for (const key of Object.keys(entity)) {
      if (entity[key as keyof CompanyEntityType]) {
        props.setNewEntityInfo((p: any) => {
          return {
            ...p,
            [key]: entity[key as keyof CompanyEntityType],
          };
        });
      }
    }

    // //-- if the entity has a point of contact, update that as well
    // if (entity.pointOfContact) {
    //   setLocalPointOfContactInfo({
    //     name: entity.pointOfContact.name || "",
    //     phone: entity.pointOfContact.phone || "",
    //     email: entity.pointOfContact.email || "",
    //     avatar: entity.pointOfContact.avatar || "",
    //   });
    // }

    newInfo.id = entity.id || localEntityInfo.id;
    setLocalEntityInfo(newInfo);
    setRefreshKey((p) => p + 1);
  };

  const cleanLogoUrl = (url: string) => {
    if (!url) return '';

    if (url.includes('https://logo.clearbit.com/')) {
      return localEntityInfo.logo.split('https://logo.clearbit.com/')[1];
    }

    if (url.includes('http://logo.clearbit.com/')) {
      return localEntityInfo.logo.split('http://logo.clearbit.com/')[1];
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
    props.setNewEntityInfo((prev: NewEntityInfo) => ({
      ...prev,
      logo: null,
    }));

    return;
  };

  return (
    <div className={cn('p-6 flex flex-col gap-3 h-auto overflow-hidden transition-all duration-300 ease-in-out')}>
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
          <NewEntityItem newEntityInfo={props.newEntityInfo} selectedEntity={props.selectedEntity} />

          {showAddPointOfContact && (
            <NewPointOfContactItem
              // showAddPointOfContact={showAddPointOfContact}
              newPointOfContactInfo={props.newPointOfContactInfo}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-scroll">
        {/* min-h-[440px] */}
        <div className="py-0 pb-4 flex flex-1 flex-col gap-3 rounded-[26px] shadow">
          <div className="flex flex-col justify-center gap-2">
            <div className="flex justify-between w-full">
              <div className="flex flex-col justify-center w-[49%]">
                <div className="pb-1 text-sm text-white/70">Company name</div>

                <AutoCompleteEntity
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  entitySuggestions={props.companyEntities.filter((ent) => !ent.project)}
                  onChange={(v) => {
                    setLocalEntityInfo((prev) => ({
                      ...prev,
                      name: v ?? '',
                    }));
                  }}
                  value={localEntityInfo.name}
                  onEntityClick={handleEntityClick}
                  placeholder="e.g., Nike"
                />
              </div>

              <div className="flex flex-col justify-center w-[49%]">
                <div className="pb-1 text-sm text-white/70">Company website</div>

                <input
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  onChange={(e) => {
                    setUserInputWebsite(e.target?.value ?? '');

                    props.setNewEntityInfo((p: any) => {
                      return {
                        ...p,
                        website: e.target.value ?? '',
                      };
                    });
                  }}
                  value={userInputWebsite !== null ? userInputWebsite : (props.selectedEntity.website ?? '')}
                  placeholder="Enter company website URL..."
                />
              </div>

              {/*<input*/}
              {/*  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"*/}
              {/*  onChange={(e) =>*/}
              {/*    props.setNewEntityInfo((p: any) => {*/}
              {/*      return {*/}
              {/*        ...p,*/}
              {/*        name: e.target.value,*/}
              {/*      };*/}
              {/*    })*/}
              {/*  }*/}
              {/*  value={props.newEntityInfo.name}*/}
              {/*  placeholder="e.g., Nike"*/}
              {/*/>*/}
            </div>

            <div className="w-full">
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
                    {props.newEntityInfo?.logo?.includes('blob') ? 'Replace Logo' : 'Upload Logo'}
                  </button>

                  {props.newEntityInfo?.logo?.includes('blob') && (
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
                      {props.newEntityInfo.logo ? 'Edit/Replace Logo' : 'Add/Upload Logo'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* type selector */}
          <div>
            <div className="pb-1 text-sm text-white/70">Type</div>

            <CustomTagSelector
              suggestions={props.typeSuggestions}
              value={selectedType || 'Agency'}
              label="Type"
              addCustomTagCallback={props.addCustomTagCallback}
              setNewTag={(newTag) => {
                setSelectedType(newTag as EntityTypeType);
                setLocalEntityInfo((prev) => ({
                  ...prev,
                  type: newTag,
                }));
              }}
            />
          </div>

          {/* address input */}
          {showEntityContactInfo ? (
            <>
              <div>
                <div className="flex items-center gap-1">
                  <div className="pb-1 text-sm text-white/70">Address</div>
                  <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
                </div>

                <LocationInput
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  placeholder="Search address..."
                  value={localEntityInfo.address}
                  onChange={(v: string) => {
                    setLocalEntityInfo((prev) => ({
                      ...prev,
                      address: v,
                    }));
                  }}
                  setNewEntityInfo={props.setNewEntityInfo}
                  setNewLocation={(location) => {
                    setLocalEntityInfo((prev) => ({
                      ...prev,
                      address: location?.formatted_address || '',
                    }));
                    setRefreshKey((p) => p + 1);
                  }}
                  // autoFocus
                  bypassPlacesApi
                />
              </div>

              {/* phone input */}
              <div className="flex items-center justify-between w-full">
                <div className="w-[48%]">
                  <div className="flex items-center gap-1">
                    <div className="pb-1 text-sm text-white/70">Phone</div>
                    <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
                  </div>

                  <PhoneInput
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(newPhone) => {
                      setLocalEntityInfo((prev) => ({
                        ...prev,
                        phone: newPhone || '',
                      }));
                    }}
                    value={localEntityInfo.phone}
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
                      setLocalEntityInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                    }}
                    value={localEntityInfo.email}
                    placeholder="e.g., you@example.com"
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              onClick={() => setShowAddPointOfContact(true)}
              className="flex items-center justify-center w-auto h-[40px] rounded-2xl bg-stone-900/90 mt-2 py-1 px-3 text-white/70 text-sm cursor-pointer hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
            >
              + Add Contact Info
            </div>
          )}

          {/* point of contact */}
          {showAddPointOfContact ? (
            <div className="flex flex-col">
              <div>
                <div className="flex items-center gap-1">
                  <div className="font-bold text-white py-2">Point of Contact</div>
                  <div className="text-sm text-white/40">(optional)</div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Name</div>
                  <input
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(e) => {
                      setLocalPointOfContactInfo((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                    }}
                    value={localPointOfContactInfo.name}
                    placeholder="e.g., Walter White"
                  />
                </div>

                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Phone</div>

                  <PhoneInput
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(newPhone) => {
                      setLocalPointOfContactInfo((prev) => ({
                        ...prev,
                        phone: newPhone || '',
                      }));
                    }}
                    value={localPointOfContactInfo.phone}
                    defaultCountry="US"
                    placeholder="e.g., (555) 867-5309"
                  />
                </div>

                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Email</div>
                  <input
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(e) => {
                      setLocalPointOfContactInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                    }}
                    value={localPointOfContactInfo.email}
                    placeholder="e.g., you@example.com"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowAddPointOfContact(true)}
              className="flex items-center justify-center w-auto h-[40px] rounded-2xl bg-stone-900/90 mt-2 py-1 px-3 text-white/70 text-sm cursor-pointer hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
            >
              + Add Point of Contact
            </div>
          )}

          <ImageCropModal
            isOpen={logoCropModalOpen}
            onClose={() => setLogoCropModalOpen(false)}
            file={selectedFile}
            onCropComplete={(croppedFile) =>
              handleCroppedLogo({
                croppedFile,
                setLogoCropModalOpen,
                setNewEntityInfo: props.setNewEntityInfo,
                setTempLogoFile: props.setTempLogoFile,
                setTempLogoPreviewUrl: props.setTempLogoPreviewUrl,
              })
            }
            options={{ freeform: true }}
          />
        </div>
      </div>
    </div>
  );
};
