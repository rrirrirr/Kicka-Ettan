import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useTutorial } from '../../contexts/TutorialContext';
import { Button } from '../ui/Button';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    animation: React.ReactNode;
}

interface TutorialDialogProps {
    tutorialId: string;
    steps: TutorialStep[];
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialDialog: React.FC<TutorialDialogProps> = ({
    tutorialId,
    steps,
    isOpen,
    onClose
}) => {
    const { markTipSeen } = useTutorial();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        markTipSeen(tutorialId);
        setCurrentStep(0);
        onClose();
    };

    const handleSkip = () => {
        markTipSeen(tutorialId);
        setCurrentStep(0);
        onClose();
    };

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleSkip}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="relative z-10 card-gradient rounded-3xl shadow-2xl overflow-hidden"
                        style={{ width: 510 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleSkip}
                            className="absolute top-4 right-4 z-20 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Close tutorial"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>

                        {/* Animation area - fixed height */}
                        <div className="relative bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 300 }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center justify-center"
                                >
                                    {step.animation}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Step indicator */}
                            <div className="flex justify-center gap-1.5 mb-4">
                                {steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            index === currentStep
                                                ? 'w-6 bg-lavender-600'
                                                : index < currentStep
                                                    ? 'w-1.5 bg-lavender-400'
                                                    : 'w-1.5 bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div style={{ height: 150 }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                                            {step.title}
                                        </h2>
                                        <p className="text-gray-600 text-center text-sm leading-relaxed">
                                            {step.description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {!isLastStep && (
                                    <button
                                        onClick={handleSkip}
                                        className="flex-1 py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                                    >
                                        Skip
                                    </button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    className={`${isLastStep ? 'flex-1' : 'flex-[2]'} h-12`}
                                    noHoverAnimation
                                >
                                    {isLastStep ? 'Got it!' : (
                                        <>
                                            Next
                                            <ChevronRight size={18} className="ml-1" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
