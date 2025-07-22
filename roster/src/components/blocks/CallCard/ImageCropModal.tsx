import 'cropperjs/dist/cropper.css';

import { FC, useEffect, useRef, useState } from 'react';
import { Cropper, ReactCropperElement } from 'react-cropper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

type ImageCropModalProps = {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onCropComplete: (croppedFile: File) => void;
  options?: {
    aspectRatio?: number; //-- aspect ratio (width/height).
    width?: number; //-- container width.
    height?: number; //-- container height.
    freeform?: boolean; //-- allow free-form cropping (no aspect ratio constraint).
    minWidth?: number; //-- minimum width constraint.
    minHeight?: number; //-- minimum height constraint.
  };
};

export const ImageCropModal: FC<ImageCropModalProps> = (props) => {
  const [imageSource, setImageSource] = useState<string | null>(null);

  const cropperRef = useRef<ReactCropperElement>(null);

  //-- default options.
  const {
    aspectRatio = 1,
    width = 463,
    height = 463,
    freeform = false,
    minWidth = 100,
    minHeight = 100,
  } = props.options || {};

  useEffect(() => {
    if (props.file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        setImageSource(e.target?.result as string);
      };
      reader.readAsDataURL(props.file);
    }
  }, [props.file]);

  //-- convert file to data url for image preview.
  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;

    if (cropper) {
      // Get the cropped image as a base64 string
      const croppedImageData = cropper.getCroppedCanvas().toDataURL(props.file?.type || 'image/jpeg');

      //-- convert base64 to Blob
      const byteCharacters = atob(croppedImageData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: props.file?.type || 'image/jpeg',
      });

      //-- create file from blob.
      const croppedFile = new File([blob], props.file?.name || 'avatar.jpg', {
        type: props.file?.type || 'image/jpeg',
      });

      props.onCropComplete(croppedFile);
      props.onClose();
    }
  };

  //-- return null if there's no file.
  if (!props.file) return null;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="w-auto max-w-full h-[620px] max-h-[650px] p-0 gap-0 max-sm:w-[350px]">
        <DialogHeader className="w-[463px]">
          <DialogTitle>Crop Your Image</DialogTitle>
          <DialogDescription>Adjust the crop to select the best part of your image</DialogDescription>
        </DialogHeader>

        {imageSource && (
          <div className={`flex items-center justify-center w-[${width}px] h-[${height}px] overflow-hidden`}>
            <Cropper
              className="object-contain w-full h-full"
              src={imageSource}
              style={{
                width: '100%',
                height: '100%',
              }}
              initialAspectRatio={aspectRatio}
              aspectRatio={freeform ? undefined : aspectRatio}
              viewMode={1}
              guides
              responsive={true}
              minCropBoxWidth={minWidth}
              minCropBoxHeight={minHeight}
              ref={cropperRef}
            />
          </div>
        )}

        <DialogFooter className="flex items-center w-[463px] h-[65px] p-0 pr-2">
          <DialogClose asChild>
            <Button className="h-[45px] text-sm font-bold gap-2 px-3 hover:bg-white/10" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button className="h-[45px] text-sm font-bold gap-2 px-5" variant="accent" onClick={handleCrop}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
