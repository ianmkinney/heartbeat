import ClientLayout from '@/app/components/ClientLayout';
import SurveyForm from '@/app/components/SurveyForm';
import HeartbeatAnimation from '@/app/components/HeartbeatAnimation';
import { notFound } from 'next/navigation';

interface SurveyPageProps {
  params: {
    pulseId: string;
    respondentId: string;
  };
}

// Convert to async function to properly handle the dynamic params
export default async function SurveyPage({ params }: SurveyPageProps) {
  if (!params?.pulseId || !params?.respondentId) {
    return notFound();
  }
  
  // Decode the respondentId in case it's URL-encoded
  const decodedRespondentId = decodeURIComponent(params.respondentId);

  return (
    <ClientLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <main className="w-full max-w-2xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
              Heartbeat
            </h1>
            <p className="text-xl opacity-80">
              We&apos;d like to know how you&apos;re doing
            </p>
          </div>
          
          <HeartbeatAnimation />
          
          <div className="bg-secondary rounded-lg p-8">
            <SurveyForm pulseId={params.pulseId} respondentId={decodedRespondentId} />
          </div>
          
          <div className="text-sm opacity-60">
            <p>Your response will be kept anonymous. Thank you for your feedback!</p>
          </div>
        </main>
      </div>
    </ClientLayout>
  );
}