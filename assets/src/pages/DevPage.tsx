import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react';

// Tutorial components
import { TutorialProvider } from '../contexts/TutorialContext';
import {
    TutorialCursor,
    StoneTapDemo,
    MeasurementCycleDemo,
    StepIndicatorDemo,
    PlacementMethodsDemo,
    LoupeEdgeDemo,
    TutorialDialog,
    TutorialStep,
} from '../components/tutorial';

// UI components
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingGame } from '../components/ui/LoadingGame';
import { BayerDither } from '../components/ui/BayerDither';

// Icons
import {
    BrainIcon,
    BroomIcon,
    StoneIcon,
    RulerIcon,
    SheetIcon,
    TargetIcon,
    GuardIcon,
    StoneToStoneIcon
} from '../components/icons/Icons';

// Component showcase wrapper
const ComponentCard: React.FC<{
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}> = ({ title, description, children, className = '' }) => (
    <div className={`bg-white rounded-2xl shadow-md overflow-hidden ${className}`}>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="p-6 flex items-center justify-center min-h-[200px] bg-gray-50/50">
            {children}
        </div>
    </div>
);

// Section wrapper
const Section: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-8">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors"
            >
                {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                {title}
            </button>
            {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children}
                </div>
            )}
        </div>
    );
};

const DevPage: React.FC = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showTutorialDialog, setShowTutorialDialog] = useState(false);

    const sampleTutorialSteps: TutorialStep[] = [
        {
            id: 'step-1',
            title: 'First Step',
            description: 'This is the first step of the tutorial with some explanation text.',
            animation: <StoneTapDemo />,
        },
        {
            id: 'step-2',
            title: 'Second Step',
            description: 'This is the second step showing another animation.',
            animation: <MeasurementCycleDemo />,
        },
    ];

    return (
        <TutorialProvider>
            <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
                {/* Header */}
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                        <Link
                            to="/"
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Component Gallery</h1>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Icons */}
                    <Section title="Icons">
                        <ComponentCard title="Navigation & UI" description="Brain, Ruler, Sheet">
                            <div className="flex gap-8 items-center justify-center p-4">
                                <div className="flex flex-col items-center gap-2">
                                    <BrainIcon size={32} />
                                    <span className="text-xs text-gray-500">BrainIcon</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <RulerIcon size={32} />
                                    <span className="text-xs text-gray-500">RulerIcon</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <SheetIcon size={32} />
                                    <span className="text-xs text-gray-500">SheetIcon</span>
                                </div>
                            </div>
                        </ComponentCard>
                        <ComponentCard title="Game Objects" description="Stone, Broom">
                            <div className="flex gap-8 items-center justify-center p-4">
                                <div className="flex flex-col items-center gap-2">
                                    <StoneIcon size={32} />
                                    <span className="text-xs text-gray-500">StoneIcon</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <BroomIcon size={32} />
                                    <span className="text-xs text-gray-500">BroomIcon</span>
                                </div>
                            </div>
                        </ComponentCard>
                        <ComponentCard title="Measurements" description="Target, Guard, StoneToStone">
                            <div className="flex gap-8 items-center justify-center p-4">
                                <div className="flex flex-col items-center gap-2">
                                    <TargetIcon size={32} />
                                    <span className="text-xs text-gray-500">TargetIcon</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <GuardIcon size={32} />
                                    <span className="text-xs text-gray-500">GuardIcon</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <StoneToStoneIcon size={32} />
                                    <span className="text-xs text-gray-500">StoneToStoneIcon</span>
                                </div>
                            </div>
                        </ComponentCard>
                    </Section>

                    {/* Tutorial Animations */}
                    <Section title="Tutorial Animations">
                        <ComponentCard title="TutorialCursor" description="Animated tapping hand">
                            <TutorialCursor size={64} />
                        </ComponentCard>

                        <ComponentCard title="StoneTapDemo" description="Shows stone selection">
                            <StoneTapDemo />
                        </ComponentCard>

                        <ComponentCard title="MeasurementCycleDemo" description="Cycling through measurements">
                            <MeasurementCycleDemo />
                        </ComponentCard>

                        <ComponentCard title="StepIndicatorDemo" description="Measurement step indicator">
                            <StepIndicatorDemo />
                        </ComponentCard>

                        <ComponentCard title="PlacementMethodsDemo" description="Drag or tap to place">
                            <PlacementMethodsDemo />
                        </ComponentCard>

                        <ComponentCard title="LoupeEdgeDemo" description="Loupe behavior at edges">
                            <LoupeEdgeDemo />
                        </ComponentCard>
                    </Section>

                    {/* Buttons */}
                    <Section title="Buttons">
                        <ComponentCard title="Button Variants" description="Primary, outline, destructive">
                            <div className="flex flex-wrap gap-3">
                                <Button>Primary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="destructive">Destructive</Button>
                            </div>
                        </ComponentCard>

                        <ComponentCard title="Button Sizes" description="Different button sizes">
                            <div className="flex flex-wrap items-center gap-3">
                                <Button className="h-8 text-sm px-3">Small</Button>
                                <Button className="h-10">Medium</Button>
                                <Button className="h-12 text-lg px-6">Large</Button>
                            </div>
                        </ComponentCard>

                        <ComponentCard title="Button States" description="Disabled state">
                            <div className="flex flex-wrap gap-3">
                                <Button disabled>Disabled</Button>
                                <Button variant="outline" disabled>Disabled</Button>
                            </div>
                        </ComponentCard>
                    </Section>

                    {/* Dialogs */}
                    <Section title="Dialogs">
                        <ComponentCard title="Dialog" description="Standard dialog modal">
                            <Button onClick={() => setShowDialog(true)}>Open Dialog</Button>
                        </ComponentCard>

                        <ComponentCard title="ConfirmDialog" description="Confirmation with actions">
                            <Button onClick={() => setShowConfirmDialog(true)}>Open Confirm</Button>
                        </ComponentCard>

                        <ComponentCard title="TutorialDialog" description="Multi-step tutorial">
                            <Button onClick={() => setShowTutorialDialog(true)}>Open Tutorial</Button>
                        </ComponentCard>
                    </Section>

                    {/* Loading States */}
                    <Section title="Loading States">
                        <ComponentCard title="LoadingGame" description="Game loading spinner" className="col-span-full">
                            <div className="w-full h-[300px]">
                                <LoadingGame />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="BayerDither" description="Interactive ordered dithering">
                            <div className="w-[180px]">
                                <BayerDither
                                    aspectRatio={1}
                                    cellSize={4}
                                    baseColor="#0a0a0a"
                                    accentColor="#D22730"
                                    speed={0.02}
                                />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="BayerDither (Blue)" description="With team blue color">
                            <div className="w-[180px]">
                                <BayerDither
                                    aspectRatio={1}
                                    cellSize={4}
                                    baseColor="#0a0a0a"
                                    accentColor="#185494"
                                    speed={0.02}
                                />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="BayerDither (Large Cells)" description="Bigger pixel effect">
                            <div className="w-[180px]">
                                <BayerDither
                                    aspectRatio={1}
                                    cellSize={8}
                                    baseColor="#1a1a2e"
                                    accentColor="#e94560"
                                    speed={0.015}
                                />
                            </div>
                        </ComponentCard>
                    </Section>

                    {/* Cards */}
                    <Section title="Cards">
                        <ComponentCard title="Card" description="Basic card component">
                            <Card className="p-4 w-full max-w-xs">
                                <h4 className="font-semibold mb-2">Card Title</h4>
                                <p className="text-sm text-gray-600">This is some card content with text.</p>
                            </Card>
                        </ComponentCard>
                    </Section>
                </div>

                {/* Dialog instances */}
                <Dialog
                    isOpen={showDialog}
                    onClose={() => setShowDialog(false)}
                    title="Example Dialog"
                >
                    <p>This is an example dialog with some content.</p>
                    <p>You can put any content here.</p>
                </Dialog>

                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    onClose={() => setShowConfirmDialog(false)}
                    onConfirm={() => {
                        alert('Confirmed!');
                        setShowConfirmDialog(false);
                    }}
                    title="Confirm Action"
                    message="Are you sure you want to proceed with this action?"
                    confirmText="Yes, proceed"
                    cancelText="Cancel"
                />

                <TutorialDialog
                    tutorialId="dev-page-tutorial"
                    steps={sampleTutorialSteps}
                    isOpen={showTutorialDialog}
                    onClose={() => setShowTutorialDialog(false)}
                />
            </div>
        </TutorialProvider>
    );
};

export default DevPage;
