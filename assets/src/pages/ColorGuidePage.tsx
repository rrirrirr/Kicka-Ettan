import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Color swatch component
const ColorSwatch: React.FC<{
    name: string;
    cssVar: string;
    hex: string;
    description?: string;
    textColor?: 'light' | 'dark';
}> = ({ name, cssVar, hex, description, textColor = 'light' }) => (
    <div className="flex flex-col">
        <div
            className={`h-24 rounded-xl shadow-md flex items-end p-3 ${textColor === 'light' ? 'text-white' : 'text-gray-900'}`}
            style={{ backgroundColor: hex }}
        >
            <span className="font-mono text-xs opacity-80">{hex}</span>
        </div>
        <div className="mt-2">
            <p className="font-semibold text-gray-900">{name}</p>
            <p className="font-mono text-xs text-gray-500">{cssVar}</p>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
    </div>
);

// Color scale component (for showing full scale like lavender-50 to lavender-900)
const ColorScale: React.FC<{
    name: string;
    colors: { shade: string; hex: string; cssVar: string }[];
}> = ({ name, colors }) => (
    <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="font-bold text-gray-900 mb-4">{name}</h3>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {colors.map(({ shade, hex, cssVar }) => (
                <div key={shade} className="flex flex-col items-center">
                    <div
                        className="w-full aspect-square rounded-lg shadow-sm"
                        style={{ backgroundColor: hex }}
                        title={cssVar}
                    />
                    <span className="text-xs text-gray-500 mt-1 font-mono">{shade}</span>
                </div>
            ))}
        </div>
    </div>
);

// Section wrapper
const Section: React.FC<{
    title: string;
    description?: string;
    children: React.ReactNode;
}> = ({ title, description, children }) => (
    <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        {description && <p className="text-gray-600 mb-6">{description}</p>}
        {children}
    </div>
);

const ColorGuidePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        to="/dev"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Color System</h1>
                        <p className="text-sm text-gray-500">Design language & color palette</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Design Philosophy */}
                <Section title="Design Philosophy">
                    <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                        <div className="prose prose-gray max-w-none">
                            <p className="text-gray-700 leading-relaxed">
                                <strong>Kicka · Ettan</strong> uses a modern, icy color palette inspired by the sport of curling.
                                The design language emphasizes clarity, readability, and a clean aesthetic that feels
                                both professional and approachable.
                            </p>
                            <ul className="mt-4 space-y-2 text-gray-600">
                                <li><strong>Primary:</strong> Deep charcoal (<code>icy-black</code>) for key actions and text</li>
                                <li><strong>Secondary:</strong> Cool cyan tones (<code>icy-blue-*</code>) for accents and highlights</li>
                                <li><strong>Background:</strong> Soft white with blue undertones for a fresh, icy feel</li>
                                <li><strong>Accent:</strong> Lavender and periwinkle for subtle decorative elements</li>
                            </ul>
                        </div>
                    </div>
                </Section>

                {/* Core Icy Palette */}
                <Section
                    title="Core Icy Palette"
                    description="The primary colors used throughout the application. These form the foundation of our visual identity."
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <ColorSwatch
                            name="Icy Black"
                            cssVar="--icy-black"
                            hex="#252333"
                            description="Primary buttons, headings"
                        />
                        <ColorSwatch
                            name="Icy Black Hover"
                            cssVar="--icy-black-hover"
                            hex="#353345"
                            description="Button hover state"
                        />
                        <ColorSwatch
                            name="Icy Black Active"
                            cssVar="--icy-black-active"
                            hex="#454255"
                            description="Button pressed state"
                        />
                        <ColorSwatch
                            name="Icy Blue Medium"
                            cssVar="--icy-blue-medium"
                            hex="#62B6CB"
                            description="Links, accents"
                        />
                        <ColorSwatch
                            name="Icy Blue Light"
                            cssVar="--icy-blue-light"
                            hex="#BEE9E8"
                            description="Backgrounds, highlights"
                            textColor="dark"
                        />
                        <ColorSwatch
                            name="Icy White"
                            cssVar="--icy-white"
                            hex="#F0F8FF"
                            description="Page background"
                            textColor="dark"
                        />
                        <ColorSwatch
                            name="Icy Red"
                            cssVar="--icy-red"
                            hex="#D22730"
                            description="Team color, accents"
                        />
                        <ColorSwatch
                            name="Ban Red"
                            cssVar="--ban-red"
                            hex="#C41E3A"
                            description="Ban zones, restrictions"
                        />
                    </div>
                </Section>

                {/* Semantic Colors */}
                <Section
                    title="Semantic Colors"
                    description="Colors with specific meaning used for feedback and status indicators."
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ColorSwatch
                            name="Destructive"
                            cssVar="--color-destructive"
                            hex="#dc2626"
                            description="Errors, delete actions"
                        />
                        <ColorSwatch
                            name="Destructive Hover"
                            cssVar="--color-destructive-hover"
                            hex="#b91c1c"
                            description="Destructive button hover"
                        />
                        <ColorSwatch
                            name="Success"
                            cssVar="--color-success"
                            hex="#16a34a"
                            description="Success states, confirmations"
                        />
                        <ColorSwatch
                            name="Warning"
                            cssVar="--color-warning"
                            hex="#d97706"
                            description="Warnings, cautions"
                        />
                    </div>
                </Section>

                {/* Button Aliases */}
                <Section
                    title="Button & UI Aliases"
                    description="Semantic aliases that map to core colors for consistent UI components."
                >
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Primary Button</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-12 rounded-xl bg-icy-button-bg flex items-center justify-center text-white font-bold shadow-md">
                                        Button
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p><code>bg-icy-button-bg</code> → <span className="font-mono">#252333</span></p>
                                        <p><code>text-icy-button-text</code> → <span className="font-mono">#ffffff</span></p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Button Hover</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-12 rounded-xl bg-icy-button-hover flex items-center justify-center text-white font-bold shadow-md">
                                        Hover
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p><code>hover:bg-icy-button-hover</code> → <span className="font-mono">#353345</span></p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Accent</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-12 rounded-xl bg-icy-accent flex items-center justify-center text-white font-bold shadow-md">
                                        Accent
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p><code>bg-icy-accent</code> → <span className="font-mono">#252333</span></p>
                                        <p><code>hover:bg-icy-accent-hover</code> → <span className="font-mono">#454255</span></p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Secondary Button</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-12 rounded-xl bg-icy-blue-light flex items-center justify-center text-icy-blue-dark font-bold shadow-md">
                                        Secondary
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p><code>bg-icy-blue-light</code> → <span className="font-mono">#BEE9E8</span></p>
                                        <p><code>text-icy-blue-dark</code> → <span className="font-mono">#252333</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Lavender Scale */}
                <Section
                    title="Lavender Scale"
                    description="Used for decorative elements, overlays, and subtle accents."
                >
                    <ColorScale
                        name="Lavender"
                        colors={[
                            { shade: '50', hex: '#f5f3ff', cssVar: '--lavender-50' },
                            { shade: '100', hex: '#ede9fe', cssVar: '--lavender-100' },
                            { shade: '200', hex: '#ddd6fe', cssVar: '--lavender-200' },
                            { shade: '300', hex: '#c4b5fd', cssVar: '--lavender-300' },
                            { shade: '400', hex: '#a78bfa', cssVar: '--lavender-400' },
                            { shade: '500', hex: '#8b5cf6', cssVar: '--lavender-500' },
                            { shade: '600', hex: '#7c3aed', cssVar: '--lavender-600' },
                            { shade: '700', hex: '#6d28d9', cssVar: '--lavender-700' },
                            { shade: '800', hex: '#5b21b6', cssVar: '--lavender-800' },
                            { shade: '900', hex: '#4c1d95', cssVar: '--lavender-900' },
                        ]}
                    />
                </Section>

                {/* Periwinkle Scale */}
                <Section
                    title="Periwinkle Scale"
                    description="Complements lavender for gradients and subtle color variations."
                >
                    <ColorScale
                        name="Periwinkle"
                        colors={[
                            { shade: '50', hex: '#f0f4ff', cssVar: '--periwinkle-50' },
                            { shade: '100', hex: '#e0e7ff', cssVar: '--periwinkle-100' },
                            { shade: '200', hex: '#c7d2fe', cssVar: '--periwinkle-200' },
                            { shade: '300', hex: '#a5b4fc', cssVar: '--periwinkle-300' },
                            { shade: '400', hex: '#818cf8', cssVar: '--periwinkle-400' },
                            { shade: '500', hex: '#6366f1', cssVar: '--periwinkle-500' },
                            { shade: '600', hex: '#4f46e5', cssVar: '--periwinkle-600' },
                            { shade: '700', hex: '#4338ca', cssVar: '--periwinkle-700' },
                            { shade: '800', hex: '#3730a3', cssVar: '--periwinkle-800' },
                            { shade: '900', hex: '#312e81', cssVar: '--periwinkle-900' },
                        ]}
                    />
                </Section>

                {/* Utility Colors */}
                <Section
                    title="Utility Colors"
                    description="Additional colors for specific use cases."
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <ColorSwatch
                            name="Amber 400"
                            cssVar="--amber-400"
                            hex="#fbbf24"
                            textColor="dark"
                        />
                        <ColorSwatch
                            name="Amber 500"
                            cssVar="--amber-500"
                            hex="#f59e0b"
                            textColor="dark"
                        />
                        <ColorSwatch
                            name="Cyan 500"
                            cssVar="--cyan-500"
                            hex="#06b6d4"
                        />
                        <ColorSwatch
                            name="Cyan 600"
                            cssVar="--cyan-600"
                            hex="#0891b2"
                        />
                        <ColorSwatch
                            name="Lime 600"
                            cssVar="--lime-600"
                            hex="#65a30d"
                        />
                        <ColorSwatch
                            name="Lime 700"
                            cssVar="--lime-700"
                            hex="#4d7c0f"
                        />
                    </div>
                </Section>

                {/* Usage Examples */}
                <Section
                    title="Usage Examples"
                    description="How to use these colors in Tailwind CSS."
                >
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Background Colors</h4>
                                <code className="block bg-gray-100 p-3 rounded-lg text-sm">
                                    bg-icy-black, bg-icy-blue-medium, bg-icy-white, bg-lavender-400
                                </code>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Text Colors</h4>
                                <code className="block bg-gray-100 p-3 rounded-lg text-sm">
                                    text-icy-black, text-icy-red, text-icy-blue-dark, text-lavender-600
                                </code>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">With Opacity</h4>
                                <code className="block bg-gray-100 p-3 rounded-lg text-sm">
                                    bg-icy-black/50, text-icy-red/80, from-icy-black/80 to-icy-black/90
                                </code>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Hover States</h4>
                                <code className="block bg-gray-100 p-3 rounded-lg text-sm">
                                    hover:bg-icy-button-hover, hover:bg-icy-accent-hover, hover:text-icy-blue-medium
                                </code>
                            </div>
                        </div>
                    </div>
                </Section>
            </div>
        </div>
    );
};

export default ColorGuidePage;
