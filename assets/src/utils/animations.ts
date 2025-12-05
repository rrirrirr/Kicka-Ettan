import { Variants } from 'framer-motion';

// Spring configurations for different feels
export const springs = {
    snappy: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 1
    },
    bouncy: {
        type: "spring",
        stiffness: 300,
        damping: 15,
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
        y: 10,
        scale: 0.98
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1] // Custom cubic bezier for "modern" feel
        }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
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

export const buttonHover = {
    y: -2,
    transition: { duration: 0.2 }
};
