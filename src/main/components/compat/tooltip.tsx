import React from 'react';
import * as TooltipNS from 'react-tooltip';

// Normalize react-tooltip export between default and named exports across versions
const ResolvedTooltip = // Prefer named export, then default, then namespace itself
  ((TooltipNS as any).Tooltip ?? (TooltipNS as any).default ?? TooltipNS) as React.ComponentType<any>;

export const Tooltip: React.ComponentType<any> = ResolvedTooltip;
