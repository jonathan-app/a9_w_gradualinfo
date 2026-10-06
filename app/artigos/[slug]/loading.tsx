import { Skeleton } from '@/components/ui/skeleton';

export default function ArticleLoading() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl animate-pulse">
      <header className="mb-8 flex flex-col items-start gap-4">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-12 md:h-14 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </header>

      <Skeleton className="w-full aspect-video rounded-card mb-12" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-full rounded-md" />
        <Skeleton className="h-6 w-[90%] rounded-md" />
        <Skeleton className="h-6 w-full rounded-md" />
        <Skeleton className="h-6 w-[80%] rounded-md" />
        <Skeleton className="h-6 w-full rounded-md" />
        <br />
        <Skeleton className="h-6 w-[85%] rounded-md" />
        <Skeleton className="h-6 w-full rounded-md" />
        <Skeleton className="h-6 w-full rounded-md" />
      </div>
    </main>
  );
}
