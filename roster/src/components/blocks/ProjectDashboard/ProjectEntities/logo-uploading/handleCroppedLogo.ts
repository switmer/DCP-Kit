type Props = {
  croppedFile: any;
  setTempLogoFile: (newLogoFile: File | null) => void;
  setTempLogoPreviewUrl: (newLogoFile: string) => void;
  setNewEntityInfo: ({}) => void;
  setLogoCropModalOpen: (bool: boolean) => void;
};

export const handleCroppedLogo = (props: Props) => {
  //-- create a temporary object url for preview.
  const objectUrl = URL.createObjectURL(props.croppedFile);

  //-- store both the file and preview url.
  props.setTempLogoFile(props.croppedFile);
  props.setTempLogoPreviewUrl(objectUrl);

  //-- update the entity info to use this temporary url.
  props.setNewEntityInfo((p: any) => ({
    ...p,
    logo: objectUrl,
    //-- flag to indicate this is a temporary url.
    logoIsTemp: true,
  }));

  props.setLogoCropModalOpen(false);
};
