import PulseResults from '@/app/components/PulseResults';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { pulseId: string } }): Promise<Metadata> {
  return {
    title: `Pulse Results - ${params.pulseId}`,
    description: 'View anonymous pulse survey results'
  };
}

// Use proper typing for the component
export default function ResultsPage({ 
  params 
}: { 
  params: { pulseId: string } 
}) {
  if (!params?.pulseId) {
    return notFound();
  }

  const pulseId = params.pulseId;

  return (
    <div className="flex flex-col p-6">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-end mb-4">
        <Link href="/" className="btn-secondary">
          Create New Pulse
        </Link>
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
  );
}