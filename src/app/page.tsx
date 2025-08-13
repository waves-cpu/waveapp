import { LanguageProvider } from '@/hooks/use-language';
import Dashboard from './components/dashboard';
import { ThemeProvider } from './components/theme-provider';

export default function Home() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <Dashboard />
      </LanguageProvider>
    </ThemeProvider>
  );
}
