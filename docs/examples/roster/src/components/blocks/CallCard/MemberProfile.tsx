import { CallSheetMemberType, CallSheetType, CompanyType, MemberType } from '@/types/type';
import React, { FC, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { parsePhoneNumber } from 'react-phone-number-input/min';
import { capitalizeString, cn } from '@/lib/utils';
import { EditSocialsModal } from '@/components/blocks/CallCard/EditSocialsModal';
import { Editable } from '@/components/ui/Editable';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';
import { ImageCropModal } from '@/components/blocks/CallCard/ImageCropModal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

type Props = {
  contactInfoVisible: boolean;
  sheet?: CallSheetType;
  company?: CompanyType;

  //-- our current user as a call_sheet_member record.
  member: CallSheetMemberType;

  //-- our currently selected member either as our current user's _user_ record,
  //-- or another user's call_sheet_member record.
  selectedMember: (CallSheetMemberType & { avatar: string }) | MemberType;
  date?: any;
  setRefreshKey: (a: (p: number) => number) => void;
};

export function isMemberType(
  member: (CallSheetMemberType & { avatar: string }) | MemberType | undefined,
): member is MemberType {
  return member !== undefined && !('call_sheet' in member);
}

export const MemberProfile: FC<Props> = (props) => {
  const [editSocialsModalOpen, setEditSocialsModalOpen] = useState(false);
  const [avatarCropModalOpen, setAvatarCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const initials = props?.selectedMember?.name
    ? props.selectedMember.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : '--';

  const handleUpdate = async (type: 'phone' | 'email' | 'department' | 'title' | 'name', value: string) => {
    // if (value === null || value === "") return;
    if (type === 'email' && (!value.includes('@') || !value.includes('.'))) {
      toast.error('Invalid email.');
      return;
    }

    const { error: updateError } = await supabase
      .from('member')
      .update({ [type]: value })
      .eq('id', props?.selectedMember.id)
      .select();

    if (updateError) {
      console.error('Error: ', updateError);
      toast.error(`Something went wrong updating ${type}. Please try again.`);

      return;
    }

    toast.success(`${capitalizeString(type)} updated successfully.`);

    props.setRefreshKey((p) => p + 1);
  };

  const renderSocials = (member: (CallSheetMemberType & { avatar: string }) | MemberType) => {
    if (!member) return;

    if (isMemberType(member)) {
      return (
        <div className="flex justify-center w-full">
          <div className="flex items-center justify-evenly gap-2 w-auto">
            {member.imdb && (
              <a
                //@ts-ignore
                href={!member.imdb.includes('http') ? 'https://' + member.imdb : member.imdb}
                target="_blank"
                className="group relative flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15 hover:bg-lime-200/25"
              >
                <div className="text-[12px] font-bold">IMDb</div>
              </a>
            )}

            {member.instagram && (
              <a
                //@ts-ignore
                href={!member.instagram.includes('http') ? 'https://' + member.instagram : member.instagram}
                target="_blank"
                className="group relative flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15 hover:bg-lime-200/25"
              >
                <Icon name="instagram-logo" className="h-[20px] w-[20px] text-white/80" />
              </a>
            )}

            {member.youtube && (
              <a
                //@ts-ignore
                href={!member.youtube.includes('http') ? 'https://' + member.youtube : member.youtube}
                target="_blank"
                className="group relative flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15 hover:bg-lime-200/25"
              >
                <Icon name="youtube-logo" className="h-[25px] w-[25px] text-white/80" />
              </a>
            )}

            {member.vimeo && (
              <a
                //@ts-ignore
                href={!member.vimeo.includes('http') ? 'https://' + member.vimeo : member.vimeo}
                target="_blank"
                className="group relative flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15 hover:bg-lime-200/25"
              >
                <Icon name="vimeo-logo" className="h-[22px] w-[22px] text-white/80" />
              </a>
            )}
          </div>
        </div>
      );
    }
  };

  const renderBubble = (type: 'imdb' | 'instagram' | 'youtube' | 'vimeo' | string) => {
    if (isMemberType(props.selectedMember)) {
      let url = props.selectedMember[type as keyof typeof props.selectedMember];

      if (url !== null && !url?.includes('http')) {
        url = 'https://' + url;
      }

      if (type !== 'edit') {
        return (
          <div className="flex flex-col items-center cursor-pointer">
            <div
              //@ts-ignore
              onClick={() => {
                setEditSocialsModalOpen(true);
              }}
              className="group relative flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15 hover:bg-lime-200/25"
            >
              <div className="text-white">
                {type === 'imdb' && <div className="text-[12px] font-bold">IMDb</div>}

                {type === 'instagram' && <Icon name="instagram-logo" className="h-[20px] w-[20px] text-white/80" />}

                {type === 'youtube' && <Icon name="youtube-logo" className="h-[25px] w-[25px] text-white/80" />}

                {type === 'vimeo' && <Icon name="vimeo-logo" className="h-[22px] w-[22px] text-white/80" />}
              </div>

              {/*{props.selectedMember[*/}
              {/*  type as keyof typeof props.selectedMember*/}
              {/*] === null && (*/}
              <>
                <div
                  className={cn(
                    'z-20 absolute flex justify-center items-center w-full h-full rounded-full bg-zinc-950/35 group-hover:bg-zinc-950/10',
                    props.selectedMember[type as keyof typeof props.selectedMember] &&
                      'bg-lime-200/15 hover:bg-lime-200/25',
                  )}
                />

                <div
                  onClick={() => setEditSocialsModalOpen(true)}
                  className="z-20 absolute -top-[5px] -right-[5px] flex justify-center items-center w-[20px] h-[20px] rounded-full bg-lime-300/80 group-hover:bg-lime-300"
                >
                  <Icon
                    name={props.selectedMember[type as keyof typeof props.selectedMember] ? 'edit' : 'plus-alt'}
                    className={cn(
                      'w-[16px] h-[16px] text-black',
                      props.selectedMember[type as keyof typeof props.selectedMember] && 'w-3 h-3 text-black/50',
                    )}
                  />
                </div>
              </>
              {/*)}*/}
            </div>

            <div className="text-sm">{type}</div>
          </div>
        );
      }
    }

    if (type !== 'edit') {
      return (
        <div className="flex flex-col items-center cursor-pointer">
          <a
            href={
              type === 'email'
                ? `mailto:${props.selectedMember.email}`
                : type === 'text'
                  ? `sms:${props.selectedMember.phone}`
                  : `tel:${props.selectedMember.phone}`
            }
            className="flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full bg-lime-200/15"
            // style={{
            //   backgroundColor:
            //     type === "green"
            //       ? "rgb(214 254 80 / 0.8)"
            //       : "rgba(255,255,255,0.1)",
            // }}
          >
            <div className="text-sm text-white">
              {type === 'text' && <Icon name="chat-bubble" className="h-[20px] w-[20px] text-white/80" />}

              {type === 'call' && <Icon name="phone" className="h-[20px] w-[20px] text-white/80" />}

              {type === 'email' && <Icon name="email" className="h-[20px] w-[20px] text-white/80" />}
            </div>
          </a>

          <div className="text-sm">{type}</div>
        </div>
      );
    }
  };

  const renderProfileDetails = (member: CallSheetMemberType | MemberType) => {
    if (!member) return;

    const parsedPhone = !!member?.phone ? parsePhoneNumber(member.phone as string, 'US')?.formatNational() : null;

    if ('call_sheet' in member) {
      return (
        <>
          <div className="flex justify-center w-full max-w-[430px] py-0 px-5 gap-4">
            {member.phone && props.contactInfoVisible && renderBubble('text')}
            {member.phone && props.contactInfoVisible && renderBubble('call')}
            {member.email && props.contactInfoVisible && renderBubble('email')}
          </div>

          {member.phone && (
            <div className="flex justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15">
              <a href={props.contactInfoVisible ? `tel:${member.phone}` : undefined}>
                <div>phone</div>
                <div className="text-lime-300">{props.contactInfoVisible ? parsedPhone : '--'}</div>
              </a>
            </div>
          )}

          {member.email && (
            <div className="flex justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15">
              <a href={props.contactInfoVisible ? `mailto:${member.email}` : undefined}>
                <div>email</div>
                <div className="text-lime-300">{props.contactInfoVisible ? member.email : '--'}</div>
              </a>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div className="flex justify-center w-full max-w-[430px] py-0 px-5 gap-4">
          {renderBubble('imdb')}
          {renderBubble('instagram')}
          {renderBubble('youtube')}
          {renderBubble('vimeo')}

          {renderBubble('edit')}
        </div>

        {isMemberType(member) && (
          <>
            <div
              className="flex flex-col justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15"
              // onBlur={() => handleUpdate("phone", newPhone)}
            >
              <div>phone</div>
              <Editable
                className="text-lime-300 pl-0 pt-0 w-full"
                type="tel"
                onChange={(v) => handleUpdate('phone', v)}
                value={props.selectedMember.phone ?? props.member.phone ?? '--'}
              />
            </div>

            <div
              className="flex flex-col justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15"
              // onBlur={() => handleUpdate("phone", newPhone)}
            >
              <div>email</div>
              <Editable
                className="text-lime-300 pl-0 pt-0 w-full"
                type="text"
                onChange={(v) => handleUpdate('email', v)}
                value={props.selectedMember.email ?? props.member.email ?? '--'}
              />
            </div>
          </>
        )}

        {!isMemberType(member) && (
          <div className="flex justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15">
            <a href={`tel:${(member as CallSheetMemberType).phone}`}>
              <div>phone</div>
              <div className="text-lime-300">{parsedPhone ?? '--'}</div>
            </a>
          </div>
        )}

        {!isMemberType(member) && (
          <div className="flex justify-between w-full max-w-[430px] py-2 px-5 rounded-xl bg-lime-200/15">
            <a href={`mailto:${(member as CallSheetMemberType).email}`}>
              <div>email</div>
              <div className="text-lime-300">{(member as CallSheetMemberType).email ?? '--'}</div>
            </a>
          </div>
        )}
      </>
    );
  };

  const handleAvatarUpload = async (e: any) => {
    if (!e.target.files || e.target.files.length === 0) {
      alert('Please select a file.');
      return;
    }

    const file = e.target.files[0];

    //-- validate file.
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File cannot be over 10MB. Please try again.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type is not allowed. Please try again.');
      return;
    }

    //-- set selected file and open crop modal.
    setSelectedFile(file);
    setAvatarCropModalOpen(true);
  };

  const handleCroppedAvatarUpload = async (croppedFile: File) => {
    setIsLoading(true);

    //-- this is passed to our modal and triggers onCropComplete.
    try {
      //-- check for an existing avatar/s...
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('avatars')
        .list(props.selectedMember.id, {
          limit: 1,
          offset: 0,
        });

      if (listError) {
        console.error('Error listing existing files:', listError);
        toast.error('Something went wrong checking for existing avatars. Please try again.');

        setIsLoading(false);
        setSelectedFile(null);

        return;
      }

      //-- ...and delete it/them if they exist.
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((file) => `${props.selectedMember.id}/${file.name}`);
        const { error: deleteError } = await supabase.storage.from('avatars').remove(filesToDelete);

        if (deleteError) {
          console.error('Error deleting existing avatar:', deleteError);
          toast.error('Something went wrong removing existing avatar. Please try again.');

          setIsLoading(false);
          setSelectedFile(null);

          return;
        }
      }

      //-- get file extension, create file name, and upload the cropped file to the avatars bucket.
      const fileExtension = croppedFile.name.split('.').pop();
      const fileName = `${props.selectedMember.id}/${Date.now()}.${fileExtension}`;

      const { error: avatarUploadError } = await supabase.storage.from('avatars').upload(fileName, croppedFile, {
        contentType: croppedFile.type,
        cacheControl: '3600',
        upsert: true,
      });

      if (avatarUploadError) {
        console.error('Storage upload error:', avatarUploadError);
        toast.error(`Something went wrong uploading the avatar. Please try again.`);

        setIsLoading(false);
        setSelectedFile(null);

        return;
      }

      //-- create signed url.
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); //-- 1 year expiry.

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        toast.error('Something went wrong creating a signed URL. Please try again.');

        setIsLoading(false);
        setSelectedFile(null);

        return;
      }

      //-- update member record with new avatar url.
      const { error } = await supabase
        .from('member')
        .update({ avatar: signedUrl.signedUrl })
        .eq('id', props.selectedMember.id);

      if (error) {
        console.error('Error:', error);
        toast.error('Something went wrong uploading the avatar. Please try again.');

        setIsLoading(false);
      } else {
        toast.success('Avatar uploaded successfully.');
        props.setRefreshKey((p) => p + 1);
      }
    } catch (err) {
      console.error('Unexpected upload error:', err);
      toast.error('Something went wrong uploading the avatar. Please try again.');

      setIsLoading(false);
      setSelectedFile(null);
    }

    setIsLoading(false);
    setSelectedFile(null);
  };

  return (
    <div className="flex justify-center items-center">
      <Card className="flex flex-col w-full max-w-[430px] gap-6 p-5 relative top-[-9px] overflow-y-auto bg-dashboard-mobile-gradient">
        <div className="flex justify-center pt-14">
          <div className="w-full flex flex-col gap-6 justify-center items-center">
            {isMemberType(props?.selectedMember) && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="z-10 group absolute top-[85px] right-[155px] flex justify-center items-center w-[25px] h-[25px] rounded-full bg-lime-300/80 cursor-pointer hover:bg-lime-300/100"
                >
                  <Icon
                    name={props?.selectedMember?.avatar ? 'edit' : 'plusAlt'}
                    className={cn('w-3 h-3 text-black/50', !props?.selectedMember?.avatar && 'w-5 h-5')}
                  />
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </>
            )}

            <Avatar className="group w-32 h-32 rounded-full">
              {isLoading ? (
                <div className="flex items-center justify-center w-32 h-32 rounded-full border border-zinc-800/75">
                  <LoadingIndicator size="medium" />
                </div>
              ) : (
                <>
                  {props?.selectedMember && (
                    <AvatarImage
                      src={props?.selectedMember?.avatar ? props.selectedMember.avatar : undefined}
                      alt="Avatar"
                      onError={(e) => {
                        //-- if image fails to load.
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </>
              )}

              {!props.selectedMember ||
                (!props.selectedMember.avatar && !isLoading && (
                  <AvatarFallback
                    onClick={(e) => {
                      if (isMemberType(props?.selectedMember)) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      'flex items-center justify-center w-32 h-32',
                      isMemberType(props?.selectedMember) && 'cursor-pointer',
                    )}
                  >
                    <span className="text-[98px] font-medium leading-none">{initials?.[0] || '--'}</span>
                  </AvatarFallback>
                ))}
            </Avatar>

            {isMemberType(props?.selectedMember) ? (
              <div className="flex flex-col justify-center items-center w-full gap-1">
                <div className="w-full">
                  <Editable
                    className="flex items-center justify-center w-full text-stone-300/80 text-[13px] font-bold leading-[1] tracking-[1]"
                    type="text"
                    onChange={(v) => handleUpdate('department', v)}
                    value={
                      props?.selectedMember?.department
                        ? props?.selectedMember?.department?.toUpperCase()
                        : props.member?.department
                          ? props?.member?.department?.toUpperCase()
                          : '--'
                    }
                  />
                </div>

                <div className="w-full">
                  <Editable
                    className="flex items-center justify-center w-full h-[55px] text-white text-[34px] font-bold leading-[1]"
                    type="text"
                    onChange={(v) => handleUpdate('name', v)}
                    value={
                      props?.selectedMember?.name
                        ? capitalizeString(props.selectedMember.name)
                        : props.member?.name
                          ? capitalizeString(props.member.name)
                          : '--'
                    }
                  />
                </div>

                <div className="w-full">
                  <Editable
                    className="flex items-center justify-center w-full text-white text-[17px] font-medium leading-[1]"
                    type="text"
                    onChange={(v) => handleUpdate('title', v)}
                    value={
                      props?.selectedMember?.title
                        ? capitalizeString(props.selectedMember.title)
                        : props.member?.title
                          ? capitalizeString(props.member.title)
                          : '--'
                    }
                  />
                </div>

                {props.selectedMember && (props.selectedMember.city || props.selectedMember.state) && (
                  <div className="flex text-white/60 text-[17px] font-medium leading-[1] gap-1 pt-2">
                    <Icon name="pin" className="h-[20px] w-[20px] text-white/60" />

                    {props.selectedMember.city && props.selectedMember.state ? (
                      <>
                        {`${capitalizeString(
                          props.selectedMember.city,
                        )}, ${capitalizeString(props.selectedMember.state)}`}
                      </>
                    ) : props.selectedMember.city ? (
                      capitalizeString(props.selectedMember.city)
                    ) : props.selectedMember.state ? (
                      capitalizeString(props.selectedMember.state)
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center gap-3">
                <div className="text-stone-300/80 text-[13px] font-bold leading-[1] tracking-[1px]">
                  {props?.selectedMember?.department ? props.selectedMember.department.toUpperCase() : '--'}
                </div>

                <div className="text-white text-[34px] font-bold leading-[1]">
                  {props?.selectedMember?.name && capitalizeString(props.selectedMember?.name || '')}
                </div>

                <div className="text-white text-[17px] font-medium leading-[1]">
                  {props?.selectedMember?.title && capitalizeString(props.selectedMember.title)}
                </div>
              </div>
            )}
          </div>
        </div>

        {props?.selectedMember && renderProfileDetails(props.selectedMember)}

        {props?.selectedMember && renderSocials(props.selectedMember)}

        {props?.selectedMember && props?.selectedMember.created_at && (
          <div className="opacity-40 text-white text-xs text-center font-medium pt-8 pb-2">
            <div className="tracking-[1px] font-medium text-[12px] mb-2">ON ROSTER SINCE</div>

            <div className="font-bold text-[24px]">{format(props?.selectedMember.created_at, 'MMM yyyy')}</div>
          </div>
        )}
      </Card>

      {isMemberType(props?.selectedMember) && editSocialsModalOpen && (
        <EditSocialsModal
          member={props?.selectedMember}
          editSocialsModalOpen={editSocialsModalOpen}
          setEditSocialsModalOpen={setEditSocialsModalOpen}
          setRefreshKey={props.setRefreshKey}
        />
      )}

      <ImageCropModal
        isOpen={avatarCropModalOpen}
        onClose={() => setAvatarCropModalOpen(false)}
        file={selectedFile}
        onCropComplete={handleCroppedAvatarUpload}
      />
    </div>
  );
};
