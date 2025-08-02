import React from 'react';
import { icons } from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
    // Lucide icon names are PascalCase, this satisfies TypeScript.
    const LucideIcon = icons[name as keyof typeof icons];

    if (!LucideIcon) {
        console.error(`Icon with name "${name}" not found in lucide-react.`);
        // Return a fallback SVG to prevent crashing.
        return <svg width={props.size || 24} height={props.size || 24} {...props} />;
    }

    return <LucideIcon {...props} data-testid={`icon-${name.toLowerCase()}`} />;
};