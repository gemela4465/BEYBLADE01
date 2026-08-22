import React from 'react';

export type RouteDirection = 'left-to-right' | 'right-to-left';
export type MatchWinnerSlot = 'p1' | 'p2' | 'none';

interface BracketRouteImageProps {
  direction: RouteDirection;
  upperWinnerSlot: MatchWinnerSlot;
  lowerWinnerSlot: MatchWinnerSlot;
  isUpperChampion?: boolean;
  isLowerChampion?: boolean;
  isUpperTracked?: boolean;
  isLowerTracked?: boolean;
  colorTheme?: 'emerald' | 'purple' | 'cyan' | 'amber';
  className?: string;
}

/**
 * BracketRouteImage:
 * Renders high-clarity, professional tournament diagrammatic route connections
 * corresponding precisely to match outcomes (as drawn in user's diagram).
 * Eliminates distracting glowing laser animations in favor of crisp, clean,
 * publication-ready tournament bracket routing graphics.
 */
export const BracketRouteImage: React.FC<BracketRouteImageProps> = ({
  direction,
  upperWinnerSlot,
  lowerWinnerSlot,
  isUpperChampion = false,
  isLowerChampion = false,
  isUpperTracked = false,
  isLowerTracked = false,
  colorTheme = 'emerald',
  className = 'w-full h-full min-h-[90px]',
}) => {
  // Theme stroke colors
  const activeColor =
    colorTheme === 'purple'
      ? '#c084fc'
      : colorTheme === 'cyan'
      ? '#00f2ff'
      : colorTheme === 'amber'
      ? '#f59e0b'
      : '#10b981';

  const goldColor = '#fbbf24';
  const trackedColor = '#00f2ff';
  const inactiveColor = '#334155'; // Dark slate for pending/unplayed routes

  // Calculate coordinates in a 100x100 coordinate plane
  // Upper Match:
  // P1 row is at Y = 18, P2 row is at Y = 32, Default midpoint = 25
  const upperStartY = upperWinnerSlot === 'p1' ? 18 : upperWinnerSlot === 'p2' ? 32 : 25;
  const upperTargetY = 38; // Target: Top slot (P1) of Next Match

  // Lower Match:
  // P1 row is at Y = 68, P2 row is at Y = 82, Default midpoint = 75
  const lowerStartY = lowerWinnerSlot === 'p1' ? 68 : lowerWinnerSlot === 'p2' ? 82 : 75;
  const lowerTargetY = 62; // Target: Bottom slot (P2) of Next Match

  const isUpperAdvancing = upperWinnerSlot !== 'none';
  const isLowerAdvancing = lowerWinnerSlot !== 'none';

  const upperStroke = isUpperChampion
    ? goldColor
    : isUpperTracked
    ? trackedColor
    : isUpperAdvancing
    ? activeColor
    : inactiveColor;

  const lowerStroke = isLowerChampion
    ? goldColor
    : isLowerTracked
    ? trackedColor
    : isLowerAdvancing
    ? activeColor
    : inactiveColor;

  const upperWidth = isUpperChampion ? 2.8 : isUpperTracked || isUpperAdvancing ? 2.2 : 1.4;
  const lowerWidth = isLowerChampion ? 2.8 : isLowerTracked || isLowerAdvancing ? 2.2 : 1.4;

  // Path definitions based on direction
  const isLtoR = direction === 'left-to-right';

  // Left to Right: X starts at 0 -> steps at X=50 -> ends at X=96
  const upperPathD = isLtoR
    ? `M 0 ${upperStartY} L 50 ${upperStartY} L 50 ${upperTargetY} L 96 ${upperTargetY}`
    : `M 100 ${upperStartY} L 50 ${upperStartY} L 50 ${upperTargetY} L 4 ${upperTargetY}`;

  const lowerPathD = isLtoR
    ? `M 0 ${lowerStartY} L 50 ${lowerStartY} L 50 ${lowerTargetY} L 96 ${lowerTargetY}`
    : `M 100 ${lowerStartY} L 50 ${lowerStartY} L 50 ${lowerTargetY} L 4 ${lowerTargetY}`;

  const uniqueId = React.useId().replace(/:/g, '_');

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Arrow Head Markers */}
          <marker
            id={`arrow-upper-${uniqueId}`}
            viewBox="0 0 100 100"
            refX={isLtoR ? '80' : '20'}
            refY="50"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 90 50 L 0 85 z' : 'M 100 15 L 10 50 L 100 85 z'}
              fill={upperStroke}
            />
          </marker>

          <marker
            id={`arrow-lower-${uniqueId}`}
            viewBox="0 0 100 100"
            refX={isLtoR ? '80' : '20'}
            refY="50"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 90 50 L 0 85 z' : 'M 100 15 L 10 50 L 100 85 z'}
              fill={lowerStroke}
            />
          </marker>
        </defs>

        {/* Upper Match Routing Image Path */}
        <path
          d={upperPathD}
          fill="none"
          stroke={upperStroke}
          strokeWidth={upperWidth}
          strokeDasharray={isUpperAdvancing ? 'none' : '3,3'}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={isUpperAdvancing ? `url(#arrow-upper-${uniqueId})` : undefined}
          opacity={isUpperAdvancing ? 1 : 0.6}
        />

        {/* Upper Route Origin Point if winning */}
        {isUpperAdvancing && (
          <circle
            cx={isLtoR ? 2 : 98}
            cy={upperStartY}
            r="3"
            fill={upperStroke}
          />
        )}

        {/* Upper Route Corner Junction Node */}
        <circle
          cx="50"
          cy={upperTargetY}
          r={isUpperChampion ? 3.5 : isUpperAdvancing ? 3 : 1.8}
          fill={upperStroke}
          stroke="#07090f"
          strokeWidth="1"
        />

        {/* Lower Match Routing Image Path */}
        <path
          d={lowerPathD}
          fill="none"
          stroke={lowerStroke}
          strokeWidth={lowerWidth}
          strokeDasharray={isLowerAdvancing ? 'none' : '3,3'}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={isLowerAdvancing ? `url(#arrow-lower-${uniqueId})` : undefined}
          opacity={isLowerAdvancing ? 1 : 0.6}
        />

        {/* Lower Route Origin Point if winning */}
        {isLowerAdvancing && (
          <circle
            cx={isLtoR ? 2 : 98}
            cy={lowerStartY}
            r="3"
            fill={lowerStroke}
          />
        )}

        {/* Lower Route Corner Junction Node */}
        <circle
          cx="50"
          cy={lowerTargetY}
          r={isLowerChampion ? 3.5 : isLowerAdvancing ? 3 : 1.8}
          fill={lowerStroke}
          stroke="#07090f"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

interface BridgeRouteImageProps {
  direction: RouteDirection;
  winnerSlot: MatchWinnerSlot;
  isChampion?: boolean;
  isTracked?: boolean;
  colorTheme?: 'emerald' | 'purple' | 'cyan' | 'amber';
  targetSlot: 'p1' | 'p2';
  className?: string;
}

/**
 * BridgeRouteImage:
 * Renders the clean semi-final to grand final connecting bridge graphic.
 */
export const BridgeRouteImage: React.FC<BridgeRouteImageProps> = ({
  direction,
  winnerSlot,
  isChampion = false,
  isTracked = false,
  colorTheme = 'cyan',
  targetSlot,
  className = 'w-full h-16',
}) => {
  const activeColor =
    colorTheme === 'purple'
      ? '#c084fc'
      : colorTheme === 'cyan'
      ? '#00f2ff'
      : colorTheme === 'amber'
      ? '#f59e0b'
      : '#10b981';

  const goldColor = '#fbbf24';
  const trackedColor = '#00f2ff';
  const inactiveColor = '#334155';

  const isAdvancing = winnerSlot !== 'none';
  const isLtoR = direction === 'left-to-right';

  const startY = winnerSlot === 'p1' ? 36 : winnerSlot === 'p2' ? 64 : 50;
  const targetY = targetSlot === 'p1' ? 36 : 64;

  const strokeColor = isChampion
    ? goldColor
    : isTracked
    ? trackedColor
    : isAdvancing
    ? activeColor
    : inactiveColor;

  const strokeWidth = isChampion ? 2.8 : isAdvancing || isTracked ? 2.2 : 1.4;

  const pathD = isLtoR
    ? `M 0 ${startY} L 50 ${startY} L 50 ${targetY} L 94 ${targetY}`
    : `M 100 ${startY} L 50 ${startY} L 50 ${targetY} L 6 ${targetY}`;

  const uniqueId = React.useId().replace(/:/g, '_');

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id={`bridge-arrow-${uniqueId}`}
            viewBox="0 0 100 100"
            refX={isLtoR ? '80' : '20'}
            refY="50"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 90 50 L 0 85 z' : 'M 100 15 L 10 50 L 100 85 z'}
              fill={strokeColor}
            />
          </marker>
        </defs>

        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isAdvancing ? 'none' : '3,3'}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={isAdvancing ? `url(#bridge-arrow-${uniqueId})` : undefined}
          opacity={isAdvancing ? 1 : 0.6}
        />

        {isAdvancing && (
          <circle
            cx={isLtoR ? 2 : 98}
            cy={startY}
            r="3"
            fill={strokeColor}
          />
        )}

        <circle
          cx="50"
          cy={targetY}
          r={isChampion ? 3.5 : isAdvancing ? 3 : 1.8}
          fill={strokeColor}
          stroke="#07090f"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};
