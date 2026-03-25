import { redirect } from 'next/navigation';

export default async function Home() {
  // For prototype: always redirect to test login
  redirect('/test-login');
}
