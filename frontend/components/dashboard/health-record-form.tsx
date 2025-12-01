'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, withAuth } from '@/lib/auth-context';
import { healthRecordApi } from '@/lib/api';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import {
  Dna,
  Activity,
  User,
  FileText,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react';

const healthRecordSchema = z.object({
  // Demographics
  age: z.number().min(0).max(120),
  sex: z.enum(['male', 'female', 'other']),
  ethnicity: z.string().optional(),
  familyHistory: z.string().optional(),

  // Symptoms
  symptoms: z.array(z.string()).min(1, 'Please select at least one symptom'),
  medicalHistory: z.string().min(10, 'Please provide medical history'),

  // Gene Expression Data
  geneExpressionData: z.object({
    cd3: z.number().min(0).max(10000),
    cd4: z.number().min(0).max(10000),
    cd8: z.number().min(0).max(10000),
    cd19: z.number().min(0).max(10000),
    cd56: z.number().min(0).max(10000),
    igG: z.number().min(0).max(5000),
    igA: z.number().min(0).max(1000),
    igM: z.number().min(0).max(500),
    ada: z.number().min(0).max(100),
    pnp: z.number().min(0).max(100),
  }),

  // Lab Results (optional)
  labResults: z.object({
    wbc: z.number().optional(),
    lymphocytes: z.number().optional(),
    neutrophils: z.number().optional(),
  }).optional(),
});

type HealthRecordFormData = z.infer<typeof healthRecordSchema>;

const symptomOptions = [
  'Recurrent infections',
  'Chronic diarrhea',
  'Failure to thrive',
  'Skin rashes',
  'Opportunistic infections',
  'Autoimmune manifestations',
  'Lymphadenopathy',
  'Hepatosplenomegaly',
  'Developmental delay',
  'Unexplained fevers',
];

const steps = [
  { id: 1, name: 'Demographics', icon: User },
  { id: 2, name: 'Symptoms', icon: FileText },
  { id: 3, name: 'Gene Expression', icon: Dna },
  { id: 4, name: 'Lab Results', icon: Activity },
  { id: 5, name: 'Review', icon: Check },
];

function HealthRecordForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      symptoms: [],
      geneExpressionData: {
        cd3: 0,
        cd4: 0,
        cd8: 0,
        cd19: 0,
        cd56: 0,
        igG: 0,
        igA: 0,
        igM: 0,
        ada: 0,
        pnp: 0,
      },
    },
  });

  const watchedSymptoms = watch('symptoms');

  const onSubmit = async (data: HealthRecordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await healthRecordApi.create(data);
      if (response.success) {
        router.push('/dashboard/records?created=true');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit health record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                } hidden sm:block`}
              >
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 lg:w-24 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {steps[currentStep - 1].name}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Enter patient demographic information'}
              {currentStep === 2 && 'Select symptoms and provide medical history'}
              {currentStep === 3 && 'Enter gene expression markers from laboratory analysis'}
              {currentStep === 4 && 'Enter additional lab results (optional)'}
              {currentStep === 5 && 'Review all information before submitting'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            {/* Step 1: Demographics */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Age"
                    type="number"
                    {...register('age', { valueAsNumber: true })}
                    error={errors.age?.message}
                  />
                  <Select
                    label="Sex"
                    {...register('sex')}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                    error={errors.sex?.message}
                  />
                </div>
                <Input
                  label="Ethnicity (optional)"
                  {...register('ethnicity')}
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Family History of Immunodeficiency
                  </label>
                  <textarea
                    {...register('familyHistory')}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe any known family history of immunodeficiency conditions..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Symptoms */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select all applicable symptoms
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Controller
                      name="symptoms"
                      control={control}
                      render={({ field }) => (
                        <>
                          {symptomOptions.map((symptom) => (
                            <label
                              key={symptom}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                (field.value || []).includes(symptom)
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={(field.value || []).includes(symptom)}
                                onChange={(e) => {
                                  const currentValue = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValue, symptom]);
                                  } else {
                                    field.onChange(
                                      currentValue.filter((s) => s !== symptom)
                                    );
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{symptom}</span>
                            </label>
                          ))}
                        </>
                      )}
                    />
                  </div>
                  {errors.symptoms && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.symptoms.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Medical History
                  </label>
                  <textarea
                    {...register('medicalHistory')}
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide detailed medical history including previous diagnoses, treatments, hospitalizations..."
                  />
                  {errors.medicalHistory && (
                    <p className="text-sm text-red-600">
                      {errors.medicalHistory.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Gene Expression Data */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Enter the values from your laboratory analysis.
                    Normal ranges are provided as reference.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">T-Cell Markers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="CD3+ (cells/µL)"
                      type="number"
                      {...register('geneExpressionData.cd3', { valueAsNumber: true })}
                      helperText="Normal: 700-2100"
                      error={errors.geneExpressionData?.cd3?.message}
                    />
                    <Input
                      label="CD4+ (cells/µL)"
                      type="number"
                      {...register('geneExpressionData.cd4', { valueAsNumber: true })}
                      helperText="Normal: 500-1500"
                      error={errors.geneExpressionData?.cd4?.message}
                    />
                    <Input
                      label="CD8+ (cells/µL)"
                      type="number"
                      {...register('geneExpressionData.cd8', { valueAsNumber: true })}
                      helperText="Normal: 200-900"
                      error={errors.geneExpressionData?.cd8?.message}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">B-Cell & NK Markers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="CD19+ (cells/µL)"
                      type="number"
                      {...register('geneExpressionData.cd19', { valueAsNumber: true })}
                      helperText="Normal: 100-500"
                      error={errors.geneExpressionData?.cd19?.message}
                    />
                    <Input
                      label="CD56+ NK (cells/µL)"
                      type="number"
                      {...register('geneExpressionData.cd56', { valueAsNumber: true })}
                      helperText="Normal: 90-600"
                      error={errors.geneExpressionData?.cd56?.message}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Immunoglobulins</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="IgG (mg/dL)"
                      type="number"
                      {...register('geneExpressionData.igG', { valueAsNumber: true })}
                      helperText="Normal: 700-1600"
                      error={errors.geneExpressionData?.igG?.message}
                    />
                    <Input
                      label="IgA (mg/dL)"
                      type="number"
                      {...register('geneExpressionData.igA', { valueAsNumber: true })}
                      helperText="Normal: 70-400"
                      error={errors.geneExpressionData?.igA?.message}
                    />
                    <Input
                      label="IgM (mg/dL)"
                      type="number"
                      {...register('geneExpressionData.igM', { valueAsNumber: true })}
                      helperText="Normal: 40-230"
                      error={errors.geneExpressionData?.igM?.message}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Enzyme Levels</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="ADA Activity (nmol/hr/mg)"
                      type="number"
                      {...register('geneExpressionData.ada', { valueAsNumber: true })}
                      helperText="Normal: 15-35"
                      error={errors.geneExpressionData?.ada?.message}
                    />
                    <Input
                      label="PNP Activity (nmol/hr/mg)"
                      type="number"
                      {...register('geneExpressionData.pnp', { valueAsNumber: true })}
                      helperText="Normal: 40-80"
                      error={errors.geneExpressionData?.pnp?.message}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Lab Results */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    These fields are optional but can help improve prediction accuracy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="WBC (cells/µL)"
                    type="number"
                    {...register('labResults.wbc', { valueAsNumber: true })}
                    helperText="Normal: 4500-11000"
                  />
                  <Input
                    label="Lymphocytes (%)"
                    type="number"
                    {...register('labResults.lymphocytes', { valueAsNumber: true })}
                    helperText="Normal: 20-40%"
                  />
                  <Input
                    label="Neutrophils (%)"
                    type="number"
                    {...register('labResults.neutrophils', { valueAsNumber: true })}
                    helperText="Normal: 40-70%"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Demographics</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Age:</dt>
                        <dd className="font-medium">{watch('age')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Sex:</dt>
                        <dd className="font-medium capitalize">{watch('sex')}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Symptoms</h4>
                    <div className="flex flex-wrap gap-1">
                      {watchedSymptoms.map((symptom) => (
                        <span
                          key={symptom}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Notice</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        By submitting this form, you consent to AI-based analysis of your health data.
                        Results are for informational purposes and should be reviewed by a qualified
                        healthcare professional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit for Analysis
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default withAuth(HealthRecordForm, ['patient']);
