import { lazy, Suspense } from "react";
export default function dynamic(load: any) {
  const C = lazy(() => load().then((m: any) => ({ default: m.default ?? m })));
  return (props: any) => (
    <Suspense fallback={null}>
      <C {...props} />
    </Suspense>
  );
}
