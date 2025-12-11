import { useState } from 'react';
import { version } from '../../package.json';
import { MessageSquare, FileText } from 'lucide-react';
import { ChangelogDialog } from './ChangelogDialog';
import { FeedbackDialog } from './FeedbackDialog';

export function Footer() {
    const [showChangelog, setShowChangelog] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    return (
        <>
            <footer className="mt-auto py-6 w-full flex flex-col items-center justify-center gap-3 text-sm text-gray-400 relative z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowChangelog(true)}
                        className="hover:text-gray-600 transition-colors flex items-center gap-1.5"
                    >
                        <span className="font-mono opacity-70">v{version}</span>
                    </button>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <button
                        onClick={() => setShowChangelog(true)}
                        className="hover:text-gray-600 transition-colors flex items-center gap-1.5"
                    >
                        <FileText size={14} />
                        changelog
                    </button>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="hover:text-icy-blue-medium transition-colors flex items-center gap-1.5"
                    >
                        <MessageSquare size={14} />
                        feedback
                    </button>
                </div>


            </footer>

            <ChangelogDialog
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
            />

            <FeedbackDialog
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
            />
        </>
    );
}
