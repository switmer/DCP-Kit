import { useCompanyStore } from "@/store/company";
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
import { Tab } from "@/components/ui/Tab";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

export const UserInviteDialog: React.FC<{
  open: boolean;
  close: () => void;
}> = ({ open, close }) => {
  const [sending, setSending] = useState(false);
  const { activeCompany } = useCompanyStore();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const handleEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const lastChar = input.slice(-1);

    if (lastChar === " " || lastChar === ",") {
      const trimmedEmails = input
        .split(/[,\s]+/)
        .filter(Boolean)
        .join(", ");
      setEmails(trimmedEmails + (lastChar === " " ? ", " : ""));
    } else {
      setEmails(input);
    }
  };

  const onClose = () => {
    setEmails("");
    setRole("user");
    close();
  };

  const handleInvite = async () => {
    if (!emails) return;

    setSending(true);

    const emailsToInvite = emails.split(",").map((email) => email.trim());

    for (const email of emailsToInvite) {
      try {
        await axios.post("/settings/users/invite", {
          email,
          role,
          company: activeCompany,
        });

        toast.success(`Invitation sent to ${email}`);
      } catch {
        toast.error(`Failed to send invitation to ${email}`);
      }
    }

    onClose();
    setSending(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <DialogContentPortless
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Invite workspace users</DialogTitle>
        </DialogHeader>

        <div className="px-8 py-4 flex flex-col gap-5">
          <Label className="flex flex-col gap-3">
            Emails
            <input
              onChange={handleEmailInput}
              className="flex font-base items-center w-full h-[44px] px-4 rounded-lg focus:border-lime-300 bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              placeholder="jane@example.com, joe@example.com..."
              value={emails}
            />
          </Label>
          <Label className="flex flex-col gap-3">
            Role
            <Tab
              className="w-full bg-[#151515] [&>*]:flex-1"
              options={["user", "admin"]}
              selected={role}
              setSelected={(p) => {
                setRole(p as "user" | "admin");
              }}
              defaultWidth={195.5}
            />
          </Label>
        </div>

        <DialogFooter>
          <Button
            className="px-6 h-10 text-sm font-semibold"
            variant="outline"
            size="compact"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-10 text-sm font-semibold gap-1 min-w-[62px] disabled:opacity-50 disabled:cursor-not-allowed"
            variant={"accent"}
            onClick={handleInvite}
            disabled={sending}
          >
            <Icon name="send" className="w-5 h-5" />
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContentPortless>
    </Dialog>
  );
};
