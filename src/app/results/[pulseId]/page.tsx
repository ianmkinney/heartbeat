import ClientLayout from '@/app/components/ClientLayout';
import PulseResults from '@/app/components/PulseResults';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PageTitle, PageDescription } from '@/app/components/PageHeadings';
import { getPulseById } from '@/app/lib/pulses';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { pulseId: string } }): Promise<Metadata> {
  const pulseId = await params.pulseId;
  return {
    title: `Pulse Results - ${pulseId}`,
    description: 'View anonymous pulse survey results'
  };
}

// Use proper typing for the component
export default async function ResultsPage({ 
  params 
}: { 
  params: { pulseId: string } 
}) {
  const pulseId = await params.pulseId;
  
  if (!pulseId) {
    return notFound();
  }
  
  // Get pulse data to check if analysis is ready
  const pulse = await getPulseById(pulseId);
  const hasAnalysis = pulse?.hasAnalysis || false;

  return (
    <ClientLayout>
      <div className="flex flex-col">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between mb-4">
          <div>
            <PageTitle className="text-3xl" />
            <PageDescription className="text-lg" />
          </div>
          <div className="flex space-x-4">
            {/* Only show download button if analysis is ready */}
            {hasAnalysis && (
              <Link 
                href={`/api/pulse/${pulseId}/download`}
                className="btn-primary flex items-center"
                aria-label="Download summary as PDF"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </Link>
            )}
            <Link href="/" className="btn-secondary">
              Create New Pulse
            </Link>
          </div>
        </div>
        
        <div className="w-full max-w-6xl mx-auto flex-grow py-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Pulse Results</h1>
            <p className="text-muted">
              View the analysis for this pulse check
            </p>
          </div>
          
          <PulseResults pulseId={pulseId} />
        </div>
        
        <footer className="w-full max-w-6xl mx-auto py-4 text-center text-muted text-sm">
          <p>© {new Date().getFullYear()} Heartbeat - Anonymous Pulse Surveys</p>
        </footer>
      </div>
    </ClientLayout>
  );
}