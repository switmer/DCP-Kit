import { toast } from "sonner";

type Props = {
  setSelectedFile: any;
  setLogoCropModalOpen: (bool: boolean) => void;
};

export const handleLogoUpload = async (e: any, props: Props) => {
  if (!e.target.files || e.target.files.length === 0) {
    alert("Please select a file.");

    return;
  }

  const file = e.target.files[0];

  //-- validate file.
  if (file.size > 10 * 1024 * 1024) {
    toast.error("File cannot be over 10MB. Please try again.");

    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg",
  ];

  if (!allowedTypes.includes(file.type)) {
    toast.error("File type is not allowed. Please try again.");

    return;
  }

  props.setSelectedFile(file);
  props.setLogoCropModalOpen(true);
};
