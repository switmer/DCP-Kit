import { SignInSegment } from "@/lib/sign-in-context";

export const Segment: React.FC<{
  segments: SignInSegment[];
  setSegment: (segment: SignInSegment) => void;
  value: SignInSegment;
}> = ({ segments, setSegment, value }) => {
  return (
    <div className="h-12 w-full p-1 bg-neutral-900 rounded-lg relative flex justify-between">
      <div
        className={`w-1/2 h-10 bg-zinc-900 rounded-lg absolute left-1 top-1 duration-200 ${
          segments.indexOf(value) === 0 ? "translate-x-0" : "translate-x-[calc(100%-8px)]"
        }`}
      ></div>
      {segments.map((segment, index) => (
        <button
          className="flex-1 flex justify-center items-center z-10"
          key={index}
          onClick={() => setSegment(segment)}
        >
          {segment}
        </button>
      ))}
    </div>
  );
};
