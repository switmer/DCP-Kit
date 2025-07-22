import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <Icon name="logo-full" className="w-[300px] h-[100px] mb-6" />

      <h1 className="text-4xl font-light text-lime-300 mb-4">
        404 - Page Not Found
      </h1>

      <p className="text-xl text-gray-600 mb-10">Oops! Something went wrong.</p>

      <a
        href="/"
        className="px-6 py-3 bg-lime-300 font-medium text-black/70 rounded-md hover:bg-lime-300/80 transition"
      >
        Return to Home
      </a>
    </div>
  );
}
