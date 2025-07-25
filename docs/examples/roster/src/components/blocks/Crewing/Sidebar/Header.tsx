export const Header = ({ position }: { position: string; }) => (
  <div className="flex flex-col gap-2">
    <div className="text-white text-opacity-50 text-sm font-bold uppercase leading-3 tracking-wide">
      Crewing up
    </div>
    <div className="text-white text-4xl">{position}</div>
  </div>
);
