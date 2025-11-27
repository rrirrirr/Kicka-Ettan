import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    children,
    ...props
}) => {
    const baseStyles = "font-bold flex items-center justify-center gap-2 rounded-xl lowercase tracking-tight disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-out active:scale-95";

    const variants = {
        primary: "bg-[var(--icy-button-bg)] text-[var(--icy-button-text)] shadow-md hover:bg-[var(--icy-button-hover)] hover:shadow-lg",
        secondary: "bg-[var(--icy-blue-light)] hover:bg-[var(--icy-blue-medium)] text-[var(--icy-blue-dark)] shadow-md hover:shadow-lg",
        destructive: "bg-[var(--icy-accent)] text-white shadow-md hover:bg-[var(--icy-accent-hover)] hover:shadow-lg",
        outline: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm",
        ghost: "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
        icon: "hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-lg"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "p-2"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
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
        </button>
    );
};
