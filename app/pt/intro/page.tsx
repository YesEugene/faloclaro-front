import { Suspense } from 'react';
import IntroClient from './IntroClient';

export default function IntroPage() {
  return (
    <Suspense fallback={null}>
      <IntroClient />
    </Suspense>
  );
}


