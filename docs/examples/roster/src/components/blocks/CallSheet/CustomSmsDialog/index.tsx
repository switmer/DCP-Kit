import { AlertDialog } from "@/components/ui/AlertDialog";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContentPortless,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/Label";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Textarea } from "@/components/ui/Textarea";
import { Database } from "@/types/supabase";
import { CallSheetMemberType } from "@/types/type";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

export const CustomSmsDialog: React.FC<{
  open: boolean;
  close: () => void;
  checked: string[];
  members: CallSheetMemberType[];
  onSend: () => void;
}> = ({ open, close, checked, members, onSend }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMessage("");
  }, [open]);

  const title = useMemo(() => {
    if (checked.length === 1) {
      const member = members.find((m) => m.id === checked[0]);
      return `Message ${member?.name}`;
    }

    return "Send crew broadcast";
  }, [checked, members]);

  const body = useMemo(() => {
    if (checked.length === 1) {
      const member = members.find((m) => m.id === checked[0]);

      if (!member || !member.phone) return <></>;

      const words = member?.name?.split(" ") ?? "";

      let initials = "";

      for (const word of words) {
        if (word.length > 0 && initials.length < 2) {
          initials += word[0]?.toUpperCase();
        }
      }

      let phone;

      try {
        const parsedPhone = parsePhoneNumber(member?.phone, "US");

        phone = parsedPhone?.formatNational();
      } catch {
        phone = member?.phone;
      }

      return (
        <div className="flex items-center gap-2">
          <Avatar className="w-[36px] h-[36px] bg-white bg-opacity-10 rounded-full">
            <AvatarFallback className="w-[36px] h-[36px] bg-white flex items-center justify-center">
              <span className="text-white text-base font-medium leading-none">
                {initials}
              </span>
            </AvatarFallback>
          </Avatar>
          <div className="text-white text-[22px] font-bold">{phone}</div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Icon name="send" className="text-accent w-[18px] h-[18px]" />
        <div className="text-white text-[22px] font-bold">
          {checked.length} selected crew
        </div>
      </div>
    );
  }, [checked, members]);

  const send = async (ids: string[]) => {
    setLoading(true);
    await axios
      .post("/sms/call-card/bulk/custom", {
        ids,
        message,
      })
      .then(() => {
        const msg =
          ids.length === 1
            ? `Messaged ${
                members.find((m) => m.id === checked[0])?.name ??
                "1 selected crew"
              }`
            : `Sent crew broadcast to ${ids.length} selected crew.`;
        toast.success(msg, {
          icon: <Icon name="checkmark" className="w-6 h-6 text-lime-300" />,
        });
        setLoading(false);
        onSend();
      })
      .catch(() => {
        toast.error("Something went wrong.");
        setLoading(false);
      });
  };

  const charCounter = useMemo(() => {
    const charactersLeft = 275 - message.length;
    return charactersLeft >= 0 ? charactersLeft : 0;
  }, [message]);

  if (!isMounted) {
    return <></>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          close();
        }
      }}
    >
      <DialogContentPortless
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="px-8 py-4 flex flex-col gap-5">
          {body}

          <Label className="flex flex-col gap-3">
            Message body
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
              maxLength={275}
            />
            <p className="text-neutral-400 text-sm font-normal -mt-1.5">
              {charCounter} character{charCounter !== 1 && "s"} left
            </p>
          </Label>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2">
          <Button
            className="h-10 text-xs w-[62px] hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            variant={"outline"}
            onClick={() => close()}
          >
            {!loading ? "Cancel" : <LoadingIndicator dark size="small" />}
          </Button>

          <AlertDialog
            withPortal
            onConfirm={() => send(checked)}
            title={title}
            description="This cannot be undone. Make sure the information you’re sending is correct."
            actionLabel={title}
          >
            <Button
              className="h-10 text-xs min-w-[62px] disabled:opacity-50 disabled:cursor-not-allowed"
              variant={"accent"}
              disabled={!message.length}
            >
              {!loading ? "Send" : <LoadingIndicator dark size="small" />}
            </Button>
          </AlertDialog>
        </DialogFooter>
      </DialogContentPortless>
    </Dialog>
  );
};
