import { toast } from "sonner";
import { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  supabase: SupabaseClient;
  entityId: string;
  tempLogoFile: File | null;
  setIsLoading: (isLoading: boolean) => void;
  tempLogoPreviewUrl: string | null;
  setTempLogoPreviewUrl: (url: string | null) => void;
};

export const uploadLogoToSupabase = async (props: Props) => {
  if (!props.tempLogoFile) {
    return null;
  }

  props.setIsLoading(true);

  const {
    data: { user },
  } = await props.supabase.auth.getUser();

  if (!user) {
    toast.error("Current user not found. Please try again.");

    props.setIsLoading(false);

    return null;
  }

  try {
    const fileExtension = props.tempLogoFile.name.split(".").pop();
    const fileName = `${user.id}/${
      props.entityId
    }/${Date.now()}.${fileExtension}`;

    const { data, error: logoUploadError } = await props.supabase.storage
      .from("logos")
      .upload(fileName, props.tempLogoFile, {
        contentType: props.tempLogoFile.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (logoUploadError) {
      console.error("Storage upload error:", logoUploadError);
      toast.error("Error uploading logo. Please try again.");

      props.setIsLoading(false);

      return null;
    }

    //-- create signed url.
    const { data: signedUrl, error: signedUrlError } =
      await props.supabase.storage
        .from("logos")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); //-- 1 year expiry.

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      toast.error("Error creating signed URL. Please try again.");

      props.setIsLoading(false);

      return null;
    }

    props.setIsLoading(false);

    //-- clean up the temporary preview url.
    if (props.tempLogoPreviewUrl) {
      URL.revokeObjectURL(props.tempLogoPreviewUrl);
      props.setTempLogoPreviewUrl(null);
    }

    return signedUrl.signedUrl;
  } catch (err) {
    console.error("Unexpected upload error:", err);
    toast.error("Something went wrong uploading the logo.");

    props.setIsLoading(false);

    return null;
  }
};
