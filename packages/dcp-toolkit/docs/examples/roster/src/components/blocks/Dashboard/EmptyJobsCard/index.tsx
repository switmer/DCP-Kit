import { Icon } from "@/components/ui/Icon";
import { UploadButton } from "@/components/ui/Upload";
import { Button } from "@/components/ui/Button";
import { AddProject } from "@/components/blocks/Dashboard/AddProject";
import { FC } from "react";

type Props = {
  isOpen: boolean;
  setOpenCallback: (isOpen: boolean) => void;
  onUpdate?: () => void;
  upcoming?: boolean;
  past?: boolean;
  archived?: boolean;
};

export const EmptyJobsCard: FC<Props> = (props) => {
  if (props.archived) {
    return (
      <>
        <div className="flex flex-col gap-4 items-center justify-center py-16 bg-dashboard-empty-gradient backdrop-blur-md rounded-2xl max-sm:px-2 max-sm:py-10 max-sm:mb-[100px]">
          <Icon name="calendar" className="w-10 h-10 text-lime-300" />

          <div className="flex-col justify-center items-center gap-2 flex px-6">
            <div className="text-center text-white text-xl font-bold leading-normal">
              You don&apos;t have any archived{" "}
              <br className="hidden max-sm:block" />
              jobs yet.
            </div>

            <div className="text-center text-white text-opacity-75 text-sm font-normal leading-tight max-sm:leading-snug">
              Jobs that have been archived will be displayed here. Certain call
              sheet features have been disabled for these jobs.
            </div>
          </div>
        </div>
      </>
    );
  }

  if (props.past) {
    return (
      <>
        <div className="flex flex-col gap-4 items-center justify-center py-16 bg-dashboard-empty-gradient backdrop-blur-md rounded-2xl max-sm:px-3 max-sm:py-10 max-sm:mb-[100px]">
          <Icon name="calendar" className="w-10 h-10 text-lime-300" />

          <div className="flex-col justify-center items-center gap-2 flex px-6">
            <div className="text-center text-white text-xl font-bold leading-normal">
              You don&apos;t have any past{" "}
              <br className="hidden max-sm:block" />
              jobs yet.
            </div>

            <div className="text-center text-white text-opacity-75 text-sm font-normal leading-tight">
              Jobs that have aged past their shoot date/s will automatically be
              displayed here as historical records.
            </div>
          </div>
        </div>
      </>
    );
  }

  if (props.upcoming) {
    return (
      <>
        <div className="bg-dashboard-empty-gradient rounded-2xl flex flex-col gap-4 items-center justify-center py-16 backdrop-blur-md max-sm:px-3 max-sm:py-10 max-sm:mb-[100px]">
          <Icon name="calendar" className="w-10 h-10 text-lime-300" />

          <div className="flex-col justify-start items-center gap-2 flex">
            <div className="text-white text-xl font-bold leading-normal">
              All your jobs in one place
            </div>

            <div className="text-center text-white text-opacity-75 text-sm font-normal leading-tight">
              Track all your crew & call sheet logistics in one place.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UploadButton />

            <Button
              variant="outlineAccent"
              className="px-8 flex-1 hover:bg-lime-300 hover:bg-opacity-5 duration-100 max-sm:px-3"
              onClick={() => props.setOpenCallback(true)}
            >
              + Add new project
            </Button>
          </div>
        </div>

        <AddProject
          open={props.isOpen}
          close={() => props.setOpenCallback(false)}
          onUpdate={props.onUpdate}
        />
      </>
    );
  }
};
