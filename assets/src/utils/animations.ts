import { Variants } from 'framer-motion';

// Spring configurations for different feels
export const springs = {
    snappy: {
        type: "spring",
        stiffness: 400,
        damping: 30, // Increased dampening to prevent overshoot (was 25)
        mass: 1
    },
    bouncy: {
        type: "spring",
        stiffness: 300,
        damping: 25, // Increased dampening to reduce erratic bounce (was 15)
        mass: 1
    },
    smooth: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 1
    }
};

// Reusable animation variants
export const fadeUp: Variants = {
    initial: {
        opacity: 0,
        y: 20
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: springs.snappy
    },
    exit: {
        opacity: 0,
        y: 10,
        transition: { duration: 0.2 }
    }
};

export const scaleIn: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: springs.snappy
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.15 }
    }
};

export const slideIn: Variants = {
    initial: {
        x: -20,
        opacity: 0
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: springs.smooth
    },
    exit: {
        x: 20,
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        // y: 10, // REMOVED: Vertical start position causing overshoot perception
        // scale: 0.98 // REMOVED: Scale causing springy feel
    },
    animate: {
        opacity: 1,
        // y: 0, // REMOVED: Vertical end position
        // scale: 1, // REMOVED: Scale causing springy feel
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: "easeIn"
        }
    }
};

// Button interaction variants
export const buttonTap = {
    scale: 0.95,
    transition: { duration: 0.1 }
};

// NOTE: Never use y-translate (jump up) animations for buttons - use scale instead
export const buttonHover = {
    scale: 1.02,
    transition: { duration: 0.2 }
};

// Round start overlay animations
export const overlayBackdrop: Variants = {
    initial: {
        opacity: 0
    },
    animate: {
        opacity: 1,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.3 }
    }
};

export const roundStartContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    },
    exit: {
        transition: {
            staggerChildren: 0.05,
            staggerDirection: -1
        }
    }
};

export const roundStartText: Variants = {
    initial: {
        opacity: 0,
        scale: 0.8,
        y: 20
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30 // Increased damping to prevent overshoot (was 20)
        }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        y: -10,
        transition: { duration: 0.2 }
    }
};
