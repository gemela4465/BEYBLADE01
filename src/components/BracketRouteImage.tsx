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
 * Renders crisp, professional diagrammatic tournament lines.
 * Strictly adheres to:
 * 1. No animations (不用動畫)
 * 2. No arrows (不用箭頭)
 * 3. Uniform stroke width across all rounds using vectorEffect="non-scaling-stroke" (每輪粗細完全一致)
 * 4. Exact alignment with Player 1 / Player 2 start rows (選手名稱起位對準)
 * 5. Merged single stem line entering the next round match (黃色框合併成單一條線)
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
  const inactiveColor = '#334155'; // Dark slate for pending routes

  // Uniform stroke width for all rounds and all states (每輪粗細一致 = 2px)
  const UNIFORM_STROKE_WIDTH = 2;

  // Exact coordinates matching the MatchCard:
  // Upper Match Card (centered at Y = 25 in a 100-unit pair height):
  // - P1 row center: Y = 23.5
  // - P2 row center: Y = 32.5
  // - Unplayed / default midpoint: Y = 25
  const upperStartY = upperWinnerSlot === 'p1' ? 23.5 : upperWinnerSlot === 'p2' ? 32.5 : 25;

  // Lower Match Card (centered at Y = 75 in a 100-unit pair height):
  // - P1 row center: Y = 73.5
  // - P2 row center: Y = 82.5
  // - Unplayed / default midpoint: Y = 75
  const lowerStartY = lowerWinnerSlot === 'p1' ? 73.5 : lowerWinnerSlot === 'p2' ? 82.5 : 75;

  const isUpperAdvancing = upperWinnerSlot !== 'none';
  const isLowerAdvancing = lowerWinnerSlot !== 'none';
  const isStemAdvancing = isUpperAdvancing || isLowerAdvancing;

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

  const stemStroke =
    isUpperChampion || isLowerChampion
      ? goldColor
      : isUpperTracked || isLowerTracked
      ? trackedColor
      : isStemAdvancing
      ? activeColor
      : inactiveColor;

  // Path definitions based on direction (left-to-right vs right-to-left)
  const isLtoR = direction === 'left-to-right';

  // Upper Branch: starts at upperStartY -> reaches mid-X (50) -> turns down to center (50, 50)
  const upperPathD = isLtoR
    ? `M 0 ${upperStartY} L 50 ${upperStartY} L 50 50`
    : `M 100 ${upperStartY} L 50 ${upperStartY} L 50 50`;

  // Lower Branch: starts at lowerStartY -> reaches mid-X (50) -> turns up to center (50, 50)
  const lowerPathD = isLtoR
    ? `M 0 ${lowerStartY} L 50 ${lowerStartY} L 50 50`
    : `M 100 ${lowerStartY} L 50 ${lowerStartY} L 50 50`;

  // Merged Single Stem: from center (50, 50) straight into next match card (100, 50)
  const stemPathD = isLtoR ? `M 50 50 L 100 50` : `M 50 50 L 0 50`;

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Upper Match Branch */}
        <path
          d={upperPathD}
          fill="none"
          stroke={upperStroke}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={isUpperAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          opacity={isUpperAdvancing ? 1 : 0.45}
        />

        {/* Lower Match Branch */}
        <path
          d={lowerPathD}
          fill="none"
          stroke={lowerStroke}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={isLowerAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          opacity={isLowerAdvancing ? 1 : 0.45}
        />

        {/* Merged Single Stem into Next Match Card (黃色框合併為一條) */}
        <path
          d={stemPathD}
          fill="none"
          stroke={stemStroke}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={isStemAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          opacity={isStemAdvancing ? 1 : 0.45}
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
 * Renders the semi-final to grand final connecting bridge graphic.
 * Clean, no animation, no arrows, uniform stroke width 2, perfectly aligned with player slots.
 */
export const BridgeRouteImage: React.FC<BridgeRouteImageProps> = ({
  direction,
  winnerSlot,
  isChampion = false,
  isTracked = false,
  colorTheme = 'cyan',
  targetSlot: _targetSlot,
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

  const UNIFORM_STROKE_WIDTH = 2;
  const isAdvancing = winnerSlot !== 'none';
  const isLtoR = direction === 'left-to-right';

  // Semi-Final Card (centered at Y = 50 in a 100-unit height):
  // P1 row center is at Y = 43, P2 row center is at Y = 57, midpoint is Y = 50
  const startY = winnerSlot === 'p1' ? 43 : winnerSlot === 'p2' ? 57 : 50;
  const targetY = 50;

  const strokeColor = isChampion
    ? goldColor
    : isTracked
    ? trackedColor
    : isAdvancing
    ? activeColor
    : inactiveColor;

  // Path definition: straight or stepped into Grand Final
  const pathD = isLtoR
    ? startY === targetY
      ? `M 0 ${startY} L 100 ${targetY}`
      : `M 0 ${startY} L 50 ${startY} L 50 ${targetY} L 100 ${targetY}`
    : startY === targetY
      ? `M 100 ${startY} L 0 ${targetY}`
      : `M 100 ${startY} L 50 ${startY} L 50 ${targetY} L 0 ${targetY}`;

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={isAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          opacity={isAdvancing ? 1 : 0.45}
        />
      </svg>
    </div>
  );
};
