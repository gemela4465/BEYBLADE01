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
 * Renders precise, crisp, professional tournament diagrammatic route lines.
 * Strictly adheres to:
 * 1. No animations (晉級線 不用動畫)
 * 2. Uniform stroke width across all rounds (每輪粗細一致 = 2px)
 * 3. Exact alignment with Player 1 / Player 2 start rows and target rows (選手名稱 起位到迄位 都要對準)
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

  // Uniform stroke width for all rounds and all states (每輪粗細一致)
  const UNIFORM_STROKE_WIDTH = 2;

  // Exact coordinates matching the MatchCard (74px height, 20px header, 24px P1, 24px P2):
  // Upper Match Card (centered at Y = 25 in a 100-unit pair height):
  // - P1 row center: Y = 30
  // - P2 row center: Y = 42
  // - Card midpoint: Y = 25
  const upperStartY = upperWinnerSlot === 'p1' ? 30 : upperWinnerSlot === 'p2' ? 42 : 25;

  // Next Match Card (centered at Y = 50):
  // - Upper winner lands in Next Match Player 1 row: Y = 48 (起位到迄位 精準對準 P1)
  const upperTargetY = 48;

  // Lower Match Card (centered at Y = 75 in a 100-unit pair height):
  // - P1 row center: Y = 79
  // - P2 row center: Y = 91
  // - Card midpoint: Y = 75
  const lowerStartY = lowerWinnerSlot === 'p1' ? 79 : lowerWinnerSlot === 'p2' ? 91 : 75;

  // Next Match Card (centered at Y = 50):
  // - Lower winner lands in Next Match Player 2 row: Y = 62 (起位到迄位 精準對準 P2)
  const lowerTargetY = 62;

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

  // Path definitions based on direction (left-to-right vs right-to-left)
  const isLtoR = direction === 'left-to-right';

  const upperPathD = isLtoR
    ? `M 0 ${upperStartY} L 50 ${upperStartY} L 50 ${upperTargetY} L 100 ${upperTargetY}`
    : `M 100 ${upperStartY} L 50 ${upperStartY} L 50 ${upperTargetY} L 0 ${upperTargetY}`;

  const lowerPathD = isLtoR
    ? `M 0 ${lowerStartY} L 50 ${lowerStartY} L 50 ${lowerTargetY} L 100 ${lowerTargetY}`
    : `M 100 ${lowerStartY} L 50 ${lowerStartY} L 50 ${lowerTargetY} L 0 ${lowerTargetY}`;

  const uniqueId = React.useId().replace(/:/g, '_');

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Arrow Head Markers - static, no animations */}
          <marker
            id={`arrow-upper-${uniqueId}`}
            viewBox="0 0 100 100"
            refX={isLtoR ? '80' : '20'}
            refY="50"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 85 50 L 0 85 z' : 'M 100 15 L 15 50 L 100 85 z'}
              fill={upperStroke}
            />
          </marker>

          <marker
            id={`arrow-lower-${uniqueId}`}
            viewBox="0 0 100 100"
            refX={isLtoR ? '80' : '20'}
            refY="50"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 85 50 L 0 85 z' : 'M 100 15 L 15 50 L 100 85 z'}
              fill={lowerStroke}
            />
          </marker>
        </defs>

        {/* Upper Match Routing Path (No animation, uniform stroke width 2) */}
        <path
          d={upperPathD}
          fill="none"
          stroke={upperStroke}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          strokeDasharray={isUpperAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          markerEnd={isUpperAdvancing ? `url(#arrow-upper-${uniqueId})` : undefined}
          opacity={isUpperAdvancing ? 1 : 0.45}
        />

        {/* Upper Route Origin Point if winning (Static clean node) */}
        {isUpperAdvancing && (
          <circle
            cx={isLtoR ? 0 : 100}
            cy={upperStartY}
            r="2.5"
            fill={upperStroke}
          />
        )}

        {/* Upper Route Junction Node (Static clean node) */}
        <circle
          cx="50"
          cy={upperTargetY}
          r="2.5"
          fill={upperStroke}
          stroke="#07090f"
          strokeWidth="1"
        />

        {/* Lower Match Routing Path (No animation, uniform stroke width 2) */}
        <path
          d={lowerPathD}
          fill="none"
          stroke={lowerStroke}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          strokeDasharray={isLowerAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          markerEnd={isLowerAdvancing ? `url(#arrow-lower-${uniqueId})` : undefined}
          opacity={isLowerAdvancing ? 1 : 0.45}
        />

        {/* Lower Route Origin Point if winning (Static clean node) */}
        {isLowerAdvancing && (
          <circle
            cx={isLtoR ? 0 : 100}
            cy={lowerStartY}
            r="2.5"
            fill={lowerStroke}
          />
        )}

        {/* Lower Route Junction Node (Static clean node) */}
        <circle
          cx="50"
          cy={lowerTargetY}
          r="2.5"
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
 * Renders the semi-final to grand final connecting bridge graphic.
 * Clean, no animation, uniform stroke width 2, perfectly aligned with player slots.
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

  const UNIFORM_STROKE_WIDTH = 2;
  const isAdvancing = winnerSlot !== 'none';
  const isLtoR = direction === 'left-to-right';

  // Semi-Final Card (centered at Y = 50 in a 100-unit height):
  // P1 row center is at Y = 42, P2 row center is at Y = 58, midpoint is Y = 50
  const startY = winnerSlot === 'p1' ? 42 : winnerSlot === 'p2' ? 58 : 50;

  // Grand Final Card:
  // Target P1 slot (Left winner) is at Y = 42
  // Target P2 slot (Right winner) is at Y = 58
  const targetY = targetSlot === 'p1' ? 42 : 58;

  const strokeColor = isChampion
    ? goldColor
    : isTracked
    ? trackedColor
    : isAdvancing
    ? activeColor
    : inactiveColor;

  // Path definition: If startY === targetY, it's a straight horizontal line
  const pathD = isLtoR
    ? startY === targetY
      ? `M 0 ${startY} L 100 ${targetY}`
      : `M 0 ${startY} L 50 ${startY} L 50 ${targetY} L 100 ${targetY}`
    : startY === targetY
      ? `M 100 ${startY} L 0 ${targetY}`
      : `M 100 ${startY} L 50 ${startY} L 50 ${targetY} L 0 ${targetY}`;

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
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d={isLtoR ? 'M 0 15 L 85 50 L 0 85 z' : 'M 100 15 L 15 50 L 100 85 z'}
              fill={strokeColor}
            />
          </marker>
        </defs>

        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={UNIFORM_STROKE_WIDTH}
          strokeDasharray={isAdvancing ? 'none' : '4 3'}
          strokeLinecap="square"
          strokeLinejoin="miter"
          markerEnd={isAdvancing ? `url(#bridge-arrow-${uniqueId})` : undefined}
          opacity={isAdvancing ? 1 : 0.45}
        />

        {isAdvancing && (
          <circle
            cx={isLtoR ? 0 : 100}
            cy={startY}
            r="2.5"
            fill={strokeColor}
          />
        )}

        {startY !== targetY && (
          <circle
            cx="50"
            cy={targetY}
            r="2.5"
            fill={strokeColor}
            stroke="#07090f"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
};
