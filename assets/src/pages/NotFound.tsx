import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-12 text-center max-w-md w-full relative overflow-hidden">
        {/* Decorative elements matching GameRoom */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-icy-accent rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-icy-blue-medium rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-8xl font-bold text-icy-blue-dark opacity-50">404</h1>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-icy-blue-dark">Page Not Found</h2>
            <p className="text-gray-600 font-medium">
              This page didn't reach the hog line.
            </p>
          </div>

          <Button
            variant="destructive"
            size="lg"
            onClick={() => navigate('/')}
            className="w-full py-4 text-lg rounded-2xl inline-flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Return to House
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
