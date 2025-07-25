export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative max-w-[1728px] min-h-screen w-full mx-auto px-4 py-6 sm:p-12">
      {children}
    </main>
  );
}
