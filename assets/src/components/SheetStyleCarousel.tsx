import React, { useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { SHEET_STYLES } from '../contexts/SettingsContext';
import CurlingSheet from './CurlingSheet';

interface SheetStyleCarouselProps {
    selectedStyleId: string;
    onSelectStyle: (styleId: string) => void;
}

export const SheetStyleCarousel: React.FC<SheetStyleCarouselProps> = ({ selectedStyleId, onSelectStyle }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'center',
        containScroll: false, // Allow centering of first/last items
        dragFree: false,
    });

    const scrollToSelected = useCallback(() => {
        if (!emblaApi) return;
        const index = SHEET_STYLES.findIndex(s => s.id === selectedStyleId);
        if (index !== -1) {
            emblaApi.scrollTo(index);
        }
    }, [emblaApi, selectedStyleId]);

    // Scroll to selected on mount and when api is ready
    useEffect(() => {
        if (emblaApi) {
            scrollToSelected();
        }
    }, [emblaApi, scrollToSelected]);

    const handleStyleClick = (styleId: string, index: number) => {
        onSelectStyle(styleId);
        if (emblaApi) {
            emblaApi.scrollTo(index);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Sheet Style</h3>

            {/* Embla Carousel Viewport */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y touch-pinch-zoom -ml-4">
                    {SHEET_STYLES.map((style, index) => (
                        <div
                            key={style.id}
                            className="flex-[0_0_85%] min-w-0 pl-4 relative"
                        >
                            <button
                                onClick={() => handleStyleClick(style.id, index)}
                                className={`
                                    w-full relative rounded-xl overflow-hidden transition-all duration-300
                                    ${selectedStyleId === style.id
                                        ? 'ring-4 ring-lavender-600 scale-100 opacity-100'
                                        : 'ring-2 ring-gray-200 hover:ring-gray-300 scale-95 opacity-70'
                                    }
                                `}
                            >
                                {/* Sheet preview */}
                                <div className="aspect-[475/823] w-full pointer-events-none bg-white">
                                    <CurlingSheet width="100%" style={style} />
                                </div>

                                {/* Style name overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-semibold text-sm">{style.name}</span>
                                        {selectedStyleId === style.id && (
                                            <div className="w-6 h-6 bg-lavender-600 rounded-full flex items-center justify-center">
                                                <Check size={16} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
