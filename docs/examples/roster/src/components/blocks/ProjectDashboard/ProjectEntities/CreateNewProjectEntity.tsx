'use client';

import React, { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input/input';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { NewEntityItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewEntityItem';
import { CustomTagSelector } from '@/components/blocks/ProjectDashboard/ProjectEntities/CustomTagSelector';
import { NewPointOfContactItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/NewPointOfContactItem';
import { CompanyEntityType } from '@/types/type';
import { AutoCompleteEntity } from '@/components/blocks/ProjectDashboard/ProjectEntities/AutoCompleteEntity';
import { LocationInput } from '@/components/blocks/CallSheet/Locations/LocationInput';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ImageCropModal } from '@/components/blocks/CallCard/ImageCropModal';
import { handleLogoUpload } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleLogoUpload';
import { handleCroppedLogo } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/handleCroppedLogo';

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

export type EntityTypeType = 'production company' | 'agency' | 'client';

type Props = {
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

export const CreateNewProjectEntity: FC<Props> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<string>('');

  const [refreshKey, setRefreshKey] = useState(0);

  const [showEntityContactInfo, setShowEntityContactInfo] = useState(false);
  const [showAddPointOfContact, setShowAddPointOfContact] = useState(false);
  const [showLogoInput, setShowLogoInput] = useState(true);
  const [userInputWebsite, setUserInputWebsite] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [selectedType, setSelectedType] = useState<EntityTypeType>(props.newEntityInfo.type as EntityTypeType);

  const handleEntityClick = (entity: CompanyEntityType) => {
    for (const key of Object.keys(entity)) {
      //-- do not inherit the id of the company_entity suggestion.
      if (key === 'id') continue;

      if (entity[key as keyof CompanyEntityType]) {
        props.setNewEntityInfo((p: any) => {
          return {
            ...p,
            [key]: entity[key as keyof CompanyEntityType],
          };
        });

        if (key === 'type') {
          setSelectedType(entity.type?.toLowerCase() as EntityTypeType);
        }
        // props.newEntityInfo[key as keyof NewEntityInfo] =
        //   entity[key as keyof CompanyEntityType] ?? "";
      }
    }

    setShowEntityContactInfo(true);
    setRefreshKey((p) => p + 1);
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

  const cleanLogoUrl = (url: string) => {
    if (!url) return '';

    if (url.includes('https://logo.clearbit.com/')) {
      return props.newEntityInfo.logo.split('https://logo.clearbit.com/')[1];
    }

    if (url.includes('http://logo.clearbit.com/')) {
      return props.newEntityInfo.logo.split('http://logo.clearbit.com/')[1];
    }

    return url;
  };

  useEffect(() => {
    //-- check if a logo already exists (either temp or uploaded)
    //-- so we don't overwrite it if the name or website changes.
    if (props.newEntityInfo.name && !props.newEntityInfo.website) {
      setUserInputWebsite('www.' + props.newEntityInfo.name.toLowerCase().trim().replaceAll(' ', '') + '.com');
    }

    if (!props.newEntityInfo.name && !props.newEntityInfo.website) {
      setUserInputWebsite('');
    }

    const fetchLogo = async () => {
      //-- don't replace existing logo if it's already a blob or supabase url.
      if (props.newEntityInfo.logo?.toLowerCase().includes('supabase')) return;
      if (props.newEntityInfo.logo?.toLowerCase().includes('blob')) return;

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

        props.setNewEntityInfo((p: any) => {
          if (p.logo?.includes('blob')) return p;

          return {
            ...p,
            logo: `https://logo.clearbit.com/${url}` ?? '',
          };
        });

        return;
      } else {
        const url = props.newEntityInfo.name.toLowerCase().trim().replaceAll(' ', '');

        props.setNewEntityInfo((p: any) => {
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
  }, [props.newEntityInfo.name, userInputWebsite]);

  useEffect(() => {
    //-- cleanup function.
    return () => {
      //-- revoke any temporary object urls to prevent memory leaks.
      if (props.tempLogoPreviewUrl) {
        URL.revokeObjectURL(props.tempLogoPreviewUrl);
      }
    };
  }, [props.tempLogoPreviewUrl]);

  return (
    //-- h-[660px]
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
          <NewEntityItem newEntityInfo={props.newEntityInfo} />

          {showAddPointOfContact && (
            <NewPointOfContactItem
              // showAddPointOfContact={showAddPointOfContact}
              newPointOfContactInfo={props.newPointOfContactInfo}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-scroll">
        {/* min-h-400 */}
        <div className="py-0 pb-4 flex flex-1 flex-col gap-3 rounded-[26px] shadow">
          <div className="flex flex-col justify-center gap-2">
            <div className="flex justify-between w-full">
              <div className="flex flex-col justify-center w-[49%]">
                <div className="pb-1 text-sm text-white/70">Company name</div>

                <AutoCompleteEntity
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  entitySuggestions={props.companyEntities.filter(
                    (ent) => !ent.project && ent.type?.toLowerCase() !== 'vendor',
                  )}
                  onChange={(v) => {
                    props.setNewEntityInfo((p: any) => {
                      return {
                        ...p,
                        name: v ?? '',
                      };
                    });
                  }}
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
                  value={userInputWebsite}
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

          <div>
            <div className="pb-1 text-sm text-white/70">Type</div>

            <CustomTagSelector
              suggestions={props.typeSuggestions}
              value={selectedType ?? 'Agency'}
              label="Type"
              addCustomTagCallback={props.addCustomTagCallback}
              setNewTag={(newTag) => {
                setSelectedType(newTag as any);

                props.setNewEntityInfo((p: any) => {
                  return {
                    ...p,
                    type: newTag ?? '',
                  };
                });

                // props.setRefreshKey((p) => p + 1);
              }}
            />
          </div>

          {showEntityContactInfo ? (
            <>
              <div>
                <div className="flex items-center gap-1">
                  <div className="pb-1 text-sm text-white/70">Address</div>
                  <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
                </div>

                <LocationInput
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  // classNameSuggestionsList="max-h-[100px]"
                  placeholder="Search address..."
                  value={props.newEntityInfo.address}
                  onChange={(v: string) => {
                    props.setNewEntityInfo((p: any) => {
                      return {
                        ...p,
                        address: v,
                      };
                    });
                  }}
                  setNewEntityInfo={props.setNewEntityInfo}
                  setNewLocation={(location) => {
                    props.setNewEntityInfo((p: any) => {
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

              <div className="flex items-center justify-between w-full">
                <div className="w-[48%]">
                  <div className="flex items-center gap-1">
                    <div className="pb-1 text-sm text-white/70">Phone</div>
                    <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
                  </div>

                  <PhoneInput
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(newPhone) => {
                      props.setNewEntityInfo((p: any) => {
                        return {
                          ...p,
                          phone: newPhone,
                        };
                      });
                    }}
                    value={props.newEntityInfo.phone}
                    defaultCountry="US"
                    placeholder="e.g., (555) 867-5309"
                  />
                </div>

                <div className="w-[48%]">
                  <div className="flex items-center gap-1">
                    <div className="pb-1 text-sm text-white/70">Email</div>
                    <div className="relative top-[-2px] text-sm text-white/40">(optional)</div>
                  </div>

                  <input
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(e) => {
                      props.setNewEntityInfo((p: any) => {
                        return {
                          ...p,
                          email: e.target.value,
                        };
                      });
                    }}
                    value={props.newEntityInfo.email}
                    placeholder="e.g., you@example.com"
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              onClick={() => setShowEntityContactInfo(true)}
              className="flex items-center justify-center w-auto h-[40px] rounded-2xl bg-stone-900/90 mt-2 py-1 px-3 text-white/70 text-sm cursor-pointer hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
            >
              + Add Contact Info
            </div>
          )}

          {showAddPointOfContact ? (
            <div className="flex flex-col">
              <div>
                <div className="flex items-center gap-1">
                  <div className="font-bold text-white py-2">Point of Contact</div>
                  <div className="text-sm text-white/40">(optional)</div>

                  <div
                    onClick={() => {
                      setShowAddPointOfContact(false);
                    }}
                    className="flex items-center justify-center text-center w-[14px] h-[14px] rounded-sm bg-stone-900/90 cursor-pointer hover:bg-white/20"
                  >
                    x
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Name</div>

                  <input
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(e) => {
                      props.setNewPointOfContactInfo((p: any) => {
                        return {
                          ...p,
                          name: e.target.value,
                        };
                      });
                    }}
                    value={props.newPointOfContactInfo.name}
                    placeholder="e.g., Walter White"
                  />
                </div>

                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Phone</div>

                  <PhoneInput
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(newPhone) => {
                      props.setNewPointOfContactInfo((p: any) => {
                        return {
                          ...p,
                          phone: newPhone,
                        };
                      });
                    }}
                    value={props.newPointOfContactInfo.phone}
                    defaultCountry="US"
                    placeholder="e.g., (555) 867-5309"
                  />
                </div>

                <div className="w-[31%]">
                  <div className="pb-1 text-sm text-white/70">Email</div>

                  <input
                    className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                    onChange={(e) => {
                      props.setNewPointOfContactInfo((p: any) => {
                        return {
                          ...p,
                          email: e.target.value,
                        };
                      });
                    }}
                    value={props.newPointOfContactInfo.email}
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

          {/*) : (*/}
          {/*  <div*/}
          {/*    onClick={() => setShowAddPointOfContact(true)}*/}
          {/*    className="flex items-center justify-center w-auto h-[40px] rounded-2xl bg-stone-900/90 mt-2 py-1 px-3 text-white/70 text-sm cursor-pointer hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"*/}
          {/*  >*/}
          {/*    + Add Point of Contact*/}
          {/*  </div>*/}
          {/*)}*/}
        </div>
      </div>
    </div>
  );
};
