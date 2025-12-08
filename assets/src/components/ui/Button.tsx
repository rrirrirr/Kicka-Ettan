import React from 'react';
import { motion } from 'framer-motion';
import { buttonTap, buttonHover } from '../../utils/animations';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
    shape?: 'default' | 'pill' | 'circle' | 'square';
    isLoading?: boolean;
    noHoverAnimation?: boolean;
    noTapAnimation?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className = '',
    variant = 'primary',
    size = 'md',
    shape = 'default',
    isLoading = false,
    noHoverAnimation = false,
    noTapAnimation = false,
    children,
    ...props
}) => {
    const baseStyles = "font-bold flex items-center justify-center gap-2 tracking-tight disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-out";

    const variants = {
        primary: "bg-[var(--icy-button-bg)] text-[var(--icy-button-text)] shadow-md hover:bg-[var(--icy-button-hover)] hover:shadow-lg",
        secondary: "bg-[var(--icy-blue-light)] hover:bg-[var(--icy-blue-medium)] text-[var(--icy-blue-dark)] shadow-md hover:shadow-lg",
        destructive: "bg-[var(--color-destructive)] text-white shadow-md hover:bg-[var(--color-destructive-hover)] hover:shadow-lg",
        outline: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm",
        ghost: "hover:bg-gray-100/50 text-gray-600 hover:text-gray-900",
        icon: "hover:bg-gray-200/50 text-gray-600 hover:text-gray-900"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg",
        icon: "p-2"
    };

    const shapes = {
        default: "rounded-xl",
        pill: "rounded-full",
        circle: "rounded-full aspect-square p-0 flex items-center justify-center", // Good for icon-only buttons that are circular
        square: "rounded-lg"
    };

    // Override shape for 'icon' variant if it's implicitly circular/square-ish? 
    // Actually, let's keep it explicit. 
    // But 'icon' size usually implies a square or circle.
    // If size is 'icon', and shape is default, we use 'rounded-lg' from the original code (which was hardcoded in variant).
    // Let's rely on the shape prop being explicit or defaulting to 'default' (rounded-xl).
    // Note: Original code had `rounded-lg` inside the `icon` variant string. I removed it from variant and rely on `shape`.
    // Wait, I should potentially default shape based on size? 
    // Let's just use the shape prop. The original code had `rounded-xl` in baseStyles and `rounded-lg` in `icon` variant.
    // To match original behavior: if size='icon' and shape='default', maybe we want rounded-lg?
    // Let's make `default` be `rounded-xl` and if user wants `rounded-lg` they can handle via className or we add a `square` shape.
    // I added `square: "rounded-lg"` above.
    // Checking original `icon` variant: `rounded-lg` was there.
    // I will remove `rounded-lg` from `icon` variant in my new code, so if they want that look they should use `shape="square"` or I can make it the default for icon size? 
    // No, let's stick to `default` = `rounded-xl` for consistency, unless `icon` variant overrides it? 
    // Actually, `icon` variant in original had `rounded-lg`.
    // Let's add that to `icon` variant to preserve compat if they don't pass shape.

    // Actually, cleaner is to have `rounded-xl` in base or shape.
    // The original `baseStyles` had `rounded-xl`.
    // The `icon` variant had `rounded-lg`.
    // Tailwind class prevalence: last wins? Usually yes if completely overriding.
    // `rounded-xl` vs `rounded-lg`.

    // To be safe and clean:
    // I will NOT put rounded in baseStyles anymore.
    // I will put it in `shapes`.

    // But wait, existing usages don't pass `shape`. They expect `rounded-xl` by default.



    // Construct the final class string carefully to ensure overrides work
    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${shapes[shape]} ${className}`;

    return (
        <motion.button
            className={combinedClassName}
            disabled={isLoading || props.disabled}
            whileTap={noTapAnimation ? undefined : buttonTap}
            whileHover={!props.disabled && size !== 'lg' && size !== 'xl' && !noHoverAnimation ? buttonHover : undefined}
            {...(props as any)}
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    loading...
                </>
            ) : children}
        </motion.button>
    );
};

