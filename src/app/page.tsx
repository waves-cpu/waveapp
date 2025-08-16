import Dashboard from './components/dashboard';
import { AppLayout } from './components/app-layout';

export default function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}
