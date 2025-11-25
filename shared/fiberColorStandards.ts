/**
 * Fiber Color Standards - TIA-598-C Compliant
 * 
 * This module provides industry-standard fiber optic color coding based on TIA-598-C.
 * Used for splice documentation and cable fiber management.
 */

// TIA-598-C 12-Fiber Base Color Sequence
export const TIA_598_BASE_COLORS = [
  { number: 1, color: 'blue', hex: '#0000FF', emoji: '🔵' },
  { number: 2, color: 'orange', hex: '#FF8C00', emoji: '🟠' },
  { number: 3, color: 'green', hex: '#00FF00', emoji: '🟢' },
  { number: 4, color: 'brown', hex: '#8B4513', emoji: '🟤' },
  { number: 5, color: 'slate', hex: '#708090', emoji: '⚫' }, // Gray
  { number: 6, color: 'white', hex: '#FFFFFF', emoji: '⚪' },
  { number: 7, color: 'red', hex: '#FF0000', emoji: '🔴' },
  { number: 8, color: 'black', hex: '#000000', emoji: '⚫' },
  { number: 9, color: 'yellow', hex: '#FFFF00', emoji: '🟡' },
  { number: 10, color: 'violet', hex: '#8B00FF', emoji: '🟣' },
  { number: 11, color: 'rose', hex: '#FF007F', emoji: '🌸' }, // Pink
  { number: 12, color: 'aqua', hex: '#00FFFF', emoji: '💧' },
] as const;

// Tracer Colors for 24+ Fiber Cables
export const TRACER_COLORS = [
  { name: 'none', hex: null },
  { name: 'black', hex: '#000000' },
  { name: 'yellow', hex: '#FFFF00' },
  { name: 'red', hex: '#FF0000' },
  { name: 'blue', hex: '#0000FF' },
  { name: 'green', hex: '#00FF00' },
] as const;

// Buffer Tube Colors (for organizing fiber groups)
export const BUFFER_TUBE_COLORS = [
  { number: 1, color: 'blue', hex: '#0000FF' },
  { number: 2, color: 'orange', hex: '#FF8C00' },
  { number: 3, color: 'green', hex: '#00FF00' },
  { number: 4, color: 'brown', hex: '#8B4513' },
  { number: 5, color: 'slate', hex: '#708090' },
  { number: 6, color: 'white', hex: '#FFFFFF' },
] as const;

export type FiberColor = typeof TIA_598_BASE_COLORS[number]['color'];
export type TracerColor = typeof TRACER_COLORS[number]['name'];
export type CableType = 'single_mode' | 'multi_mode' | 'hybrid';

export interface FiberInfo {
  fiberNumber: number;
  color: string;
  colorHex: string;
  emoji: string;
  bufferTube?: number;
  tracerColor?: string;
  tracerHex?: string | null;
}

/**
 * Get the complete fiber color scheme for a cable based on fiber count
 * @param fiberCount Number of fibers in the cable (12, 24, 48, 72, 96, 144, 288)
 * @param cableType Type of cable (affects color scheme)
 * @returns Array of fiber information with colors
 */
export function generateFiberColorScheme(
  fiberCount: number,
  cableType: CableType = 'single_mode'
): FiberInfo[] {
  const fibers: FiberInfo[] = [];
  
  // Determine how many 12-fiber groups we need
  const groupCount = Math.ceil(fiberCount / 12);
  
  for (let group = 0; group < groupCount; group++) {
    const tracerInfo = getTracerForGroup(group);
    const fibersInThisGroup = Math.min(12, fiberCount - (group * 12));
    
    for (let i = 0; i < fibersInThisGroup; i++) {
      const baseColor = TIA_598_BASE_COLORS[i];
      const fiberNumber = (group * 12) + i + 1;
      
      fibers.push({
        fiberNumber,
        color: baseColor.color,
        colorHex: baseColor.hex,
        emoji: baseColor.emoji,
        bufferTube: Math.floor((fiberNumber - 1) / 12) + 1,
        tracerColor: tracerInfo.name,
        tracerHex: tracerInfo.hex,
      });
    }
  }
  
  return fibers;
}

/**
 * Get tracer color for a specific 12-fiber group
 * Group 0 (fibers 1-12): No tracer
 * Group 1 (fibers 13-24): Black tracer
 * Group 2 (fibers 25-36): Yellow tracer
 * Group 3 (fibers 37-48): Red tracer
 * And so on...
 */
function getTracerForGroup(groupIndex: number): { name: string; hex: string | null } {
  if (groupIndex === 0) {
    return { name: 'none', hex: null };
  }
  
  const tracerIndex = ((groupIndex - 1) % (TRACER_COLORS.length - 1)) + 1;
  const tracer = TRACER_COLORS[tracerIndex];
  return { name: tracer.name, hex: tracer.hex };
}

/**
 * Get the color information for a specific fiber number
 * @param fiberNumber The fiber number (1-indexed)
 * @param totalFibers Total fibers in the cable (for tracer determination)
 * @returns Fiber color information
 */
export function getColorForFiberNumber(
  fiberNumber: number,
  totalFibers: number
): FiberInfo {
  // Determine which 12-fiber group this fiber belongs to
  const groupIndex = Math.floor((fiberNumber - 1) / 12);
  const positionInGroup = ((fiberNumber - 1) % 12);
  
  const baseColor = TIA_598_BASE_COLORS[positionInGroup];
  const tracerInfo = getTracerForGroup(groupIndex);
  
  return {
    fiberNumber,
    color: baseColor.color,
    colorHex: baseColor.hex,
    emoji: baseColor.emoji,
    bufferTube: groupIndex + 1,
    tracerColor: tracerInfo.name,
    tracerHex: tracerInfo.hex,
  };
}

/**
 * Validate if two fibers can be spliced together
 * Basic validation - same position in color sequence is typical
 * @param fiberA First fiber info
 * @param fiberB Second fiber info
 * @returns Validation result with message
 */
export function validateSpliceConnection(
  fiberA: Partial<FiberInfo>,
  fiberB: Partial<FiberInfo>
): { valid: boolean; warning?: string } {
  // Allow any connection (field techs know what they're doing)
  // But warn if colors don't match typical patterns
  
  if (!fiberA.fiberNumber || !fiberB.fiberNumber) {
    return { valid: false, warning: 'Fiber numbers required' };
  }
  
  // Check if fibers are from same cable (shouldn't splice to itself)
  // This check would need cable ID comparison - left for implementation
  
  // Warn if not same color (unusual but allowed)
  if (fiberA.color && fiberB.color && fiberA.color !== fiberB.color) {
    return {
      valid: true,
      warning: `Unusual: splicing ${fiberA.color} to ${fiberB.color}. Typical to match colors.`
    };
  }
  
  return { valid: true };
}

/**
 * Get suggested fiber pairings for a splice between two cables
 * Returns typical 1-to-1 color matching
 * @param cableAFiberCount Fiber count in cable A
 * @param cableBFiberCount Fiber count in cable B
 * @returns Suggested pairings
 */
export function getSuggestedSplicePairings(
  cableAFiberCount: number,
  cableBFiberCount: number
): Array<{ cableA: FiberInfo; cableB: FiberInfo }> {
  const minCount = Math.min(cableAFiberCount, cableBFiberCount);
  const pairings: Array<{ cableA: FiberInfo; cableB: FiberInfo }> = [];
  
  for (let i = 1; i <= minCount; i++) {
    const fiberA = getColorForFiberNumber(i, cableAFiberCount);
    const fiberB = getColorForFiberNumber(i, cableBFiberCount);
    pairings.push({ cableA: fiberA, cableB: fiberB });
  }
  
  return pairings;
}

/**
 * Get a display-friendly color name with tracer
 * @param fiber Fiber information
 * @returns Display string like "Blue" or "Blue (Black Tracer)"
 */
export function getDisplayColorName(fiber: FiberInfo): string {
  const colorName = fiber.color.charAt(0).toUpperCase() + fiber.color.slice(1);
  
  if (fiber.tracerColor && fiber.tracerColor !== 'none') {
    const tracerName = fiber.tracerColor.charAt(0).toUpperCase() + fiber.tracerColor.slice(1);
    return `${colorName} (${tracerName} Tracer)`;
  }
  
  return colorName;
}

/**
 * Get all supported fiber counts for cable creation
 */
export const STANDARD_FIBER_COUNTS = [
  2, 4, 6, 8, 12, 24, 36, 48, 72, 96, 144, 216, 288
] as const;

/**
 * Check if a fiber count is standard
 */
export function isStandardFiberCount(count: number): boolean {
  return STANDARD_FIBER_COUNTS.includes(count as any);
}

/**
 * Get buffer tube organization for a cable
 * Returns how fibers are organized into buffer tubes
 */
export function getBufferTubeOrganization(fiberCount: number): {
  tubeCount: number;
  fibersPerTube: number;
  organization: Array<{ tubeNumber: number; fiberRange: string }>;
} {
  // Standard is 12 fibers per buffer tube
  const fibersPerTube = 12;
  const tubeCount = Math.ceil(fiberCount / fibersPerTube);
  
  const organization = [];
  for (let tube = 1; tube <= tubeCount; tube++) {
    const startFiber = ((tube - 1) * fibersPerTube) + 1;
    const endFiber = Math.min(tube * fibersPerTube, fiberCount);
    organization.push({
      tubeNumber: tube,
      fiberRange: `${startFiber}-${endFiber}`
    });
  }
  
  return { tubeCount, fibersPerTube, organization };
}
