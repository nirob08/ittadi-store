import { Suspense } from 'react';
import ProductDetails from '@/app/components/product-details';

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading product…</main>}>
      {params.then(({ id }) => <ProductDetails key={id} productId={id} />)}
    </Suspense>
  );
}
