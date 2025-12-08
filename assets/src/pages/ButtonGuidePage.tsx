import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowLeft, Play, Settings, Home, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ButtonGuidePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen p-8 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight lowercase">button design system</h1>
                        <p className="text-gray-500">guide to button variants, sizes, and shapes</p>
                    </div>
                </header>

                {/* VISUAL HIERARCHY SECTION */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Visual Hierarchy</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button>Primary Action</Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Primary</strong>
                                <p>Use once per view for the main positive action (e.g., "Create Game", "Confirm").</p>
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button variant="secondary">Secondary Action</Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Secondary</strong>
                                <p>Use for alternative actions that are not the main focus but still important.</p>
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button variant="outline">Outline</Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Outline</strong>
                                <p>Use for low-emphasis actions or when you need a border to define the button area.</p>
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button variant="ghost">Ghost Button</Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Ghost / Text</strong>
                                <p>Use for least important actions, navigation links, or inside other components.</p>
                            </div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button variant="destructive">Destructive</Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Destructive</strong>
                                <p>Use for high-risk actions like deleting data or leaving a game.</p>
                            </div>
                        </Card>
                        <Card className="p-6 space-y-4">
                            <div className="h-12 flex items-center justify-center">
                                <Button variant="icon" size="icon"><Home size={20} /></Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                <strong>Icon Only</strong>
                                <p>Use for compact toolbars or headers where space is limited.</p>
                            </div>
                        </Card>
                    </div>
                </section>

                {/* SIZES SECTION */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Sizes</h2>
                    <Card className="p-8">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <Button size="sm">Small</Button>
                                <span className="text-xs text-gray-400">size="sm"</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button size="md">Medium (Default)</Button>
                                <span className="text-xs text-gray-400">size="md"</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button size="lg">Large</Button>
                                <span className="text-xs text-gray-400">size="lg"</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button size="xl">Extra Large</Button>
                                <span className="text-xs text-gray-400">size="xl"</span>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* SHAPES SECTION */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Shapes</h2>
                    <Card className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-600">Default (Rounded XL)</h3>
                                <p className="text-sm text-gray-500 mb-4">Standard shape for most UI elements. Friendly and modern.</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button>Primary</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="outline">Outline</Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-600">Pill (Rounded Full)</h3>
                                <p className="text-sm text-gray-500 mb-4">Use for distinct "Call to Action" buttons, usually independent from other UI blocks.</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button shape="pill">Primary Pill</Button>
                                    <Button shape="pill" variant="secondary">Secondary</Button>
                                    <Button shape="pill" variant="outline">Outline</Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-600">Comparison: Home Page CTA</h3>
                                <p className="text-sm text-gray-500 mb-4">Recreating the main "Create Game" button using components.</p>
                                <Button
                                    size="xl"
                                    shape="pill"
                                    className="w-full md:w-auto bg-[var(--icy-accent)] hover:bg-[var(--icy-accent-hover)] shadow-lg"
                                >
                                    <Play size={24} fill="currentColor" />
                                    create game
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-600">Icon Shapes</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <Button variant="secondary" size="icon" shape="circle">
                                            <Play size={20} className="ml-0.5" fill="currentColor" />
                                        </Button>
                                        <span className="text-xs text-gray-400">circle</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <Button variant="secondary" size="icon" shape="square">
                                            <Settings size={20} />
                                        </Button>
                                        <span className="text-xs text-gray-400">square</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <Button variant="ghost" size="icon" shape="default">
                                            <Info size={20} />
                                        </Button>
                                        <span className="text-xs text-gray-400">default</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* SETTINGS-STYLE BUTTONS */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Settings-Style Buttons</h2>
                    <Card className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            For interactive settings and form-like inputs, use <code className="bg-gray-100 px-1 rounded">rounded-2xl</code> with
                            a muted background. This distinguishes them from action buttons.
                        </p>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1 bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center gap-3 border-0"
                            >
                                <div className="w-9 h-9 rounded-full bg-red-500 shadow-sm border border-black/5"></div>
                                <span className="font-bold text-gray-700 lowercase text-base">team 1</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center gap-3 border-0"
                            >
                                <div className="w-9 h-9 rounded-full bg-blue-600 shadow-sm border border-black/5"></div>
                                <span className="font-bold text-gray-700 lowercase text-base">team 2</span>
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Key classes: <code className="bg-gray-100 px-1 rounded">bg-gray-50</code>,
                            <code className="bg-gray-100 px-1 rounded ml-1">!rounded-2xl</code>,
                            <code className="bg-gray-100 px-1 rounded ml-1">!p-4</code>,
                            <code className="bg-gray-100 px-1 rounded ml-1">border-0</code>
                        </p>
                    </Card>
                </section>

                {/* STATES SECTION */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">States</h2>
                    <Card className="p-6">
                        <div className="flex flex-wrap gap-4">
                            <Button isLoading>Loading</Button>
                            <Button disabled>Disabled</Button>
                            <Button className="animate-glow">With Glow Effect</Button>
                        </div>
                    </Card>
                </section>

                {/* OVERRIDE TIPS SECTION */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Override Tips</h2>
                    <Card className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            The Button component has base styles that may conflict with custom classes.
                            Use <code className="bg-gray-100 px-1 rounded">!</code> prefix to force overrides:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                            <li><code className="bg-gray-100 px-1 rounded">!justify-between</code> — Override <code className="bg-gray-100 px-1 rounded">justify-center</code></li>
                            <li><code className="bg-gray-100 px-1 rounded">!shadow-none</code> — Override <code className="bg-gray-100 px-1 rounded">shadow-sm</code> from outline variant</li>
                            <li><code className="bg-gray-100 px-1 rounded">!rounded-2xl</code> — Override default rounding</li>
                            <li><code className="bg-gray-100 px-1 rounded">!p-4</code> — Override default padding</li>
                        </ul>
                        <p className="text-sm text-gray-500">
                            Use <code className="bg-gray-100 px-1 rounded">noHoverAnimation</code> prop to disable button scale on hover.
                        </p>
                    </Card>
                </section>
            </div>
        </div>
    );
};

export default ButtonGuidePage;
