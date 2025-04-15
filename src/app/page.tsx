import CreatePulseForm from './components/CreatePulseForm';
import PulseDashboard from './components/PulseDashboard';

export default function Home() {
  return (
    <div className="flex flex-col p-6">
      <div className="w-full max-w-6xl mx-auto flex-grow grid md:grid-cols-2 gap-8 py-8">
        <div className="space-y-8">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl font-bold">
              Team Pulse Monitoring
            </h1>
            <p className="text-xl text-muted">
              Anonymously monitor your team&apos;s wellbeing with pulse checks
            </p>
          </div>
          
          <div className="bg-secondary rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Create a New Pulse</h2>
            <CreatePulseForm />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold">How It Works</h2>
            <div className="grid gap-4">
              <div className="bg-secondary rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">1. Create a Pulse</h3>
                <p className="text-muted">Enter the email addresses of your team members</p>
              </div>
              <div className="bg-secondary rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">2. Team Responds</h3>
                <p className="text-muted">Members receive an email with a link to a simple form</p>
              </div>
              <div className="bg-secondary rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">3. View Analysis</h3>
                <p className="text-muted">Get anonymous insights on how your team is feeling</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          
          <PulseDashboard />
          
        </div>
      </div>
      
      <footer className="w-full max-w-6xl mx-auto py-4 text-center text-muted text-sm">
        <p>© {new Date().getFullYear()} Heartbeat - Anonymous Pulse Surveys</p>
      </footer>
    </div>
  );
}
