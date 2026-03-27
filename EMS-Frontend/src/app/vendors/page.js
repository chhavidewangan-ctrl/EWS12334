'use client';

// Redirect page for ERP routes
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ERPRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/clients'); }, [router]);
  return null;
}
