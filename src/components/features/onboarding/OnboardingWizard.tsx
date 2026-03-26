'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { toastError } from '@/components/common/Toast'
import { createClient } from '@/lib/supabase/client'
import { WelcomeStep } from './WelcomeStep'
import { SpecialtyStep } from './SpecialtyStep'
import { PlanStep } from './PlanStep'
import { FirstProjectStep } from './FirstProjectStep'
import type { WelcomeData } from './WelcomeStep'
import type { SpecialtyData } from './SpecialtyStep'
import type { PlanData } from './PlanStep'
import type { FirstProjectData } from './FirstProjectStep'

type StepErrors<T> = Partial<Record<keyof T, string>>

interface OnboardingState {
  welcome: WelcomeData
  specialty: SpecialtyData
  plan: PlanData
  firstProject: FirstProjectData
}

const STEP_COUNT = 4

const STEP_LABELS = ['Welcome', 'Specialty', 'Plan', 'First Project']

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [submitting, setSubmitting] = useState(false)

  const [data, setData] = useState<OnboardingState>({
    welcome: { displayName: '', businessName: '' },
    specialty: { specialty: '' },
    plan: { plan: 'free' },
    firstProject: { projectName: '', projectPreset: 'blank' },
  })

  const [errors, setErrors] = useState<{
    welcome: StepErrors<WelcomeData>
    specialty: StepErrors<SpecialtyData>
    plan: StepErrors<PlanData>
    firstProject: StepErrors<FirstProjectData>
  }>({ welcome: {}, specialty: {}, plan: {}, firstProject: {} })

  function updateWelcome(patch: Partial<WelcomeData>) {
    setData((prev) => ({ ...prev, welcome: { ...prev.welcome, ...patch } }))
  }
  function updateSpecialty(patch: Partial<SpecialtyData>) {
    setData((prev) => ({ ...prev, specialty: { ...prev.specialty, ...patch } }))
  }
  function updatePlan(patch: Partial<PlanData>) {
    setData((prev) => ({ ...prev, plan: { ...prev.plan, ...patch } }))
  }
  function updateFirstProject(patch: Partial<FirstProjectData>) {
    setData((prev) => ({ ...prev, firstProject: { ...prev.firstProject, ...patch } }))
  }

  const validateStep = useCallback(
    (s: number): boolean => {
      if (s === 1) {
        const errs: StepErrors<WelcomeData> = {}
        if (!data.welcome.displayName.trim()) errs.displayName = 'Name is required'
        if (!data.welcome.businessName.trim()) errs.businessName = 'Business name is required'
        setErrors((prev) => ({ ...prev, welcome: errs }))
        return Object.keys(errs).length === 0
      }
      if (s === 2) {
        const errs: StepErrors<SpecialtyData> = {}
        if (!data.specialty.specialty) errs.specialty = 'Please select a specialty'
        setErrors((prev) => ({ ...prev, specialty: errs }))
        return Object.keys(errs).length === 0
      }
      if (s === 3) {
        // Plan always has a default — always valid
        return true
      }
      if (s === 4) {
        const errs: StepErrors<FirstProjectData> = {}
        if (!data.firstProject.projectName.trim()) errs.projectName = 'Project name is required'
        setErrors((prev) => ({ ...prev, firstProject: errs }))
        return Object.keys(errs).length === 0
      }
      return true
    },
    [data]
  )

  function navigate(toStep: number) {
    if (animating) return
    setDirection(toStep > step ? 'forward' : 'back')
    setAnimating(true)
    setTimeout(() => {
      setStep(toStep)
      setAnimating(false)
    }, 200)
  }

  function handleNext() {
    if (!validateStep(step)) return
    if (step < STEP_COUNT) {
      navigate(step + 1)
    } else {
      handleFinish()
    }
  }

  function handleBack() {
    if (step > 1) navigate(step - 1)
  }

  async function handleFinish() {
    if (!validateStep(STEP_COUNT)) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // 1. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: data.welcome.displayName.trim(),
          onboarded: true,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Create workspace
      const slug = data.welcome.businessName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ owner_id: user.id, name: data.welcome.businessName.trim(), slug })
        .select('id')
        .single()

      if (workspaceError) throw workspaceError

      // 3. Create workspace membership (owner)
      await supabase.from('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      })

      // 4. Create first project
      const { error: projectError } = await supabase.from('projects').insert({
        workspace_id: workspace.id,
        name: data.firstProject.projectName.trim(),
        preset: data.firstProject.projectPreset,
        status: 'active',
        gallery_public: false,
        gallery_theme: 'dark',
        pricing_model: 'free',
        currency: 'usd',
      })

      if (projectError) throw projectError

      router.push('/dashboard')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercent = (step / STEP_COUNT) * 100

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress bar */}
      <div className="mb-8 space-y-3">
        <div className="flex justify-between text-xs text-muted">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={clsx('transition-colors', i + 1 <= step ? 'text-white' : 'text-muted')}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="h-1 w-full rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
          />
        </div>
      </div>

      {/* Step content */}
      <div
        className={clsx(
          'transition-all duration-200',
          animating
            ? direction === 'forward'
              ? 'opacity-0 translate-x-4'
              : 'opacity-0 -translate-x-4'
            : 'opacity-100 translate-x-0'
        )}
      >
        {step === 1 && (
          <WelcomeStep data={data.welcome} errors={errors.welcome} onChange={updateWelcome} />
        )}
        {step === 2 && (
          <SpecialtyStep
            data={data.specialty}
            errors={errors.specialty}
            onChange={updateSpecialty}
          />
        )}
        {step === 3 && (
          <PlanStep data={data.plan} errors={errors.plan} onChange={updatePlan} />
        )}
        {step === 4 && (
          <FirstProjectStep
            data={data.firstProject}
            errors={errors.firstProject}
            onChange={updateFirstProject}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <div>
          {step > 1 && (
            <Button variant="ghost" size="md" onClick={handleBack} disabled={submitting}>
              <ChevronLeft size={16} />
              Back
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          loading={submitting}
        >
          {step === STEP_COUNT ? 'Launch my workspace' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
