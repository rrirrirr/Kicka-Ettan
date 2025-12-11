import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Dialog, Button } from './ui';
import { usePostHog } from '../contexts/PostHogContext';

interface FeedbackDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
    const [feedback, setFeedback] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { trackEvent } = usePostHog();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);

        try {
            // Track the feedback event in PostHog
            trackEvent('user_feedback_submitted', {
                feedback_text: feedback,
                contact_email: email,
                timestamp: new Date().toISOString()
            });

            // Simulate network delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));

            setSubmitted(true);
            setTimeout(() => {
                onClose();
                // Reset form after closing
                setTimeout(() => {
                    setSubmitted(false);
                    setFeedback('');
                    setEmail('');
                }, 300);
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="feedback"
            variant="default"
            headerIcon={<MessageSquare size={48} className="text-gray-400" />}
        >
            <div className="p-1">
                {submitted ? (
                    <div className="text-center py-8 space-y-3">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                            <Send size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Thank you!</h3>
                        <p className="text-gray-600">Your feedback has been sent to the team.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        <p className="text-gray-600 mb-4">
                            Found a bug? Have a feature request? Let us know how we can improve Kicka Ettan.
                        </p>

                        <div>
                            <label htmlFor="feedback" className="block text-sm font-bold text-gray-700 mb-2 lowercase">
                                Your Feedback
                            </label>
                            <textarea
                                id="feedback"
                                required
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full min-h-[120px] p-3 rounded-xl border border-gray-200 focus:border-icy-blue-medium focus:ring-2 focus:ring-icy-blue-light outline-none transition-all resize-none bg-gray-50 text-gray-800 placeholder:text-gray-400"
                                placeholder="Describe your experience or suggestion..."
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2 lowercase">
                                Email (Optional)
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:border-icy-blue-medium focus:ring-2 focus:ring-icy-blue-light outline-none transition-all bg-gray-50 text-gray-800 placeholder:text-gray-400"
                                placeholder="If you'd like a reply..."
                            />
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={!feedback.trim()}
                                shape="pill"
                                className="w-full bg-icy-accent hover:bg-icy-accent-hover text-white py-3 font-bold shadow-sm"
                            >
                                Send Feedback
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Dialog>
    );
}
