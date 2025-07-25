import { Nav } from ".";
import { ProjectNav } from "./ProjectNav";
import React from "react";

export const NavLayout = ({
  children,
  project,
}: {
  children: React.ReactNode;
  project?: string | null;
}) => {
  return (
    <div className="flex flex-col flex-1 min-w-screen min-h-screen pl-[85px] max-sm:px-0 max-sm:bg-dashboard-empty-gradient">
      <div className="block max-sm:hidden">
        {project ? <ProjectNav project={project} /> : <Nav />}
      </div>

      <div className="block [@media(min-width:601px)]:hidden">
        <Nav />
      </div>

      {children}
    </div>
  );
};
