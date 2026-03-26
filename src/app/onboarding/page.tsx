import { OnboardingWizard } from '@/components/features/onboarding/OnboardingWizard'

export const metadata = { title: 'Get started — View1 Studio' }

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-10 text-center">
        <span className="text-2xl font-bold tracking-tight text-white">View1 Studio</span>
      </div>
      <OnboardingWizard />
    </main>
  )
}
